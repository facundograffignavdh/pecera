"use client";

import dynamic from "next/dynamic";
import type { CausticParams } from "@/components/ui/caustic-pool";

// El agua es un chunk aparte (WebGL2, ~900 líneas): se baja después de pintar la página, no con ella.
const CausticPool = dynamic(() => import("@/components/ui/caustic-pool"), { ssr: false });

/**
 * El agua del hero: "deep-ocean" con más luz (exposición, cáusticas y vetas altas, viñeta
 * suave) y destellos cálidos que enlazan con la marca. El texto se lee gracias al velo azul
 * marino del hero y a la sombra de las letras, no a bajar el brillo del agua. Constante de
 * módulo: así `params` no cambia entre renders y el agua nunca se reinicia.
 */
const AGUA: Partial<CausticParams> = {
  exposure: 1.85,
  floorBase: 0.34,
  causticGain: 0.36,
  veinGain: 0.24,
  veinColor: [150, 215, 250],
  deepGain: 0.75,
  glintColor: [255, 236, 214],
  glintGain: 0.95,
  fresnelGain: 0.4,
  vigDark: 0.8,
};
/** Antes del primer cuadro y sin WebGL2: un celeste profundo, quieto. */
const AGUA_FIJA = "radial-gradient(120% 90% at 35% 25%, #4fa3c7 0%, #2f86b0 55%, #0f4f78 100%)";

/** Fondo de agua del hero de /sumate. Es decoración. */
export default function AguaHero() {
  return <CausticPool preset="deep-ocean" params={AGUA} fondo={AGUA_FIJA} height="100%" resolution={256} />;
}
