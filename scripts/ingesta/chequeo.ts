import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config.ts";
import { filtroWhisper } from "./subtitulos.ts";
import { comprimir, correr, orientacion } from "./video.ts";

/**
 * Chequeo previo de cada corrida: clips sintéticos con rotación en la metadata
 * pasan por `comprimir()` y se verifica que salgan derechos y sin franja. Si
 * falla, la corrida se corta antes de leer la hoja.
 *
 * El clip crudo es 1920x1080 con cuatro cuadrantes de colores. Después de
 * comprimir se reduce a 8x16 píxeles y se miran celdas que caen enteras dentro
 * de un cuadrante: si el giro está mal los colores no coinciden, y si quedó la
 * franja con fondo desenfocado las esquinas salen mezcladas.
 */

type Rgb = [number, number, number];
const ROJO: Rgb = [255, 0, 0];
const VERDE: Rgb = [0, 255, 0];
const AZUL: Rgb = [0, 0, 255];
const AMARILLO: Rgb = [255, 255, 0];
const TOLERANCIA = 60;

/** Rotaciones como las escribe ffmpeg en la displaymatrix (antihorario). */
const ROTACIONES = [90, 180, 270];

/** Cuadrantes [[arriba-izq, arriba-der], [abajo-izq, abajo-der]] girados 90° horario. */
function girarHorario([[a, b], [c, d]]: Rgb[][]): Rgb[][] {
  return [
    [c, a],
    [d, b],
  ];
}

function parecido(real: Rgb, esperado: Rgb) {
  return real.every((v, i) => Math.abs(v - esperado[i]) <= TOLERANCIA);
}

async function probar(dir: string, crudo: string, rotacion: number): Promise<void> {
  const rotado = join(dir, `rot-${rotacion}.mp4`);
  const salida = join(dir, `sal-${rotacion}.mp4`);
  const muestra = join(dir, `px-${rotacion}.rgb`);

  await correr("ffmpeg", ["-y", "-display_rotation", String(rotacion), "-i", crudo, "-c", "copy", rotado]);
  const entrada = await comprimir(rotado, salida);

  const grados = (360 - rotacion) % 360;
  if (entrada.grados !== grados) {
    throw new Error(`rotación ${rotacion}: se leyeron ${entrada.grados}° en vez de ${grados}°`);
  }
  const vertical = grados % 180 === 90;
  if (vertical !== entrada.alto > entrada.ancho) {
    throw new Error(`rotación ${rotacion}: no se detectó ${vertical ? "vertical" : "horizontal"}`);
  }

  const final = await orientacion(salida);
  if (final.ancho !== 720 || final.alto !== 1280 || final.grados !== 0 || final.giro) {
    throw new Error(
      `rotación ${rotacion}: salida ${final.ancho}x${final.alto} con ${final.grados}° (se esperaba 720x1280 sin rotación)`
    );
  }

  await correr("ffmpeg", [
    "-y", "-i", salida, "-frames:v", "1",
    "-vf", "scale=8:16:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", muestra,
  ]);
  const px = await readFile(muestra);
  const en = (x: number, y: number): Rgb => {
    const i = (y * 8 + x) * 3;
    return [px[i], px[i + 1], px[i + 2]];
  };

  let cuadrantes: Rgb[][] = [
    [ROJO, VERDE],
    [AZUL, AMARILLO],
  ];
  for (let g = 0; g < grados; g += 90) cuadrantes = girarHorario(cuadrantes);

  // Vertical: ocupa todo el cuadro. Horizontal: franja de 720x405 centrada
  // (filas 437 a 842), cuyas mitades caen enteras en las celdas 6 y 9.
  const [filaArriba, filaAbajo] = vertical ? [0, 15] : [6, 9];
  const celdas: [string, number, number, Rgb][] = [
    ["arriba-izq", 0, filaArriba, cuadrantes[0][0]],
    ["arriba-der", 7, filaArriba, cuadrantes[0][1]],
    ["abajo-izq", 0, filaAbajo, cuadrantes[1][0]],
    ["abajo-der", 7, filaAbajo, cuadrantes[1][1]],
  ];
  for (const [nombre, x, y, esperado] of celdas) {
    const real = en(x, y);
    if (!parecido(real, esperado)) {
      throw new Error(
        `rotación ${rotacion}: ${nombre} es rgb(${real.join(",")}), se esperaba rgb(${esperado.join(",")})`
      );
    }
  }
}

export async function chequeoRotacion(): Promise<void> {
  const version = (await correr("ffmpeg", ["-version"])).split("\n")[0];
  console.log(`Chequeo de rotación con ${version}`);

  const dir = await mkdtemp(join(tmpdir(), "chequeo-"));
  try {
    const crudo = join(dir, "crudo.mp4");
    await correr("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i",
      "color=c=red:s=960x540:d=1[a];color=c=lime:s=960x540:d=1[b];" +
        "color=c=blue:s=960x540:d=1[c];color=c=yellow:s=960x540:d=1[d];" +
        "[a][b]hstack[arriba];[c][d]hstack[abajo];[arriba][abajo]vstack",
      "-f", "lavfi", "-i", "sine=d=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
      crudo,
    ]);
    for (const rotacion of ROTACIONES) {
      await probar(dir, crudo, rotacion);
      console.log(`  rotación ${rotacion}: ok`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * El ffmpeg de los subtítulos (en el runner, otro binario que el que comprime)
 * tiene que traer el filtro whisper y poder cargar el modelo. Se prueba con 2 s
 * de silencio. Si falla, la ingesta publica igual y saltea los subtítulos.
 */
export async function chequeoWhisper(): Promise<void> {
  const version = (await correr(env.ffmpegWhisper, ["-version"])).split("\n")[0];
  console.log(`Chequeo de whisper con ${version}`);

  const filtros = await correr(env.ffmpegWhisper, ["-filters"]);
  if (!/^\s*\S+\s+whisper\s/m.test(filtros)) throw new Error("este ffmpeg no tiene el filtro whisper");

  const dir = await mkdtemp(join(tmpdir(), "chequeo-whisper-"));
  try {
    await correr(
      env.ffmpegWhisper,
      [
        "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "2",
        "-af", filtroWhisper(dir, "chequeo.srt"), "-f", "null", "-",
      ],
      { cwd: dir, timeoutMs: 3 * 60 * 1000 }
    );
    console.log("  modelo: ok");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// `npm run ingesta:chequeo`: corre solo los chequeos, sin variables de entorno.
// El de whisper, solo si está WHISPER_MODELO.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    await chequeoRotacion().catch((e: Error) => {
      throw new Error(`Chequeo de rotación FALLÓ: ${e.message}`);
    });
    if (!process.env.WHISPER_MODELO) {
      console.log("Chequeo de whisper salteado: falta WHISPER_MODELO.");
      return;
    }
    await chequeoWhisper().catch((e: Error) => {
      throw new Error(`Chequeo de whisper FALLÓ: ${e.message}`);
    });
  })().catch((e: Error) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
