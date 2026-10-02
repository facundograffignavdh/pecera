import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config.ts";
import type { Cuenta, EmailsBorrados, Entrada, Perfil, Regla } from "./formulario.ts";
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
  estado: "ok" | "error" | "borrado";
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

export type Claves = { video: string; poster: string };

/**
 * Crea (o actualiza, si es un reintento) el pitch publicado en el perfil dado.
 * Las claves que reemplaza las anota `procesar()` para borrarlas más tarde.
 * Si el video cambió, sus subtítulos ya no sirven: se borran y se reinician los
 * intentos. Con el mismo video se conservan, aunque estén corregidos a mano.
 */
export async function guardarPitch(
  perfilId: string,
  entrada: Entrada,
  claves: Claves,
  videoNuevo: boolean
): Promise<void> {
  const { error: errorPitch } = await db()
    .from("pitches")
    .upsert(
      {
        perfil_id: perfilId,
        origen_id: entrada.origenId,
        video_url: claves.video,
        poster_url: claves.poster,
        orden: entrada.orden,
        descripcion: entrada.descripcion,
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
}

/** Pasa un pitch ya publicado a otro perfil (input `asignar`). Devuelve si existía. */
export async function moverPitch(origenId: string, perfilId: string): Promise<boolean> {
  const { data, error } = await db()
    .from("pitches")
    .update({ perfil_id: perfilId })
    .eq("origen_id", origenId)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) fallo("moverPitch", error);
  return data.length > 0;
}

/** Claves de R2 que usa hoy el pitch (video y poster). Las rutas `/...` del seed quedan afuera. */
export async function clavesActuales(origenId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("pitches")
    .select("video_url, poster_url")
    .eq("origen_id", origenId)
    .maybeSingle()
    .overrideTypes<{ video_url: string | null; poster_url: string | null } | null, { merge: false }>();
  if (error) fallo("clavesPitch", error);
  return [data?.video_url, data?.poster_url].filter(
    (c): c is string => !!c && !c.startsWith("/")
  );
}

export type EstadoEnvio = "recibido" | "en_espera" | "ok" | "error" | "rechazado" | "borrado";

export type Envio = {
  origen_id: string;
  estado: EstadoEnvio;
  regla: Regla | null;
  perfil_id: string | null;
};

/** Todos los envíos registrados, sin los emails (no hacen falta: salen de la hoja). */
export async function leerEnvios(): Promise<Map<string, Envio>> {
  const todos = new Map<string, Envio>();
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await db()
      .from("envios")
      .select("origen_id, estado, regla, perfil_id")
      .order("origen_id")
      .range(desde, desde + pagina - 1)
      .overrideTypes<Envio[], { merge: false }>();
    if (error) fallo("leerEnvios", error);
    for (const fila of data) todos.set(fila.origen_id, fila);
    if (data.length < pagina) return todos;
  }
}

/** Registra el envío. Solo escribe si cambió algo respecto de `previo`. */
export async function guardarEnvio(
  entrada: Entrada,
  nuevo: Omit<Envio, "origen_id">,
  previo: Envio | undefined
): Promise<void> {
  if (
    previo &&
    previo.estado === nuevo.estado &&
    previo.regla === nuevo.regla &&
    previo.perfil_id === nuevo.perfil_id
  ) {
    return;
  }
  const { error } = await db()
    .from("envios")
    .upsert(
      {
        origen_id: entrada.origenId,
        email_verificado: entrada.emailVerificado,
        email_escrito: entrada.emailEscrito,
        fecha: entrada.fecha,
        ...nuevo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "origen_id" }
    );
  if (error) fallo("guardarEnvio", error);
}

/** Emails de una tabla privada de una sola columna (bloqueados o equipo). */
export async function leerEmails(tabla: "emails_bloqueados" | "equipo_ingesta"): Promise<Set<string>> {
  const { data, error } = await db()
    .from(tabla)
    .select("email")
    .overrideTypes<{ email: string }[], { merge: false }>();
  if (error) fallo(`leer ${tabla}`, error);
  return new Set(data.map((f) => f.email));
}

