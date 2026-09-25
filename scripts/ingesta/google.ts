import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { env, PESTANA } from "./config.ts";

/**
 * Google Sheets y Drive por REST, con el access token que deja
 * google-github-actions/auth. Los errores nunca incluyen datos de la fila.
 */

const cabeceras = () => ({ Authorization: `Bearer ${env.googleToken}` });

/** Filas de la pestaña del Form como objetos { columna: valor }. */
export async function leerHoja(): Promise<Record<string, string>[]> {
  const rango = encodeURIComponent(`'${PESTANA}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.sheetId}/values/${rango}?valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, { headers: cabeceras() });
  if (!res.ok) throw new Error(`Sheets respondió ${res.status}`);

  const { values = [] } = (await res.json()) as { values?: string[][] };
  const [encabezado = [], ...filas] = values;
  const columnas = encabezado.map((c) => c.trim());

  // Sheets omite las celdas vacías del final de cada fila.
  return filas.map((fila) =>
    Object.fromEntries(columnas.map((col, i) => [col, (fila[i] ?? "").trim()]))
  );
}

/** Baja un archivo de Drive a disco, en streaming. `que` solo va al mensaje de error. */
export async function bajarDeDrive(id: string, destino: string, que: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, { headers: cabeceras() });
  if (!res.ok || !res.body) throw new Error(`Drive (${que}) respondió ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(destino));
}
