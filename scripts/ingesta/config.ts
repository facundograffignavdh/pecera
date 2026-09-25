/** Configuración de la ingesta: variables de entorno y topes. */

function requerida(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}

/** En modo seco se lee la hoja y se muestra qué se haría, sin tocar nada más. */
export const SECO = process.env.INGESTA_SECO === "1" || process.env.INGESTA_SECO === "true";

/** Origen_id a procesar de nuevo aunque ya esté ok (input `reprocesar` del workflow). */
export const REPROCESAR = process.env.INGESTA_REPROCESAR?.trim() || null;
if (REPROCESAR && !/^[A-Za-z0-9_-]{10,}$/.test(REPROCESAR)) {
  throw new Error("INGESTA_REPROCESAR no parece un ID de Drive.");
}

/** Con `reprocesar`: rehacer solo los subtítulos de ese pitch, sin tocar el video. */
export const SOLO_SUBTITULOS =
  process.env.INGESTA_SOLO_SUBTITULOS === "1" || process.env.INGESTA_SOLO_SUBTITULOS === "true";
if (SOLO_SUBTITULOS && !REPROCESAR) {
  throw new Error("INGESTA_SOLO_SUBTITULOS necesita INGESTA_REPROCESAR.");
}

// Se leen al usarlas, así `npm run ingesta:chequeo` corre sin variables.
// En modo seco no se usan R2 ni Supabase.
export const env = {
  get googleToken() { return requerida("GOOGLE_TOKEN"); },
  get sheetId() { return requerida("GOOGLE_SHEET_ID"); },
  get r2AccessKeyId() { return requerida("R2_ACCESS_KEY_ID"); },
  get r2SecretAccessKey() { return requerida("R2_SECRET_ACCESS_KEY"); },
  get r2Endpoint() { return requerida("R2_ENDPOINT").replace(/\/+$/, ""); },
  get r2Bucket() { return requerida("R2_BUCKET"); },
  get supabaseUrl() { return requerida("SUPABASE_URL"); },
  get supabaseServiceKey() { return requerida("SUPABASE_SERVICE_KEY"); },
  /** ffmpeg con el filtro whisper. En el runner es otro binario que el que comprime. */
  get ffmpegWhisper() { return process.env.FFMPEG_WHISPER?.trim() || "ffmpeg"; },
  get whisperModelo() { return requerida("WHISPER_MODELO"); },
};

/** Las claves viejas se borran de R2 una hora después: el ISR puede seguir sirviéndolas. */
export const BORRAR_DESPUES_MS = 60 * 60 * 1000;

export const PESTANA = "Form Responses 1";

export const DURACION_MAX_S = 90;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const TOTAL_MAX_BYTES = 8 * 1024 * 1024 * 1024;
export const POSTER_MAX_BYTES = 100 * 1024;
export const AVATAR_LADO = 256;
export const MAX_INTENTOS = 3;

/** El token de Google vence a la hora: después de esto no se empiezan filas nuevas. */
export const TIEMPO_MAX_MS = 40 * 60 * 1000;

/**
 * Duración máxima de la corrida contando los subtítulos (fase 2): pasado esto no se
 * empieza otra transcripción. Con el cron cada 10 min, así un pitch nuevo no espera
 * de más. Variable de GitHub `INGESTA_PRESUPUESTO_MIN`, 9 por defecto.
 */
const presupuestoMin = Number(process.env.INGESTA_PRESUPUESTO_MIN?.trim() || 9);
if (!Number.isFinite(presupuestoMin) || presupuestoMin <= 0) {
  throw new Error("INGESTA_PRESUPUESTO_MIN tiene que ser un número de minutos positivo.");
}
export const PRESUPUESTO_CORRIDA_MS = presupuestoMin * 60 * 1000;

export const MAX_INTENTOS_SUBTITULOS = 3;
/** Segundos de transcripción por segundo de audio que se suponen antes de medir. */
export const FACTOR_INICIAL = 3.5;
/** Una transcripción que tarda más de esto por segundo de audio se da por colgada. */
export const TIMEOUT_FACTOR = 8;
/** Bloques de subtítulos: hasta 2 líneas de 32 caracteres, legibles en vertical. */
export const LINEA_MAX = 32;
export const LINEAS_POR_BLOQUE = 2;

export const CACHE_CONTROL = "public, max-age=31536000, immutable";
