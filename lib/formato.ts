/** Números cortos para contadores: hasta 999 tal cual; desde 1000, "1,2 mil". */
export function formatoCompacto(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil`;
}
