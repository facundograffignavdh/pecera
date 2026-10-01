/**
 * Prepara una foto o un logo en el celular antes de subirlo: cuadrado de 512 px, en
 * JPG y sin EXIF (pasar por canvas borra el GPS). Solo navegador.
 *
 * - "cubrir" (foto de perfil): recorta al centro, como un avatar.
 * - "contener" (logo): entra entero, centrado, con margen. Un logo ancho no se corta.
 *
 * El fondo es Marfil: un PNG transparente pasado a JPG no queda negro.
 */

export type ModoImagen = "cubrir" | "contener";

const LADO = 512;
export const MAX_BYTES_IMAGEN = 512 * 1024;
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

export async function prepararImagen(archivo: Blob, modo: ModoImagen = "cubrir"): Promise<Blob> {
  const fuente = await decodificar(archivo);
  try {
    const { ancho, alto } = fuente;
    if (!ancho || !alto) throw new Error("imagen vacía");

    const canvas = document.createElement("canvas");
    const destino = modo === "cubrir" ? Math.min(LADO, ancho, alto) : LADO;
    canvas.width = destino;
    canvas.height = destino;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin canvas");
    ctx.fillStyle = MARFIL;
    ctx.fillRect(0, 0, destino, destino);
    ctx.imageSmoothingQuality = "high";

    if (modo === "cubrir") {
      const lado = Math.min(ancho, alto);
      ctx.drawImage(fuente.dibujable, (ancho - lado) / 2, (alto - lado) / 2, lado, lado, 0, 0, destino, destino);
    } else {
      // 10% de margen alrededor del logo.
      const util = destino * 0.8;
      const escala = Math.min(util / ancho, util / alto);
      const w = ancho * escala;
      const h = alto * escala;
      ctx.drawImage(fuente.dibujable, (destino - w) / 2, (destino - h) / 2, w, h);
    }

    for (const calidad of [0.88, 0.75, 0.6, 0.45]) {
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
      if (blob && blob.size <= MAX_BYTES_IMAGEN) return blob;
    }
    throw new Error("imagen muy pesada");
  } finally {
    fuente.cerrar();
  }
}
