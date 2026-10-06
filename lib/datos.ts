import { cache } from "react";
import type { Avance, Hito, HitoActual } from "@/lib/build";
import type { Documento } from "@/lib/dataroom";
import { urlMedia } from "@/lib/media";
import type { NewsletterLink } from "@/lib/newsletter";
import { COLUMNAS_PORTFOLIO, type EntradaPortfolio, type Servicio, type Tesis } from "@/lib/portfolio";
import type { Producto } from "@/lib/producto";
import { supabase } from "@/lib/supabase";
import { hashtagsDe, normalizarTag } from "@/lib/hashtags";
import { calcularRacha, type Racha } from "@/lib/racha";
import type { DatoScore, DocumentoScore, Score } from "@/lib/score";
import { scoreDeEmpresa } from "@/lib/score-empresa";
import type {
  DatoEmpresa,
  Empresa,
  EmpresaDePerfil,
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
  "busca_cofundador, cofundador_aporta, cofundador_busca, cofundador_dedicacion, cofundador_nota, ubicacion, experiencia, educacion, skills, busca, ofrece";
const COLUMNAS_PERFIL_LISTA = `${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, empresa:empresas(slug, nombre)`;
const COLUMNAS_PERFIL = `${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, ${COLUMNAS_COFUNDADOR}, empresa:empresas(slug, nombre, logo_url, ubicacion)`;
// multi_empresa: todas sus empresas (la RLS deja solo las visibles), con el cargo en cada una.
const COLUMNAS_PERFIL_MULTI = `${COLUMNAS_PERFIL}, membresias:empresa_miembros(empresa_id, cargo, created_at, empresa:empresas(slug, nombre, logo_url))`;
// networking_feria: detalle libre y "cómo" de busca/ofrece.
const COLUMNAS_PERFIL_NETWORKING = `${COLUMNAS_PERFIL_MULTI}, busca_detalle, ofrece_detalle, busca_como, ofrece_como`;

/**
 * Columnas por migración, de la más nueva a la más vieja: networking_feria → multi_empresa →
 * feria_pro → feria_lista → lo de siempre. Cada consulta prueba en ese orden y se queda con la
 * primera que la base entiende; así el deploy nunca depende de que la migración ya
 * haya corrido.
 */
const NIVELES_PERFIL = [
  COLUMNAS_PERFIL_NETWORKING,
  COLUMNAS_PERFIL_MULTI,
  COLUMNAS_PERFIL,
  COLUMNAS_PERFIL_LISTA,
  COLUMNAS_PERFIL_BASE,
];

type Membresia = {
  empresa_id: string;
  cargo: string | null;
  created_at: string;
  empresa: { slug: string; nombre: string; logo_url: string | null } | null;
};

/**
 * Sus empresas visibles, la principal primero y después por antigüedad. Sin la
 * migración multi_empresa, la principal sola (con el cargo del perfil).
 */
function empresasDe(perfil: Perfil & { membresias?: Membresia[] }): EmpresaDePerfil[] {
  if (!perfil.membresias) {
    return perfil.empresa
      ? [{ ...perfil.empresa, id: perfil.empresa_id ?? null, cargo: perfil.cargo ?? null, principal: true }]
      : [];
  }
  return perfil.membresias
    .filter((m): m is Membresia & { empresa: NonNullable<Membresia["empresa"]> } => !!m.empresa)
    .sort(
      (a, b) =>
        Number(b.empresa_id === perfil.empresa_id) - Number(a.empresa_id === perfil.empresa_id) ||
        a.created_at.localeCompare(b.created_at)
    )
    .map((m) => ({
      ...m.empresa,
      id: m.empresa_id,
      // El de esa empresa: el del perfil es solo el de la principal.
      cargo: m.cargo,
      principal: m.empresa_id === perfil.empresa_id,
    }));
}

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
const COLUMNAS_EMPRESA = `${COLUMNAS_EMPRESA_LISTA}, logo_url, ubicacion`;

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

function conUrlsPerfil(fila: Perfil & { membresias?: Membresia[] }): Perfil {
  // Las membresías crudas no viajan al cliente: quedan resueltas en `empresas`.
  const perfil: Perfil & { membresias?: Membresia[] } = { ...fila };
  delete perfil.membresias;
  const empresas = empresasDe(fila).map((e) => ({ ...e, logo_url: e.logo_url && urlMedia(e.logo_url) }));
  return {
    ...perfil,
    avatar_url: perfil.avatar_url && urlMedia(perfil.avatar_url),
    ...(perfil.empresa && {
      empresa: { ...perfil.empresa, logo_url: perfil.empresa.logo_url && urlMedia(perfil.empresa.logo_url) },
    }),
    empresas,
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

  const [feed, conteos, construyendo] = await Promise.all([
    enCascada(NIVELES_PERFIL, consulta),
    getConteoPiques(),
    getHitosActuales(),
  ]);
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
    construyendo: (perfil.empresa_id && construyendo.get(perfil.empresa_id)) || null,
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
          // portafolio llegó con feria_pro (niveles 0 y 1).
          nivel <= 1 ? ", portafolio(id, tipo, titulo, descripcion, url, visible, orden)" : ""
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

/** Todos los perfiles visibles (con o sin pitch), para Explorar. En cascada por migración. */
export async function getPerfilesVisibles(): Promise<Perfil[]> {
  const { data, error } = await enCascada(NIVELES_PERFIL, (columnas) =>
    supabase
      .from("perfiles")
      .select(columnas)
      .eq("publicado", true)
      .eq("oculto", false)
      .order("created_at", { ascending: false })
      .overrideTypes<Perfil[], { merge: false }>()
  );
  if (error) fallo("getPerfilesVisibles", error);
  return data.map(conUrlsPerfil);
}

/**
 * Perfiles visibles con algo en busca u ofrece (pestaña Networking de /cofundadores), todos
 * los roles. Sin feria_pro (no hay busca/ofrece), vacío.
 */
export async function getNetworking(): Promise<Perfil[]> {
  const { data, error } = await enCascada(NIVELES_PERFIL.slice(0, 3), (columnas) =>
    supabase
      .from("perfiles")
      .select(columnas)
      .eq("publicado", true)
      .eq("oculto", false)
      .or("busca.neq.{},ofrece.neq.{}")
      .order("created_at", { ascending: false })
      .overrideTypes<Perfil[], { merge: false }>()
  );
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getNetworking): ${error.message}`);
    return [];
  }
  return data.map(conUrlsPerfil);
}

/** Ids de los perfiles anotados en un evento (filtro "Feria 21"). No lanza: si falla, vacío. */
export async function getIdsParticipantes(evento: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("participantes_evento", { p_evento: evento });
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getIdsParticipantes): ${error.message}`);
    return [];
  }
  return ((data ?? []) as Array<{ perfil_id: string }>).map((p) => p.perfil_id);
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

/**
 * Documentos transparentes del Dataroom de una empresa visible (la RLS ya filtra lo
 * privado y lo archivado; acá queda explícito). No lanza: sin la migración, vacío.
 */
export const getDocumentosPublicos = cache(async (empresaId: string): Promise<Documento[]> => {
  const { data, error } = await supabase
    .from("empresa_documentos")
    .select("id, plantilla, categoria, tipo, titulo, campos, cuerpo, url, completo, visible, archivado, updated_at")
    .eq("empresa_id", empresaId)
    .eq("visible", true)
    .eq("archivado", false)
    .order("updated_at", { ascending: false })
    .overrideTypes<Documento[], { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getDocumentosPublicos): ${error.message}`);
    return [];
  }
  return data ?? [];
});

/** Link a la newsletter de un perfil visible, o null. No lanza. */
export const getNewsletter = cache(async (perfilId: string): Promise<NewsletterLink | null> => {
  const { data, error } = await supabase
    .from("perfil_newsletter")
    .select("url, titulo")
    .eq("perfil_id", perfilId)
    .maybeSingle()
    .overrideTypes<NewsletterLink | null, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getNewsletter): ${error.message}`);
    return null;
  }
  return data;
});

