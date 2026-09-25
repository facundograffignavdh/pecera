import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env, LINEA_MAX, LINEAS_POR_BLOQUE, TIMEOUT_FACTOR } from "./config.ts";
import { correr, duracion } from "./video.ts";

/**
 * Subtítulos con el filtro whisper de ffmpeg. Lo transcripto nunca va al log:
 * el repo es público. Solo se guarda en Supabase (`pitches.subtitulos`).
 */

export type Bloque = { desde: number; hasta: number; texto: string };

/** Carga del modelo (574 MB) y arranque, aparte del tiempo por segundo de audio. */
const MARGEN_CARGA_MS = 60 * 1000;

/**
 * Ruta del modelo relativa a `dir` y con "/": en un filtro de ffmpeg los ":" de
 * "C:\" y las "\" rompen la sintaxis.
 */
function modeloRelativo(dir: string): string {
  const ruta = relative(dir, resolve(env.whisperModelo)).replaceAll("\\", "/");
  if (/[:,;[\]'\\=]/.test(ruta)) {
    throw new Error("La ruta del modelo no se puede escribir en el filtro (¿otra unidad de disco?)");
  }
  return ruta;
}

/** Filtro whisper que escribe `destino` (relativo a `dir`) en SRT. */
export function filtroWhisper(dir: string, destino: string): string {
  return (
    `whisper=model=${modeloRelativo(dir)}:language=es:queue=10:use_gpu=0` +
    `:destination=${destino}:format=srt`
  );
}

/**
 * Transcribe el audio de `video` y devuelve el SRT crudo. Corre con `cwd: dir`
 * para que el filtro use rutas relativas. Se corta si tarda más de
 * `TIMEOUT_FACTOR` veces la duración del audio.
 */
export async function transcribir(video: string, dir: string, segundos: number): Promise<string> {
  await correr(
    env.ffmpegWhisper,
    ["-y", "-i", resolve(video), "-vn", "-af", filtroWhisper(dir, "subs.srt"), "-f", "null", "-"],
    { cwd: dir, timeoutMs: segundos * TIMEOUT_FACTOR * 1000 + MARGEN_CARGA_MS }
  );
  // Sin voz, el filtro puede no escribir nada.
  return readFile(join(dir, "subs.srt"), "utf8").catch(() => "");
}

function segundosDe(hora: string): number {
  const [h, m, s] = hora.replace(",", ".").split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** Frases del SRT. Acepta "," o "." antes de los milisegundos. */
export function leerSrt(texto: string): Bloque[] {
  const frases: Bloque[] = [];
  for (const parte of texto.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lineas = parte.split("\n");
    const i = lineas.findIndex((l) => l.includes("-->"));
    if (i === -1) continue;
    const [desde, hasta] = lineas[i].split("-->").map((t) => segundosDe(t.trim()));
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) continue;
    frases.push({ desde, hasta, texto: lineas.slice(i + 1).join(" ") });
  }
  return frases;
}

/** Marcas que no son habla y los créditos que Whisper inventa en los silencios. */
const RUIDO = [/\[[^\]]*\]/g, /\([^)]*\)/g, /\*[^*]*\*/g, /♪/g];
const INVENTADAS = [/amara\.org/i, /subt[ií]tulos? (realizados|hechos|por)/i];

const ms = (s: number) => Math.round(s * 1000) / 1000;

/**
 * Limpia las frases: espacios, ruido, orden y superposiciones (Whisper puede
 * encimar unos milisegundos una frase con la siguiente: se recorta la anterior).
 */
export function normalizar(frases: Bloque[]): Bloque[] {
  const limpias = frases
    .map((f) => ({
      desde: Math.max(0, f.desde),
      hasta: f.hasta,
      texto: RUIDO.reduce((t, r) => t.replace(r, " "), f.texto).replace(/\s+/g, " ").trim(),
    }))
    .filter((f) => /[\p{L}\p{N}]/u.test(f.texto) && !INVENTADAS.some((r) => r.test(f.texto)))
    .sort((a, b) => a.desde - b.desde);

  for (let i = 1; i < limpias.length; i++) {
    if (limpias[i].desde < limpias[i - 1].hasta) limpias[i - 1].hasta = limpias[i].desde;
  }
  return limpias
    .filter((f) => f.hasta > f.desde)
    .map((f) => ({ desde: ms(f.desde), hasta: ms(f.hasta), texto: f.texto }));
}

