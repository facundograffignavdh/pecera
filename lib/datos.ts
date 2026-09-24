import { cache } from "react";
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

function fallo(donde: string, error: { message: string }): never {
  throw new Error(`Supabase (${donde}): ${error.message}`);
}

/** Pitches publicados con perfil publicado, ordenados por `orden`. */
export async function getFeed(): Promise<ItemFeed[]> {
  const { data, error } = await supabase
    .from("pitches")
    .select(`${COLUMNAS_PITCH}, perfil:perfiles!inner(${COLUMNAS_PERFIL})`)
    .eq("publicado", true)
    .eq("perfil.publicado", true)
    .order("orden")
    .order("id")
    .overrideTypes<Array<Pitch & { perfil: Perfil }>, { merge: false }>();

  if (error) fallo("getFeed", error);

  return data.map(({ perfil, ...pitch }) => ({ pitch, perfil }));
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
    return { perfil, pitches };
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
