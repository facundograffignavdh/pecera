"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { CausticParams } from "@/components/ui/caustic-pool";

// El agua es un chunk aparte que solo se baja en escritorio: en el celular ni se carga.
const CausticPool = dynamic(() => import("@/components/ui/caustic-pool"), { ssr: false });

/** Desde `lg` de Tailwind. */
const ESCRITORIO = "(min-width: 1024px)";

/**
 * Agua celeste, como el interior de una pecera: el rojo se absorbe con la
 * profundidad, lo hondo tira a azul y las cáusticas se ven. Ningún texto va directo
 * sobre el agua: el del hero tiene su panel Marfil al 0,88 y el pie su píldora al 0,80,
 * medidos contra el píxel más oscuro posible del render (sin cáustica, viñeta y grano
 * en contra: luminancia 0,18). Las notificaciones de vidrio llevan Tinta sólida
 * (10,5:1 ahí). Constante de módulo: si cambia, el agua se reinicia.
 */
const AGUA: Partial<CausticParams> = {
  floorBase: 0.3,
  causticGain: 0.48,
  veinGain: 0.3,
  veinColor: [170, 235, 255],
  sandHi: [190, 226, 236],
  sandLo: [120, 180, 200],
  absorb: [230, 60, 20],
  absorbScale: 1.5,
  deepColor: [8, 105, 170],
  deepGain: 0.42,
  skyColor: [90, 185, 230],
  fresnelGain: 0.3,
  glintColor: [235, 250, 255],
  exposure: 1.35,
  grain: 0.012,
  vigDark: 0.78,
  vigBright: 1.05,
};
/** Antes del primer cuadro y sin WebGL2: el mismo celeste, quieto. */
const AGUA_FIJA = "radial-gradient(120% 90% at 35% 25%, #7cc4dc 0%, #4fa3c7 55%, #2f86b0 100%)";

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia(ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/** Fondo de agua del hero de /sumate, solo en escritorio. Es decoración. */
export default function AguaHero() {
  const escritorio = useSyncExternalStore(
    suscribir,
    () => window.matchMedia(ESCRITORIO).matches,
    () => false
  );
  if (!escritorio) return null;
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <CausticPool params={AGUA} fondo={AGUA_FIJA} height="100%" />
      {/* Empalma con el Marfil de la sección siguiente. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-marfil to-transparent" />
    </div>
  );
}
