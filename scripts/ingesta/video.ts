import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { AVATAR_LADO, DURACION_MAX_S, POSTER_MAX_BYTES } from "./config.ts";

/**
 * ffmpeg/ffprobe. Con `-loglevel error` la salida de error trae solo el error y
 * no la metadata del archivo (GPS, modelo del celular), que no debe ir al log.
 */

export function correr(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, ["-hide_banner", "-loglevel", "error", ...args]);
    let salida = "";
    let errores = "";
    proc.stdout.on("data", (d) => (salida += d));
    proc.stderr.on("data", (d) => (errores += d));
    proc.on("error", reject);
    proc.on("close", (codigo) => {
      if (codigo === 0) return resolve(salida);
      const ultima = errores.trim().split("\n").pop()?.slice(0, 200) ?? "";
      reject(new Error(`${cmd} salió con ${codigo}: ${ultima}`));
    });
  });
}

async function pesoDe(ruta: string): Promise<number> {
  return stat(ruta).then(
    (s) => s.size,
    () => 0
  );
}

/** Giro que hay que aplicar para ver el video derecho, como filtro de ffmpeg. */
export type Orientacion = {
  /** Ancho y alto como se ven, ya aplicado el giro. */
  ancho: number;
  alto: number;
  /** Grados en sentido horario: 0, 90, 180 o 270. */
  grados: number;
  /** Cadena de filtros para enderezar ("" si no hace falta). */
  giro: string;
};

/** Los 9 enteros de la displaymatrix tal como la imprime ffprobe. */
function leerMatriz(texto: string | undefined): number[] | null {
  if (!texto) return null;
  const numeros = texto
    .split("\n")
    .map((l) => l.replace(/^\s*[0-9a-f]+:/i, "").trim())
    .filter(Boolean)
    .flatMap((l) => l.split(/\s+/).map(Number));
  return numeros.length === 9 && numeros.every(Number.isFinite) ? numeros : null;
}

/**
 * Lee la rotación (displaymatrix o tag rotate) y arma el filtro para enderezar,
 * con la misma lógica que el autorotate de ffmpeg (incluidos los espejados).
 * No se usa el autorotate: su comportamiento cambió entre versiones.
 */
export async function orientacion(entrada: string): Promise<Orientacion> {
  const json = await correr("ffprobe", [
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data",
    "-of", "json",
    entrada,
  ]);
  const stream = (JSON.parse(json).streams ?? [])[0] as
    | {
        width: number;
        height: number;
        tags?: { rotate?: string };
        side_data_list?: { displaymatrix?: string; rotation?: number }[];
      }
    | undefined;
  if (!stream?.width || !stream.height) throw new Error("El archivo no tiene video");

  const lado = stream.side_data_list?.find((s) => s.rotation !== undefined || s.displaymatrix);
  const matriz = leerMatriz(lado?.displaymatrix);
  // ffprobe da la rotación antihoraria; el tag rotate ya viene en horario.
  const crudo = lado?.rotation !== undefined ? -lado.rotation : Number(stream.tags?.rotate ?? 0);
  if (!Number.isFinite(crudo)) throw new Error("Rotación ilegible");
  const grados = ((Math.round(crudo) % 360) + 360) % 360;

  let giro: string;
  if (grados === 90) giro = matriz && matriz[3] > 0 ? "transpose=cclock_flip" : "transpose=clock";
  else if (grados === 270) giro = matriz && matriz[3] < 0 ? "transpose=clock_flip" : "transpose=cclock";
  else if (grados === 180) {
    const [a, , , , e] = matriz ?? [-1, 0, 0, 0, -1];
    giro = [a < 0 ? "hflip" : "", e < 0 ? "vflip" : ""].filter(Boolean).join(",");
  } else if (grados === 0) giro = matriz && matriz[4] < 0 ? "vflip" : "";
  else throw new Error(`Rotación de ${grados}° no soportada`);

  const acostado = grados % 180 === 90;
  return {
    ancho: acostado ? stream.height : stream.width,
    alto: acostado ? stream.width : stream.height,
    grados,
    giro,
  };
}

