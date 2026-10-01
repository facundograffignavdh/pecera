import { cache } from "react";
import type { Avance, Hito, HitoActual } from "@/lib/build";
import { urlMedia } from "@/lib/media";
import type { Producto } from "@/lib/producto";
import { supabase } from "@/lib/supabase";
import type { DatoEmpresa, Empresa, ItemFeed, Metricas, Perfil, Pitch } from "@/types/pecera";

/**
 * Única puerta a los datos públicos. Los filtros por `publicado` (equipo) y
 * `oculto` (la persona) repiten lo que ya hace la RLS, para que quede explícito
 * qué se muestra. /cuenta usa su propio cliente con sesión.
 *
 * Ante un error se lanza en vez de devolver vacío: si falla una revalidación,
 * Next sigue sirviendo la última página buena.
 *
 * Migración feria_lista: las consultas piden primero las columnas nuevas y la
 * empresa. Si la base todavía no la corrió (columna, tabla, relación o función
 * inexistente), repiten con lo de siempre: el feed nunca se cae por el orden del
 * deploy.
 */

const COLUMNAS_PERFIL_BASE =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado";
const COLUMNAS_PERFIL_NUEVAS =
  "etapa, ronda, industrias, cargo, especialidades, ticket, rondas_interes, empresa_id";
const EMPRESA_EMBEBIDA = "empresa:empresas(slug, nombre)";
const COLUMNAS_PERFIL = `${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, ${EMPRESA_EMBEBIDA}`;

const COLUMNAS_PITCH = "id, perfil_id, video_url, poster_url, orden, publicado, descripcion";
// El perfil no dibuja subtítulos: solo el feed los pide.
const COLUMNAS_PITCH_FEED = `${COLUMNAS_PITCH}, subtitulos`;

const COLUMNAS_EMPRESA =
  "id, slug, nombre, descripcion, web, linkedin, instagram, industrias, etapa, ronda";

/**
 * Códigos de "eso todavía no existe en la base": columna (42703), tabla (42P01),
 * relación (PGRST200), columna o tabla en el caché de PostgREST (PGRST204/205) y
 * función (PGRST202).
 */
const SIN_MIGRACION = new Set(["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

export function faltaMigracion(error: { code?: string } | null): boolean {
  return !!error?.code && SIN_MIGRACION.has(error.code);
}

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
  const consulta = (columnas: string) =>
    supabase
      .from("pitches")
      .select(`${COLUMNAS_PITCH_FEED}, perfil:perfiles!inner(${columnas})`)
      .eq("publicado", true)
      .eq("perfil.publicado", true)
      .eq("perfil.oculto", false)
      .order("orden")
      .order("id")
      .overrideTypes<Array<Pitch & { perfil: Perfil }>, { merge: false }>();

  const [primera, conteos, construyendo] = await Promise.all([
    consulta(COLUMNAS_PERFIL),
    getConteoPiques(),
    getHitosActuales(),
  ]);
  const feed = faltaMigracion(primera.error) ? await consulta(COLUMNAS_PERFIL_BASE) : primera;
  if (feed.error) fallo("getFeed", feed.error);

  return feed.data.map(({ perfil, ...pitch }) => ({
    pitch: conUrlsPitch(pitch),
    perfil: conUrlsPerfil(perfil),
    piques: conteos.get(pitch.id) ?? 0,
    construyendo: (perfil.empresa_id && construyendo.get(perfil.empresa_id)) || null,
  }));
}

/**
 * Hito en curso de cada empresa visible (Build in Public), para el reel. Como los
 * piques, no lanza: sin la migración o con un error, el feed sale sin el chip.
 */
async function getHitosActuales(): Promise<Map<string, HitoActual>> {
  const { data, error } = await supabase
    .from("empresa_hitos")
    .select("empresa_id, titulo, progreso, etapa")
    .eq("estado", "en_curso")
    .overrideTypes<Array<HitoActual & { empresa_id: string }>, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getHitosActuales): ${error.message}`);
    return new Map();
  }
  return new Map(data.map(({ empresa_id, ...hito }) => [empresa_id, hito]));
}

/**
 * Piques por pitch (solo los que tienen alguno). anon nunca lee las filas.
 * A diferencia del resto no lanza: un contador no puede tumbar el feed. Sale en
 * 0 y el cliente vuelve a pedirlo al montar.
 */
async function getConteoPiques(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("conteo_piques");
  if (error) {
    console.error(`Supabase (getConteoPiques): ${error.message}`);
    return new Map();
  }

  const filas = (data ?? []) as Array<{ pitch_id: string; total: number }>;
  return new Map(filas.map((fila) => [fila.pitch_id, fila.total]));
}

/**
 * Perfil publicado con sus pitches publicados, o `null` si no existe.
 * Con `cache` para que `generateMetadata` y la página hagan una sola consulta.
 */
export const getPerfil = cache(
  async (slug: string): Promise<{ perfil: Perfil; pitches: Pitch[] } | null> => {
    const consulta = (columnas: string) =>
      supabase
        .from("perfiles")
        .select(`${columnas}, pitches(${COLUMNAS_PITCH})`)
        .eq("slug", slug)
        .eq("publicado", true)
        .eq("oculto", false)
        .eq("pitches.publicado", true)
        .order("orden", { referencedTable: "pitches" })
        .maybeSingle()
        .overrideTypes<(Perfil & { pitches: Pitch[] }) | null, { merge: false }>();

    const primera = await consulta(COLUMNAS_PERFIL);
    const { data, error } = faltaMigracion(primera.error)
      ? await consulta(COLUMNAS_PERFIL_BASE)
      : primera;

    if (error) fallo("getPerfil", error);
    if (!data) return null;

    const { pitches, ...perfil } = data;
    return { perfil: conUrlsPerfil(perfil), pitches: pitches.map(conUrlsPitch) };
  }
);

/**
 * Vistas y piques por pitch de un perfil visible. Como los piques del feed, no
 * lanza: un contador no tumba el perfil (sin la migración, todo en 0) y el cliente
 * lo vuelve a pedir al montar.
 */
export async function getMetricasPerfil(slug: string): Promise<Metricas> {
  const { data, error } = await supabase.rpc("metricas_perfil", { p_slug: slug });
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getMetricasPerfil): ${error.message}`);
    return {};
  }

  const filas = (data ?? []) as Array<{ pitch_id: string; vistas: number; piques: number }>;
  return Object.fromEntries(filas.map((f) => [f.pitch_id, { vistas: f.vistas, piques: f.piques }]));
}

