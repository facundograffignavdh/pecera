import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { GaleriaEdicion, PortadaFeria21, TituloFeria } from "@/components/eventos/MarcaFeria21";
import Votacion from "@/components/eventos/Votacion";
import TarjetaJuegoStand from "@/components/stand/TarjetaJuegoStand";
import { getEstadoEvento, getEstadoStand } from "@/lib/datos";
import { EVENTO_ACTUAL, EVENTOS, getEventoDefinido } from "@/lib/eventos";

export const revalidate = 60;

export function generateStaticParams() {
  return EVENTOS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/eventos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const evento = getEventoDefinido(slug);
  if (!evento) return { title: "Evento no encontrado — Pecera" };
  return {
    title: `${evento.nombre} — Pecera`,
    description: evento.bajada,
    openGraph: { title: `${evento.nombre} — Pecera`, description: evento.bajada },
  };
}

const SUBTITULO = "font-display text-2xl font-semibold leading-tight text-tinta";

/** Título de sección: con la marca de Semana 21 en la Feria 21; el de siempre en otros eventos. */
function Titulo({ id, feria, children }: { id: string; feria: boolean; children: ReactNode }) {
  return feria ? (
    <TituloFeria id={id}>{children}</TituloFeria>
  ) : (
    <h2 id={id} className={SUBTITULO}>
      {children}
    </h2>
  );
}

