import { cache } from "react";
import { urlMedia } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import { hashtagsDe, normalizarTag } from "@/lib/hashtags";
import { calcularRacha, type Racha } from "@/lib/racha";
import type {
  DatoEmpresa,
  Empresa,
  ItemFeed,
  ItemPortafolio,
  Metricas,
  Perfil,
  Pitch,
} from "@/types/pecera";

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
const COLUMNAS_COFUNDADOR =
  "busca_cofundador, cofundador_aporta, cofundador_busca, cofundador_dedicacion, cofundador_nota";
const COLUMNAS_PERFIL_LISTA = `${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, empresa:empresas(slug, nombre)`;
const COLUMNAS_PERFIL = `${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, ${COLUMNAS_COFUNDADOR}, empresa:empresas(slug, nombre, logo_url)`;

/**
 * Columnas por migración, de la más nueva a la más vieja: feria_pro → feria_lista →
 * lo de siempre. Cada consulta prueba en ese orden y se queda con la primera que la
 * base entiende; así el deploy nunca depende de que la migración ya haya corrido.
 */
const NIVELES_PERFIL = [COLUMNAS_PERFIL, COLUMNAS_PERFIL_LISTA, COLUMNAS_PERFIL_BASE];

async function enCascada<T extends { error: { code?: string } | null }>(
  niveles: string[],
  consulta: (columnas: string, nivel: number) => PromiseLike<T>
): Promise<T & { nivel: number }> {
  let resultado = await consulta(niveles[0], 0);
  let nivel = 0;
  while (faltaMigracion(resultado.error) && nivel < niveles.length - 1) {
    nivel++;
    resultado = await consulta(niveles[nivel], nivel);
  }
  return Object.assign(resultado, { nivel });
}

const COLUMNAS_PITCH =
  "id, perfil_id, video_url, poster_url, orden, publicado, descripcion, created_at";
// El perfil no dibuja subtítulos: solo el feed los pide.
const COLUMNAS_PITCH_FEED = `${COLUMNAS_PITCH}, subtitulos`;

const COLUMNAS_EMPRESA_LISTA =
  "id, slug, nombre, descripcion, web, linkedin, instagram, industrias, etapa, ronda";
const COLUMNAS_EMPRESA = `${COLUMNAS_EMPRESA_LISTA}, logo_url`;

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
  return {
    ...perfil,
    avatar_url: perfil.avatar_url && urlMedia(perfil.avatar_url),
    ...(perfil.empresa && {
      empresa: { ...perfil.empresa, logo_url: perfil.empresa.logo_url && urlMedia(perfil.empresa.logo_url) },
    }),
  };
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

  const [feed, conteos] = await Promise.all([enCascada(NIVELES_PERFIL, consulta), getConteoPiques()]);
  if (feed.error) fallo("getFeed", feed.error);

  // Racha de cada perfil con las fechas de todos sus pitches publicados.
  const fechas = new Map<string, string[]>();
  for (const { perfil_id, created_at } of feed.data) {
    fechas.set(perfil_id, [...(fechas.get(perfil_id) ?? []), created_at ?? ""]);
  }
  const rachas = new Map([...fechas].map(([id, lista]) => [id, calcularRacha(lista).actual]));

  return feed.data.map(({ perfil, ...pitch }) => ({
    pitch: conUrlsPitch(pitch),
    perfil: conUrlsPerfil(perfil),
    piques: conteos.get(pitch.id) ?? 0,
    racha: rachas.get(pitch.perfil_id) ?? 0,
  }));
}

