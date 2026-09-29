import type { SupabaseClient } from "@supabase/supabase-js";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";

/** El celular ya la achicó a 512 px en JPG: sobra margen. */
export const MAX_BYTES_FOTO = 512 * 1024;

/**
 * Foto de "Mi perfil" (solo servidor). Sube a R2 con clave por hash
 * (`<userId>-<hash8>.jpg`) y actualiza avatar_url con la sesión del usuario. La
 * foto anterior la manda a r2_borrar el trigger de la base. Nunca tira: devuelve
 * el mensaje para la persona, o null si salió bien.
 */
export async function guardarFoto(
  supabase: SupabaseClient,
  userId: string,
  perfil: { id: string; avatar_url: string | null },
  foto: Blob
): Promise<string | null> {
  try {
    if (foto.type !== "image/jpeg" || foto.size === 0 || foto.size > MAX_BYTES_FOTO) {
      return "La foto no es válida.";
    }
    const cuerpo = await foto.arrayBuffer();
    const inicio = new Uint8Array(cuerpo.slice(0, 3));
    if (inicio[0] !== 0xff || inicio[1] !== 0xd8 || inicio[2] !== 0xff) {
      return "La foto no es válida.";
    }

    const clave = `${userId}-${await hash8(cuerpo)}.jpg`;
    if (clave === perfil.avatar_url) return null;

    try {
      await subirR2(clave, cuerpo, "image/jpeg");
    } catch (e) {
      console.error(`R2 (foto): ${(e as Error).message}`);
      return "No pudimos subir la foto.";
    }

    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_url: clave })
      .eq("id", perfil.id);
    if (error) {
      console.error(`Supabase (foto): ${error.code} ${error.message}`);
      // La clave nueva no quedó en ninguna fila: se borra ya.
      await borrarR2(clave).catch((e) => console.error(`R2 (foto): ${(e as Error).message}`));
      return "No pudimos guardar la foto.";
    }
    return null;
  } catch (e) {
    console.error(`Foto: ${(e as Error).message}`);
    return "No pudimos guardar la foto.";
  }
}
