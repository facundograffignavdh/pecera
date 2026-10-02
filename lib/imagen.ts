/**
 * Prepara una foto o un logo en el celular antes de subirlo: lado mayor hasta 1024 px,
 * con su proporción y sin recortar (Avatar muestra con object-cover y LogoEntidad con
 * object-contain). Pasar por canvas borra el EXIF (GPS incluido); la orientación se
 * aplica antes. Solo navegador.
 *
 * - "foto": JPG sobre Marfil (un PNG transparente no queda negro).
 * - "logo": PNG si tiene transparencia, para que se vea sin fondo; si no, JPG.
 */

import { FALLA_IMAGEN, MAX_BYTES_IMAGEN } from "@/lib/limites-imagen";

export { MAX_BYTES_IMAGEN };

export type UsoImagen = "foto" | "logo";
export type MotivoImagen = "formato" | "pesada";

export const MENSAJES_IMAGEN: Record<MotivoImagen, string> = {
  formato: FALLA_IMAGEN.formato,
  pesada: "La imagen es muy pesada. Probá con otra más chica.",
};

export class ErrorImagen extends Error {
  constructor(readonly motivo: MotivoImagen) {
    super(MENSAJES_IMAGEN[motivo]);
    this.name = "ErrorImagen";
  }
}

/** Texto para la persona cuando prepararImagen falla. */
export function mensajeImagen(e: unknown): string {
  return MENSAJES_IMAGEN[e instanceof ErrorImagen ? e.motivo : "formato"];
}

/** Texto cuando la action tira (no llegó una respuesta): por tamaño o por conexión. */
export function mensajeEnvioImagen(blob: Blob): string {
  return blob.size > MAX_BYTES_IMAGEN ? MENSAJES_IMAGEN.pesada : "No llegó al servidor. Revisá tu conexión.";
}

/** Nombre para el FormData con la extensión real. */
export function nombreImagen(blob: Blob, base: string): string {
  return `${base}.${blob.type === "image/png" ? "png" : "jpg"}`;
}

const LADOS = [1024, 768, 512];
const CALIDADES = [0.85, 0.75, 0.6];
const LADO_ALFA = 256;
const MARFIL = "#F5F4EC";

type Fuente = { dibujable: CanvasImageSource; ancho: number; alto: number; cerrar: () => void };

/**
 * Decodifica con createImageBitmap y, si el navegador no lo soporta con la opción de
 * orientación (Safari viejo) o falla, con un <img> (que ya respeta la orientación EXIF).
 */
async function decodificar(archivo: Blob): Promise<Fuente> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
      return { dibujable: bitmap, ancho: bitmap.width, alto: bitmap.height, cerrar: () => bitmap.close() };
    } catch {
      // Sigue con <img>.
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      dibujable: img,
      ancho: img.naturalWidth,
      alto: img.naturalHeight,
      cerrar: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Canvas con la imagen entera, lado mayor ≤ `lado` (nunca agranda). */
function dibujar(fuente: Fuente, lado: number, fondo: string | null): HTMLCanvasElement {
  const escala = Math.min(1, lado / Math.max(fuente.ancho, fuente.alto));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(fuente.ancho * escala));
  canvas.height = Math.max(1, Math.round(fuente.alto * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  if (fondo) {
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente.dibujable, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Hay algún píxel no del todo opaco (en una copia chica, para no leer millones). */
function tieneAlfa(fuente: Fuente): boolean {
  const canvas = dibujar(fuente, LADO_ALFA, null);
  const datos = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < datos.length; i += 4) if (datos[i] < 255) return true;
  return false;
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, tipo, calidad));
}

/**
 * Devuelve un JPG o un PNG de ≤ MAX_BYTES_IMAGEN. Tira ErrorImagen: "formato" si el
 * navegador no la puede leer (HEIC en Chrome o Android), "pesada" si no entra ni a 512 px.
 */
export async function prepararImagen(archivo: Blob, uso: UsoImagen): Promise<Blob> {
  let fuente: Fuente;
  try {
    fuente = await decodificar(archivo);
  } catch {
    throw new ErrorImagen("formato");
  }
  try {
    if (!fuente.ancho || !fuente.alto) throw new ErrorImagen("formato");
    const png = uso === "logo" && archivo.type !== "image/jpeg" && tieneAlfa(fuente);

    let anterior = 0;
    for (const lado of LADOS) {
      // Una imagen chica da el mismo canvas en todos los lados: no repetir.
      const efectivo = Math.min(lado, Math.max(fuente.ancho, fuente.alto));
      if (efectivo === anterior) continue;
      anterior = efectivo;

      const canvas = dibujar(fuente, lado, png ? null : MARFIL);
      if (png) {
        const blob = await aBlob(canvas, "image/png");
        if (blob && blob.size <= MAX_BYTES_IMAGEN) return blob;
        continue;
      }
      for (const calidad of CALIDADES) {
        const blob = await aBlob(canvas, "image/jpeg", calidad);
        if (blob && blob.size <= MAX_BYTES_IMAGEN) return blob;
      }
    }
    throw new ErrorImagen("pesada");
  } finally {
    fuente.cerrar();
  }
}
