/**
 * Botones del sistema. Una sola fuente para que todos los primarios, secundarios
 * y fantasmas se vean y respondan igual en toda la app.
 *
 * - primario: naranja de marca con texto Tinta (AA). Uno por pantalla o tarjeta.
 * - secundario: borde cálido, para acciones al lado del primario.
 * - fantasma: solo texto, para acciones menores.
 * - oscuro: Tinta, para destacar sobre naranja o en bloques de marca.
 * - peligro: borde Arcilla, para borrar o salir (siempre con confirmación).
 *
 * Feedback: hover cambia el tono, apretar achica 2% (rápido). El foco siempre es
 * un contorno Arcilla visible (3,5:1 sobre Marfil).
 */
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,color,transform] duration-[var(--duracion-rapida)] ease-pecera active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:pointer-events-none disabled:opacity-60";

const VARIANTES = {
  primario: "bg-naranja text-tinta hover:bg-pecera",
  secundario: "border border-tinta/25 bg-transparent text-tinta hover:border-tinta",
  fantasma: "text-tinta underline-offset-4 hover:underline",
  oscuro: "bg-tinta text-marfil hover:bg-tinta/90",
  peligro: "border-2 border-arcilla text-tinta hover:bg-arcilla/10",
} as const;

const TAMANOS = {
  sm: "min-h-10 px-3.5 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
} as const;

export function boton(variante: keyof typeof VARIANTES = "primario", tamano: keyof typeof TAMANOS = "lg"): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]}`;
}
