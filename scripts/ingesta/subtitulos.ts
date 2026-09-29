import { mkdtemp, readFile, rm } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COBERTURA_MIN,
  CONFIANZA_MIN,
  env,
  LINEA_MAX,
  LINEAS_POR_BLOQUE,
  TIMEOUT_POR_SEGUNDO,
  tiempoWhisperMs,
} from "./config.ts";
import { correr, duracion, Vencido } from "./video.ts";

/**
 * Subtítulos con whisper.cpp: el detector de voz (Silero) descarta lo que no es
 * habla, se transcribe sin reintentos con temperatura ni contexto entre bloques
 * (cortan los bucles) y se descartan los segmentos de baja confianza. Mejor sin
 * subtítulos que con frases que la persona no dijo.
 *
 * Lo transcripto nunca va al log: el repo es público. Solo se guarda en Supabase
 * (`pitches.subtitulos`). Al log van solo números.
 */

export type Bloque = { desde: number; hasta: number; texto: string };
type Segmento = Bloque & { tokens: number; confianza: number };

/** Números de una transcripción, para el log y para ajustar los umbrales. */
export type Medicion = {
  /** Segundos con voz según el detector. */
  voz: number;
  /** Parte de la voz cubierta por los segmentos que quedaron (0-1). */
  cobertura: number;
  /** Confianza media de todos los tokens transcriptos (0-1). */
  confianza: number;
  segmentos: number;
  descartados: number;
};

/**
 * Corre un binario de whisper.cpp. En Linux el build trae sus .so en la misma
 * carpeta; en Windows las .dll ya se buscan junto al .exe.
 */
function whisperCpp(nombre: string, args: string[], timeoutMs: number): Promise<string> {
  const dir = resolve(env.whisperCpp);
  return correr(join(dir, nombre), args, { timeoutMs, ffmpeg: false, env: { LD_LIBRARY_PATH: dir } });
}

