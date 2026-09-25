import { spawn } from "node:child_process";
import { rm, stat } from "node:fs/promises";
import { AVATAR_LADO, DURACION_MAX_S, POSTER_MAX_BYTES } from "./config.ts";

/**
 * ffmpeg/ffprobe. Con `-loglevel error` la salida de error trae solo el error y
 * no la metadata del archivo (GPS, modelo del celular), que no debe ir al log.
 */

function correr(cmd: string, args: string[]): Promise<string> {
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

type Dimensiones = { ancho: number; alto: number };

/** Ancho y alto como se ven, ya aplicada la rotación que guardan los celulares. */
export async function dimensiones(entrada: string): Promise<Dimensiones> {
  const json = await correr("ffprobe", [
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
    "-of", "json",
    entrada,
  ]);
  const stream = (JSON.parse(json).streams ?? [])[0] as
    | {
        width: number;
        height: number;
        tags?: { rotate?: string };
        side_data_list?: { rotation?: number }[];
      }
    | undefined;
  if (!stream?.width || !stream.height) throw new Error("El archivo no tiene video");

  const rotacion =
    stream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ??
    Number(stream.tags?.rotate ?? 0);
  const acostado = Math.abs(rotacion) % 180 === 90;

  return acostado
    ? { ancho: stream.height, alto: stream.width }
    : { ancho: stream.width, alto: stream.height };
}

/**
 * MP4 720p para el feed, sin metadata y de hasta 90 s. Vertical: lado corto a 720.
 * Horizontal o cuadrado: 720x1280 con el video entero centrado sobre una copia
 * desenfocada de sí mismo.
 */
export async function comprimir(entrada: string, salida: string): Promise<void> {
  const { ancho, alto } = await dimensiones(entrada);
  const vertical = alto > ancho;

  const filtro = vertical
    ? ["-vf", "scale=720:-2,setsar=1"]
    : [
        "-filter_complex",
        // El fondo se desenfoca en chico (más barato) y después se agranda.
        "[0:v]split=2[a][b];" +
          "[a]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,boxblur=20:2,scale=720:1280,setsar=1[fondo];" +
          "[b]scale=720:-2,setsar=1[frente];" +
          "[fondo][frente]overlay=(W-w)/2:(H-h)/2[v]",
        "-map", "[v]",
      ];

  await correr("ffmpeg", [
    "-y",
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
}

/** JPG del segundo 1 (o del 0 si el video es más corto), de hasta 100 KB. */
export async function poster(video: string, salida: string): Promise<void> {
  for (const segundo of ["1", "0"]) {
    for (const calidad of [3, 5, 8, 12, 18, 24, 31]) {
      await rm(salida, { force: true });
      await correr("ffmpeg", [
        "-y",
        "-ss", segundo,
        "-i", video,
        "-frames:v", "1",
        "-map_metadata", "-1",
        "-q:v", String(calidad),
        "-update", "1",
        salida,
      ]);
      const peso = await pesoDe(salida);
      if (peso === 0) break; // sin frame en ese segundo: probar desde el 0
      if (peso <= POSTER_MAX_BYTES) return;
    }
  }
  throw new Error("No se pudo sacar un poster de 100 KB o menos");
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
