import { cache } from "react";
import { urlMedia } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import type { ItemFeed, Perfil, Pitch } from "@/types/pecera";

/**
 * Única puerta a los datos. Los filtros por `publicado` repiten lo que ya hace
 * la RLS, para que quede explícito qué se muestra.
 *
 * Ante un error se lanza en vez de devolver vacío: si falla una revalidación,
 * Next sigue sirviendo la última página buena.
 */

const COLUMNAS_PERFIL =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado";
const COLUMNAS_PITCH = "id, perfil_id, video_url, poster_url, orden, publicado";
// El perfil no dibuja subtítulos: solo el feed los pide.
const COLUMNAS_PITCH_FEED = `${COLUMNAS_PITCH}, subtitulos`;

function fallo(donde: string, error: { message: string }): never {
  throw new Error(`Supabase (${donde}): ${error.message}`);
}

/** La base guarda claves de R2; los componentes reciben URLs listas. */
function conUrlsPitch(pitch: Pitch): Pitch {
  return {
    ...pitch,
    video_url: urlMedia(pitch.video_url),
    poster_url: pitch.poster_url && urlMedia(pitch.poster_url),
  };
}

function conUrlsPerfil(perfil: Perfil): Perfil {
  return { ...perfil, avatar_url: perfil.avatar_url && urlMedia(perfil.avatar_url) };
}

/** Pitches publicados con perfil publicado, ordenados por `orden`. */
export async function getFeed(): Promise<ItemFeed[]> {
  const { data, error } = await supabase
    .from("pitches")
    .select(`${COLUMNAS_PITCH_FEED}, perfil:perfiles!inner(${COLUMNAS_PERFIL})`)
    .eq("publicado", true)
    .eq("perfil.publicado", true)
    .order("orden")
    .order("id")
    .overrideTypes<Array<Pitch & { perfil: Perfil }>, { merge: false }>();

  if (error) fallo("getFeed", error);

  return data.map(({ perfil, ...pitch }) => ({
    pitch: conUrlsPitch(pitch),
    perfil: conUrlsPerfil(perfil),
  }));
}

/**
 * Perfil publicado con sus pitches publicados, o `null` si no existe.
 * Con `cache` para que `generateMetadata` y la página hagan una sola consulta.
 */
export const getPerfil = cache(
  async (slug: string): Promise<{ perfil: Perfil; pitches: Pitch[] } | null> => {
    const { data, error } = await supabase
      .from("perfiles")
      .select(`${COLUMNAS_PERFIL}, pitches(${COLUMNAS_PITCH})`)
      .eq("slug", slug)
      .eq("publicado", true)
      .eq("pitches.publicado", true)
      .order("orden", { referencedTable: "pitches" })
      .maybeSingle()
      .overrideTypes<(Perfil & { pitches: Pitch[] }) | null, { merge: false }>();

    if (error) fallo("getPerfil", error);
    if (!data) return null;

    const { pitches, ...perfil } = data;
    return { perfil: conUrlsPerfil(perfil), pitches: pitches.map(conUrlsPitch) };
  }
);

/** Slugs publicados, para `generateStaticParams`. */
export async function getSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("slug")
    .eq("publicado", true)
    .overrideTypes<Array<{ slug: string }>, { merge: false }>();

  if (error) fallo("getSlugs", error);

  return data.map((p) => p.slug);
}
