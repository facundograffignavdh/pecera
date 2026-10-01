import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import AbrirDestino from "@/components/docs/AbrirDestino";
import Compartir from "@/components/docs/Compartir";
import { CATEGORIAS_LEGALES, DOCUMENTOS_LEGALES, KIT_POR_ETAPA } from "@/lib/legales";

export const metadata: Metadata = {
  title: "Documentos legales — Docs de Pecera",
  description:
    "SAFE, vesting y cliff, pacto de socios, estatuto SAS, NDA, ESOP, term sheet y más: qué es cada documento, cuándo lo necesitás y qué mirar.",
};

const POR_ID = new Map(DOCUMENTOS_LEGALES.map((d) => [d.id, d]));

export default function LegalesPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <AbrirDestino />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Link href="/academy/docs" className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Academy · Docs
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-tinta">Documentos legales</h1>
        <p className="mt-2 leading-relaxed text-tinta/80">
          Los papeles que toda startup necesita, en orden: qué es cada uno, cuándo hace falta, qué
          tiene que decir y qué señales de alerta mirar.
        </p>
        <p className="mt-4 rounded-2xl border-2 border-t-ocre/40 bg-t-ocre-suave px-4 py-3 text-sm leading-relaxed text-t-ocre">
          <strong className="font-semibold">Esto es una guía, no asesoramiento legal.</strong> Usala
          para llegar al abogado con las preguntas claras. Cada documento lo redacta o revisa un
          profesional matriculado.
        </p>

        <section aria-labelledby="kit" className="mt-8">
          <h2 id="kit" className="font-display text-2xl font-semibold leading-tight text-tinta">
            Qué tener según tu etapa
          </h2>
          <ol className="mt-4 flex flex-col gap-2">
            {KIT_POR_ETAPA.map((k, i) => (
              <li key={k.etapa} className="rounded-2xl border border-tinta/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <span className="flex size-6 items-center justify-center rounded-full bg-tinta text-xs text-marfil">
                    {i + 1}
                  </span>
                  {k.etapa}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {k.docs.map((id) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="inline-flex min-h-9 items-center rounded-full bg-tinta/5 px-3 text-sm text-tinta hover:bg-tinta/10"
                      >
                        {POR_ID.get(id)?.nombre ?? id}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {CATEGORIAS_LEGALES.map((categoria) => (
          <section key={categoria} aria-label={categoria} className="mt-10">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">{categoria}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {DOCUMENTOS_LEGALES.filter((d) => d.categoria === categoria).map((d) => (
                <details
                  key={d.id}
                  id={d.id}
                  className="documento group scroll-mt-24 rounded-3xl border border-tinta/10 bg-tinta/[0.02]"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-semibold leading-tight text-tinta">
                        {d.nombre}
                      </span>
                      <span className="mt-0.5 block text-sm text-tinta/60">{d.cuando}</span>
                    </span>
                    <span
                      aria-hidden
                      className="text-xl text-tinta transition-transform duration-300 ease-pecera group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="flex flex-col gap-4 border-t border-tinta/10 px-4 pb-4 pt-3">
                    <p className="leading-relaxed text-tinta/90">{d.queEs}</p>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">
                        Lo que tiene que resolver
                      </h3>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {d.claves.map((c) => (
                          <li key={c} className="flex gap-2 text-sm text-tinta">
                            <span aria-hidden className="mt-0.5 text-t-verde">
                              ✓
                            </span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Estructura mínima</h3>
                      <ol className="mt-2 flex flex-col gap-1 text-sm text-tinta/85">
                        {d.estructura.map((s, i) => (
                          <li key={s}>
                            {i + 1}. {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <p className="rounded-2xl bg-t-arcilla-suave px-3.5 py-2.5 text-sm leading-relaxed text-t-arcilla">
                      <span className="font-semibold">Señal de alerta: </span>
                      {d.alerta}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {d.concepto ? (
                        <Link
                          href={`/docs/conceptos#${d.concepto}`}
                          className="text-sm font-medium text-tinta underline decoration-tinta/30 underline-offset-4 hover:text-arcilla"
                        >
                          Ver el concepto
                        </Link>
                      ) : (
                        <span />
                      )}
                      <Compartir titulo={d.nombre} ruta={`/docs/legales#${d.id}`} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
