/**
 * Escena del pop-up: la caña con el sedal en el agua, un pez que llega, muerde
 * y la punta se dobla con un tirón. Las clases están en `globals.css`. Sin
 * animación (prefers-reduced-motion) queda el reposo: pez junto al anzuelo.
 *
 * La punta rota en dos tramos (sobre 90,18 y 112,13); lo que cuelga (sedal,
 * anzuelo, pez) contrarrota sobre la punta (132,8), así sigue vertical y baja
 * con el tirón en lugar de girar.
 */
export default function EscenaPique({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`escena-pique ${className}`}
    >
      {/* Agua */}
      <path
        d="M-4 52q12.5-5 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0"
        stroke="#1C1B16"
        strokeOpacity={0.25}
        strokeWidth={2}
      />

      {/* Burbujas, desde la boca del pez hacia la superficie */}
      <g stroke="#1C1B16" strokeOpacity={0.4} strokeWidth={1.5}>
        <circle className="burbuja" cx="121" cy="74" r="2.6" />
        <circle className="burbuja burbuja-2" cx="115" cy="68" r="1.9" />
        <circle className="burbuja burbuja-3" cx="124" cy="64" r="1.5" />
      </g>

      {/* Caña: mango y tramo fijo */}
      <g stroke="#1C1B16">
        <path d="M4 45 22 38" strokeWidth={7} />
        <path d="M22 38 90 18" strokeWidth={4.5} />
        <circle cx="26" cy="44" r="4" strokeWidth={3} />
      </g>

      {/* Punta en dos tramos encadenados: al girar los dos, se curva en vez de quebrarse. */}
      <g className="cana-punta">
        <path d="M90 18 112 13" stroke="#1C1B16" strokeWidth={4} />

        <g className="cana-punta-fina">
          <path d="M112 13 132 8" stroke="#1C1B16" strokeWidth={3.25} />

          <g className="cana-colgante">
            {/* Sedal */}
            <path d="M132 8v62" stroke="#1C1B16" strokeOpacity={0.7} strokeWidth={1.25} />

            {/* Pez: nado de llegada y mordida en grupos separados */}
            <g className="pez-llega">
              <g className="pez-muerde">
                <path
                  className="pez-cola"
                  d="M163 78c4-4 8-8 14-10-2 6-2 14 0 20-6-2-10-6-14-10z"
                  fill="#F7A878"
                />
                <path d="M141 70c4-7 12-8 17-1z" fill="#F7A878" />
                <path
                  d="M129 78c0-8 10-10.5 20-10 8 .5 13 5 16 10-3 5-8 9.5-16 10-10 .5-20-2-20-10z"
                  fill="#F87C43"
                />
                <path d="M146 81c3 3 7 4 9.5 2-3-2.5-6.5-3-9.5-2z" fill="#F7A878" />
                <path d="M141 72.5c1.8 3.5 1.8 7.5 0 11" stroke="#F7A878" strokeWidth={1.5} />
                <circle cx="135.5" cy="76" r="2" fill="#1C1B16" />
              </g>
            </g>

            {/* Anzuelo, encima del pez: queda en la boca */}
            <path
              d="M132 69v7a4 4 0 0 1-8 0v-2"
              stroke="#1C1B16"
              strokeWidth={2.25}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
