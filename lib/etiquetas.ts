/**
 * Vocabularios del perfil y de las empresas. Espejo EXACTO de los CHECK de
 * supabase/migrations/20261001120000_feria_lista.sql: si agregás un valor acá,
 * agregalo también allá (y al revés), o la base lo va a rechazar.
 *
 * Los colores son clases completas (Tailwind solo genera las que ve escritas).
 */

export type Opcion<T extends string = string> = { valor: T; label: string };

type Tono = "arcilla" | "azul" | "verde" | "ocre" | "ciruela" | "violeta" | "petroleo" | "tierra";

/** Chip claro (fondo suave + texto fuerte): AA sobre marfil y sobre video. */
export const TONO: Record<Tono, string> = {
  arcilla: "bg-t-arcilla-suave text-t-arcilla",
  azul: "bg-t-azul-suave text-t-azul",
  verde: "bg-t-verde-suave text-t-verde",
  ocre: "bg-t-ocre-suave text-t-ocre",
  ciruela: "bg-t-ciruela-suave text-t-ciruela",
  violeta: "bg-t-violeta-suave text-t-violeta",
  petroleo: "bg-t-petroleo-suave text-t-petroleo",
  tierra: "bg-t-tierra-suave text-t-tierra",
};

// ---------------------------------------------------------------------------
// Etapa (emprendedor y empresa)
// ---------------------------------------------------------------------------
export const ETAPAS = [
  { valor: "idea", label: "Idea", ayuda: "Todavía no hay producto." },
  { valor: "prototipo", label: "Prototipo", ayuda: "Algo que se puede mostrar." },
  { valor: "mvp", label: "MVP", ayuda: "Primeros usuarios reales." },
  { valor: "funcionando", label: "Funcionando", ayuda: "Clientes que pagan." },
  { valor: "escalando", label: "Escalando", ayuda: "Crece y suma equipo." },
] as const;
export type Etapa = (typeof ETAPAS)[number]["valor"];

// ---------------------------------------------------------------------------
// Ronda que busca (emprendedor y empresa) y rondas que mira (inversor)
// ---------------------------------------------------------------------------
export const RONDAS = [
  { valor: "no_busca", label: "No estamos levantando" },
  { valor: "pre_seed", label: "Pre-seed" },
  { valor: "seed", label: "Seed" },
  { valor: "serie_a", label: "Serie A" },
  { valor: "serie_b", label: "Serie B o más" },
] as const;
export type Ronda = (typeof RONDAS)[number]["valor"];

export const RONDAS_INTERES = RONDAS.filter((r) => r.valor !== "no_busca");
export type RondaInteres = Exclude<Ronda, "no_busca">;

// ---------------------------------------------------------------------------
// Ticket (inversor)
// ---------------------------------------------------------------------------
export const TICKETS = [
  { valor: "hasta_10k", label: "Hasta USD 10 mil" },
  { valor: "10k_50k", label: "USD 10 a 50 mil" },
  { valor: "50k_250k", label: "USD 50 a 250 mil" },
  { valor: "250k_1m", label: "USD 250 mil a 1 M" },
  { valor: "mas_1m", label: "Más de USD 1 M" },
] as const;
export type Ticket = (typeof TICKETS)[number]["valor"];

// ---------------------------------------------------------------------------
// Industrias (todos). Emprendedor y empresa: hasta 3. Inversor y aliado: hasta 6.
// ---------------------------------------------------------------------------
export const INDUSTRIAS = [
  { valor: "fintech", label: "Fintech" },
  { valor: "agtech", label: "Agtech" },
  { valor: "healthtech", label: "Healthtech" },
  { valor: "biotech", label: "Biotech" },
  { valor: "edtech", label: "Edtech" },
  { valor: "foodtech", label: "Foodtech" },
  { valor: "climatech", label: "Climatech" },
  { valor: "energia", label: "Energía" },
  { valor: "govtech", label: "Govtech" },
  { valor: "legaltech", label: "Legaltech" },
  { valor: "proptech", label: "Proptech" },
  { valor: "retail", label: "Retail y e-commerce" },
  { valor: "logistica", label: "Logística" },
  { valor: "industria", label: "Industria" },
  { valor: "saas", label: "SaaS B2B" },
  { valor: "ia", label: "IA aplicada" },
  { valor: "ciberseguridad", label: "Ciberseguridad" },
  { valor: "gaming", label: "Gaming" },
  { valor: "blockchain", label: "Blockchain" },
  { valor: "turismo", label: "Turismo" },
  { valor: "impacto", label: "Impacto social" },
  { valor: "otra", label: "Otra" },
] as const;
export type Industria = (typeof INDUSTRIAS)[number]["valor"];

