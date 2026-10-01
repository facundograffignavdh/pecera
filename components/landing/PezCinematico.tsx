import VideoFondo from "@/components/landing/VideoFondo";

/**
 * El pez de Pecera y el lema. Jerarquía: video → "Las bocas cerradas no se alimentan."
 * → Build in Public (la sección que sigue).
 *
 * El video va limpio: sin texto encima y sin velo negro (antes lo tapaba un 55-92 %
 * de negro). La luz se arma en capas, todas CSS y baratas:
 *  - color: un toque de contraste y saturación sobre el propio video;
 *  - rayos de sol que entran por arriba y se mecen despacio;
 *  - un resplandor cálido (naranja de la marca) donde nada el pez;
 *  - viñeta suave en los bordes, para dar profundidad sin apagar el centro;
 *  - burbujas que suben (solo con movimiento permitido).
 * Formato: 16:10 en el celular (recorta apenas un 10 %: el pez cruza de lado a lado y
 * se ve entero), 16:9 en tablet y 2:1 en la compu. Sin conexión rápida o con "reducir movimiento", queda
 * el póster. Los estilos viven en globals.css (.pez-*).
 */

// Burbujas: posición, tamaño y ritmo fijos (sin Math.random: el HTML del servidor y el
// del navegador tienen que coincidir).
const BURBUJAS = [
  { x: 8, t: 5, d: 11, r: 0 },
  { x: 17, t: 3, d: 14, r: 4 },
  { x: 26, t: 6, d: 12, r: 7 },
  { x: 35, t: 4, d: 16, r: 2 },
  { x: 47, t: 3, d: 13, r: 9 },
  { x: 58, t: 5, d: 15, r: 5 },
  { x: 67, t: 3, d: 12, r: 1 },
  { x: 76, t: 6, d: 17, r: 8 },
  { x: 85, t: 4, d: 13, r: 3 },
  { x: 93, t: 3, d: 15, r: 6 },
] as const;

export default function PezCinematico() {
  return (
    <section aria-labelledby="bocas-titulo" className="relative isolate overflow-hidden bg-[#04090d] text-white">
      {/* Agua profunda detrás: un azul petróleo arriba y un poco de naranja abajo. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_0%,rgb(20_110_140/0.38),transparent_72%),radial-gradient(45%_40%_at_15%_100%,rgb(248_124_67/0.16),transparent_70%),radial-gradient(40%_35%_at_90%_95%,rgb(31_122_82/0.14),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-[110rem] sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">
        <figure
          data-revelar
          className="pez-marco relative aspect-[16/10] w-full overflow-hidden sm:rounded-[2rem] md:aspect-video lg:aspect-[2/1]"
        >
          <VideoFondo
            src="/landing/pecera-hero.mp4"
            poster="/landing/pez-poster.webp"
            posterMovil="/landing/pez-poster-movil.webp"
            className="pez-video absolute inset-0 h-full w-full object-cover object-[50%_50%]"
          />
          <span aria-hidden className="pez-rayos" />
          <span aria-hidden className="pez-calido" />
          <span aria-hidden className="pez-vineta" />
          <span aria-hidden className="pez-burbujas">
            {BURBUJAS.map((b) => (
              <i
                key={b.x}
                style={{ left: `${b.x}%`, width: `${b.t}px`, height: `${b.t}px`, animationDuration: `${b.d}s`, animationDelay: `-${b.r}s` }}
              />
            ))}
          </span>
          <figcaption className="sr-only">Un pez dorado nadando en un acuario con plantas.</figcaption>
        </figure>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-14 text-center sm:px-8 sm:pb-28 sm:pt-20 lg:pt-24">
        <h2
          id="bocas-titulo"
          data-revelar
          className="font-display text-[clamp(1.7rem,8.4vw,2.45rem)] font-semibold leading-[1.04] tracking-[-0.02em] whitespace-nowrap sm:text-6xl lg:text-[5.4rem]"
        >
          <span className="block">Las bocas cerradas</span>
          <span className="block text-pecera">no se alimentan.</span>
        </h2>
        <span aria-hidden className="pez-linea mx-auto mt-8 block h-px w-24 bg-gradient-to-r from-transparent via-pecera to-transparent" />
      </div>
      {/* Puente de luz hacia la franja naranja que sigue: el negro se calienta antes del corte. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#bf4513]/40" />
    </section>
  );
}
