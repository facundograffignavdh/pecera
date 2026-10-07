import Link from "next/link";
import type { EstadoStand } from "@/lib/stand";
import { boton } from "@/lib/ui";

/** Lo que dice la tarjeta según el estado del juego (cuántas quedan, si está abierto). */
function estadoTexto(e: EstadoStand): string {
  if (!e.activo) return "El juego está cerrado por ahora.";
  if (!e.listo) return "Arranca pronto: estamos preparando las tarjetas.";
  if (e.quedan <= 0) return `Ya se ganaron las ${e.premios} tarjetas. ¡Gracias por jugar!`;
  return e.quedan === 1 ? `Queda 1 de ${e.premios} tarjetas.` : `Quedan ${e.quedan} de ${e.premios} tarjetas.`;
}

/**
 * Sección "Juego del stand" de la Feria 21 (/eventos/feria-21): invita a /stand. El estado sale de
 * `getEstadoStand` (ISR, hasta 60 s de atraso); sin la migración la página no la dibuja.
 */
export default function TarjetaJuegoStand({ estado }: { estado: EstadoStand }) {
  const jugable = estado.activo && estado.listo && estado.quedan > 0;
  return (
    <section
      aria-labelledby="juego-stand"
      className="tema-fijo relative mt-8 overflow-hidden rounded-[2rem] bg-tinta px-5 py-6 text-marfil sm:px-8"
    >
      <div aria-hidden className="pointer-events-none absolute -right-3 top-5 flex gap-2 opacity-90 sm:right-8">
        {[-10, 4, 14].map((giro) => (
          <span
            key={giro}
            style={{ transform: `rotate(${giro}deg)` }}
            className="carton flex h-14 w-10 items-center justify-center rounded-lg font-display text-2xl font-semibold text-tinta"
          >
            ?
          </span>
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-marfil/75">En el stand de Pecera</p>
      <h2 id="juego-stand" className="mt-2 max-w-[13rem] font-display text-3xl font-semibold leading-tight sm:max-w-none">
        Juego del stand
      </h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-marfil/90">
        Adiviná el número de 3 cifras en 3 intentos y ganate una tarjeta NFC de Pecera.
      </p>
      <p className="mt-2 text-sm font-semibold text-marfil">{estadoTexto(estado)}</p>
      <Link
        href="/stand"
        className={`mt-5 ${
          jugable
            ? boton("primario", "lg")
            : "inline-flex min-h-12 items-center rounded-full border border-marfil/40 px-6 text-base font-semibold text-marfil hover:border-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
        }`}
      >
        {jugable ? "Jugar" : "Ver el juego"}
      </Link>
    </section>
  );
}
