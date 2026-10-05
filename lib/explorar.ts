import { urlMedia } from "@/lib/media";
import { faltaMigracion, getLogos } from "@/lib/datos";
import { supabase } from "@/lib/supabase";
import type { Rol, TipoPerfil } from "@/types/pecera";

/**
 * Datos del directorio (/explorar): perfiles y empresas visibles, más lo que el
 * portfolio público, los servicios y la tesis dicen de cada perfil. Así "inversores
 * en fintech" encuentra a quien invirtió en fintech, no solo a quien lo escribió.
 * Todo es público (RLS de anon). Nunca lanza: sin una tabla, esa parte va vacía.
 */

export type FichaDirectorio = {
  clase: "perfil" | "empresa";
  slug: string;
  nombre: string;
  rol: Rol | null;
  tipo: TipoPerfil | null;
  descripcion: string;
  avatar_url: string | null;
  industrias: string[];
  etapa: string | null;
  ronda: string | null;
  rondas_interes: string[];
  ticket: string | null;
  especialidades: string[];
  empresa: { slug: string; nombre: string } | null;
  /** Sus otras empresas visibles (multi_empresa), además de la principal. */
  otrasEmpresas: string[];
  /** Del portfolio público. */
  inversiones: number;
  apoyos: number;
  industriasPortfolio: string[];
  empresasPortfolio: string[];
  /** Servicios (aliados) y tesis (inversores). */
  servicios: string[];
  categoriasServicio: string[];
  geografias: string[];
  modelos: string[];
};

type FilaPerfil = {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  tipo: TipoPerfil;
  descripcion: string;
  avatar_url: string | null;
  industrias?: string[];
  etapa?: string | null;
  ronda?: string | null;
  rondas_interes?: string[];
  ticket?: string | null;
  especialidades?: string[];
  empresa?: { slug: string; nombre: string } | null;
};

export async function getDirectorio(): Promise<FichaDirectorio[]> {
  const [perfiles, empresas, portfolio, servicios, tesis, membresias] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, slug, nombre, rol, tipo, descripcion, avatar_url, industrias, etapa, ronda, rondas_interes, ticket, especialidades, empresa:empresas(slug, nombre)")
      .eq("publicado", true)
      .eq("oculto", false)
      .order("nombre")
      .limit(2000)
      .overrideTypes<FilaPerfil[], { merge: false }>(),
    supabase
      .from("empresas")
      .select("id, slug, nombre, descripcion, industrias, etapa, ronda")
      .order("nombre")
      .limit(1000),
    supabase.from("portfolio").select("perfil_id, tipo, industria, nombre").eq("visibilidad", "publico").limit(10000),
    supabase.from("perfil_servicios").select("perfil_id, nombre, categoria").limit(5000),
    supabase.from("perfil_tesis").select("perfil_id, geografias, modelos").limit(2000),
    supabase.from("empresa_miembros").select("perfil_id, created_at, empresa:empresas(slug, nombre)").order("created_at").limit(10000),
  ]);
  if (perfiles.error) {
    console.error(`Supabase (getDirectorio): ${perfiles.error.message}`);
    return [];
  }
  for (const r of [empresas, portfolio, servicios, tesis, membresias]) {
    if (r.error && !faltaMigracion(r.error)) console.error(`Supabase (getDirectorio): ${r.error.message}`);
  }

  const porPerfil = <T extends { perfil_id: string }>(filas: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const f of filas ?? []) m.set(f.perfil_id, [...(m.get(f.perfil_id) ?? []), f]);
    return m;
  };
  const pf = porPerfil(portfolio.data as Array<{ perfil_id: string; tipo: string; industria: string | null; nombre: string }> | null);
  const sv = porPerfil(servicios.data as Array<{ perfil_id: string; nombre: string; categoria: string | null }> | null);
  const mb = porPerfil(
    membresias.data as unknown as Array<{ perfil_id: string; empresa: { slug: string; nombre: string } | null }> | null
  );
  const ts = new Map(((tesis.data ?? []) as Array<{ perfil_id: string; geografias: string[]; modelos: string[] }>).map((t) => [t.perfil_id, t]));

  const fichasPerfil: FichaDirectorio[] = (perfiles.data ?? []).map((p) => {
    const entradas = pf.get(p.id) ?? [];
    return {
      clase: "perfil",
      slug: p.slug,
      nombre: p.nombre,
      rol: p.rol,
      tipo: p.tipo,
      descripcion: p.descripcion,
      avatar_url: p.avatar_url && urlMedia(p.avatar_url),
      industrias: p.industrias ?? [],
      etapa: p.etapa ?? null,
      ronda: p.ronda ?? null,
      rondas_interes: p.rondas_interes ?? [],
      ticket: p.ticket ?? null,
      especialidades: p.especialidades ?? [],
      empresa: p.empresa ?? null,
      otrasEmpresas: (mb.get(p.id) ?? [])
        .map((m) => m.empresa)
        .filter((e): e is { slug: string; nombre: string } => !!e && e.slug !== p.empresa?.slug)
        .map((e) => e.nombre),
      inversiones: entradas.filter((e) => e.tipo === "inversion").length,
      apoyos: entradas.filter((e) => e.tipo !== "inversion").length,
      industriasPortfolio: [...new Set(entradas.map((e) => e.industria).filter((x): x is string => !!x))],
      empresasPortfolio: entradas.map((e) => e.nombre),
      servicios: (sv.get(p.id) ?? []).map((s) => s.nombre),
      categoriasServicio: [...new Set((sv.get(p.id) ?? []).map((s) => s.categoria).filter((x): x is string => !!x))],
      geografias: ts.get(p.id)?.geografias ?? [],
      modelos: ts.get(p.id)?.modelos ?? [],
    };
  });

  const filasEmpresa = (empresas.data ?? []) as Array<{ id: string; slug: string; nombre: string; descripcion: string | null; industrias: string[]; etapa: string | null; ronda: string | null }>;
  const logos = await getLogos(filasEmpresa.map((e) => e.id));
  const fichasEmpresa: FichaDirectorio[] = filasEmpresa.map((e) => ({
    clase: "empresa",
    slug: e.slug,
    nombre: e.nombre,
    rol: null,
    tipo: null,
    descripcion: e.descripcion ?? "",
    avatar_url: logos.get(e.id) ?? null,
    industrias: e.industrias ?? [],
    etapa: e.etapa,
    ronda: e.ronda,
    rondas_interes: [],
    ticket: null,
    especialidades: [],
    empresa: null,
    otrasEmpresas: [],
    inversiones: 0,
    apoyos: 0,
    industriasPortfolio: [],
    empresasPortfolio: [],
    servicios: [],
    categoriasServicio: [],
    geografias: [],
    modelos: [],
  }));

  return [...fichasEmpresa, ...fichasPerfil];
}