export type PortfolioPublico = { entradas: EntradaPortfolio[]; servicios: Servicio[]; tesis: Tesis | null };

/**
 * Lo público del portfolio de un perfil visible: entradas públicas, servicios y
 * tesis. Lo de "solo cuentas" lo pide el navegador con sesión. No lanza.
 */
export const getPortfolio = cache(async (perfilId: string): Promise<PortfolioPublico | null> => {
  const [entradas, servicios, tesis] = await Promise.all([
    supabase
      .from("portfolio")
      .select(`${COLUMNAS_PORTFOLIO}, empresa:empresas(slug, nombre)`)
      .eq("perfil_id", perfilId)
      .eq("visibilidad", "publico")
      .order("created_at", { ascending: false })
      .limit(60)
      .overrideTypes<EntradaPortfolio[], { merge: false }>(),
    supabase
      .from("perfil_servicios")
      .select("id, nombre, categoria, descripcion, modalidad, precio")
      .eq("perfil_id", perfilId)
      .order("orden")
      .overrideTypes<Servicio[], { merge: false }>(),
    supabase
      .from("perfil_tesis")
      .select("texto, geografias, modelos, busca")
      .eq("perfil_id", perfilId)
      .maybeSingle()
      .overrideTypes<Tesis | null, { merge: false }>(),
  ]);
  const error = entradas.error ?? servicios.error ?? tesis.error;
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getPortfolio): ${error.message}`);
    return null;
  }
  return { entradas: entradas.data ?? [], servicios: servicios.data ?? [], tesis: tesis.data };
});

export type Apoyo = Pick<EntradaPortfolio, "id" | "tipo" | "estado" | "rol" | "confirmacion"> & {
  perfil: Pick<Perfil, "slug" | "nombre" | "rol" | "tipo" | "avatar_url">;
};

/**
 * Inversores y aliados que muestran públicamente una relación con esta empresa (las
 * que la empresa rechazó, no). Confirmadas primero. No lanza.
 */
export const getApoyos = cache(async (empresaId: string): Promise<Apoyo[]> => {
  const { data, error } = await supabase
    .from("portfolio")
    .select("id, tipo, estado, rol, confirmacion, perfil:perfiles!inner(slug, nombre, rol, tipo, avatar_url)")
    .eq("empresa_id", empresaId)
    .eq("visibilidad", "publico")
    .neq("confirmacion", "rechazada")
    .overrideTypes<Apoyo[], { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getApoyos): ${error.message}`);
    return [];
  }
  return (data ?? [])
    .map((a) => ({ ...a, perfil: { ...a.perfil, avatar_url: a.perfil.avatar_url && urlMedia(a.perfil.avatar_url) } }))
    .sort((a, b) => Number(b.confirmacion === "confirmada") - Number(a.confirmacion === "confirmada"));
});