/** Slugs publicados, para `generateStaticParams`. */
export async function getSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("slug")
    .eq("publicado", true)
    .eq("oculto", false)
    .overrideTypes<Array<{ slug: string }>, { merge: false }>();

  if (error) fallo("getSlugs", error);

  return data.map((p) => p.slug);
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

export type PaginaEmpresa = {
  empresa: Empresa;
  miembros: Perfil[];
  pitches: Array<Pitch & { autor: Pick<Perfil, "slug" | "nombre"> }>;
  datos: DatoEmpresa[];
  producto: Producto | null;
} & BuildEmpresa;

/** Build in Public de una empresa. Vacío si la base no tiene la migración. */
export type BuildEmpresa = { hitos: Hito[]; avances: Avance[] };

const COLUMNAS_HITO = "id, titulo, detalle, etapa, estado, progreso, fecha, created_at";
const COLUMNAS_PRODUCTO =
  "tipo, nombre, propuesta, problema, solucion, para_quien, caracteristicas, como_usar, demo_url, imagenes";

/**
 * Hitos y los últimos avances (los suficientes para la racha de un año). No lanza:
 * es una sección más de la página, no la página.
 */
export async function getBuildEmpresa(empresaId: string): Promise<BuildEmpresa> {
  const [hitos, avances] = await Promise.all([
    supabase
      .from("empresa_hitos")
      .select(COLUMNAS_HITO)
      .eq("empresa_id", empresaId)
      .overrideTypes<Hito[], { merge: false }>(),
    supabase
      .from("empresa_avances")
      .select("id, texto, hito_id, created_at")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(120)
      .overrideTypes<Avance[], { merge: false }>(),
  ]);
  const error = hitos.error ?? avances.error;
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getBuildEmpresa): ${error.message}`);
    return { hitos: [], avances: [] };
  }
  return { hitos: hitos.data ?? [], avances: avances.data ?? [] };
}

/** Producto de la empresa con las URLs de las imágenes listas. No lanza. */
async function getProducto(empresaId: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from("empresa_productos")
    .select(COLUMNAS_PRODUCTO)
    .eq("empresa_id", empresaId)
    .maybeSingle()
    .overrideTypes<Producto | null, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getProducto): ${error.message}`);
    return null;
  }
  return data && { ...data, imagenes: data.imagenes.map(urlMedia) };
}

/**
 * Empresa visible con sus miembros visibles, los pitches de todos ellos y los
 * datos que compartió. `null` si no existe, no es visible o la base no tiene la
 * migración todavía.
 */
