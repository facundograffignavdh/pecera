import type { CSSProperties } from "react";
import { Seccion, Tilde } from "@/components/landing/Seccion";

const HITOS = [
  { titulo: "MVP en 3 huertas piloto", estado: "logrado", fecha: "Agosto" },
  { titulo: "Primeras 1.000 bolsas vendidas", estado: "logrado", fecha: "Septiembre" },
  { titulo: "Beta pública", estado: "en_curso", progreso: 75 },
  { titulo: "100 clientes recurrentes", estado: "proximo", fecha: "Diciembre" },
] as const;

const AVANCES = [
  { texto: "Cerramos con dos viveros de Paraná.", cuando: "hace 2 días" },
  { texto: "Lanzamos la tienda online en beta cerrada.", cuando: "hace 1 semana" },
];

const SEMANAS = 12;
const RACHA = 6;

/**
 * Build in Public tiene identidad propia: banda oscura con el ámbar "obra". La
 * línea de tiempo crece, los hitos aparecen en orden, la barra del hito en curso
 * se llena y la racha se enciende semana por semana. Ejemplo rotulado.
 */
export default function BuildEnPublico() {
  return (
    <Seccion
      id="build-in-public"
      numero="06"
      etiqueta="Build in Public"
      titulo="Mostrá el avance, no solo la idea."
      bajada="Cada empresa marca sus hitos, publica avances cortos y suma una racha por cada semana que cuenta algo. Quien te sigue ve el camino, no solo el pitch."
      oscura
    >
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <ul data-revelar className="flex flex-col gap-5 self-center">
          {[
            ["Hitos con progreso", "Lo que viene, lo que está en curso y lo que ya lograste, con fecha."],
            ["Avances cortos", "Una línea por novedad. Sin producir contenido: contando lo que pasó."],
            ["Racha semanal", "Cada semana que publicás algo suma. Se calcula sola, de tus avances."],
            ["En el feed", "Tu pitch muestra en qué estás construyendo ahora."],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3.5">
              <Tilde className="mt-1 text-obra" />
              <div>
                <p className="font-semibold text-marfil">{t}</p>
                <p className="mt-0.5 leading-relaxed text-marfil/70">{d}</p>
              </div>
            </li>
          ))}
        </ul>

        <div
          data-revelar
          aria-label="Ejemplo de Build in Public: cuatro hitos, dos avances y una racha de seis semanas."
          role="img"
          className="relative rounded-[var(--radius-bloque)] border border-marfil/10 bg-marfil/[0.04] p-6 sm:p-8"
        >
          <span className="absolute right-5 top-5 rounded-full bg-marfil/10 px-2.5 py-1 text-xs font-semibold text-marfil/75">Ejemplo</span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-obra">Raíz Verde · Recorrido</p>

          <ol aria-hidden className="relative mt-6">
            <span className="linea-tiempo absolute bottom-3 left-[0.6875rem] top-3 w-px bg-marfil/20" />
            {HITOS.map((h, i) => (
              <li key={h.titulo} className="hito-bip relative flex gap-4 pb-6 last:pb-0" style={{ "--i": i } as CSSProperties}>
                <span
                  className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                    h.estado === "logrado"
                      ? "bg-obra text-tinta"
                      : h.estado === "en_curso"
                        ? "border-2 border-obra bg-tinta"
                        : "border border-dashed border-marfil/40 bg-tinta"
                  }`}
                >
                  {h.estado === "logrado" && <Tilde tamano="size-3.5" />}
                  {h.estado === "en_curso" && <span className="punto-vivo size-2 rounded-full bg-obra" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${h.estado === "proximo" ? "text-marfil/60" : "text-marfil"}`}>{h.titulo}</p>
                  {h.estado === "en_curso" ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-marfil/15">
                        <div className="barra-progreso h-full rounded-full bg-obra" style={{ "--p": h.progreso / 100, "--retraso": "900ms" } as CSSProperties} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-obra">{h.progreso}%</span>
                    </div>
                  ) : (
                    <p className="text-sm text-marfil/55">
                      {h.estado === "logrado" ? `Logrado · ${h.fecha}` : `Próximo · ${h.fecha}`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div aria-hidden className="mt-7 grid gap-2.5 border-t border-marfil/10 pt-6">
            {AVANCES.map((a) => (
              <p key={a.texto} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-marfil/[0.06] px-4 py-3 text-[15px] text-marfil/90">
                {a.texto}
                <span className="text-xs text-marfil/50">{a.cuando}</span>
              </p>
            ))}
          </div>

          <div aria-hidden className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-semibold text-marfil">
              <svg viewBox="0 0 32 40" className="h-6 w-5">
                <path className="llama" d="M16 2c1.2 6.4 9.5 10.6 9.5 20.2C25.5 30.4 21.2 37 16 37S6.5 30.4 6.5 22.6c0-5 2.4-8.4 5.1-10.8.3 3.4 1.6 5.6 3.6 6.6C14.6 12.2 15.2 6.4 16 2Z" fill="#f2c45f" />
              </svg>
              {RACHA} semanas seguidas
            </p>
            <span className="flex gap-1.5">
              {Array.from({ length: SEMANAS }, (_, i) => (
                <span
                  key={i}
                  data-lleno={i >= SEMANAS - RACHA || undefined}
                  className="racha-punto size-2.5 rounded-full bg-marfil/15"
                  style={{ "--i": i } as CSSProperties}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </Seccion>
  );
}
