import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** El celular ya la achicó a 512 px en JPG: sobra margen. */
const MAX_BYTES = 512 * 1024;

function error(status: number, mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status });
}

/**
 * Foto de "Mi perfil". Verifica la sesión, sube a R2 con clave por hash
 * (`<userId>-<hash8>.jpg`) y actualiza avatar_url con la sesión del usuario. La
 * foto anterior la manda a r2_borrar el trigger de la base.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return error(401, "Se cerró tu sesión. Volvé a entrar.");

  const { data: perfil, error: errorLectura } = await supabase
    .from("perfiles")
    .select("id, slug, avatar_url")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (errorLectura) {
    console.error(`Supabase (foto): ${errorLectura.code} ${errorLectura.message}`);
    return error(500, "No pudimos guardar la foto.");
  }
  if (!perfil) return error(409, "Primero creá tu perfil.");

  const tipo = request.headers.get("content-type");
  const largo = Number(request.headers.get("content-length") ?? 0);
  if (tipo !== "image/jpeg" || largo > MAX_BYTES) return error(415, "La foto no es válida.");

  const cuerpo = await request.arrayBuffer();
  const inicio = new Uint8Array(cuerpo.slice(0, 3));
  if (
    cuerpo.byteLength === 0 ||
    cuerpo.byteLength > MAX_BYTES ||
    inicio[0] !== 0xff ||
    inicio[1] !== 0xd8 ||
    inicio[2] !== 0xff
  ) {
    return error(415, "La foto no es válida.");
  }

  const clave = `${user.id}-${await hash8(cuerpo)}.jpg`;
  if (clave === perfil.avatar_url) return NextResponse.json({ ok: true });

  try {
    await subirR2(clave, cuerpo, "image/jpeg");
  } catch (e) {
    console.error(`R2 (foto): ${(e as Error).message}`);
    return error(502, "No pudimos subir la foto.");
  }

  const { error: errorUpdate } = await supabase
    .from("perfiles")
    .update({ avatar_url: clave })
    .eq("id", perfil.id);
  if (errorUpdate) {
    console.error(`Supabase (foto): ${errorUpdate.code} ${errorUpdate.message}`);
    // La clave nueva no quedó en ninguna fila: se borra ya.
    await borrarR2(clave).catch((e) => console.error(`R2 (foto): ${(e as Error).message}`));
    return error(500, "No pudimos guardar la foto.");
  }

  revalidatePath("/");
  revalidatePath(`/p/${perfil.slug}`);
  revalidatePath("/cuenta");
  return NextResponse.json({ ok: true });
}
