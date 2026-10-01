/**
 * Portfolio de inversores y aliados. Vocabularios espejo EXACTO de los CHECK de la
 * migración portfolio (cambiar uno = migración nueva).
 *
 * La distinción que no se puede perder: un inversor muestra en qué invirtió y a
 * quién apoyó (y lo dice por separado); un aliado muestra con quién trabajó y qué
 * hizo. Nunca se da a entender inversión donde no la hubo.
 */
import type { Rol } from "@/types/pecera";

export const TIPOS_PORTFOLIO = [
  { valor: "inversion", label: "Inversión", verbo: "Invirtió en", para: ["inversor"] },
  { valor: "asesoria", label: "Asesoría", verbo: "Asesora a", para: ["inversor", "aliado"] },
  { valor: "directorio", label: "Directorio", verbo: "En el directorio de", para: ["inversor"] },
  { valor: "mentoria", label: "Mentoría", verbo: "Mentorea a", para: ["inversor", "aliado"] },
  { valor: "aceleracion", label: "Aceleración", verbo: "Aceleró a", para: ["inversor", "aliado"] },
  { valor: "fundacion", label: "Fundó o dirigió", verbo: "Fundó o dirigió", para: ["inversor", "aliado"] },
  { valor: "cliente", label: "Cliente", verbo: "Trabajó para", para: ["aliado"] },
  { valor: "alianza", label: "Alianza", verbo: "Aliado de", para: ["aliado", "inversor"] },
  { valor: "otro", label: "Otra participación", verbo: "Participó con", para: ["inversor", "aliado"] },
] as const satisfies ReadonlyArray<{ valor: string; label: string; verbo: string; para: ReadonlyArray<Rol> }>;
export type TipoPortfolio = (typeof TIPOS_PORTFOLIO)[number]["valor"];

export const ESTADOS_PORTFOLIO = [
  { valor: "actual", label: "Actual" },
  { valor: "pasado", label: "Pasado" },
  { valor: "exit", label: "Exit" },
  { valor: "adquirida", label: "Adquirida" },
  { valor: "cerrada", label: "Cerrada" },
] as const;
export type EstadoPortfolio = (typeof ESTADOS_PORTFOLIO)[number]["valor"];

export const RONDAS_PORTFOLIO = [
  { valor: "pre_seed", label: "Pre-seed" },
  { valor: "seed", label: "Seed" },
  { valor: "serie_a", label: "Serie A" },
  { valor: "serie_b", label: "Serie B o más" },
  { valor: "otra", label: "Otra" },
] as const;

export const VISIBILIDADES = [
  { valor: "publico", label: "Pública", ayuda: "La ve cualquiera que abra tu perfil." },
  { valor: "miembros", label: "Solo cuentas de Pecera", ayuda: "La ven quienes entraron con su cuenta." },
  { valor: "privado", label: "Privada", ayuda: "Solo vos. Sirve para tu registro." },
] as const;
export type Visibilidad = (typeof VISIBILIDADES)[number]["valor"];

export const CONFIRMACIONES = {
  declarada: "Declarado por el perfil",
  pendiente: "Esperando confirmación de la empresa",
  confirmada: "Confirmado por la empresa",
  rechazada: "Declarado por el perfil",
} as const;
export type Confirmacion = keyof typeof CONFIRMACIONES;

export const GEOGRAFIAS = [
  { valor: "argentina", label: "Argentina" },
  { valor: "latam", label: "Latinoamérica" },
  { valor: "eeuu", label: "Estados Unidos" },
  { valor: "europa", label: "Europa" },
  { valor: "global", label: "Global" },
] as const;

export const MODELOS = [
  { valor: "b2b", label: "B2B" },
  { valor: "b2c", label: "B2C" },
  { valor: "b2b2c", label: "B2B2C" },
  { valor: "b2g", label: "B2G" },
  { valor: "marketplace", label: "Marketplace" },
] as const;

export const MODALIDADES = [
  { valor: "remoto", label: "Remoto" },
  { valor: "presencial", label: "Presencial" },
  { valor: "ambos", label: "Remoto y presencial" },
] as const;

export const LIMITES_PORTFOLIO = {
  nombre: 80,
  web: 200,
  ubicacion: 80,
  rol: 120,
  descripcion: 400,
  desafio: 600,
  solucion: 600,
  resultado: 140,
  resultados: 5,
  enlace: 300,
  servicio: 80,
  servicioDescripcion: 400,
  precio: 60,
  tesis: 600,
  busca: 280,
} as const;