export const getEmpresa = cache(async (slug: string): Promise<PaginaEmpresa | null> => {
  const { data: empresa, error } = await supabase
    .from("empresas")
    .select(COLUMNAS_EMPRESA)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Empresa | null, { merge: false }>();

  if (faltaMigracion(error)) return null;
  if (error) fallo("getEmpresa", error);
  if (!empresa) return null;

  const [miembrosRes, datosRes, build, producto] = await Promise.all([
    supabase
      .from("perfiles")
      .select(`${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, pitches(${COLUMNAS_PITCH})`)
      .eq("empresa_id", empresa.id)
      .eq("publicado", true)
      .eq("oculto", false)
      .eq("pitches.publicado", true)
      .order("orden", { referencedTable: "pitches" })
      .overrideTypes<Array<Perfil & { pitches: Pitch[] }>, { merge: false }>(),
    supabase
      .from("empresa_datos")
      .select("clave, valor, url, visible")
      .eq("empresa_id", empresa.id)
      .eq("visible", true)
      .overrideTypes<DatoEmpresa[], { merge: false }>(),
    getBuildEmpresa(empresa.id),
    getProducto(empresa.id),
  ]);

  if (miembrosRes.error) fallo("getEmpresa (miembros)", miembrosRes.error);
  if (datosRes.error && !faltaMigracion(datosRes.error)) {
    fallo("getEmpresa (datos)", datosRes.error);
  }

  const miembros = miembrosRes.data.map((m) => conUrlsPerfil(m));
  const pitches = miembrosRes.data.flatMap(({ pitches: lista, slug: s, nombre }) =>
    lista.map((p) => ({ ...conUrlsPitch(p), autor: { slug: s, nombre } }))
  );

  return { empresa, miembros, pitches, datos: datosRes.data ?? [], producto, ...build };
});

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export type Participante = {
  perfil_id: string;
  slug: string;
  nombre: string;
  rol: Perfil["rol"];
  tipo: Perfil["tipo"];
  descripcion: string;
  avatar_url: string | null;
  etapa: string | null;
  industrias: string[] | null;
  cargo: string | null;
  empresa_slug: string | null;
  empresa_nombre: string | null;
  pitch_id: string | null;
  poster_url: string | null;
};

export type EstadoEvento = {
  /** La base tiene la migración: se puede participar y votar. */
  disponible: boolean;
  votacionAbierta: boolean;
  resultadosVisibles: boolean;
  participantes: Participante[];
  totalVotos: number;
  /** Votos por perfil; vacío mientras los resultados no son visibles. */
  resultados: Record<string, number>;
};

const SIN_EVENTO: EstadoEvento = {
  disponible: false,
  votacionAbierta: false,
  resultadosVisibles: false,
  participantes: [],
  totalVotos: 0,
  resultados: {},
};

/**
 * Participantes, total de votos y (si ya se mostraron) resultados. Nunca lanza:
 * el programa del evento se ve igual aunque la parte dinámica falle.
 */
export async function getEstadoEvento(evento: string): Promise<EstadoEvento> {
  const [estado, participantes, total, resultados] = await Promise.all([
    supabase
      .from("eventos")
      .select("votacion_abierta, resultados_visibles")
      .eq("slug", evento)
      .maybeSingle()
      .overrideTypes<{ votacion_abierta: boolean; resultados_visibles: boolean } | null, { merge: false }>(),
    supabase.rpc("participantes_evento", { p_evento: evento }),
    supabase.rpc("total_votos_evento", { p_evento: evento }),
    supabase.rpc("resultados_evento", { p_evento: evento }),
  ]);

  const error = estado.error ?? participantes.error;
  if (error || !estado.data) {
    if (error && !faltaMigracion(error)) console.error(`Supabase (getEstadoEvento): ${error.message}`);
    return SIN_EVENTO;
  }

  const lista = ((participantes.data ?? []) as Participante[]).map((p) => ({
    ...p,
    avatar_url: p.avatar_url && urlMedia(p.avatar_url),
    poster_url: p.poster_url && urlMedia(p.poster_url),
  }));
  const filas = (resultados.data ?? []) as Array<{ perfil_id: string; votos: number }>;

  return {
    disponible: true,
    votacionAbierta: estado.data.votacion_abierta,
    resultadosVisibles: estado.data.resultados_visibles,
    participantes: lista,
    totalVotos: typeof total.data === "number" ? total.data : 0,
    resultados: Object.fromEntries(filas.map((f) => [f.perfil_id, Number(f.votos)])),
  };
}
