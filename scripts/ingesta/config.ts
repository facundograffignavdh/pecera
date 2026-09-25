/** Configuración de la ingesta: variables de entorno y topes. */

function requerida(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}

/** En modo seco se lee la hoja y se muestra qué se haría, sin tocar nada más. */
export const SECO = process.env.INGESTA_SECO === "1" || process.env.INGESTA_SECO === "true";

export const env = {
  googleToken: requerida("GOOGLE_TOKEN"),
  sheetId: requerida("GOOGLE_SHEET_ID"),
  // En modo seco no hacen falta R2 ni Supabase.
  r2AccessKeyId: SECO ? "" : requerida("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: SECO ? "" : requerida("R2_SECRET_ACCESS_KEY"),
  r2Endpoint: SECO ? "" : requerida("R2_ENDPOINT").replace(/\/+$/, ""),
  r2Bucket: SECO ? "" : requerida("R2_BUCKET"),
  supabaseUrl: SECO ? "" : requerida("SUPABASE_URL"),
  supabaseServiceKey: SECO ? "" : requerida("SUPABASE_SERVICE_KEY"),
};

export const PESTANA = "Form Responses 1";

export const DURACION_MAX_S = 90;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const TOTAL_MAX_BYTES = 8 * 1024 * 1024 * 1024;
export const POSTER_MAX_BYTES = 100 * 1024;
export const AVATAR_LADO = 256;
export const MAX_INTENTOS = 3;

/** El token de Google vence a la hora: después de esto no se empiezan filas nuevas. */
export const TIEMPO_MAX_MS = 40 * 60 * 1000;

export const CACHE_CONTROL = "public, max-age=31536000, immutable";
