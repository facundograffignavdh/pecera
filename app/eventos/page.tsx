import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { CATEGORIAS_EVENTO, EVENTO_ACTUAL, getEventoDefinido } from "@/lib/eventos";

export const metadata: Metadata = {
  title: "Eventos — Pecera",
  description: "Ferias, networking, pitch events, workshops y demo days del ecosistema.",
};

/**
 * Eventos: la sección madre. La Feria es una categoría más; cada evento abre su
 * propia página (la de la Feria 21 se mantiene igual).
 */
export default function EventosPage() {
  const enCurso = CATEGORIAS_EVENTO.filter((c) => c.eventos.length > 0);
  const proximas = CATEGORIAS_EVENTO.filter((c) => c.eventos.length === 0);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-5xl lg:px-8">
        <EnlaceVolver href="/" />
        <header className="aparecer mt-6 max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-tight text-tinta sm:text-5xl">Eventos</h1>
          <p className="mt-2 leading-relaxed text-tinta/75">
            Donde el ecosistema se encuentra en persona. Cada evento tiene su programa, sus proyectos y su sección de
            pitches en Pecera.
          </p>
        </header>

        {enCurso.map((categoria) => (
          <section key={categoria.id} aria-labelledby={`cat-${categoria.id}`} className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`cat-${categoria.id}`} className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">
                {categoria.nombre}
              </h2>
              <span className="text-xs text-tinta/55">{categoria.bajada}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {categoria.eventos.map((slug) => {
                const evento = getEventoDefinido(slug);
                if (!evento) return null;
                const esFeria21 = evento.slug === EVENTO_ACTUAL.slug;
                return (
                  <li key={slug}>
                    <Link
                      href={`/eventos/${evento.slug}`}
                      className="boton group block overflow-hidden rounded-[2rem] border border-tinta/10 bg-marfil shadow-[0_14px_40px_rgb(28_27_22/0.08)] hover:border-tinta/30"
                    >
                      {esFeria21 && (
                        <span className="tema-fijo block bg-[#fbfaf6] px-5 py-5 sm:px-8">
                          <Image
                            src="/feria/feria21.webp"
                            alt="Feria 21: es el corazón emprendedor de Semana 21"
                            width={2584}
                            height={500}
                            priority
                            className="h-auto w-full"
                          />
                        </span>
                      )}
                      <span className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
                        <span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-t-verde-suave px-2.5 py-0.5 text-xs font-semibold text-t-verde">
                            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
                            En curso
                          </span>
                          {/* En la Feria 21 el título es el banner oficial (FERIA 21 en verde). */}
                          {!esFeria21 && (
                            <span className="mt-2 block font-display text-3xl font-semibold leading-none text-tinta">{evento.nombre}</span>
                          )}
                          <span className="mt-2 block text-sm text-tinta/70">{evento.fechas}</span>
                          <span className="block text-sm text-tinta/55">{evento.lugar}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-tinta">
                          Programa y votación
                          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                            &rarr;
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section aria-labelledby="proximos" className="mt-10">
          <h2 id="proximos" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">
            Próximamente
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proximas.map((c, i) => (
              <li
                key={c.id}
                className="aparecer flex flex-col gap-1.5 rounded-3xl border border-dashed border-tinta/20 px-5 py-5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="font-display text-xl font-semibold text-tinta">{c.nombre}</span>
                <span className="text-sm leading-relaxed text-tinta/65">{c.bajada}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-tinta/65">
            ¿Organizás una feria, un networking o un demo day y querés usar Pecera? Escribinos desde la{" "}
            <Link href="/sumate" className="font-medium text-tinta underline underline-offset-4">
              landing
            </Link>
            .
          </p>
        </section>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
