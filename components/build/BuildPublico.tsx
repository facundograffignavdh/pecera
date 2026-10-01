import Link from "next/link";
import type { CSSProperties } from "react";
import InsigniaBuild from "@/components/build/InsigniaBuild";
import Racha from "@/components/build/Racha";
import {
  ETAPAS_BUILD,
  type Avance,
  type Hito,
  calcularRacha,
  fechaAvance,
  fechaHito,
  labelEtapaBuild,
  ordenarHitos,
} from "@/lib/build";

/**
 * Build in Public de una empresa, en su página (`completo`) o resumido en el perfil
 * de un miembro (con link a la empresa). Solo muestra lo que el equipo cargó: si no
 * hay hitos ni avances, no dibuja nada (la página de la empresa ya tiene su vacío).
 */
export default function BuildPublico({
  hitos,
  avances,
  ahora,
  completo = true,
  hrefEmpresa,
}: {
  hitos: Hito[];
  avances: Avance[];
  /** Hora del render del servidor (ISR): la racha se calcula una sola vez. */
  ahora: Date;
  completo?: boolean;
  hrefEmpresa?: string;
}) {
  if (hitos.length === 0 && avances.length === 0) return null;
  const { actual, logrados, proximos } = ordenarHitos(hitos);
  const racha = calcularRacha(
    avances.map((a) => a.created_at),
    ahora
  );
  const etapasAlcanzadas = new Set(
    [...logrados, ...(actual ? [actual] : [])].map((h) => h.etapa).filter(Boolean)
  );

  if (!completo) {
    return (
      <div className="mt-3 flex flex-col gap-3 rounded-3xl border border-obra/70 bg-obra-suave/50 p-4">
        <InsigniaBuild className="self-start" />
        {actual ? <HitoActual hito={actual} /> : logrados[0] && <Ultimo hito={logrados[0]} />}
        {proximos[0] && (
          <p className="text-sm text-tinta/80">
            <span className="font-semibold text-tinta">Próximo:</span> {proximos[0].titulo}
          </p>
        )}
        {racha.semanas > 0 && (
          <p className="text-sm font-medium text-tinta">
            {racha.semanas} {racha.semanas === 1 ? "semana" : "semanas seguidas"} publicando avances
          </p>
        )}
        {hrefEmpresa && (
          <Link
            href={`${hrefEmpresa}#build`}
            className="inline-flex min-h-10 items-center self-start rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            Ver todo el recorrido
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {actual && (
        <div data-revelar className="rounded-3xl border border-obra/70 bg-obra-suave/50 p-4">
          <HitoActual hito={actual} grande />
        </div>
      )}

      {etapasAlcanzadas.size > 0 && <Camino alcanzadas={etapasAlcanzadas} actual={actual?.etapa ?? null} />}

      {avances.length > 0 && <Racha racha={racha} />}

      {(logrados.length > 0 || proximos.length > 0) && (
        <ol data-revelar className="relative flex flex-col gap-0 pl-5 before:absolute before:bottom-2 before:left-[0.4375rem] before:top-2 before:w-px before:bg-tinta/15">
          {proximos.map((h) => (
            <PuntoLinea key={h.id} hito={h} tipo="proximo" />
          ))}
          {logrados.map((h) => (
            <PuntoLinea key={h.id} hito={h} tipo="logrado" />
          ))}
        </ol>
      )}

      {avances.length > 0 && <Avances avances={avances} hitos={hitos} />}
    </div>
  );
}

function HitoActual({ hito, grande = false }: { hito: Hito; grande?: boolean }) {
  const etapa = labelEtapaBuild(hito.etapa);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-t-ocre">
        <span aria-hidden className="punto-vivo size-2 rounded-full bg-obra" />
        Hito actual{etapa && ` · ${etapa}`}
      </p>
      <p className={`font-display font-semibold leading-tight text-tinta ${grande ? "text-2xl" : "text-lg"}`}>
        {hito.titulo}
      </p>
      {grande && hito.detalle && <p className="text-sm leading-relaxed text-tinta/80">{hito.detalle}</p>}
      {hito.progreso !== null && (
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={`Progreso de ${hito.titulo}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hito.progreso}
            className={`flex-1 overflow-hidden rounded-full bg-tinta/10 ${grande ? "h-3" : "h-2"}`}
          >
            <div
              className="barra-progreso h-full rounded-full bg-t-ocre"
              style={{ "--p": hito.progreso / 100 } as CSSProperties}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-tinta">
            <span aria-hidden className="contador" style={{ "--valor": hito.progreso } as CSSProperties} />
            <span aria-hidden>%</span>
            <span className="sr-only">{hito.progreso}%</span>
          </span>
        </div>
      )}
      <p className="text-xs text-tinta/60">Progreso según el equipo.</p>
    </div>
  );
}

function Ultimo({ hito }: { hito: Hito }) {
  return (
    <p className="text-sm text-tinta/80">
      <span className="font-semibold text-tinta">Último logro:</span> {hito.titulo}
      {hito.fecha && <span className="text-tinta/60"> · {fechaHito(hito.fecha)}</span>}
    </p>
  );
}

/**
 * Las etapas como un camino: se marcan las que el equipo usó en sus hitos. No es
 * una escala obligatoria; cada startup tiene su recorrido.
 */
function Camino({ alcanzadas, actual }: { alcanzadas: Set<string | null>; actual: string | null }) {
  return (
    <div data-revelar>
      <p className="text-xs text-tinta/60">Etapas que recorrieron (cada startup tiene su camino):</p>
      <ol className="no-scrollbar mt-2 flex snap-x gap-1.5 overflow-x-auto pb-1">
        {ETAPAS_BUILD.map((e) => {
          const es = e.valor === actual;
          const paso = alcanzadas.has(e.valor);
          return (
            <li
              key={e.valor}
              className={`shrink-0 snap-start rounded-full px-2.5 py-1 text-xs font-medium ${
                es
                  ? "bg-obra text-tinta"
                  : paso
                    ? "bg-tinta text-marfil"
                    : "border border-tinta/15 text-tinta/50"
              }`}
            >
              {e.label}
              <span className="sr-only">{es ? " (actual)" : paso ? " (recorrida)" : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PuntoLinea({ hito, tipo }: { hito: Hito; tipo: "logrado" | "proximo" }) {
  const etapa = labelEtapaBuild(hito.etapa);
  return (
    <li className="relative pb-4 last:pb-0">
      <span
        aria-hidden
        className={`absolute -left-5 top-1 flex size-3.5 items-center justify-center rounded-full ${
          tipo === "logrado" ? "bg-aliado" : "border-2 border-tinta/30 bg-marfil"
        }`}
      >
        {tipo === "logrado" && (
          <svg viewBox="0 0 12 12" className="size-2.5 text-marfil">
            <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <p className="text-xs font-medium text-tinta/60">
        {tipo === "logrado" ? "Logrado" : "Próximo"}
        {hito.fecha && ` · ${tipo === "proximo" ? "para el " : ""}${fechaHito(hito.fecha)}`}
        {etapa && ` · ${etapa}`}
      </p>
      <p className={`text-sm font-semibold ${tipo === "logrado" ? "text-tinta" : "text-tinta/80"}`}>{hito.titulo}</p>
      {hito.detalle && <p className="text-sm leading-snug text-tinta/70">{hito.detalle}</p>}
    </li>
  );
}

/** Los últimos 3 avances a la vista; el resto, a un toque (sin cargar otra página). */
function Avances({ avances, hitos }: { avances: Avance[]; hitos: Hito[] }) {
  const tituloHito = new Map(hitos.map((h) => [h.id, h.titulo]));
  const fila = (a: Avance) => (
    <li key={a.id} className="flex flex-col gap-0.5 border-t border-tinta/10 py-2.5 first:border-t-0">
      <p className="text-xs text-tinta/60">
        {fechaAvance(a.created_at)}
        {a.hito_id && tituloHito.get(a.hito_id) && ` · ${tituloHito.get(a.hito_id)}`}
      </p>
      <p className="text-sm leading-relaxed text-tinta">{a.texto}</p>
    </li>
  );
  const visibles = avances.slice(0, 3);
  const resto = avances.slice(3, 30);
  return (
    <div data-revelar>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Últimos avances</h3>
      <ul className="mt-1">{visibles.map(fila)}</ul>
      {resto.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="transition-transform duration-300 ease-pecera group-open:rotate-90">›</span>
            Ver {resto.length} {resto.length === 1 ? "avance más" : "avances más"}
          </summary>
          <ul>{resto.map(fila)}</ul>
        </details>
      )}
    </div>
  );
}
