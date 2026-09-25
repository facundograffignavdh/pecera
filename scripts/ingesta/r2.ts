import { readFile } from "node:fs/promises";
import { AwsClient } from "aws4fetch";
import { CACHE_CONTROL, env } from "./config.ts";

/**
 * Subidas a R2: un PutObject simple por archivo, clase Standard, sin multipart.
 * Nunca se lista el bucket: qué falta procesar lo decide Supabase.
 */

let cliente: AwsClient | null = null;

function r2(): AwsClient {
  cliente ??= new AwsClient({
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
    service: "s3",
    region: "auto",
  });
  return cliente;
}

/** Sube un archivo con la clave dada. Si ya existe, lo sobrescribe. */
export async function subir(clave: string, ruta: string, tipo: string): Promise<void> {
  const cuerpo = await readFile(ruta);
  const url = `${env.r2Endpoint}/${env.r2Bucket}/${encodeURIComponent(clave)}`;
  const res = await r2().fetch(url, {
    method: "PUT",
    body: cuerpo,
    headers: {
      "Content-Type": tipo,
      "Cache-Control": CACHE_CONTROL,
      "x-amz-storage-class": "STANDARD",
    },
  });
  if (!res.ok) throw new Error(`R2 respondió ${res.status} al subir ${clave}`);
}
