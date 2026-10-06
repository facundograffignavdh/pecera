import { CATEGORIA_DE_DATO } from "@/lib/dataroom";
import { PLANTILLAS } from "@/lib/plantillas";
import { type DatoScore, type DocumentoScore, type Score, calcularScore, construirMetricas } from "@/lib/score";
import { DATOS } from "@/lib/transparencia";

/**
 * El score (lib/score.ts) con los catálogos de la app. Es el que se usa en las páginas;
 * lib/score.ts queda sin imports para probarlo con node.
 */
export function scoreDeEmpresa(
  entrada: { documentos: readonly DocumentoScore[]; datos: readonly DatoScore[] },
  opciones?: { soloVisibles?: boolean }
): Score {
  return calcularScore(entrada, CATEGORIA_DE_DATO, opciones);
}

/** Qué métricas, documentos y templates de la app suben el score, por área (de los catálogos reales). */
export const METRICAS_SCORE = construirMetricas(
  { datos: DATOS, plantillas: PLANTILLAS.map((p) => ({ categoria: p.categoria, nombre: p.nombre })) },
  CATEGORIA_DE_DATO
);
