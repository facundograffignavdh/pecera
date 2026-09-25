import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config.ts";
import type { Entrada } from "./formulario.ts";
import type { Bloque } from "./subtitulos.ts";

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

export type Ingesta = {
  origen_id: string;
  estado: "ok" | "error";
  intentos: number;
  bytes: number;
  subtitulos_intentos: number;
};

/** Todas las ingestas registradas, de a páginas (la tabla es chica). */
export async function leerIngestas(): Promise<Map<string, Ingesta>> {
  const todas = new Map<string, Ingesta>();
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await db()
      .from("ingestas")
      .select("origen_id, estado, intentos, bytes, subtitulos_intentos")
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
 * Las claves que reemplaza las anota `procesar()` para borrarlas más tarde.
 * Si el video cambió, sus subtítulos ya no sirven: se borran y se reinician los
 * intentos. Con el mismo video se conservan, aunque estén corregidos a mano.
 * Devuelve el slug.
 */
export async function guardarPerfilYPitch(
  entrada: Entrada,
  claves: Claves,
  videoNuevo: boolean
): Promise<string> {
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
        ...(videoNuevo ? { subtitulos: null } : {}),
      },
      { onConflict: "origen_id" }
    );
  if (errorPitch) fallo("guardarPitch", errorPitch);

  if (videoNuevo) {
    const { error } = await db()
      .from("ingestas")
      .update({ subtitulos_intentos: 0, subtitulos_error: null })
      .eq("origen_id", entrada.origenId);
    if (error) fallo("reiniciarSubtitulos", error);
  }

  return perfil.slug;
}

/**
 * Claves de R2 que usa hoy la fila (video, poster y avatar). Las rutas `/...`
 * del seed no son de R2 y quedan afuera.
 */
export async function clavesActuales(origenId: string): Promise<string[]> {
  const [pitch, perfil] = await Promise.all([
    db()
      .from("pitches")
      .select("video_url, poster_url")
      .eq("origen_id", origenId)
      .maybeSingle()
      .overrideTypes<{ video_url: string | null; poster_url: string | null } | null, { merge: false }>(),
    db()
      .from("perfiles")
      .select("avatar_url")
      .eq("origen_id", origenId)
      .maybeSingle()
      .overrideTypes<{ avatar_url: string | null } | null, { merge: false }>(),
  ]);
  if (pitch.error) fallo("clavesPitch", pitch.error);
  if (perfil.error) fallo("clavesPerfil", perfil.error);
  return [pitch.data?.video_url, pitch.data?.poster_url, perfil.data?.avatar_url].filter(
    (c): c is string => !!c && !c.startsWith("/")
  );
}

export type ParaBorrar = { clave: string; bytes: number; borrar_despues: string };

/** Claves viejas anotadas para borrar de R2 (vencidas o no). */
export async function leerParaBorrar(): Promise<ParaBorrar[]> {
  const { data, error } = await db()
    .from("r2_borrar")
    .select("clave, bytes, borrar_despues")
    .order("borrar_despues")
    .overrideTypes<ParaBorrar[], { merge: false }>();
  if (error) fallo("leerParaBorrar", error);
  return data.map((f) => ({ ...f, bytes: Number(f.bytes) }));
}

/** Anota claves viejas para borrar después de `cuando`. */
export async function anotarParaBorrar(claves: { clave: string; bytes: number }[], cuando: Date) {
  if (claves.length === 0) return;
  const { error } = await db()
    .from("r2_borrar")
    .upsert(
      claves.map((c) => ({ ...c, borrar_despues: cuando.toISOString() })),
      { onConflict: "clave" }
    );
  if (error) fallo("anotarParaBorrar", error);
}

/** Saca claves de la lista: ya se borraron de R2 o volvieron a estar en uso. */
export async function quitarDeBorrar(claves: string[]) {
  if (claves.length === 0) return;
  const { error } = await db().from("r2_borrar").delete().in("clave", claves);
  if (error) fallo("quitarDeBorrar", error);
}

export type ParaSubtitular = { origen_id: string; video_url: string };

/**
 * Pitches publicados de la ingesta que todavía no tienen subtítulos, del más
 * viejo al más nuevo. Los del seed (sin `origen_id`) quedan afuera. Los intentos
 * se filtran en `index.ts` con las ingestas ya leídas.
 */
export async function pendientesDeSubtitulos(): Promise<ParaSubtitular[]> {
  const { data, error } = await db()
    .from("pitches")
    .select("origen_id, video_url")
    .eq("publicado", true)
    .not("origen_id", "is", null)
    .is("subtitulos", null)
    .order("created_at")
    .overrideTypes<ParaSubtitular[], { merge: false }>();
  if (error) fallo("pendientesDeSubtitulos", error);
  return data;
}

/** El pitch publicado de `origenId`, para rehacer sus subtítulos a pedido. */
export async function pitchParaSubtitular(origenId: string): Promise<ParaSubtitular | null> {
  const { data, error } = await db()
    .from("pitches")
    .select("origen_id, video_url")
    .eq("origen_id", origenId)
    .eq("publicado", true)
    .maybeSingle()
    .overrideTypes<ParaSubtitular | null, { merge: false }>();
  if (error) fallo("pitchParaSubtitular", error);
  return data;
}

export async function guardarSubtitulos(origenId: string, bloques: Bloque[]): Promise<void> {
  const { error } = await db().from("pitches").update({ subtitulos: bloques }).eq("origen_id", origenId);
  if (error) fallo("guardarSubtitulos", error);
  const { error: errorIngesta } = await db()
    .from("ingestas")
    .update({ subtitulos_error: null })
    .eq("origen_id", origenId);
  if (errorIngesta) fallo("limpiarErrorSubtitulos", errorIngesta);
}

/** El detalle queda acá (tabla privada), nunca en el log. */
export async function registrarErrorSubtitulos(
  origenId: string,
  mensaje: string,
  intentosPrevios: number
): Promise<void> {
  const { error } = await db()
    .from("ingestas")
    .update({ subtitulos_intentos: intentosPrevios + 1, subtitulos_error: mensaje.slice(0, 500) })
    .eq("origen_id", origenId);
  if (error) fallo("registrarErrorSubtitulos", error);
}
