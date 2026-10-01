import type { CSSProperties } from "react";
import { RONDAS, labelRonda } from "@/lib/etiquetas";
import { defDato } from "@/lib/transparencia";
import type { DatoEmpresa } from "@/types/pecera";

/**
 * Ronda que busca la empresa, como un camino (pre-seed → serie B) y con los datos
 * de ronda que el equipo compartió. No hay "cuánto levantaron": Pecera no lo sabe
 * ni lo estima. Si no busca ronda y no compartió nada de ronda, no se dibuja.
 */
export default function Ronda({ ronda, datos }: { ronda: string | null; datos: DatoEmpresa[] }) {
  const busca = ronda && ronda !== "no_busca" ? ronda : null;
  const deRonda = datos.filter((d) => defDato(d.clave)?.categoria === "Ronda");
  if (!busca && deRonda.length === 0) return null;

  const pasos = RONDAS.filter((r) => r.valor !== "no_busca");
  const indice = pasos.findIndex((r) => r.valor === busca);
  const monto = deRonda.find((d) => d.clave === "ronda_monto");
  const resto = deRonda.filter((d) => d !== monto);

  return (
    <div data-revelar className="mt-3 flex flex-col gap-4 rounded-3xl border border-tinta/10 px-4 py-5">
      {busca && (
        <>
          <p className="text-sm text-tinta/70">
            Están levantando <strong className="font-semibold text-tinta">{labelRonda(busca)}</strong>
          </p>
          <ol aria-label="Etapas de inversión" className="grid grid-cols-4 gap-1.5">
            {pasos.map((r, i) => (
              <li key={r.valor} className="flex flex-col gap-1.5">
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-tinta/10">
                  {i <= indice && (
                    <span
                      className="barra-progreso block h-full rounded-full bg-inversor"
                      style={{ "--p": 1, "--retraso": `${150 + i * 120}ms` } as CSSProperties}
                    />
                  )}
                </span>
                <span className={`text-[0.6875rem] leading-tight ${i === indice ? "font-semibold text-tinta" : "text-tinta/60"}`}>
                  {r.label}
                  {i === indice && <span className="sr-only"> (actual)</span>}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {monto?.valor && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{defDato(monto.clave)?.label}</p>
          <p className="font-display text-3xl font-semibold leading-tight text-tinta">{monto.valor}</p>
        </div>
      )}

      {resto.length > 0 && (
        <dl className="flex flex-col divide-y divide-tinta/10">
          {resto.map((d) => (
            <div key={d.clave} className="flex flex-col gap-0.5 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{defDato(d.clave)?.label}</dt>
              <dd className="text-sm text-tinta">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4 hover:text-arcilla">
                    {d.valor || "Ver documento"}
                  </a>
                ) : (
                  d.valor
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-xs leading-relaxed text-tinta/60">
        Datos cargados por el equipo; Pecera no los verifica. No es una oferta de inversión.
      </p>
    </div>
  );
}
