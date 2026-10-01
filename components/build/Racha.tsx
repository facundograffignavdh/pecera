import type { CSSProperties } from "react";
import { METAS_RACHA, type Racha as DatosRacha } from "@/lib/build";

/**
 * Racha de Build in Public: semanas seguidas con al menos un avance. Sale de las
 * fechas reales de los avances (lib/build.ts). La barra va de la meta anterior a la
 * próxima, así siempre hay un "falta poco" a la vista.
 */
export default function Racha({ racha, propia = false }: { racha: DatosRacha; propia?: boolean }) {
  const { semanas, estaSemana, meta, metaAnterior } = racha;
  const proporcion = meta ? (semanas - metaAnterior) / (meta - metaAnterior) : 1;
  const faltan = meta ? meta - semanas : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-obra/60 bg-obra-suave/60 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Llama apagada={semanas === 0} />
        <p className="min-w-0 flex-1 text-sm text-tinta">
          {semanas > 0 ? (
            <>
              <span className="sr-only">{semanas}</span>
              <span
                aria-hidden
                className="contador font-display text-2xl font-semibold leading-none"
                style={{ "--valor": semanas } as CSSProperties}
              />{" "}
              <span className="font-medium">{semanas === 1 ? "semana" : "semanas seguidas"}</span>
              <span className="block text-tinta/70">construyendo en público</span>
            </>
          ) : (
            <span className="text-tinta/80">
              Todavía no hay racha. Una semana con un avance la empieza.
            </span>
          )}
        </p>
      </div>

      {semanas > 0 && meta && (
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-label={`Racha hacia la meta de ${meta} semanas`}
            aria-valuemin={metaAnterior}
            aria-valuemax={meta}
            aria-valuenow={semanas}
            className="h-1.5 overflow-hidden rounded-full bg-tinta/10"
          >
            <div className="barra-progreso h-full rounded-full bg-t-ocre" style={{ "--p": proporcion } as CSSProperties} />
          </div>
          <p className="text-xs text-tinta/75">
            {faltan === 1 ? "Falta 1 semana" : `Faltan ${faltan} semanas`} para la meta de {meta}.
          </p>
        </div>
      )}

      {semanas > 0 && !estaSemana && (
        <p className="text-xs font-medium text-tinta">
          {propia ? "Publicá un avance esta semana para no cortarla." : "Todavía no publicaron un avance esta semana."}
        </p>
      )}

      <ul aria-label="Metas de la racha" className="flex flex-wrap gap-1.5">
        {METAS_RACHA.map((m) => {
          const lograda = semanas >= m;
          return (
            <li
              key={m}
              className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums ${
                lograda ? "bg-t-ocre text-marfil" : "border border-tinta/15 text-tinta/60"
              }`}
            >
              {m} sem{lograda && <span className="sr-only"> (lograda)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Llama({ apagada }: { apagada: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 32 40" className="h-10 w-8 shrink-0">
      <path
        className={apagada ? "" : "llama"}
        d="M16 2c1.2 6.4 9.5 10.6 9.5 20.2C25.5 30.4 21.2 37 16 37S6.5 30.4 6.5 22.6c0-5 2.4-8.4 5.1-10.8.3 3.4 1.6 5.6 3.6 6.6C14.6 12.2 15.2 6.4 16 2Z"
        fill={apagada ? "rgb(28 27 22 / 0.15)" : "#d95a22"}
      />
      {!apagada && (
        <path
          className="llama"
          d="M16 19c3.6 3 5 5.8 5 9.2 0 3.6-2.2 6.3-5 6.3s-5-2.7-5-6.3c0-2.4 1.1-4.4 2.6-5.6.4 1.8 1.2 2.8 2.4 3.2-.3-2.6-.3-4.6 0-6.8Z"
          fill="#f2c45f"
        />
      )}
    </svg>
  );
}
