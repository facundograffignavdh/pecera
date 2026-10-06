/**
 * Reglas puras de "Quién vio tu perfil" del lado del navegador (sin React ni Supabase, así se
 * prueban con `node scripts/pruebas/visitas.ts`): el día en Buenos Aires y la deduplicación por
 * día. La base también deduplica (una fila por visitante → visitado → tipo → día).
 */

export type TipoVisita = "perfil" | "pitch" | "pique";

/** Si cambia el texto, cambia la versión (la base guarda cuál se vio). */
export const AVISO_VISITAS = {
  version: "visitas-v1",
  texto:
    "Ahora cada perfil ve quién lo visitó: tu nombre, rol, empresa y el día (sin hora) en que viste su perfil o su pitch, o le diste pique. Si preferís, usá el modo privado: no se muestra tu nombre y vos tampoco ves quién te visitó.",
} as const;

/** Lo que se guarda en localStorage: las visitas ya mandadas hoy. */
export type VisitasDelDia = { dia: string; claves: string[] };

/** Tope de claves guardadas por día (alcanza y sobra: la base limita a 60 por minuto). */
const TOPE_CLAVES = 300;

/** "2026-10-06": el día en Buenos Aires, igual que `visitas_hoy()` en la base. */
export function diaBuenosAires(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

export function claveVisita(tipo: TipoVisita, id: string): string {
  return `${tipo}:${id}`;
}

/** Lee lo guardado; si es de otro día o está roto, empieza de cero. */
export function delDia(guardado: unknown, dia: string): VisitasDelDia {
  const g = guardado as Partial<VisitasDelDia> | null;
  return g && g.dia === dia && Array.isArray(g.claves)
    ? { dia, claves: g.claves.filter((c): c is string => typeof c === "string") }
    : { dia, claves: [] };
}

/** null si ya se mandó hoy; si no, lo nuevo a guardar. */
export function sumarClave(actual: VisitasDelDia, clave: string): VisitasDelDia | null {
  if (actual.claves.includes(clave)) return null;
  return { dia: actual.dia, claves: [...actual.claves, clave].slice(-TOPE_CLAVES) };
}

export function sacarClave(actual: VisitasDelDia, clave: string): VisitasDelDia {
  return { dia: actual.dia, claves: actual.claves.filter((c) => c !== clave) };
}