/** Cuáles de estos emails son cuentas y su perfil, si tienen. Una sola consulta. */
export async function leerCuentas(emails: string[]): Promise<Map<string, Cuenta>> {
  const cuentas = new Map<string, Cuenta>();
  if (emails.length === 0) return cuentas;
  const { data, error } = await db().rpc("ingesta_cuentas", { p_emails: emails });
  if (error) fallo("ingesta_cuentas", error);
  const filas = (data ?? []) as { email: string; perfil_id: string | null; slug: string | null }[];
  for (const f of filas) cuentas.set(f.email, { perfilId: f.perfil_id, slug: f.slug });
  return cuentas;
}

export async function perfilPorSlug(slug: string): Promise<Perfil | null> {
  const { data, error } = await db()
    .from("perfiles")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Perfil | null, { merge: false }>();
  if (error) fallo("perfilPorSlug", error);
  return data;
}

export async function perfilPorId(id: string): Promise<Perfil | null> {
  const { data, error } = await db()
    .from("perfiles")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Perfil | null, { merge: false }>();
  if (error) fallo("perfilPorId", error);
  return data;
}

export type Borrados = { origenes: Set<string>; emails: EmailsBorrados };

/** Sin la migración borrar_cuenta (tabla inexistente) no hay nada borrado. */
const sinTabla = (error: { code?: string }) => error.code === "PGRST205" || error.code === "42P01";

/**
 * Lo que dejaron las cuentas eliminadas: los videos (ID de Drive) y el hash de cada
 * email con su fecha. La ingesta nunca vuelve a procesar nada de eso.
 */
export async function leerBorrados(): Promise<Borrados | null> {
  const origenes = new Set<string>();
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await db()
      .from("origenes_borrados")
      .select("origen_id")
      .order("origen_id")
      .range(desde, desde + pagina - 1)
      .overrideTypes<{ origen_id: string }[], { merge: false }>();
    if (error) {
      if (sinTabla(error)) return null;
      fallo("leerOrigenesBorrados", error);
    }
    for (const f of data) origenes.add(f.origen_id);
    if (data.length < pagina) break;
  }
  const emails: EmailsBorrados = new Map();
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await db()
      .from("emails_borrados")
      .select("email_hash, borrado_at")
      .order("email_hash")
      .range(desde, desde + pagina - 1)
      .overrideTypes<{ email_hash: string; borrado_at: string }[], { merge: false }>();
    if (error) {
      if (sinTabla(error)) return null;
      fallo("leerEmailsBorrados", error);
    }
    for (const f of data) emails.set(f.email_hash, Date.parse(f.borrado_at));
    if (data.length < pagina) return { origenes, emails };
  }
}

/**
 * Una respuesta de una cuenta eliminada que la base no había visto: queda anotada
 * (para no volver a mirarla y para que el equipo borre el original en Drive) y sus
 * filas de ingestas y envíos en 'borrado', sin emails. Los triggers de la base
 * fuerzan lo mismo aunque algo se escriba distinto.
 */
export async function marcarBorrado(entrada: Entrada): Promise<void> {
  const { error } = await db()
    .from("origenes_borrados")
    .upsert({ origen_id: entrada.origenId }, { onConflict: "origen_id", ignoreDuplicates: true });
  if (error) fallo("marcarBorrado", error);
  const { error: errorIngesta } = await db()
    .from("ingestas")
    .upsert(
      { origen_id: entrada.origenId, estado: "borrado", error: null, intentos: 1000, bytes: 0 },
      { onConflict: "origen_id" }
    );
  if (errorIngesta) fallo("marcarBorrado (ingestas)", errorIngesta);
  const { error: errorEnvio } = await db()
    .from("envios")
    .upsert(
      {
        origen_id: entrada.origenId,
        email_verificado: "",
        email_escrito: "",
        fecha: entrada.fecha,
        estado: "borrado",
        regla: null,
        perfil_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "origen_id" }
    );
  if (errorEnvio) fallo("marcarBorrado (envios)", errorEnvio);
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
