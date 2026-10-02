import { AwsClient } from "aws4fetch";

/**
 * R2 desde la app (solo servidor): la foto de "Mi perfil". Mismas reglas que la
 * ingesta: PutObject simple, clase Standard, claves con hash, nunca listar.
 * Credenciales en variables de servidor de Vercel, sin NEXT_PUBLIC_.
 */

export const CACHE_CONTROL = "public, max-age=31536000, immutable";

function requerida(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta ${nombre} en las variables de entorno del servidor.`);
  return valor;
}

let cliente: AwsClient | null = null;

function r2(): AwsClient {
  cliente ??= new AwsClient({
    accessKeyId: requerida("R2_ACCESS_KEY_ID"),
    secretAccessKey: requerida("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  return cliente;
}

function urlObjeto(clave: string): string {
  const endpoint = requerida("R2_ENDPOINT").replace(/\/+$/, "");
  return `${endpoint}/${requerida("R2_BUCKET")}/${encodeURIComponent(clave)}`;
}

/**
 * Firma con aws4fetch pero hace el fetch con URL + init, nunca con un Request
 * (r2().fetch): el fetch parcheado de Next rearma los Request con el cuerpo como
 * stream sin largo, sale en partes (chunked) y R2 responde 411. Con los bytes en el
 * init, undici pone el Content-Length solo. Un reintento ante 5xx o 429.
 */
async function pedirR2(
  metodo: "PUT" | "DELETE",
  clave: string,
  cuerpo?: ArrayBuffer,
  encabezados?: Record<string, string>
): Promise<Response> {
  const url = urlObjeto(clave);
  const bytes = cuerpo && new Uint8Array(cuerpo);
  for (let intento = 1; ; intento++) {
    const firmado = await r2().sign(url, { method: metodo, headers: encabezados, body: bytes });
    const res = await fetch(url, { method: metodo, headers: firmado.headers, body: bytes, cache: "no-store" });
    if (intento >= 2 || (res.status < 500 && res.status !== 429)) return res;
    await new Promise((ok) => setTimeout(ok, 300));
  }
}

export async function subirR2(clave: string, cuerpo: ArrayBuffer, tipo: string): Promise<void> {
  const res = await pedirR2("PUT", clave, cuerpo, {
    "Content-Type": tipo,
    "Cache-Control": CACHE_CONTROL,
    "x-amz-storage-class": "STANDARD",
  });
  if (!res.ok) throw new Error(`R2 respondió ${res.status} al subir ${clave}`);
}

/** Que ya no exista no es error. */
export async function borrarR2(clave: string): Promise<void> {
  const res = await pedirR2("DELETE", clave);
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 respondió ${res.status} al borrar ${clave}`);
  }
}

/** Primeros 8 hex del sha256 del archivo final, como en la ingesta. */
export async function hash8(cuerpo: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", cuerpo);
  return Array.from(new Uint8Array(digest).slice(0, 4), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
