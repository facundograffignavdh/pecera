"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useProgreso } from "@/components/academy/useProgreso";
import { type Leccion, MODULOS, type Modulo } from "@/lib/essentials";
import { PLANTILLAS } from "@/lib/plantillas";

/**
 * Las lecciones por módulo, con el estado del template de cada una (de la empresa
 * de la sesión) y un filtro por módulo. Sin sesión, se ven igual: el progreso es un
 * extra.
 */
export default function ListaEssentials({ lecciones }: { lecciones: Leccion[] }) {
  const progreso = useProgreso();
  const [modulo, setModulo] = useState<Modulo | "todos">("todos");
  const conTemplate = lecciones.filter((l) => l.accion.tipo === "plantilla");
  const completos = progreso ? conTemplate.filter((l) => l.accion.tipo === "plantilla" && progreso.plantillas[l.accion.id]?.completo).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <Resumen progreso={progreso} completos={completos} total={conTemplate.length} />

      <div role="group" aria-label="Filtrar por módulo" className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {(["todos", ...MODULOS] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modulo === m}
            onClick={() => setModulo(m)}
            className={`min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              modulo === m ? "border-tinta bg-tinta text-marfil" : "border-tinta/15 text-tinta hover:border-tinta/40"
            }`}
          >
            {m === "todos" ? "Todos" : m}
          </button>
        ))}
      </div>

      {MODULOS.filter((m) => modulo === "todos" || m === modulo).map((m, im) => (
        <section key={m} aria-labelledby={`modulo-${im}`} className="flex flex-col gap-2">
          <h2 id={`modulo-${im}`} className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
            {MODULOS.indexOf(m) + 1}. {m}
          </h2>
          <ul className="flex flex-col gap-2">
            {lecciones
              .filter((l) => l.modulo === m)
              .map((l) => {
                const estado = l.accion.tipo === "plantilla" ? progreso?.plantillas[l.accion.id] : undefined;
                const plantilla = l.accion.tipo === "plantilla" ? PLANTILLAS.find((p) => p.id === (l.accion as { id: string }).id) : undefined;
                return (
                  <li key={l.slug}>
                    <article className="flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-display text-lg font-semibold leading-tight text-tinta">{l.titulo}</h3>
                        <p className="text-sm text-tinta/75">{l.bajada}</p>
                      </div>
                      {estado && (
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
                            <span
                              className={`barra-progreso block h-full rounded-full ${estado.completo ? "bg-aliado" : "bg-t-ocre"}`}
                              style={{ "--p": estado.proporcion } as CSSProperties}
                            />
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-tinta">
                            {estado.completo ? "Completo" : `${Math.round(estado.proporcion * 100)}%`}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/academy/essentials/${l.slug}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                        >
                          Aprender
                        </Link>
                        {plantilla && (
                          <Link
                            href={`/cuenta/dataroom/plantilla/${plantilla.id}`}
                            className="inline-flex min-h-11 items-center rounded-full bg-naranja px-4 text-sm font-semibold text-tinta transition-[background-color,transform] duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
                          >
                            {estado?.completo ? "Ver template" : estado ? "Seguir completando" : `Completar · ${plantilla.minutos} min`}
                          </Link>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Resumen({
  progreso,
  completos,
  total,
}: {
  progreso: ReturnType<typeof useProgreso>;
  completos: number;
  total: number;
}) {
  if (!progreso) {
    return (
      <div aria-busy="true" className="h-[5.5rem] animate-pulse rounded-3xl bg-tinta/[0.05]">
        <span className="sr-only">Cargando tu progreso…</span>
      </div>
    );
  }
  if (!progreso.sesion || !progreso.conEmpresa) {
    return (
      <div className="flex flex-col gap-2 rounded-3xl border border-tinta/10 px-4 py-4">
        <p className="text-sm text-tinta/80">
          {progreso.sesion
            ? "Para guardar tus templates, creá tu empresa o sumate a la de tu equipo."
            : "Leé todo sin cuenta. Para completar templates y guardar tu progreso, entrá con Google."}
        </p>
        <Link href="/cuenta" className="self-start text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
          {progreso.sesion ? "Ir a Mi perfil" : "Entrar"}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-tinta">
          {completos} de {total} templates completos
        </p>
        <span className="text-sm font-semibold tabular-nums text-tinta">{Math.round((completos / total) * 100)}%</span>
      </div>
      <div role="progressbar" aria-label="Startup Essentials" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completos} className="h-2 overflow-hidden rounded-full bg-tinta/10">
        <div className="barra-progreso h-full rounded-full bg-aliado" style={{ "--p": completos / total } as CSSProperties} />
      </div>
      <Link href="/cuenta/dataroom" className="self-start text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
        Ver mi Dataroom
      </Link>
    </div>
  );
}
