/**
 * Build in Public: hitos y avances de una empresa. Vocabularios espejo EXACTO de los
 * CHECK de la migración pitch_build_producto_newsletter (cambiar uno = migración
 * nueva). Las etapas son una guía: un hito puede no tener ninguna y no hace falta
 * pasar por todas.
 */

export const ETAPAS_BUILD = [
  { valor: "idea", label: "Idea" },
  { valor: "investigacion", label: "Investigación" },
  { valor: "prototipo", label: "Prototipo" },
  { valor: "mvp", label: "MVP" },
  { valor: "lanzamiento", label: "Lanzamiento" },
  { valor: "primeros_usuarios", label: "Primeros usuarios" },
  { valor: "traccion", label: "Tracción" },
  { valor: "crecimiento", label: "Crecimiento" },
  { valor: "fundraising", label: "Fundraising" },
  { valor: "expansion", label: "Expansión" },
] as const;
export type EtapaBuild = (typeof ETAPAS_BUILD)[number]["valor"];

export const ESTADOS_HITO = [
  { valor: "logrado", label: "Logrado" },
  { valor: "en_curso", label: "En curso" },
  { valor: "proximo", label: "Próximo" },
] as const;
export type EstadoHito = (typeof ESTADOS_HITO)[number]["valor"];

export const TITULO_HITO_MAX = 80;
export const DETALLE_HITO_MAX = 280;
export const AVANCE_MAX = 280;

export type Hito = {
  id: string;
  titulo: string;
  detalle: string | null;
  etapa: EtapaBuild | null;
  estado: EstadoHito;
  progreso: number | null;
  /** YYYY-MM-DD. Logrado: cuándo; próximo: para cuándo. */
  fecha: string | null;
  created_at: string;
};

export type Avance = {
  id: string;
  texto: string;
  hito_id: string | null;
  created_at: string;
};

/** Lo que se muestra del Build in Public en el feed y en el perfil. */
export type HitoActual = Pick<Hito, "titulo" | "progreso" | "etapa">;

export function labelEtapaBuild(valor: string | null | undefined): string | null {
  return ETAPAS_BUILD.find((e) => e.valor === valor)?.label ?? null;
}

export function esEtapaBuild(valor: string): valor is EtapaBuild {
  return ETAPAS_BUILD.some((e) => e.valor === valor);
}

export function esEstadoHito(valor: string): valor is EstadoHito {
  return ESTADOS_HITO.some((e) => e.valor === valor);
}

/** El hito en curso (hay uno como máximo), los logrados del más nuevo al más viejo y los próximos. */
export function ordenarHitos(hitos: Hito[]) {
  const porFecha = (a: Hito, b: Hito) =>
    (b.fecha ?? b.created_at).localeCompare(a.fecha ?? a.created_at);
  return {
    actual: hitos.find((h) => h.estado === "en_curso") ?? null,
    logrados: hitos.filter((h) => h.estado === "logrado").sort(porFecha),
    proximos: hitos
      .filter((h) => h.estado === "proximo")
      .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999")),
  };
}

// ---------------------------------------------------------------------------
// Racha: semanas seguidas con al menos un avance publicado
// ---------------------------------------------------------------------------

/** Metas de la racha, en semanas. */
export const METAS_RACHA = [2, 4, 8, 12, 26, 52] as const;

const ZONA = "America/Argentina/Buenos_Aires";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** Número de semana (lunes a domingo, hora de Buenos Aires) desde 1970. */
function semana(fecha: Date): number {
  const [y, m, d] = DIA.format(fecha).split("-").map(Number);
  const dias = Date.UTC(y, m - 1, d) / 86_400_000;
  // El 1/1/1970 fue jueves: +3 lleva el corte al lunes.
  return Math.floor((dias + 3) / 7);
}

export type Racha = {
  /** Semanas seguidas con avances, terminando esta semana o la anterior. */
  semanas: number;
  /** Ya hay un avance esta semana. Si no, la racha sigue viva hasta el domingo. */
  estaSemana: boolean;
  /** Próxima meta y la anterior (para la barra). Sin próxima: pasó las 52. */
  meta: number | null;
  metaAnterior: number;
};

/**
 * La racha sale solo de las fechas de los avances: nada se estima ni se guarda.
 * `ahora` se pasa desde el servidor (ISR) para que el cálculo sea uno solo.
 */
export function calcularRacha(fechas: string[], ahora: Date): Racha {
  const semanas = new Set(fechas.map((f) => semana(new Date(f))));
  const hoy = semana(ahora);
  const estaSemana = semanas.has(hoy);
  let cursor = estaSemana ? hoy : hoy - 1;
  let total = 0;
  while (semanas.has(cursor)) {
    total++;
    cursor--;
  }
  const meta = METAS_RACHA.find((m) => m > total) ?? null;
  const metaAnterior = [...METAS_RACHA].reverse().find((m) => m <= total) ?? 0;
  return { semanas: total, estaSemana, meta, metaAnterior };
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: ZONA });
const FECHA_DIA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Fecha de un avance (timestamp). */
export function fechaAvance(iso: string): string {
  return FECHA_CORTA.format(new Date(iso));
}

/** Fecha de un hito (columna date, sin zona). */
export function fechaHito(dia: string): string {
  return FECHA_DIA.format(new Date(`${dia}T00:00:00Z`));
}