export const MAX_INDUSTRIAS_PROYECTO = 3;
export const MAX_INDUSTRIAS_INTERES = 6;

// ---------------------------------------------------------------------------
// Cargo en el equipo (emprendedor). Cada uno con su color: se reconocen de un vistazo.
// ---------------------------------------------------------------------------
export const CARGOS = [
  { valor: "ceo", label: "CEO", tono: "arcilla" },
  { valor: "cto", label: "CTO", tono: "azul" },
  { valor: "cfo", label: "CFO", tono: "verde" },
  { valor: "coo", label: "COO", tono: "ocre" },
  { valor: "cmo", label: "CMO", tono: "ciruela" },
  { valor: "cpo", label: "CPO", tono: "violeta" },
  { valor: "fundador", label: "Fundador/a", tono: "tierra" },
  { valor: "cofundador", label: "Cofundador/a", tono: "tierra" },
  { valor: "asesor", label: "Asesor/a", tono: "petroleo" },
  { valor: "equipo", label: "Equipo", tono: "petroleo" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
export type Cargo = (typeof CARGOS)[number]["valor"];

// ---------------------------------------------------------------------------
// Especialidades (aliado: mentor, coach, aceleradora…). Hasta 5, con color por área.
// ---------------------------------------------------------------------------
export const ESPECIALIDADES = [
  { valor: "mentoria", label: "Mentoría", tono: "verde" },
  { valor: "coaching", label: "Coaching", tono: "verde" },
  { valor: "fundraising", label: "Fundraising", tono: "arcilla" },
  { valor: "finanzas", label: "Finanzas", tono: "ocre" },
  { valor: "legal", label: "Legal", tono: "tierra" },
  { valor: "marketing", label: "Marketing", tono: "ciruela" },
  { valor: "comunicacion", label: "Comunicación", tono: "ciruela" },
  { valor: "ventas", label: "Ventas", tono: "arcilla" },
  { valor: "producto", label: "Producto", tono: "violeta" },
  { valor: "diseno", label: "Diseño", tono: "violeta" },
  { valor: "tecnologia", label: "Tecnología", tono: "azul" },
  { valor: "rrhh", label: "Talento y RR. HH.", tono: "petroleo" },
  { valor: "internacionalizacion", label: "Internacionalización", tono: "azul" },
  { valor: "impacto", label: "Impacto", tono: "verde" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
export type Especialidad = (typeof ESPECIALIDADES)[number]["valor"];

export const MAX_ESPECIALIDADES = 5;

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------
function mapa<T extends { valor: string; label: string }>(lista: readonly T[]) {
  return Object.fromEntries(lista.map((o) => [o.valor, o])) as Record<string, T | undefined>;
}

const M_ETAPAS = mapa(ETAPAS);
const M_RONDAS = mapa(RONDAS);
const M_TICKETS = mapa(TICKETS);
const M_INDUSTRIAS = mapa(INDUSTRIAS);
const M_CARGOS = mapa(CARGOS);
const M_ESPECIALIDADES = mapa(ESPECIALIDADES);

export const labelEtapa = (v?: string | null) => (v && M_ETAPAS[v]?.label) || null;
export const labelRonda = (v?: string | null) => (v && M_RONDAS[v]?.label) || null;
export const labelTicket = (v?: string | null) => (v && M_TICKETS[v]?.label) || null;
export const labelIndustria = (v: string) => M_INDUSTRIAS[v]?.label ?? v;

export function cargo(v?: string | null) {
  const c = v ? M_CARGOS[v] : undefined;
  return c ? { label: c.label, clase: TONO[c.tono] } : null;
}

export function especialidad(v: string) {
  const e = M_ESPECIALIDADES[v];
  return e ? { label: e.label, clase: TONO[e.tono] } : { label: v, clase: TONO.tierra };
}

/** Posición de la etapa (1..5) para la barrita de progreso. */
export function pasoEtapa(v?: string | null): number {
  const i = ETAPAS.findIndex((e) => e.valor === v);
  return i < 0 ? 0 : i + 1;
}

export const esValor = <T extends string>(lista: readonly { valor: T }[], v: unknown): v is T =>
  typeof v === "string" && lista.some((o) => o.valor === v);
