/**
 * Achica una imagen en el celular antes de subirla: lado mayor `ladoMax`, en JPG,
 * bajando la calidad hasta entrar en `maxBytes`. Pasar por canvas borra el EXIF
 * (GPS incluido); la orientación se aplica antes. Solo cliente.
 */
export async function achicarImagen(archivo: File, ladoMax: number, maxBytes: number): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, ladoMax / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  for (const calidad of [0.85, 0.75, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("imagen muy pesada");
}