/** Líneas que ocupa el texto cortando por palabras a `LINEA_MAX` caracteres. */
function lineas(texto: string): number {
  let n = 1;
  let largo = 0;
  for (const palabra of texto.split(" ")) {
    if (largo > 0 && largo + 1 + palabra.length > LINEA_MAX) {
      n++;
      largo = palabra.length;
    } else largo += (largo > 0 ? 1 : 0) + palabra.length;
  }
  return n;
}

const entra = (texto: string) => lineas(texto) <= LINEAS_POR_BLOQUE;

/**
 * Reparte el texto en `k` bloques de largo parejo, en límites de palabra. Si hay
 * puntuación cerca del punto de corte, corta ahí.
 */
function repartir(palabras: string[], k: number): string[] {
  const bloques: string[] = [];
  let actual = "";
  let restante = palabras.join(" ").length;

  for (const palabra of palabras) {
    const junto = actual ? `${actual} ${palabra}` : palabra;
    const objetivo = restante / (k - bloques.length);
    const cerrar =
      actual &&
      bloques.length < k - 1 &&
      // Sumar la palabra aleja el bloque del largo parejo, o hay puntuación cerca.
      (junto.length - objetivo > objetivo - actual.length ||
        (actual.length >= objetivo * 0.7 && /[,.;:!?…]$/.test(actual)));
    if (cerrar) {
      bloques.push(actual);
      restante -= actual.length + 1;
      actual = palabra;
    } else actual = junto;
  }
  if (actual) bloques.push(actual);
  return bloques;
}

/**
 * Corta el texto en la menor cantidad de bloques parejos en la que todos entran
 * en `LINEAS_POR_BLOQUE` líneas.
 */
function cortar(texto: string): string[] {
  if (entra(texto)) return [texto];
  const palabras = texto.split(" ");
  for (let k = Math.ceil(texto.length / (LINEA_MAX * LINEAS_POR_BLOQUE)); ; k++) {
    const bloques = repartir(palabras, k);
    // Con una palabra por bloque ya no se puede cortar más (palabra enorme).
    if (bloques.every(entra) || k >= palabras.length) return bloques;
  }
}

/**
 * Frases largas → bloques legibles en el celular. El tiempo de cada frase se
 * reparte entre sus bloques en proporción a los caracteres.
 */
export function partir(frases: Bloque[]): Bloque[] {
  return frases.flatMap((f) => {
    const textos = cortar(f.texto);
    if (textos.length === 1) return [f];
    const total = textos.reduce((suma, t) => suma + t.length, 0);
    const duracionFrase = f.hasta - f.desde;
    let desde = f.desde;
    return textos.map((texto, i) => {
      const hasta = i === textos.length - 1 ? f.hasta : desde + (duracionFrase * texto.length) / total;
      const bloque = { desde: ms(desde), hasta: ms(hasta), texto };
      desde = hasta;
      return bloque;
    });
  });
}

/** Video → bloques listos para guardar, con los segundos medidos. */
export async function subtitular(
  video: string,
  segundos?: number
): Promise<{ bloques: Bloque[]; audio: number; transcripcion: number }> {
  const dir = await mkdtemp(join(tmpdir(), "subtitulos-"));
  try {
    const audio = segundos ?? (await duracion(video));
    const inicio = Date.now();
    const srt = await transcribir(video, dir, audio);
    const transcripcion = (Date.now() - inicio) / 1000;
    return { bloques: partir(normalizar(leerSrt(srt))), audio, transcripcion };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// `npm run ingesta:subtitulos -- <video>`: solo local, imprime los bloques para
// revisar el corte. El workflow nunca lo corre (el log es público).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const video = process.argv[2];
  if (!video) {
    console.error("Uso: npm run ingesta:subtitulos -- <video>  (con WHISPER_MODELO)");
    process.exitCode = 1;
  } else {
    subtitular(video).then(
      ({ bloques, audio, transcripcion }) => {
        console.log(JSON.stringify(bloques, null, 2));
        console.log(
          `\n${audio.toFixed(1)} s de audio en ${transcripcion.toFixed(1)} s ` +
            `(${(transcripcion / audio).toFixed(2)}x) · ${bloques.length} bloques`
        );
      },
      (e: Error) => {
        console.error(`Falló: ${e.message}`);
        process.exitCode = 1;
      }
    );
  }
}
