// Nombre literal: Next solo inyecta las NEXT_PUBLIC_* si aparecen así.
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

/**
 * Videos, posters y avatares se guardan como clave de R2 ("<id>.mp4"). Las rutas
 * del seed ("/videos/...") y las URLs completas se usan tal cual.
 */
export function urlMedia(valor: string): string {
  if (valor.startsWith("/") || valor.startsWith("http")) return valor;
  if (!mediaUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_MEDIA_URL: cargala en .env.local (local) o en las variables de entorno de Vercel."
    );
  }
  return `${mediaUrl}/${valor}`;
}
