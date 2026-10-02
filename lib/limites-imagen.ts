/**
 * Límite y textos de la foto de perfil y el logo, compartidos por el celular
 * (lib/imagen.ts) y el servidor (lib/foto.ts, app/cuenta/logo.ts). Sin código de
 * navegador ni de servidor.
 */

/** Tope de lo que manda el celular. La action acepta 2 MB (next.config.ts) por el resto del form. */
export const MAX_BYTES_IMAGEN = 1024 * 1024;

/** Lo que dice el servidor cuando una imagen no se guarda. */
export const FALLA_IMAGEN = {
  pesada: "La imagen es muy pesada.",
  formato: "Este formato no se puede usar, probá con JPG o PNG.",
  nuestra: "No pudimos guardar la imagen por un problema nuestro, no de tu foto. Ya quedó registrado.",
} as const;

export type TipoImagen = "jpg" | "png";

/** Formato por la firma del archivo (JPG FF D8 FF, PNG 89 50 4E 47), no por el nombre. */
export function firmaImagen(cuerpo: ArrayBuffer): TipoImagen | null {
  const b = new Uint8Array(cuerpo.slice(0, 4));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  return null;
}