/**
 * MP4 720p para el feed, sin metadata y de hasta 90 s. Vertical: lado corto a 720.
 * Horizontal o cuadrado: 720x1280 con el video entero centrado sobre una copia
 * desenfocada de sí mismo. La orientación se decide después de enderezarlo.
 */
export async function comprimir(entrada: string, salida: string): Promise<Orientacion> {
  const orient = await orientacion(entrada);
  const vertical = orient.alto > orient.ancho;
  const giro = orient.giro ? `${orient.giro},` : "";

  const filtro = vertical
    ? ["-vf", `${giro}scale=720:-2,setsar=1`]
    : [
        "-filter_complex",
        // El fondo se desenfoca en chico (más barato) y después se agranda.
        `[0:v]${giro}split=2[a][b];` +
          "[a]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,boxblur=20:2,scale=720:1280,setsar=1[fondo];" +
          "[b]scale=720:-2,setsar=1[frente];" +
          "[fondo][frente]overlay=(W-w)/2:(H-h)/2[v]",
        "-map", "[v]",
      ];

  await correr("ffmpeg", [
    "-y",
    // Sin autorotate y con la matriz anulada: el giro lo hace el filtro y la
    // salida no debe llevar rotación (si no, el player la gira de nuevo).
    "-noautorotate",
    "-display_rotation:v:0", "0",
    "-i", entrada,
    ...filtro,
    ...(vertical ? ["-map", "0:v:0"] : []),
    "-map", "0:a:0?",
    "-t", String(DURACION_MAX_S),
    "-map_metadata", "-1",
    "-map_chapters", "-1",
    "-fpsmax", "30",
    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    salida,
  ]);
  return orient;
}

/** JPG del segundo 1 (o del 0 si el video es más corto), de hasta 100 KB. */
export async function poster(video: string, salida: string): Promise<void> {
  for (const segundo of ["1", "0"]) {
    for (const calidad of [3, 5, 8, 12, 18, 24, 31]) {
      await rm(salida, { force: true });
      // Sin frame en ese segundo, ffmpeg falla o no escribe nada: se prueba desde el 0.
      await correr("ffmpeg", [
        "-y",
        "-ss", segundo,
        "-i", video,
        "-frames:v", "1",
        "-map_metadata", "-1",
        "-q:v", String(calidad),
        "-update", "1",
        salida,
      ]).catch((e) => {
        if (segundo === "0") throw e;
      });
      const peso = await pesoDe(salida);
      if (peso === 0) break;
      if (peso <= POSTER_MAX_BYTES) return;
    }
  }
  throw new Error("No se pudo sacar un poster de 100 KB o menos");
}

/** sha256 del archivo, 8 caracteres hex: va en la clave de R2. */
export async function hash8(ruta: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(ruta), hash);
  return hash.digest("hex").slice(0, 8);
}

/**
 * Foto o logo → JPG cuadrado de 256, recortado al centro y sin EXIF. Las
 * transparencias (logos PNG) quedan sobre Marfil en vez de negro.
 */
export async function avatar(entrada: string, salida: string): Promise<void> {
  const lado = AVATAR_LADO;
  await correr("ffmpeg", [
    "-y",
    "-i", entrada,
    "-filter_complex",
    `color=c=0xF5F4EC:s=${lado}x${lado}[fondo];` +
      `[0:v]scale=${lado}:${lado}:force_original_aspect_ratio=increase,crop=${lado}:${lado},setsar=1,format=rgba[img];` +
      "[fondo][img]overlay=shortest=1[v]",
    "-map", "[v]",
    "-frames:v", "1",
    "-map_metadata", "-1",
    "-q:v", "3",
    salida,
  ]);
  if ((await pesoDe(salida)) === 0) throw new Error("ffmpeg no generó el avatar");
}