/** Hashtags de los pitches del feed con cuántos pitches tiene cada uno. */
export async function getTags(): Promise<Array<{ tag: string; total: number }>> {
  const cuenta = new Map<string, number>();
  for (const { pitch } of await getFeed()) {
    for (const tag of hashtagsDe(pitch.descripcion)) cuenta.set(tag, (cuenta.get(tag) ?? 0) + 1);
  }
  return [...cuenta]
    .map(([tag, total]) => ({ tag, total }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

/** Pitches del feed que llevan un hashtag (sección /t/tag). */
export async function getPitchesDeTag(tag: string): Promise<ItemFeed[]> {
  const buscado = normalizarTag(tag);
  return (await getFeed()).filter(({ pitch }) => hashtagsDe(pitch.descripcion).includes(buscado));
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

export type PaginaPerfil = {
  perfil: Perfil;
  pitches: Pitch[];
  portafolio: ItemPortafolio[];
  racha: Racha;
};

/**
 * Perfil publicado con sus pitches publicados, su portafolio visible y su racha, o
 * `null` si no existe. Con `cache` para que `generateMetadata` y la página hagan
 * una sola consulta.
 */
export const getPerfil = cache(async (slug: string): Promise<PaginaPerfil | null> => {
  const consulta = (columnas: string, nivel: number) =>
    supabase
      .from("perfiles")
      .select(
        `${columnas}, pitches(${COLUMNAS_PITCH})${
          nivel === 0 ? ", portafolio(id, tipo, titulo, descripcion, url, visible, orden)" : ""
        }`
      )
      .eq("slug", slug)
      .eq("publicado", true)
      .eq("oculto", false)
      .eq("pitches.publicado", true)
      .order("orden", { referencedTable: "pitches" })
      .maybeSingle()
      .overrideTypes<
        (Perfil & { pitches: Pitch[]; portafolio?: ItemPortafolio[] }) | null,
        { merge: false }
      >();

  const { data, error } = await enCascada(NIVELES_PERFIL, consulta);
  if (error) fallo("getPerfil", error);
  if (!data) return null;

  const { pitches, portafolio = [], ...perfil } = data;
  return {
    perfil: conUrlsPerfil(perfil),
    pitches: pitches.map(conUrlsPitch),
    portafolio: portafolio.filter((i) => i.visible).sort((a, b) => a.orden - b.orden),
    racha: calcularRacha(pitches.map((p) => p.created_at)),
  };
});

/** Seguidores de un perfil (solo el total). No lanza: sin migración, 0. */
export async function getSeguidores(slug: string): Promise<number> {
  const { data, error } = await supabase.rpc("seguidores_de", { p_slug: slug });
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getSeguidores): ${error.message}`);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

/** Perfiles visibles que buscan cofundador/a (/cofundadores). Sin migración, vacío. */
export async function getCofundadores(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(COLUMNAS_PERFIL)
    .eq("publicado", true)
    .eq("oculto", false)
    .eq("busca_cofundador", true)
    .order("created_at", { ascending: false })
    .overrideTypes<Perfil[], { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getCofundadores): ${error.message}`);
    return [];
  }
  return data.map(conUrlsPerfil);
}

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
};

/**
 * Empresa visible con sus miembros visibles, los pitches de todos ellos y los
 * datos que compartió. `null` si no existe, no es visible o la base no tiene la
 * migración todavía.
 */
export const getEmpresa = cache(async (slug: string): Promise<PaginaEmpresa | null> => {
  const { data: fila, error } = await enCascada([COLUMNAS_EMPRESA, COLUMNAS_EMPRESA_LISTA], (columnas) =>
    supabase
      .from("empresas")
      .select(columnas)
      .eq("slug", slug)
      .maybeSingle()
      .overrideTypes<Empresa | null, { merge: false }>()
  );

  if (faltaMigracion(error)) return null;
  if (error) fallo("getEmpresa", error);
  if (!fila) return null;
  const empresa: Empresa = { ...fila, logo_url: fila.logo_url && urlMedia(fila.logo_url) };

  const [miembrosRes, datosRes] = await Promise.all([
    supabase
      .from("perfiles")
      .select(`${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, pitches(${COLUMNAS_PITCH})`)
      .order("created_at")
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
  ]);

  if (miembrosRes.error) fallo("getEmpresa (miembros)", miembrosRes.error);
  if (datosRes.error && !faltaMigracion(datosRes.error)) {
    fallo("getEmpresa (datos)", datosRes.error);
  }

  const miembros = miembrosRes.data.map((m) => conUrlsPerfil(m));
  const pitches = miembrosRes.data.flatMap(({ pitches: lista, slug: s, nombre }) =>
    lista.map((p) => ({ ...conUrlsPitch(p), autor: { slug: s, nombre } }))
  );

  return { empresa, miembros, pitches, datos: datosRes.data ?? [] };
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