/** Audio mono de 16 kHz, que es lo que lee whisper.cpp. Lo saca el mismo ffmpeg que comprime. */
export async function extraerAudio(entrada: string[], wav: string): Promise<void> {
  await correr("ffmpeg", ["-y", ...entrada, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
}

/**
 * Segundos con voz según Silero. La herramienta imprime los tramos en
 * centésimas de segundo; si la salida no cuadra, se corta en vez de adivinar.
 */
export async function detectarVoz(wav: string, audio: number): Promise<number> {
  const salida = await whisperCpp(
    "whisper-vad-speech-segments",
    ["-vm", resolve(env.whisperVad), "-f", wav],
    2 * 60 * 1000
  );
  const declarados = /^Detected (\d+) speech segments/m.exec(salida);
  const tramos = [...salida.matchAll(/^Speech segment \d+: start = ([\d.]+), end = ([\d.]+)/gm)].map(
    (m) => ({ desde: Number(m[1]) / 100, hasta: Number(m[2]) / 100 })
  );
  if (!declarados || Number(declarados[1]) !== tramos.length) {
    throw new Error("no se pudo leer la salida del detector de voz");
  }
  if (tramos.some((t) => !(t.hasta > t.desde) || t.hasta > audio + 1)) {
    throw new Error("el detector de voz dio tramos fuera del audio");
  }
  return tramos.reduce((suma, t) => suma + t.hasta - t.desde, 0);
}

/** Timeout de whisper-cli, con cuántos segmentos llevaba (solo números). */
export class TranscripcionVencida extends Error {
  segundos: number;
  bloques: number;
  constructor(segundos: number, bloques: number) {
    super(`whisper-cli tardó más de ${Math.round(segundos)} s (${bloques} bloques generados)`);
    this.segundos = segundos;
    this.bloques = bloques;
  }
}

/** whisper-cli imprime una línea así por cada segmento terminado (con el texto, que no se lee). */
const LINEA_SEGMENTO = /^\[\d{2}:\d{2}:\d{2}\.\d{3} --> /gm;

type JsonWhisper = {
  transcription?: {
    offsets: { from: number; to: number };
    text: string;
    tokens?: { text: string; p: number }[];
  }[];
};

/** Segmentos del JSON completo de whisper-cli (`-ojf`), con su confianza. */
export function leerJson(texto: string): Segmento[] {
  const json = JSON.parse(texto) as JsonWhisper;
  return (json.transcription ?? []).map((s) => {
    // Los tokens especiales ([_BEG_], [_TT_…]) no cuentan para la confianza.
    const p = (s.tokens ?? []).filter((t) => !t.text.startsWith("[_")).map((t) => t.p);
    return {
      desde: s.offsets.from / 1000,
      hasta: s.offsets.to / 1000,
      texto: s.text,
      tokens: p.length,
      confianza: p.length > 0 ? p.reduce((a, b) => a + b, 0) / p.length : 0,
    };
  });
}

/**
 * Transcribe `wav`. Se corta pasado el costo fijo más `TIMEOUT_POR_SEGUNDO` por
 * segundo de audio. `vad: false` solo para el chequeo: sobre silencio, con el
 * detector no se transcribe nada y no se mediría el costo fijo.
 */
export async function transcribir(
  wav: string,
  dir: string,
  audio: number,
  { vad = true } = {}
): Promise<Segmento[]> {
  const base = join(dir, "subs");
  const args = [
    "-m", resolve(env.whisperModelo), "-f", wav, "-l", "es", "-t", String(availableParallelism()),
    // Greedy, sin reintentos con temperatura y sin el texto anterior como contexto.
    "-bs", "1", "-bo", "1", "-nf", "-mc", "0",
    ...(vad ? ["--vad", "-vm", resolve(env.whisperVad)] : []),
    "-ojf", "-of", base, "-np",
  ];
  try {
    await whisperCpp("whisper-cli", args, tiempoWhisperMs(audio, TIMEOUT_POR_SEGUNDO));
  } catch (e) {
    if (e instanceof Vencido) {
      throw new TranscripcionVencida(e.segundos, e.salida.match(LINEA_SEGMENTO)?.length ?? 0);
    }
    throw e;
  }
  return leerJson(await readFile(`${base}.json`, "utf8"));
}

/**
 * Descarta los segmentos con confianza menor a `CONFIANZA_MIN`. Si lo que queda
 * cubre menos de `COBERTURA_MIN` de la voz, no queda nada.
 */
export function filtrar(segmentos: Segmento[], voz: number): { frases: Bloque[]; medicion: Medicion } {
  const tokens = segmentos.reduce((suma, s) => suma + s.tokens, 0);
  const confianza =
    tokens > 0 ? segmentos.reduce((suma, s) => suma + s.confianza * s.tokens, 0) / tokens : 0;
  const quedan = segmentos.filter((s) => s.confianza >= CONFIANZA_MIN);
  const cubierto = quedan.reduce((suma, s) => suma + Math.max(0, s.hasta - s.desde), 0);
  const cobertura = voz > 0 ? Math.min(1, cubierto / voz) : 0;
  return {
    frases:
      cobertura >= COBERTURA_MIN ? quedan.map(({ desde, hasta, texto }) => ({ desde, hasta, texto })) : [],
    medicion: {
      voz,
      cobertura,
      confianza,
      segmentos: segmentos.length,
      descartados: segmentos.length - quedan.length,
    },
  };
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

/** Video → bloques listos para guardar, con los segundos y los números medidos. */
export async function subtitular(
  video: string,
  segundos?: number
): Promise<{ bloques: Bloque[]; audio: number; transcripcion: number; medicion: Medicion }> {
  const dir = await mkdtemp(join(tmpdir(), "subtitulos-"));
  try {
    const audio = segundos ?? (await duracion(video));
    const wav = join(dir, "audio.wav");
    await extraerAudio(["-i", resolve(video)], wav);
    const inicio = Date.now();
    const voz = await detectarVoz(wav, audio);
    // Sin voz no se transcribe: Whisper solo inventaría.
    const segmentos = voz > 0 ? await transcribir(wav, dir, audio) : [];
    const transcripcion = (Date.now() - inicio) / 1000;
    const { frases, medicion } = filtrar(segmentos, voz);
    return { bloques: partir(normalizar(frases)), audio, transcripcion, medicion };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Números de una transcripción, para el log. */
export function describirMedicion(m: Medicion, audio: number): string {
  return (
    `voz ${m.voz.toFixed(1)} de ${audio.toFixed(1)} s, cobertura ${Math.round(m.cobertura * 100)} %, ` +
    `confianza media ${m.confianza.toFixed(2)}, ${m.descartados} de ${m.segmentos} segmentos descartados`
  );
}

// `npm run ingesta:subtitulos -- <video>`: solo local, imprime los bloques para
// revisar el corte. El workflow nunca lo corre (el log es público).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const video = process.argv[2];
  if (!video) {
    console.error("Uso: npm run ingesta:subtitulos -- <video>  (con WHISPER_CPP, WHISPER_MODELO y WHISPER_VAD)");
    process.exitCode = 1;
  } else {
    subtitular(video).then(
      ({ bloques, audio, transcripcion, medicion }) => {
        console.log(JSON.stringify(bloques, null, 2));
        console.log(
          `\n${audio.toFixed(1)} s de audio en ${transcripcion.toFixed(1)} s · ${bloques.length} bloques\n` +
            describirMedicion(medicion, audio)
        );
      },
      (e: Error) => {
        console.error(`Falló: ${e.message}`);
        process.exitCode = 1;
      }
    );
  }
}
