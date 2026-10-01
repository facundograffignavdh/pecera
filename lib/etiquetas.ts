/**
 * Vocabularios del perfil y de las empresas. Espejo EXACTO de los CHECK de
 * supabase/migrations/20261001120000_feria_lista.sql y 20261007120000_feria_pro.sql:
 * si agregás un valor acá, agregalo también allá con una migración nueva (y al
 * revés), o la base lo va a rechazar.
 *
 * Colores con sentido: cada tono significa UNA área en toda la app (ver AREAS). Un
 * CTO, la especialidad "Tecnología" y la industria "IA aplicada" son azules porque
 * son tecnología. Los colores son clases completas (Tailwind solo genera las que ve
 * escritas).
 */

export type Opcion<T extends string = string> = { valor: T; label: string };

export type Tono = "arcilla" | "azul" | "verde" | "ocre" | "ciruela" | "violeta" | "petroleo" | "tierra";

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

/** Qué significa cada color. Se muestra como referencia en los perfiles. */
export const AREAS: Record<Tono, { label: string; ejemplos: string }> = {
  arcilla: { label: "Negocio y crecimiento", ejemplos: "CEO, ventas, fundraising" },
  verde: { label: "Plata", ejemplos: "CFO, finanzas, fintech, tickets" },
  azul: { label: "Tecnología", ejemplos: "CTO, IA, SaaS, ciberseguridad" },
  violeta: { label: "Producto y diseño", ejemplos: "CPO, producto, diseño" },
  ciruela: { label: "Marca y comunicación", ejemplos: "CMO, marketing, audiovisual" },
  ocre: { label: "Operaciones e industria", ejemplos: "COO, logística, retail" },
  petroleo: { label: "Impacto: planeta y personas", ejemplos: "Agtech, salud, educación, mentoría" },
  tierra: { label: "Legal e instituciones", ejemplos: "Legal, govtech, legaltech" },
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
  { valor: "fintech", label: "Fintech", tono: "verde" },
  { valor: "blockchain", label: "Blockchain", tono: "verde" },
  { valor: "saas", label: "SaaS B2B", tono: "azul" },
  { valor: "ia", label: "IA aplicada", tono: "azul" },
  { valor: "ciberseguridad", label: "Ciberseguridad", tono: "azul" },
  { valor: "gaming", label: "Gaming", tono: "azul" },
  { valor: "agtech", label: "Agtech", tono: "petroleo" },
  { valor: "climatech", label: "Climatech", tono: "petroleo" },
  { valor: "energia", label: "Energía", tono: "petroleo" },
  { valor: "foodtech", label: "Foodtech", tono: "petroleo" },
  { valor: "healthtech", label: "Healthtech", tono: "petroleo" },
  { valor: "biotech", label: "Biotech", tono: "petroleo" },
  { valor: "edtech", label: "Edtech", tono: "petroleo" },
  { valor: "impacto", label: "Impacto social", tono: "petroleo" },
  { valor: "retail", label: "Retail y e-commerce", tono: "ocre" },
  { valor: "logistica", label: "Logística", tono: "ocre" },
  { valor: "industria", label: "Industria", tono: "ocre" },
  { valor: "proptech", label: "Proptech", tono: "ocre" },
  { valor: "turismo", label: "Turismo", tono: "ocre" },
  { valor: "govtech", label: "Govtech", tono: "tierra" },
  { valor: "legaltech", label: "Legaltech", tono: "tierra" },
  { valor: "otra", label: "Otra", tono: "tierra" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
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
  { valor: "fundador", label: "Fundador/a", tono: "arcilla" },
  { valor: "cofundador", label: "Cofundador/a", tono: "arcilla" },
  { valor: "asesor", label: "Asesor/a", tono: "petroleo" },
  { valor: "equipo", label: "Equipo", tono: "petroleo" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
export type Cargo = (typeof CARGOS)[number]["valor"];

// ---------------------------------------------------------------------------
// Especialidades (aliado: mentor, coach, aceleradora…). Hasta 5, con color por área.
// ---------------------------------------------------------------------------
export const ESPECIALIDADES = [
  { valor: "mentoria", label: "Mentoría", tono: "petroleo" },
  { valor: "coaching", label: "Coaching", tono: "petroleo" },
  { valor: "rrhh", label: "Talento y RR. HH.", tono: "petroleo" },
  { valor: "impacto", label: "Impacto", tono: "petroleo" },
  { valor: "fundraising", label: "Fundraising", tono: "arcilla" },
  { valor: "ventas", label: "Ventas", tono: "arcilla" },
  { valor: "finanzas", label: "Finanzas", tono: "verde" },
  { valor: "contabilidad", label: "Contabilidad e impuestos", tono: "verde" },
  { valor: "tecnologia", label: "Desarrollo y tecnología", tono: "azul" },
  { valor: "ia_datos", label: "IA y datos", tono: "azul" },
  { valor: "producto", label: "Producto", tono: "violeta" },
  { valor: "diseno", label: "Diseño y UX", tono: "violeta" },
  { valor: "marketing", label: "Marketing", tono: "ciruela" },
  { valor: "comunicacion", label: "Comunicación y prensa", tono: "ciruela" },
  { valor: "audiovisual", label: "Audiovisual y contenido", tono: "ciruela" },
  { valor: "operaciones", label: "Operaciones", tono: "ocre" },
  { valor: "internacionalizacion", label: "Internacionalización", tono: "ocre" },
  { valor: "legal", label: "Legal", tono: "tierra" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
export type Especialidad = (typeof ESPECIALIDADES)[number]["valor"];

export const MAX_ESPECIALIDADES = 5;

// ---------------------------------------------------------------------------
// Cofounder match (estilo YC): qué aporta cada uno y qué busca
// ---------------------------------------------------------------------------
export const APORTES = [
  { valor: "tecnico", label: "Técnico/a", ayuda: "Construye el producto: código, hardware, datos.", tono: "azul" },
  { valor: "negocio", label: "Negocio", ayuda: "Vende, levanta plata y arma alianzas.", tono: "arcilla" },
  { valor: "producto", label: "Producto", ayuda: "Decide qué se construye y por qué.", tono: "violeta" },
  { valor: "diseno", label: "Diseño", ayuda: "Experiencia, marca e interfaz.", tono: "ciruela" },
  { valor: "ciencia", label: "Ciencia", ayuda: "Investigación: bio, agro, materiales, salud.", tono: "petroleo" },
] as const satisfies ReadonlyArray<Opcion & { ayuda: string; tono: Tono }>;
export type Aporte = (typeof APORTES)[number]["valor"];

export const DEDICACIONES = [
  { valor: "full", label: "Tiempo completo" },
  { valor: "part", label: "Medio tiempo" },
  { valor: "explorando", label: "Explorando" },
] as const;

export const NOTA_COFUNDADOR_MAX = 200;

// ---------------------------------------------------------------------------
// Qué busca y qué ofrece cada persona (todos los roles). Espejo de
// perfiles_busca_valido / perfiles_ofrece_valido. Hasta 6 de cada uno.
// ---------------------------------------------------------------------------
export const NECESIDADES = [
  { valor: "inversion", label: "Inversión", tono: "verde" },
  { valor: "cofundador", label: "Cofundador/a", tono: "arcilla" },
  { valor: "clientes", label: "Clientes", tono: "arcilla" },
  { valor: "mentoria", label: "Mentoría", tono: "petroleo" },
  { valor: "talento", label: "Talento y equipo", tono: "petroleo" },
  { valor: "empleo", label: "Trabajo", tono: "petroleo" },
  { valor: "alianzas", label: "Alianzas", tono: "ocre" },
  { valor: "proveedores", label: "Proveedores", tono: "ocre" },
  { valor: "networking", label: "Networking", tono: "ciruela" },
  { valor: "prensa", label: "Prensa y difusión", tono: "ciruela" },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono }>;
export const MAX_NECESIDADES = 6;

/** Skills: texto libre corto, como en LinkedIn. */
export const MAX_SKILLS = 10;
export const SKILL_MAX = 30;
export const UBICACION_MAX = 80;
export const EXPERIENCIA_MAX = 400;
export const EDUCACION_MAX = 200;

// ---------------------------------------------------------------------------
// Portafolio (los tres roles). Espejo de portafolio_tipo_check.
// ---------------------------------------------------------------------------
export const TIPOS_PORTAFOLIO = [
  { valor: "inversion", label: "Inversión", tono: "verde", roles: ["inversor"] },
  { valor: "caso", label: "Caso o cliente", tono: "arcilla", roles: ["emprendedor", "aliado"] },
  { valor: "servicio", label: "Servicio", tono: "azul", roles: ["aliado"] },
  { valor: "logro", label: "Logro o premio", tono: "ocre", roles: ["emprendedor", "inversor", "aliado"] },
  { valor: "prensa", label: "Prensa", tono: "ciruela", roles: ["emprendedor", "inversor", "aliado"] },
  { valor: "documento", label: "Documento", tono: "tierra", roles: ["emprendedor", "inversor", "aliado"] },
] as const satisfies ReadonlyArray<Opcion & { tono: Tono; roles: readonly string[] }>;
export type TipoPortafolio = (typeof TIPOS_PORTAFOLIO)[number]["valor"];
export const MAX_PORTAFOLIO = 12;

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
const M_APORTES = mapa(APORTES);
const M_DEDICACIONES = mapa(DEDICACIONES);
const M_PORTAFOLIO = mapa(TIPOS_PORTAFOLIO);
const M_NECESIDADES = mapa(NECESIDADES);

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

export function industria(v: string) {
  const i = M_INDUSTRIAS[v];
  return i ? { label: i.label, clase: TONO[i.tono], tono: i.tono } : { label: v, clase: TONO.tierra, tono: "tierra" as Tono };
}

export function aporte(v?: string | null) {
  const a = v ? M_APORTES[v] : undefined;
  return a ? { label: a.label, clase: TONO[a.tono] } : null;
}

export const labelDedicacion = (v?: string | null) => (v && M_DEDICACIONES[v]?.label) || null;

export function necesidad(v: string) {
  const n = M_NECESIDADES[v];
  return n ? { label: n.label, clase: TONO[n.tono] } : { label: v, clase: TONO.tierra };
}

export function tipoPortafolio(v: string) {
  const t = M_PORTAFOLIO[v];
  return t ? { label: t.label, clase: TONO[t.tono] } : { label: v, clase: TONO.tierra };
}

/** Opciones de chips con su color: `{ valor, label, tono }` listo para Chips. */
export const conTono = <T extends { valor: string; label: string; tono: Tono }>(lista: readonly T[]) =>
  lista.map(({ valor, label, tono }) => ({ valor, label, tono: TONO[tono] }));

/** Posición de la etapa (1..5) para la barrita de progreso. */
export function pasoEtapa(v?: string | null): number {
  const i = ETAPAS.findIndex((e) => e.valor === v);
  return i < 0 ? 0 : i + 1;
}

export const esValor = <T extends string>(lista: readonly { valor: T }[], v: unknown): v is T =>
  typeof v === "string" && lista.some((o) => o.valor === v);
