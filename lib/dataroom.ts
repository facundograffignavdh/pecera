/**
 * Dataroom: la información de la empresa ordenada para un inversor. Junta lo que
 * ya existía (los datos de Transparencia, `empresa_datos`) y los documentos nuevos
 * (`empresa_documentos`: templates de Academy, textos propios y links). Las
 * categorías son espejo EXACTO del CHECK de la migración dataroom.
 */

export const CATEGORIAS_DATAROOM = [
  { valor: "empresa", label: "Empresa", bajada: "Qué es, qué la hace distinta y el pitch." },
  { valor: "fundadores", label: "Fundadores y equipo", bajada: "Quiénes son y por qué ustedes." },
  { valor: "producto", label: "Producto", bajada: "Problema, solución y propuesta de valor." },
  { valor: "mercado", label: "Mercado", bajada: "Tamaño, cliente ideal y competencia." },
  { valor: "modelo", label: "Modelo de negocio", bajada: "Cómo ganan plata y cómo llegan a sus clientes." },
  { valor: "finanzas", label: "Finanzas", bajada: "Unit economics, caja y proyecciones." },
  { valor: "traccion", label: "Tracción", bajada: "Usuarios, clientes, ingresos y crecimiento." },
  { valor: "fundraising", label: "Fundraising", bajada: "La ronda: cuánto, en qué condiciones y para qué." },
  { valor: "legal", label: "Legal", bajada: "Sociedad, socios, propiedad intelectual." },
  { valor: "otros", label: "Otros", bajada: "Todo lo que no entra en lo anterior." },
] as const;
export type CategoriaDataroom = (typeof CATEGORIAS_DATAROOM)[number]["valor"];

export function esCategoriaDataroom(v: string): v is CategoriaDataroom {
  return CATEGORIAS_DATAROOM.some((c) => c.valor === v);
}

export function labelCategoria(v: string): string {
  return CATEGORIAS_DATAROOM.find((c) => c.valor === v)?.label ?? "Otros";
}

/** En qué categoría del Dataroom cae cada dato de Transparencia (lib/transparencia.ts). */
export const CATEGORIA_DE_DATO: Record<string, CategoriaDataroom> = {
  mrr: "traccion",
  arr: "traccion",
  clientes: "traccion",
  usuarios_activos: "traccion",
  crecimiento_mensual: "traccion",
  retencion: "traccion",
  churn: "traccion",
  nps: "traccion",
  gmv: "traccion",
  cac: "finanzas",
  ltv: "finanzas",
  ltv_cac: "finanzas",
  payback: "finanzas",
  margen_bruto: "finanzas",
  ticket_promedio: "finanzas",
  burn_rate: "finanzas",
  runway: "finanzas",
  moat: "mercado",
  tam: "mercado",
  sam: "mercado",
  som: "mercado",
  competencia: "mercado",
  modelo_negocio: "modelo",
  go_to_market: "modelo",
  ronda_monto: "fundraising",
  valuacion: "fundraising",
  uso_fondos: "fundraising",
  inversores_actuales: "fundraising",
  pitch_deck: "empresa",
  one_pager: "empresa",
  video_demo: "producto",
  cap_table: "finanzas",
  proyecciones: "finanzas",
  data_room: "otros",
  estatuto: "legal",
  pacto_socios: "legal",
  vesting: "legal",
  safe: "legal",
  term_sheet: "legal",
  nda: "legal",
  cesion_ip: "legal",
  plan_esop: "legal",
};

export const TIPOS_DOCUMENTO = ["plantilla", "escrito", "link"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const LIMITES_DOCUMENTO = { titulo: 120, cuerpo: 20000, url: 500 } as const;

/** Valor de un campo de template: texto, o filas en los campos tipo tabla. */
export type ValorCampo = string | Array<Record<string, string>>;

export type Documento = {
  id: string;
  plantilla: string | null;
  categoria: CategoriaDataroom;
  tipo: TipoDocumento;
  titulo: string;
  campos: Record<string, ValorCampo>;
  cuerpo: string | null;
  url: string | null;
  completo: boolean;
  visible: boolean;
  archivado: boolean;
  updated_at: string;
};

const HACE = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

/** "hace 5 minutos", "ayer"… desde `ahora` (lo pasa quien renderiza). */
export function haceCuanto(iso: string, ahora: number): string {
  const seg = Math.round((new Date(iso).getTime() - ahora) / 1000);
  const abs = Math.abs(seg);
  if (abs < 60) return "recién";
  if (abs < 3600) return HACE.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return HACE.format(Math.round(seg / 3600), "hour");
  if (abs < 86400 * 30) return HACE.format(Math.round(seg / 86400), "day");
  return HACE.format(Math.round(seg / (86400 * 30)), "month");
}
