"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { CausticParams } from "@/components/ui/caustic-pool";

// El agua es un chunk aparte que solo se baja en escritorio: en el celular ni se carga.
const CausticPool = dynamic(() => import("@/components/ui/caustic-pool"), { ssr: false });

/** Desde `lg` de Tailwind. */
const ESCRITORIO = "(min-width: 1024px)";

/**
 * Agua clara de pileta al sol: arena casi Marfil, poca absorción y el celeste de la
 * marca en lo hondo y en el reflejo del cielo. Su píxel más oscuro posible (sin
 * cáustica, viñeta y grano en contra) queda en luminancia 0,43: con el panel del
 * texto al 0,80, el Arcilla queda en 3,06:1 y tinta/65 en 4,86:1. Constante de
 * módulo: si cambia, el agua se reinicia.
 */
const AGUA: Partial<CausticParams> = {
  floorBase: 0.5,
  causticGain: 0.36,
  veinGain: 0.2,
  veinColor: [200, 236, 250],
  sandHi: [236, 226, 200],
  sandLo: [200, 192, 170],
  absorb: [90, 28, 12],
  absorbScale: 0.9,
  deepColor: [120, 196, 232],
  deepGain: 0.22,
  skyColor: [143, 211, 244],
  fresnelGain: 0.3,
  glintColor: [255, 250, 236],
  exposure: 1.8,
  grain: 0.012,
  vigDark: 0.85,
  vigBright: 1.02,
};
/** Antes del primer cuadro y sin WebGL2: el mismo agua, quieta. */
const AGUA_FIJA = "radial-gradient(120% 90% at 35% 25%, #eef3ee 0%, #d6e2e2 55%, #c4d2d2 100%)";

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
