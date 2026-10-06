/**
 * Reglas puras de la pared de pitches (sin React ni Supabase, así se prueban con
 * `node scripts/pruebas/pared.ts`). La pared es una capa en el navegador: invita a entrar e
 * identifica a quien entra; NO protege los videos (sus URLs son públicas).
 */

export type EstadoPared = {
  /** Interruptor de /admin (config_funciones). Si no llegó, false: nunca se traba a nadie. */
  activa: boolean;
  /** Pitches distintos que se ven sin cuenta. */
  libres: number;
  /** Hay cookie de sesión: con cuenta no hay pared. */
  sesion: boolean;
  /** Pitches distintos que ya llegaron a 3 s sin cuenta (mismo criterio que las vistas). */
  vistos: readonly string[];
};

/** Tope de ids guardados: con más de 20 libres posibles, alcanza. */
const TOPE_VISTOS = 50;

/** ¿Este pitch queda detrás de la pared? Los ya vistos se pueden volver a ver. */
export function estaBloqueado(estado: EstadoPared, pitchId: string): boolean {
  return estado.activa && !estado.sesion && estado.vistos.length >= estado.libres && !estado.vistos.includes(pitchId);
}

/** Lee lo guardado; si está roto, vacío. */
export function leerVistos(guardado: unknown): string[] {
  return Array.isArray(guardado) ? guardado.filter((x): x is string => typeof x === "string").slice(-TOPE_VISTOS) : [];
}

/** null si ya estaba contado. */
export function sumarVisto(vistos: readonly string[], pitchId: string): string[] | null {
  if (vistos.includes(pitchId)) return null;
  return [...vistos, pitchId].slice(-TOPE_VISTOS);
}
