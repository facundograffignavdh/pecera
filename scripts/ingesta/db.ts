import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config.ts";
import type { Entrada } from "./formulario.ts";

/**
 * Supabase con la service key (se saltea la RLS). Solo corre en el workflow.
 * Los errores van con código y mensaje, nunca con los datos de la fila.
 */

let cliente: SupabaseClient | null = null;

function db(): SupabaseClient {
  cliente ??= createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

function fallo(donde: string, error: { code?: string; message: string }): never {
  throw new Error(`Supabase (${donde}): ${error.code ?? "?"} ${error.message}`);
}

export type Ingesta = { origen_id: string; estado: "ok" | "error"; intentos: number; bytes: number };

/** Todas las ingestas registradas, de a páginas (la tabla es chica). */
export async function leerIngestas(): Promise<Map<string, Ingesta>> {
  const todas = new Map<string, Ingesta>();
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await db()
      .from("ingestas")
      .select("origen_id, estado, intentos, bytes")
      .order("origen_id")
      .range(desde, desde + pagina - 1)
      .overrideTypes<Ingesta[], { merge: false }>();
    if (error) fallo("leerIngestas", error);
    // bigint llega como número (o texto si es enorme): se normaliza.
    for (const fila of data) todas.set(fila.origen_id, { ...fila, bytes: Number(fila.bytes) });
    if (data.length < pagina) return todas;
  }
}

export async function registrar(
  origenId: string,
  resultado: { estado: "ok"; bytes: number } | { estado: "error"; error: string; bytes: number },
  intentosPrevios: number
): Promise<void> {
  const { error } = await db()
    .from("ingestas")
    .upsert(
      {
        origen_id: origenId,
        estado: resultado.estado,
        error: resultado.estado === "error" ? resultado.error.slice(0, 500) : null,
        intentos: intentosPrevios + 1,
        bytes: resultado.bytes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "origen_id" }
    );
  if (error) fallo("registrar", error);
}

/** base, base-2, base-3… el primero que no esté usado. */
async function slugLibre(base: string): Promise<string> {
  const { data, error } = await db()
    .from("perfiles")
    .select("slug")
    .like("slug", `${base}%`)
    .overrideTypes<{ slug: string }[], { merge: false }>();
  if (error) fallo("slugLibre", error);

  const usados = new Set(data.map((p) => p.slug));
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type Claves = { video: string; poster: string; avatar: string | null };

/**
 * Crea (o actualiza, si es un reintento) el perfil y su pitch, publicados.
 * El perfil se busca por `origen_id` para no duplicarlo; el slug se conserva.
 * Devuelve el slug.
 */
export async function guardarPerfilYPitch(entrada: Entrada, claves: Claves): Promise<string> {
  const datos = { ...entrada.perfil, avatar_url: claves.avatar, publicado: true };

  const { data: existente, error: errorBuscar } = await db()
    .from("perfiles")
    .select("id, slug")
    .eq("origen_id", entrada.origenId)
    .maybeSingle()
    .overrideTypes<{ id: string; slug: string } | null, { merge: false }>();
  if (errorBuscar) fallo("buscarPerfil", errorBuscar);

  let perfil = existente;
  if (perfil) {
    const { error } = await db().from("perfiles").update(datos).eq("id", perfil.id);
    if (error) fallo("actualizarPerfil", error);
  } else {
    const slug = await slugLibre(entrada.slugBase);
    const { data, error } = await db()
      .from("perfiles")
      .insert({ ...datos, slug, origen_id: entrada.origenId })
      .select("id, slug")
      .single()
      .overrideTypes<{ id: string; slug: string }, { merge: false }>();
    if (error) fallo("crearPerfil", error);
    perfil = data;
  }

  const { error: errorPitch } = await db()
    .from("pitches")
    .upsert(
      {
        perfil_id: perfil.id,
        origen_id: entrada.origenId,
        video_url: claves.video,
        poster_url: claves.poster,
        orden: entrada.orden,
        publicado: true,
      },
      { onConflict: "origen_id" }
    );
  if (errorPitch) fallo("guardarPitch", errorPitch);

  return perfil.slug;
}
