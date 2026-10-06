import { NECESIDADES, categoriaDe } from "@/lib/etiquetas";

/**
 * Panel de la organización de la Feria 21 (/organizacion): lo que devuelve
 * `organizacion_networking` (migración panel_organizacion). Números sin el equipo y, con
 * nombre, solo quienes aceptaron compartir. `sin_completar` viene solo para admins.
 */
export type PanelOrganizacion = {
  personas: number;
  con_busca: number;
  con_ofrece: number;
  completos: number;
  con_interes: number;
  intereses: number;
  pendientes: number;
  rechazados: number;
  retirados: number;
  aceptados: number;
  matches: number;
  por_dia: Array<{ dia: string; intereses: number; aceptados: number }>;
  por_roles: Array<{ de: string; a: string; intereses: number; aceptados: number }>;
  busca: Record<string, number>;
  ofrece: Record<string, number>;
  busca_como: Record<string, number>;
  ofrece_como: Record<string, number>;
  consentimiento: { aceptan: number; retiraron: number; sin_decidir: number };
  consentidos: Consentido[];
  sin_completar: Array<{ slug: string; nombre: string; rol: string; falta: "busca" | "ofrece" | "ambos" }> | null;
  es_admin: boolean;
};

export type Consentido = {
  slug: string;
  nombre: string;
  rol: string;
  descripcion: string;
  ubicacion: string | null;
  busca: string[];
  ofrece: string[];
  busca_detalle: string[];
  ofrece_detalle: string[];
  busca_como: string[];
  ofrece_como: string[];
  participa: boolean;
  empresas: string | null;
  acepto_at: string;
};

/** Las opciones más elegidas, de mayor a menor. */
export function ranking(conteo: Record<string, number>, max = 10): Array<{ valor: string; n: number }> {
  return Object.entries(conteo)
    .map(([valor, n]) => ({ valor, n: Number(n) }))
    .sort((a, b) => b.n - a.n || a.valor.localeCompare(b.valor))
    .slice(0, max);
}

/**
 * Brechas: lo que muchos buscan y pocos ofrecen (al menos 2 que lo buscan y menos de la mitad
 * que lo ofrecen). Sirve para saber a quién sumar a la feria.
 */
export function brechas(busca: Record<string, number>, ofrece: Record<string, number>, max = 8) {
  return Object.entries(busca)
    .map(([valor, n]) => ({ valor, buscan: Number(n), ofrecen: Number(ofrece[valor] ?? 0) }))
    .filter((b) => b.buscan >= 2 && b.ofrecen * 2 < b.buscan)
    .sort((a, b) => b.buscan - b.ofrecen - (a.buscan - a.ofrecen))
    .slice(0, max);
}

/** Suma por categoría (las "en general" de antes cuentan en la suya). */
export function porCategoria(conteo: Record<string, number>): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [valor, n] of Object.entries(conteo)) {
    const c = categoriaDe(valor);
    if (c) salida[c] = (salida[c] ?? 0) + Number(n);
  }
  return salida;
}

/** Para el CSV: el label legible de cada opción. */
export const labelsNecesidad = (lista: string[]) =>
  lista.map((v) => NECESIDADES.find((n) => n.valor === v)?.label ?? v).join(" · ");
