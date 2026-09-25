import { appendFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chequeoRotacion, chequeoWhisper } from "./chequeo.ts";
import {
  BORRAR_DESPUES_MS,
  FACTOR_INICIAL,
  MAX_INTENTOS,
  MAX_INTENTOS_SUBTITULOS,
  PRESUPUESTO_CORRIDA_MS,
  REPROCESAR,
  SECO,
  SOLO_SUBTITULOS,
  TIEMPO_MAX_MS,
  TOTAL_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "./config.ts";
import {
  anotarParaBorrar,
  clavesActuales,
  guardarPerfilYPitch,
  guardarSubtitulos,
  leerIngestas,
  leerParaBorrar,
  pendientesDeSubtitulos,
  pitchParaSubtitular,
  quitarDeBorrar,
  registrar,
  registrarErrorSubtitulos,
  type Ingesta,
  type ParaSubtitular,
} from "./db.ts";
import { leerFila, type Entrada, type Lectura } from "./formulario.ts";
import { bajarDeDrive, leerHoja } from "./google.ts";
import { bajar, borrar, pesoEnR2, subir } from "./r2.ts";
import { subtitular } from "./subtitulos.ts";
import { avatar, comprimir, duracion, hash8, poster } from "./video.ts";

/**
 * Ingesta: Form → Drive → ffmpeg → R2 + Supabase. Se procesa fila por fila y
 * una fila con error no frena a las demás.
 *
 * Fase 1: publicar los videos nuevos. Fase 2: con lo que quede del presupuesto
 * de la corrida, transcribir los pitches publicados sin subtítulos. La fase 2
 * nunca afecta la publicación: lo que no entra queda para la próxima corrida.
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
  subtitulados: 0,
  erroresSubtitulos: 0,
  agotadosSubtitulos: 0,
  subtitulosParaDespues: 0,
  segundosAudio: 0,
  segundosTranscripcion: 0,
  subtitulosDesactivados: null as string | null,
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
    const videoNuevo = !actuales.includes(archivos[0].clave);
    let slug: string;
    subidos.bytes = 0;
    try {
      // Si alguna clave nueva estaba anotada para borrar, vuelve a estar en uso.
      await quitarDeBorrar(nuevas);
      for (const [i, a] of archivos.entries()) {
        await subir(a.clave, a.ruta, a.tipo);
        subidos.bytes += pesos[i];
      }
      slug = await guardarPerfilYPitch(
        entrada,
        { video: archivos[0].clave, poster: archivos[1].clave, avatar: archivos[2]?.clave ?? null },
        videoNuevo
      );
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
    ...(resumen.subtitulosDesactivados
      ? [`Subtítulos desactivados: ${resumen.subtitulosDesactivados}`]
      : [
          `Subtítulos hechos: ${resumen.subtitulados}`,
          `Subtítulos con error: ${resumen.erroresSubtitulos}`,
          `Subtítulos agotados (${MAX_INTENTOS_SUBTITULOS} errores, no se reintentan): ${resumen.agotadosSubtitulos}`,
          `Subtítulos para la próxima corrida: ${resumen.subtitulosParaDespues}`,
          `Transcripción: ${resumen.segundosAudio.toFixed(0)} s de audio en ${resumen.segundosTranscripcion.toFixed(0)} s`,
        ]),
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

/**
 * Baja un pitch de R2 y lo transcribe. Si no entra en el presupuesto (y no es
 * forzado) devuelve "sin tiempo" sin tocar nada. Los errores se registran y
 * no se propagan: nunca afectan la publicación.
 */
async function subtitularUno(
  pitch: ParaSubtitular,
  intentos: number,
  factor: number,
  forzar: boolean
): Promise<{ factor: number } | "sin tiempo" | "error"> {
  const id = pitch.origen_id;
  const dir = await mkdtemp(join(tmpdir(), "fase2-"));
  try {
    const video = join(dir, "video.mp4");
    await bajar(pitch.video_url, video);
    const audio = await duracion(video);

    const estimado = audio * factor * 1000 + 30 * 1000;
    if (!forzar && Date.now() - inicio + estimado > PRESUPUESTO_CORRIDA_MS) return "sin tiempo";

    // El texto transcripto nunca va al log: solo números.
    const { bloques, transcripcion } = await subtitular(video, audio);
    await guardarSubtitulos(id, bloques);
    resumen.subtitulados++;
    resumen.segundosAudio += audio;
    resumen.segundosTranscripcion += transcripcion;
    const medido = transcripcion / audio;
    log(
      id,
      forzar ? "subtítulos rehechos" : "subtítulos",
      `${audio.toFixed(1)} s de audio en ${transcripcion.toFixed(1)} s (${medido.toFixed(2)}x) · ${bloques.length} bloques`
    );
    return { factor: medido };
  } catch (e) {
    // El detalle va a la tabla privada; al log público solo el intento.
    resumen.erroresSubtitulos++;
    log(id, "error subtítulos", `intento ${intentos + 1}`);
    try {
      await registrarErrorSubtitulos(id, (e as Error).message, intentos);
    } catch {
      log(id, "aviso", "no se pudo registrar el error de subtítulos");
    }
    return "error";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Fase 2: subtítulos de los pitches publicados que no los tienen, con el tiempo
 * que quede del presupuesto. `factor` (segundos de transcripción por segundo de
 * audio) arranca conservador y pasa a ser el peor medido en la corrida.
 * Devuelve un error fatal (solo si el pitch pedido a mano no existe) o null.
 */
async function fase2(): Promise<string | null> {
  // Se relee: la fase 1 pudo sumar filas o reiniciar intentos.
  const ingestas = await leerIngestas();
  const intentosDe = (id: string) => ingestas.get(id)?.subtitulos_intentos ?? 0;
  let factor = FACTOR_INICIAL;
  let medidos = 0;
  const medir = (r: Awaited<ReturnType<typeof subtitularUno>>) => {
    if (typeof r !== "object") return;
    factor = medidos === 0 ? r.factor : Math.max(factor, r.factor);
    medidos++;
  };

  // A pedido: se rehace aunque ya tenga subtítulos o haya agotado los intentos,
  // fuera del presupuesto (es un solo pitch).
  let pedido: string | null = null;
  if (SOLO_SUBTITULOS && REPROCESAR) {
    const pitch = await pitchParaSubtitular(REPROCESAR);
    if (!pitch) return `solo_subtitulos: ${REPROCESAR} no es un pitch publicado de la ingesta`;
    pedido = pitch.origen_id;
    medir(await subtitularUno(pitch, intentosDe(pedido), factor, true));
  }

  const sinSubtitulos = (await pendientesDeSubtitulos()).filter((p) => p.origen_id !== pedido);
  const pendientes = sinSubtitulos.filter((p) => intentosDe(p.origen_id) < MAX_INTENTOS_SUBTITULOS);
  resumen.agotadosSubtitulos = sinSubtitulos.length - pendientes.length;
  for (const [i, pitch] of pendientes.entries()) {
    const r =
      Date.now() - inicio > PRESUPUESTO_CORRIDA_MS
        ? "sin tiempo"
        : await subtitularUno(pitch, intentosDe(pitch.origen_id), factor, false);
    if (r === "sin tiempo") {
      resumen.subtitulosParaDespues = pendientes.length - i;
      break;
    }
    medir(r);
  }
  return null;
}

async function main() {
  // Si ffmpeg no endereza bien los videos rotados, no se procesa nada.
  await chequeoRotacion();

  // Si el whisper no anda, se publica igual y se saltea la fase 2.
  try {
    await chequeoWhisper();
  } catch (e) {
    resumen.subtitulosDesactivados = (e as Error).message.slice(0, 200);
    console.log(`Aviso: subtítulos desactivados en esta corrida (${resumen.subtitulosDesactivados})`);
  }

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
    if (SOLO_SUBTITULOS) {
      console.log(`Se reharían solo los subtítulos de ${REPROCESAR} (en modo seco no se consulta Supabase).`);
    } else if (REPROCESAR) {
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

  if (REPROCESAR && !SOLO_SUBTITULOS && !porVideo.has(REPROCESAR)) {
    fatal = `reprocesar: ${REPROCESAR} no está en la hoja (o no tiene consentimiento)`;
  }

  for (const [id, lectura] of fatal ? [] : porVideo) {
    const previa: Ingesta | undefined = ingestas.get(id);
    const forzar = id === REPROCESAR && !SOLO_SUBTITULOS;
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

  // Fase 2. Un error acá no deshace nada de lo publicado.
  if (!resumen.subtitulosDesactivados) {
    try {
      fatal ??= await fase2();
    } catch (e) {
      resumen.subtitulosDesactivados = `la fase 2 se cortó: ${(e as Error).message.slice(0, 200)}`;
      console.log(`Aviso: ${resumen.subtitulosDesactivados}`);
    }
  }

  await escribirResumen(usados, fatal);
  // Los errores de subtítulos quedan en el resumen sin poner el job en rojo;
  // que el whisper no ande, sí.
  if (fatal || resumen.errores > 0 || resumen.subtitulosDesactivados) process.exitCode = 1;
}

main().catch((e: Error) => {
  console.error(`La ingesta falló: ${e.message}`);
  process.exitCode = 1;
});