/**
 * URL del logo de cada empresa (las visibles), por id. Tabla aparte: si la
 * migración no corrió o falla, vacío y se ven las iniciales. No lanza.
 */
export async function getLogos(empresaIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(empresaIds)].filter(Boolean);
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("empresa_logos")
    .select("empresa_id, clave")
    .in("empresa_id", ids)
    .overrideTypes<Array<{ empresa_id: string; clave: string }>, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (getLogos): ${error.message}`);
    return new Map();
  }
  return new Map((data ?? []).map((l) => [l.empresa_id, urlMedia(l.clave)]));
}

/**
 * Score crediticio (A-D) de cada empresa, por id, según lo TRANSPARENTE de su Dataroom
 * (documentos y datos con el switch en "Transparente"; la RLS ya deja solo eso y
 * lo de empresas visibles). Se calcula acá, sin tabla ni migración. No lanza: si la
 * consulta falla, el mapa queda sin esa empresa y la página no dibuja la insignia
 * (nunca un "Sin score" que no es verdad). Sin las migraciones del Dataroom o de
 * Transparencia, esa parte cuenta como vacía.
 */
export async function getScoresEmpresas(empresaIds: string[]): Promise<Map<string, Score>> {
  const ids = [...new Set(empresaIds)].filter(Boolean);
  if (ids.length === 0) return new Map();
  const [docs, datos] = await Promise.all([
    supabase
      .from("empresa_documentos")
      .select("empresa_id, categoria, tipo, completo, url, cuerpo, visible, archivado")
      .in("empresa_id", ids)
      .eq("visible", true)
      .eq("archivado", false)
      .overrideTypes<Array<DocumentoScore & { empresa_id: string }>, { merge: false }>(),
    supabase
      .from("empresa_datos")
      .select("empresa_id, clave, valor, url, visible")
      .in("empresa_id", ids)
      .eq("visible", true)
      .overrideTypes<Array<DatoScore & { empresa_id: string }>, { merge: false }>(),
  ]);
  for (const [donde, r] of [["documentos", docs], ["datos", datos]] as const) {
    if (r.error && !faltaMigracion(r.error)) {
      console.error(`Supabase (getScoresEmpresas, ${donde}): ${r.error.message}`);
      return new Map();
    }
  }
  const documentos = docs.error ? [] : (docs.data ?? []);
  const deDatos = datos.error ? [] : (datos.data ?? []);
  return new Map(
    ids.map((id) => [
      id,
      scoreDeEmpresa({
        documentos: documentos.filter((d) => d.empresa_id === id),
        datos: deDatos.filter((d) => d.empresa_id === id),
      }),
    ])
  );
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

  // multi_empresa: el equipo sale de las membresías (con el cargo en esta empresa).
  // Sin la migración, de `empresa_id` como siempre.
  const membresias = await supabase
    .from("empresa_miembros")
    .select("perfil_id, cargo")
    .eq("empresa_id", empresa.id)
    .order("created_at")
    .overrideTypes<Array<{ perfil_id: string; cargo: string | null }>, { merge: false }>();
  if (membresias.error && !faltaMigracion(membresias.error)) fallo("getEmpresa (membresías)", membresias.error);
  const equipo = membresias.error ? null : membresias.data;

  const consultaMiembros = supabase
    .from("perfiles")
    .select(`${COLUMNAS_PERFIL_BASE}, ${COLUMNAS_PERFIL_NUEVAS}, pitches(${COLUMNAS_PITCH})`)
    .order("created_at")
    .eq("publicado", true)
    .eq("oculto", false)
    .eq("pitches.publicado", true)
    .order("orden", { referencedTable: "pitches" });

  const [miembrosRes, datosRes, build, producto] = await Promise.all([
    (equipo
      ? consultaMiembros.in("id", equipo.map((m) => m.perfil_id))
      : consultaMiembros.eq("empresa_id", empresa.id)
    ).overrideTypes<Array<Perfil & { pitches: Pitch[] }>, { merge: false }>(),
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

  // En el orden en que se sumaron, y con el cargo que tienen en esta empresa.
  const orden = new Map(equipo?.map((m, i) => [m.perfil_id, i]));
  const cargos = new Map(equipo?.map((m) => [m.perfil_id, m.cargo]));
  const filas = [...miembrosRes.data].sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0));
  const miembros = filas.map((m) => conUrlsPerfil({ ...m, cargo: equipo ? (cargos.get(m.id) ?? null) : m.cargo }));
  const pitches = filas.flatMap(({ pitches: lista, slug: s, nombre }) =>
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

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

/** Un pitch reciente para la vitrina de la landing. */
export type PitchVitrina = {
  slug: string;
  nombre: string;
  rol: Perfil["rol"];
  tipo: Perfil["tipo"];
  poster: string;
};

/**
 * Lo que la landing puede mostrar como prueba: conteos reales de lo visible y los
 * pitches más recientes con poster. Deja afuera los perfiles `test-*` (los de
 * prueba de supabase/test-50.sql). Nunca lanza: sin datos, la landing muestra sus
 * principios y no inventa números.
 */
export type PulsoEcosistema = {
  emprendedores: number;
  inversores: number;
  aliados: number;
  empresas: number;
  pitches: number;
  vitrina: PitchVitrina[];
};

const ES_PRUEBA = (slug: string) => slug.startsWith("test-");

export async function getPulsoEcosistema(): Promise<PulsoEcosistema | null> {
  try {
    return await pulso();
  } catch (e) {
    console.error(`getPulsoEcosistema: ${e instanceof Error ? e.message : "error"}`);
    return null;
  }
}

async function pulso(): Promise<PulsoEcosistema | null> {
  const [perfiles, empresas, pitches] = await Promise.all([
    supabase
      .from("perfiles")
      .select("slug, rol")
      .eq("publicado", true)
      .eq("oculto", false)
      .limit(5000)
      .overrideTypes<Array<{ slug: string; rol: Perfil["rol"] }>, { merge: false }>(),
    supabase.from("empresas").select("id").limit(5000),
    supabase
      .from("pitches")
      .select("poster_url, created_at, perfil:perfiles!inner(slug, nombre, rol, tipo)")
      .eq("publicado", true)
      .eq("perfil.publicado", true)
      .eq("perfil.oculto", false)
      .order("created_at", { ascending: false })
      .limit(1000)
      .overrideTypes<
        Array<{ poster_url: string | null; perfil: Pick<Perfil, "slug" | "nombre" | "rol" | "tipo"> }>,
        { merge: false }
      >(),
  ]);
  if (perfiles.error || pitches.error) {
    const error = perfiles.error ?? pitches.error;
    if (error && !faltaMigracion(error)) console.error(`Supabase (getPulsoEcosistema): ${error.message}`);
    return null;
  }

  const reales = perfiles.data.filter((p) => !ES_PRUEBA(p.slug));
  const deRol = (rol: Perfil["rol"]) => reales.filter((p) => p.rol === rol).length;
  const pitchesReales = pitches.data.filter((p) => !ES_PRUEBA(p.perfil.slug));

  // Un pitch por perfil: la vitrina muestra gente distinta.
  const vistos = new Set<string>();
  const vitrina: PitchVitrina[] = [];
  for (const { poster_url, perfil } of pitchesReales) {
    if (!poster_url || vistos.has(perfil.slug)) continue;
    vistos.add(perfil.slug);
    vitrina.push({ ...perfil, poster: urlMedia(poster_url) });
    if (vitrina.length === 8) break;
  }

  return {
    emprendedores: deRol("emprendedor"),
    inversores: deRol("inversor"),
    aliados: deRol("aliado"),
    // Sin la migración de empresas no hay número que mostrar.
    empresas: empresas.error ? 0 : empresas.data.length,
    pitches: pitchesReales.length,
    vitrina,
  };
}