export type EntradaPortfolio = {
  id: string;
  tipo: TipoPortfolio;
  empresa_id: string | null;
  /** Slug de la empresa de Pecera enlazada (si es visible). */
  empresa?: { slug: string; nombre: string } | null;
  nombre: string;
  web: string | null;
  industria: string | null;
  ubicacion: string | null;
  estado: EstadoPortfolio;
  ronda: string | null;
  lider: boolean | null;
  anio: number | null;
  rol: string | null;
  descripcion: string | null;
  desafio: string | null;
  solucion: string | null;
  resultados: string[];
  enlace: string | null;
  visibilidad: Visibilidad;
  confirmacion: Confirmacion;
};

export type Servicio = {
  id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  modalidad: string | null;
  precio: string | null;
};

export type Tesis = {
  texto: string | null;
  geografias: string[];
  modelos: string[];
  busca: string | null;
};

export const COLUMNAS_PORTFOLIO =
  "id, tipo, empresa_id, nombre, web, industria, ubicacion, estado, ronda, lider, anio, rol, descripcion, desafio, solucion, resultados, enlace, visibilidad, confirmacion";

const tipo = new Map<string, (typeof TIPOS_PORTFOLIO)[number]>(TIPOS_PORTFOLIO.map((t) => [t.valor, t]));
export const defTipo = (v: string) => tipo.get(v);
export const labelEstado = (v: string) => ESTADOS_PORTFOLIO.find((e) => e.valor === v)?.label ?? v;
export const labelRondaPortfolio = (v: string | null) => RONDAS_PORTFOLIO.find((r) => r.valor === v)?.label ?? null;
export const labelGeografia = (v: string) => GEOGRAFIAS.find((g) => g.valor === v)?.label ?? v;
export const labelModelo = (v: string) => MODELOS.find((m) => m.valor === v)?.label ?? v;
export const labelModalidad = (v: string | null) => MODALIDADES.find((m) => m.valor === v)?.label ?? null;

export const esTipo = (v: string): v is TipoPortfolio => tipo.has(v);
export const esEstado = (v: string): v is EstadoPortfolio => ESTADOS_PORTFOLIO.some((e) => e.valor === v);
export const esVisibilidad = (v: string): v is Visibilidad => VISIBILIDADES.some((e) => e.valor === v);

/** Es un caso de éxito si contó el desafío o la solución. */
export const esCaso = (e: Pick<EntradaPortfolio, "desafio" | "solucion">) => !!(e.desafio || e.solucion);

/**
 * Cómo se agrupa el portfolio en el perfil. Inversor: inversiones actuales, exits y
 * pasadas, y aparte el apoyo sin inversión. Aliado: con quién trabaja hoy y antes.
 */
export function agrupar(rol: Rol, entradas: EntradaPortfolio[]) {
  if (rol === "inversor") {
    const inversiones = entradas.filter((e) => e.tipo === "inversion");
    return [
      { id: "actual", titulo: "Inversiones actuales", items: inversiones.filter((e) => e.estado === "actual") },
      { id: "exits", titulo: "Exits", items: inversiones.filter((e) => e.estado === "exit" || e.estado === "adquirida") },
      { id: "pasadas", titulo: "Inversiones pasadas", items: inversiones.filter((e) => e.estado === "pasado" || e.estado === "cerrada") },
      { id: "apoyo", titulo: "Asesoría, directorio y otras participaciones", items: entradas.filter((e) => e.tipo !== "inversion") },
    ].filter((g) => g.items.length > 0);
  }
  return [
    { id: "actual", titulo: "Trabaja hoy con", items: entradas.filter((e) => e.estado === "actual") },
    { id: "pasado", titulo: "Trabajó con", items: entradas.filter((e) => e.estado !== "actual") },
  ].filter((g) => g.items.length > 0);
}

/**
 * Track record calculado del portfolio visible (nunca tipeado a mano): cuántas
 * inversiones, exits, industrias y cuántas confirmó la empresa.
 */
export function trackRecord(entradas: EntradaPortfolio[]) {
  const inversiones = entradas.filter((e) => e.tipo === "inversion");
  const industrias = [...new Set(entradas.map((e) => e.industria).filter((x): x is string => !!x))];
  return {
    inversiones: inversiones.length,
    exits: inversiones.filter((e) => e.estado === "exit" || e.estado === "adquirida").length,
    apoyos: entradas.length - inversiones.length,
    confirmadas: entradas.filter((e) => e.confirmacion === "confirmada").length,
    industrias,
  };
}
