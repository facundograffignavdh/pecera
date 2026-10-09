"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Video en loop de /nfc: la tarjeta de Pecera pasa a "TU LOGO", a Siglo 21 y a una marca premium
 * inventada (public/nfc/tarjetas-loop.mp4, 15 s, sin audio). Abajo, una etiqueta por tarjeta que se
 * marca sola según el momento del video. Con "reducir movimiento" no arranca solo: queda el póster
 * y los controles del navegador.
 */

/** Segundos del loop en que se ve cada tarjeta (el cambio cae a mitad de cada clip de 5 s). */
const TRAMOS: ReadonlyArray<readonly [desde: number, hasta: number, tarjeta: number]> = [
  [0, 2.2, 0],
  [2.2, 7, 1],
  [7, 11.7, 2],
  [11.7, 14.3, 3],
  [14.3, Infinity, 0],
];

const TARJETAS = ["Pecera", "Tu logo", "Siglo 21", "Premium"];

const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";
function suscribirMovimiento(avisar: () => void) {
  const consulta = window.matchMedia(MOVIMIENTO_REDUCIDO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

export default function AnimacionTarjetas() {
  const video = useRef<HTMLVideoElement>(null);
  const [actual, setActual] = useState(0);
  // En el servidor no se sabe: arranca como "con movimiento" y se corrige al hidratar.
  const quieto = useSyncExternalStore(
    suscribirMovimiento,
    () => window.matchMedia(MOVIMIENTO_REDUCIDO).matches,
    () => false
  );

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (quieto) v.pause();
    else v.play().catch(() => {});
  }, [quieto]);

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-tinta/5 shadow-[0_20px_50px_rgb(28_27_22/0.14)]">
        <video
          ref={video}
          src="/nfc/tarjetas-loop.mp4"
          poster="/nfc/tarjetas-poster.jpg"
          muted
          loop
          playsInline
          preload="auto"
          controls={quieto}
          aria-label="Animación: la tarjeta NFC de Pecera se transforma en tarjetas con el logo de cada marca"
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            const tramo = TRAMOS.find(([desde, hasta]) => t >= desde && t < hasta);
            setActual(tramo ? tramo[2] : 0);
          }}
          className="block aspect-[3/2] w-full object-cover"
        />
      </div>
      <ul aria-hidden className="mt-4 flex flex-wrap gap-1.5">
        {TARJETAS.map((nombre, i) => (
          <li
            key={nombre}
            className={`rounded-full border px-2.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-[var(--duracion)] ease-pecera ${
              i === actual ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta/75"
            }`}
          >
            {nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}
