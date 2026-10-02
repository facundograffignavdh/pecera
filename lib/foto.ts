import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLA_IMAGEN, MAX_BYTES_IMAGEN, type TipoImagen, firmaImagen } from "@/lib/limites-imagen";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";

/** Tamaño y tipo para los logs: nada de datos personales. */
export function detalleImagen(archivo: Blob): string {
  return `${archivo.size} B, ${archivo.type || "sin tipo"}`;
}

/**
 * Lee la imagen y la valida por separado: tamaño (falla "pesada") y firma (falla
 * "formato", entre los tipos `aceptados`). Solo servidor.
 */
export async function leerImagen(
  archivo: Blob,
  aceptados: TipoImagen[],
  donde: string
): Promise<{ cuerpo: ArrayBuffer; tipo: TipoImagen } | { falla: string }> {
  if (archivo.size > MAX_BYTES_IMAGEN) {
    console.error(`${donde}: muy pesada (${detalleImagen(archivo)})`);
    return { falla: FALLA_IMAGEN.pesada };
  }
  const cuerpo = await archivo.arrayBuffer();
  const tipo = cuerpo.byteLength ? firmaImagen(cuerpo) : null;
  if (!tipo || !aceptados.includes(tipo)) {
    console.error(`${donde}: formato ${tipo ?? "desconocido"} (${detalleImagen(archivo)})`);
    return { falla: FALLA_IMAGEN.formato };
  }
  return { cuerpo, tipo };
}

/**
 * Foto de "Mi perfil" (solo servidor). Sube a R2 con clave por hash
 * (`<userId>-<hash8>.jpg`) y actualiza avatar_url con la sesión del usuario. La
 * foto anterior la manda a r2_borrar el trigger de la base, que solo acepta .jpg. Nunca
 * tira: devuelve el mensaje para la persona, o null si salió bien.
 */
export async function guardarFoto(
  supabase: SupabaseClient,
  userId: string,
  perfil: { id: string; avatar_url: string | null },
  foto: Blob
): Promise<string | null> {
  try {
    const leida = await leerImagen(foto, ["jpg"], "Foto");
    if ("falla" in leida) return leida.falla;
    const { cuerpo } = leida;

    const clave = `${userId}-${await hash8(cuerpo)}.jpg`;
    if (clave === perfil.avatar_url) return null;

    try {
      await subirR2(clave, cuerpo, "image/jpeg");
    } catch (e) {
      console.error(`R2 (foto): ${(e as Error).message} (${detalleImagen(foto)})`);
      return FALLA_IMAGEN.nuestra;
    }

    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_url: clave })
      .eq("id", perfil.id);
    if (error) {
      console.error(`Supabase (foto): ${error.code} ${error.message} (${clave})`);
      // La clave nueva no quedó en ninguna fila: se borra ya.
      await borrarR2(clave).catch((e) => console.error(`R2 (foto): ${(e as Error).message}`));
      return FALLA_IMAGEN.nuestra;
    }
    return null;
  } catch (e) {
    console.error(`Foto: ${(e as Error).message} (${detalleImagen(foto)})`);
    return FALLA_IMAGEN.nuestra;
  }
}

/**
 * Logo de la empresa por la ruta vieja (solo servidor, sin la tabla empresa_logos):
 * `empresa-<empresaId>-<hash8>.jpg` en R2 y la función `cambiar_logo_empresa`, que
 * valida la clave (solo .jpg) y manda el logo viejo a r2_borrar. Nunca tira: devuelve
 * el mensaje, o null si salió bien.
 */
export async function guardarLogo(
  supabase: SupabaseClient,
  empresa: { id: string; logo_url: string | null },
  logo: Blob
): Promise<string | null> {
  try {
    const leida = await leerImagen(logo, ["jpg"], "Logo");
    if ("falla" in leida) return leida.falla;
    const { cuerpo } = leida;

    const clave = `empresa-${empresa.id}-${await hash8(cuerpo)}.jpg`;
    if (clave === empresa.logo_url) return null;

    try {
      await subirR2(clave, cuerpo, "image/jpeg");
    } catch (e) {
      console.error(`R2 (logo): ${(e as Error).message} (${detalleImagen(logo)})`);
      return FALLA_IMAGEN.nuestra;
    }

    const { error } = await supabase.rpc("cambiar_logo_empresa", { p_logo: clave });
    if (error) {
      console.error(`Supabase (logo): ${error.code} ${error.message} (${clave})`);
      await borrarR2(clave).catch((e) => console.error(`R2 (logo): ${(e as Error).message}`));
      return FALLA_IMAGEN.nuestra;
    }
    return null;
  } catch (e) {
    console.error(`Logo: ${(e as Error).message} (${detalleImagen(logo)})`);
    return FALLA_IMAGEN.nuestra;
  }
}
