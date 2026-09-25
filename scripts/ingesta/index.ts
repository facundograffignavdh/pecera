import { appendFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chequeoRotacion } from "./chequeo.ts";
import {
  BORRAR_DESPUES_MS,
  MAX_INTENTOS,
  REPROCESAR,
  SECO,
  TIEMPO_MAX_MS,
  TOTAL_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "./config.ts";
import {
  anotarParaBorrar,
  clavesActuales,
  guardarPerfilYPitch,
  leerIngestas,
  leerParaBorrar,
  quitarDeBorrar,
  registrar,
  type Ingesta,
} from "./db.ts";
import { leerFila, type Entrada, type Lectura } from "./formulario.ts";
import { bajarDeDrive, leerHoja } from "./google.ts";
import { borrar, pesoEnR2, subir } from "./r2.ts";
import { avatar, comprimir, hash8, poster } from "./video.ts";

/**
 * Ingesta: Form → Drive → ffmpeg → R2 + Supabase. Se procesa fila por fila y
 * una fila con error no frena a las demás.
 *
 * El repo es público: el log y el resumen solo muestran origen_id, slug, estado
 * y números. Nunca nombres, emails, teléfonos ni links.
 */

const inicio = Date.now();
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const log = (origenId: string, estado: string, detalle = "") =>
  console.log(`[${origenId}] ${estado}${detalle ? ` — ${detalle}` : ""}`);

/** Superar el tope de 8 GB corta la corrida entera. */
class TopeSuperado extends Error {}

const resumen = {
  ok: 0,
  errores: 0,
  salteadas: 0,
  agotadas: 0,
  yaHechas: 0,
  quedanParaDespues: 0,
  subidos: 0,
  viejasBorradas: 0,
};

async function peso(ruta: string) {
  return (await stat(ruta)).size;
}

/**
 * Procesa una entrada válida. `subidos` se va actualizando para que, si algo
 * falla a mitad de camino, se registre lo que ya quedó en R2. `usados` incluye
 * la versión actual de esta fila: sigue en R2 hasta que se borre.
 */
async function procesar(
  entrada: Entrada,
  usados: number,
  subidos: { bytes: number }
): Promise<{ slug: string; anotados: number }> {
  const dir = await mkdtemp(join(tmpdir(), "ingesta-"));
  try {
    const original = join(dir, "original");
    const video = join(dir, "video.mp4");
    const imagen = join(dir, "poster.jpg");

    await bajarDeDrive(entrada.origenId, original, "video");
    await comprimir(original, video);
    await rm(original);

    const pesoVideo = await peso(video);
    if (pesoVideo > VIDEO_MAX_BYTES) {
      throw new Error(`El video comprimido pesa ${mb(pesoVideo)} (máximo ${mb(VIDEO_MAX_BYTES)})`);
    }
    await poster(video, imagen);

    // La foto es opcional: si no se puede procesar, el perfil va sin avatar.
    let archivoAvatar: string | null = null;
    if (entrada.fotoId) {
      const foto = join(dir, "foto");
      const destino = join(dir, "avatar.jpg");
      try {
        await bajarDeDrive(entrada.fotoId, foto, "foto");
        await avatar(foto, destino);
        archivoAvatar = destino;
      } catch (e) {
        log(entrada.origenId, "aviso", `sin avatar: ${(e as Error).message}`);
      }
    }

    // Clave nueva por contenido: R2 sirve con `immutable`, sobrescribir no alcanza.
    const archivos = [
      { clave: `${entrada.origenId}-${await hash8(video)}.mp4`, ruta: video, tipo: "video/mp4" },
      { clave: `${entrada.origenId}-${await hash8(imagen)}.jpg`, ruta: imagen, tipo: "image/jpeg" },
      ...(archivoAvatar && entrada.fotoId
        ? [{ clave: `${entrada.fotoId}-${await hash8(archivoAvatar)}.jpg`, ruta: archivoAvatar, tipo: "image/jpeg" }]
        : []),
    ];
    const nuevas = archivos.map((a) => a.clave);
    const pesos = await Promise.all(archivos.map((a) => peso(a.ruta)));
    const total = pesos.reduce((a, b) => a + b, 0);

    if (usados + total > TOTAL_MAX_BYTES) {
      throw new TopeSuperado(
        `Subir esta fila (${mb(total)}) supera el tope de ${mb(TOTAL_MAX_BYTES)}; ya hay ${mb(usados)}`
      );
    }

    const actuales = await clavesActuales(entrada.origenId);
    let slug: string;
    subidos.bytes = 0;
    try {
      // Si alguna clave nueva estaba anotada para borrar, vuelve a estar en uso.
      await quitarDeBorrar(nuevas);
      for (const [i, a] of archivos.entries()) {
        await subir(a.clave, a.ruta, a.tipo);
        subidos.bytes += pesos[i];
      }
      slug = await guardarPerfilYPitch(entrada, {
        video: archivos[0].clave,
        poster: archivos[1].clave,
        avatar: archivos[2]?.clave ?? null,
      });
    } catch (e) {
      // Nada apunta todavía a las claves nuevas: se borran ya. Las que coinciden
      // con las actuales (mismo contenido) están en uso y no se tocan.
      try {
        for (const clave of nuevas.filter((c) => !actuales.includes(c))) await borrar(clave);
        subidos.bytes = 0;
      } catch {
        log(entrada.origenId, "aviso", "no se pudieron borrar las claves nuevas");
      }
      throw e;
    }

    // Las viejas se borran más tarde: el ISR puede seguir sirviéndolas un rato.
    let anotados = 0;
    try {
      const viejas = await Promise.all(
        actuales
          .filter((c) => !nuevas.includes(c))
          .map(async (clave) => ({ clave, bytes: await pesoEnR2(clave) }))
      );
      await anotarParaBorrar(viejas, new Date(Date.now() + BORRAR_DESPUES_MS));
      anotados = viejas.reduce((suma, v) => suma + v.bytes, 0);
      if (viejas.length > 0) log(entrada.origenId, "reemplazo", `${viejas.length} claves viejas se borran en 1 h`);
    } catch (e) {
      log(entrada.origenId, "aviso", `no se anotaron las claves viejas: ${(e as Error).message}`);
    }
    return { slug, anotados };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function escribirResumen(usados: number, fatal: string | null) {
  const lineas = [
    `OK: ${resumen.ok}`,
    `Errores: ${resumen.errores}`,
    `Salteadas (sin consentimiento o sin video): ${resumen.salteadas}`,
    `Ya procesadas antes: ${resumen.yaHechas}`,
    `Agotadas (${MAX_INTENTOS} errores, no se reintentan): ${resumen.agotadas}`,
    `Quedan para la próxima corrida: ${resumen.quedanParaDespues}`,
    `Subido en esta corrida: ${mb(resumen.subidos)}`,
    `Claves viejas borradas de R2: ${resumen.viejasBorradas}`,
    `Total usado en R2: ${mb(usados)} de ${mb(TOTAL_MAX_BYTES)}`,
    ...(fatal ? [`CORTADA: ${fatal}`] : []),
  ];
  console.log(`\n=== Resumen ===\n${lineas.join("\n")}`);

  const archivo = process.env.GITHUB_STEP_SUMMARY;
  if (archivo) {
    await appendFile(archivo, `## Ingesta\n\n${lineas.map((l) => `- ${l}`).join("\n")}\n`);
  }
}

/**
 * Borra de R2 las claves viejas que ya vencieron. Si una falla, queda para la
 * próxima corrida. Devuelve los bytes que siguen ocupando las que quedan.
 */
async function borrarVencidas(): Promise<number> {
  const ahora = Date.now();
  const borradas: string[] = [];
  let quedan = 0;
  for (const f of await leerParaBorrar()) {
    if (Date.parse(f.borrar_despues) > ahora) {
      quedan += f.bytes;
      continue;
    }
    try {
      await borrar(f.clave);
      borradas.push(f.clave);
    } catch (e) {
      quedan += f.bytes;
      console.log(`Aviso: queda para la próxima una clave vieja (${(e as Error).message})`);
    }
  }
  await quitarDeBorrar(borradas);
  resumen.viejasBorradas = borradas.length;
  return quedan;
}

async function main() {
  // Si ffmpeg no endereza bien los videos rotados, no se procesa nada.
  await chequeoRotacion();

  const pendientesDeBorrar = SECO ? 0 : await borrarVencidas();

  const filas = await leerHoja();
  console.log(`Hoja leída: ${filas.length} filas.`);

  // Una lectura por video; si el mismo video aparece dos veces, cuenta una.
  const porVideo = new Map<string, Exclude<Lectura, { tipo: "salteada" }>>();
  for (const fila of filas) {
    const lectura = leerFila(fila);
    if (lectura.tipo === "salteada") {
      resumen.salteadas++;
      continue;
    }
    const id = lectura.tipo === "valida" ? lectura.entrada.origenId : lectura.origenId;
    if (!porVideo.has(id)) porVideo.set(id, lectura);
  }

  if (SECO) {
    console.log("Modo seco: no se baja, no se sube y no se escribe nada.");
    for (const [id, l] of porVideo) {
      if (l.tipo === "invalida") log(id, "inválida", l.error);
      else {
        const { perfil, slugBase, fotoId, orden } = l.entrada;
        log(id, "válida", `slug ${slugBase} · ${perfil.tipo}/${perfil.rol} · foto ${fotoId ? "sí" : "no"} · orden ${orden}`);
      }
    }
    console.log(`\nVálidas o inválidas: ${porVideo.size} · Salteadas: ${resumen.salteadas}`);
    if (REPROCESAR) {
      console.log(
        porVideo.has(REPROCESAR)
          ? `Se reprocesaría ${REPROCESAR} aunque esté ok.`
          : `reprocesar: ${REPROCESAR} no está en la hoja (o no tiene consentimiento).`
      );
      if (!porVideo.has(REPROCESAR)) process.exitCode = 1;
    }
    return;
  }

  const ingestas = await leerIngestas();
  // Lo vigente de cada fila más las claves viejas que todavía no se borraron.
  let usados = [...ingestas.values()].reduce((suma, i) => suma + i.bytes, pendientesDeBorrar);
  let fatal: string | null = null;

  if (REPROCESAR && !porVideo.has(REPROCESAR)) {
    fatal = `reprocesar: ${REPROCESAR} no está en la hoja (o no tiene consentimiento)`;
  }

  for (const [id, lectura] of fatal ? [] : porVideo) {
    const previa: Ingesta | undefined = ingestas.get(id);
    const forzar = id === REPROCESAR;
    if (previa?.estado === "ok" && !forzar) {
      resumen.yaHechas++;
      continue;
    }
    if (previa && previa.intentos >= MAX_INTENTOS && !forzar) {
      resumen.agotadas++;
      continue;
    }
    if (Date.now() - inicio > TIEMPO_MAX_MS) {
      resumen.quedanParaDespues++;
      continue;
    }

    const intentos = previa?.intentos ?? 0;
    const bytesPrevios = previa?.bytes ?? 0;

    if (lectura.tipo === "invalida") {
      await registrar(id, { estado: "error", error: lectura.error, bytes: bytesPrevios }, intentos);
      resumen.errores++;
      log(id, "error", `${lectura.error} (intento ${intentos + 1})`);
      continue;
    }

    // Los bytes previos de la fila pasan a r2_borrar (`anotados`) o se descartan si
    // la subida falló y se limpió lo nuevo.
    const usadosPorOtras = usados - bytesPrevios;
    const subidos = { bytes: 0 };
    try {
      const { slug, anotados } = await procesar(lectura.entrada, usados, subidos);
      await registrar(id, { estado: "ok", bytes: subidos.bytes }, intentos);
      usados = usadosPorOtras + subidos.bytes + anotados;
      resumen.ok++;
      resumen.subidos += subidos.bytes;
      log(id, forzar ? "reprocesada" : "ok", `/p/${slug} · ${mb(subidos.bytes)}`);
    } catch (e) {
      if (e instanceof TopeSuperado) {
        fatal = e.message;
        log(id, "cortada", e.message);
        break;
      }
      const mensaje = (e as Error).message;
      const bytes = Math.max(bytesPrevios, subidos.bytes);
      await registrar(id, { estado: "error", error: mensaje, bytes }, intentos);
      usados = usadosPorOtras + bytes;
      resumen.errores++;
      resumen.subidos += subidos.bytes;
      log(id, "error", `${mensaje} (intento ${intentos + 1})`);
    }
  }

  await escribirResumen(usados, fatal);
  if (fatal || resumen.errores > 0) process.exitCode = 1;
}

main().catch((e: Error) => {
  console.error(`La ingesta falló: ${e.message}`);
  process.exitCode = 1;
});
