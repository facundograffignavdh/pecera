/** Espejo del CHECK de `pitches.descripcion` (`pitches_descripcion_valida`, feria21_sin_tope). */
export const DESCRIPCION_PITCH_MAX = 150;

/** Largo que cuenta para el tope: sin los "#feria21" (ni el espacio de antes), como la base. */
export function largoDescripcionPitch(texto: string): number {
  return texto.replace(/\s*#feria21/gi, "").trim().length;
}