export default async function EventoPage({ params }: PageProps<"/eventos/[slug]">) {
  const { slug } = await params;
  const evento = getEventoDefinido(slug);
  if (!evento) notFound();

  // La Feria 21 lleva la identidad de Semana 21 (verde, mayúsculas, trazo amarillo).
  const feria = evento.slug === EVENTO_ACTUAL.slug;
  // El juego del stand solo en la Feria; null (sin migración o si falla) = sin sección.
  const [estado, juegoStand] = await Promise.all([getEstadoEvento(evento.slug), feria ? getEstadoStand() : null]);
  // Compite cualquier perfil anotado: emprendedores, inversores y aliados.
  const participantes = estado.participantes;

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />

        {/* Portada */}
        {feria ? (
          <PortadaFeria21 evento={evento} votacionAbierta={estado.votacionAbierta} />
        ) : (
        <header className="relative mt-6 overflow-hidden rounded-3xl bg-tinta px-5 pb-6 pt-5 text-marfil">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-pecera/25 blur-2xl"
          />
          <span className="relative inline-flex rounded-full bg-marfil/10 px-2.5 py-0.5 text-xs font-medium ring-1 ring-marfil/20">
            {evento.tipo}
          </span>
          <h1 className="relative mt-3 font-display text-4xl font-semibold leading-none">{evento.nombre}</h1>
          <p className="relative mt-3 text-sm leading-relaxed text-marfil/85">{evento.bajada}</p>
          <dl className="relative mt-4 grid grid-cols-1 gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-marfil/60">Dónde</dt>
              <dd className="font-medium">{evento.lugar}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-marfil/60">Cuándo</dt>
              <dd className="font-medium">{evento.fechas}</dd>
            </div>
          </dl>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <a
              href="#votacion"
              className="inline-flex min-h-11 items-center rounded-full bg-naranja px-5 text-sm font-semibold text-tinta transition-[background-color,transform] duration-200 ease-pecera hover:bg-pecera active:scale-[0.98]"
            >
              {estado.votacionAbierta ? "Votar ahora" : "Ver participantes"}
            </a>
            <Link
              href="/cuenta"
              className="inline-flex min-h-11 items-center rounded-full border border-marfil/40 px-5 text-sm font-medium text-marfil hover:border-marfil"
            >
              Participar
            </Link>
          </div>
        </header>
        )}

        {juegoStand && <TarjetaJuegoStand estado={juegoStand} />}

        {/* En la compu: el programa a la izquierda; cómo votar y la votación a la derecha. */}
        <div className="lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-10">
        <div className="min-w-0 lg:[&>section:first-child]:mt-0">
        {/* Programa */}
        <section aria-labelledby="programa" className="mt-10">
          <Titulo id="programa" feria={feria}>
            Programa
          </Titulo>
          <ol className="mt-4 flex flex-col">
            {evento.agenda.map((j, i) => {
              const ultima = i === evento.agenda.length - 1;
              return (
                <li key={j.id} className="relative flex gap-4 pb-6">
                  {!ultima && (
                    <span aria-hidden className={`absolute left-[1.1rem] top-10 h-[calc(100%-2.5rem)] w-px ${feria ? "bg-s21-verde/40" : "bg-tinta/15"}`} />
                  )}
                  <span
                    aria-hidden
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                      j.destacada
                        ? feria
                          ? "bg-s21-amarillo text-[#353535]"
                          : "bg-arcilla text-marfil"
                        : feria
                          ? "bg-s21-verde-oscuro text-white"
                          : "bg-tinta text-marfil"
                    }`}
                  >
                    {j.destacada ? "★" : i + 1}
                  </span>
                  <div
                    className={`min-w-0 flex-1 rounded-2xl px-4 py-3 ${
                      j.destacada
                        ? feria
                          ? "border border-s21-amarillo/50 bg-s21-amarillo/15"
                          : "bg-t-arcilla-suave"
                        : "border border-tinta/10"
                    }`}
                  >
                    <p className="flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wide text-tinta/60">
                      <span className={j.destacada && !feria ? "text-t-arcilla" : ""}>{j.dia}</span>
                      <span className="font-normal normal-case tracking-normal">{j.fecha}</span>
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-tinta">{j.titulo}</h3>
                    <p className="mt-1 text-sm font-medium text-tinta">
                      <time dateTime={j.inicio}>{j.horario}</time> · {j.lugar}
                    </p>
                    <p className="mt-1 text-sm text-tinta/80">{j.resumen}</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {j.momentos.map((m) => (
                        <li key={m} className="flex gap-2 text-sm text-tinta/80">
                          <span aria-hidden className={`mt-2 size-1.5 shrink-0 rounded-full ${feria ? "bg-s21-verde" : "bg-tinta/40"}`} />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        </div>
        <div className="lg:sticky lg:top-24">
        {/* Cómo votar */}
        <section aria-labelledby="como-votar" className="mt-4 grid gap-3">
          <Titulo id="como-votar" feria={feria}>
            Cómo votar
          </Titulo>
          <ol className="flex flex-col gap-2">
            {evento.comoVotar.map((paso, i) => (
              <li key={paso} className="flex gap-3 text-sm text-tinta">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    feria ? "bg-s21-verde-oscuro text-white" : "bg-tinta/10"
                  }`}
                >
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-tinta/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Reglas</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-tinta/80">
              {evento.reglas.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Votación */}
        <section id="votacion" aria-labelledby="titulo-votacion" className="mt-10 scroll-mt-24">
          <Titulo id="titulo-votacion" feria={feria}>
            {estado.resultadosVisibles ? "Ranking del público" : "Participantes"}
          </Titulo>
          {!estado.disponible ? (
            <p className="mt-3 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
              Estamos preparando la votación. Volvé en un rato.
            </p>
          ) : participantes.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
              Todavía no se anotó nadie. ¿Vas a estar?{" "}
              <Link href="/cuenta" className="font-medium underline underline-offset-4">
                Anotate desde tu perfil
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4">
              <Votacion
                evento={evento.slug}
                participantes={participantes}
                abierta={estado.votacionAbierta}
                resultadosVisibles={estado.resultadosVisibles}
                resultados={estado.resultados}
                totalVotos={estado.totalVotos}
              />
            </div>
          )}
        </section>

        </div>
        </div>

        {feria && <GaleriaEdicion />}


        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
