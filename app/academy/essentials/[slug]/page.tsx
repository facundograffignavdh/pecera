import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AccionLeccion from "@/components/academy/AccionLeccion";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { AVISO_EDUCATIVO, LECCIONES, leccion } from "@/lib/essentials";
import { CONCEPTOS } from "@/lib/glosario";

export function generateStaticParams() {
  return LECCIONES.map((l) => ({ slug: l.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/academy/essentials/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = leccion(slug);
  return l ? { title: `${l.titulo} · Academy — Pecera`, description: l.bajada } : {};
}

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";

/** Una lección: qué es, por qué importa, ejemplo, errores, checklist y la acción. */
export default async function LeccionPage({ params }: PageProps<"/academy/essentials/[slug]">) {
  const { slug } = await params;
  const l = leccion(slug);
  if (!l) notFound();
  const i = LECCIONES.indexOf(l);
  const anterior = LECCIONES[i - 1];
  const siguiente = LECCIONES[i + 1];
  const conceptos = l.conceptos
    .map((s) => CONCEPTOS.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <article className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl">
        <EnlaceVolver href="/academy" texto="Volver a Academy" />

        <header className="entrada mt-6 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">
            Startup Essentials · {l.modulo}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{l.titulo}</h1>
          <p className="text-lg leading-snug text-tinta/80">{l.bajada}</p>
        </header>

        <section className="mt-7">
          <h2 className={SUBTITULO}>¿Qué es?</h2>
          <p className="mt-2 font-editorial text-[1.0625rem] leading-relaxed text-tinta/90">{l.queEs}</p>
        </section>

        <section className="mt-6">
          <h2 className={SUBTITULO}>¿Por qué importa?</h2>
          <p className="mt-2 font-editorial text-[1.0625rem] leading-relaxed text-tinta/90">{l.porQueImporta}</p>
        </section>

        <section className="mt-6 rounded-3xl bg-celeste-suave/60 px-4 py-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/60">Ejemplo ilustrativo (empresa ficticia)</h2>
          <p className="mt-2 font-editorial text-[1.0625rem] italic leading-relaxed text-tinta">{l.ejemplo}</p>
        </section>

        <section className="mt-6">
          <h2 className={SUBTITULO}>Errores comunes</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {l.errores.map((e) => (
              <li key={e} className="flex items-start gap-2.5 text-tinta/90">
                <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-arcilla" />
                {e}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className={SUBTITULO}>Checklist</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {l.checklist.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-tinta/90">
                <span aria-hidden className="mt-1 size-4 shrink-0 rounded border-2 border-tinta/30" />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="accion-titulo" className="mt-8 flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5">
          <h2 id="accion-titulo" className="font-display text-xl font-semibold text-tinta">
            Ahora, el tuyo
          </h2>
          <AccionLeccion accion={l.accion} />
        </section>

        {conceptos.length > 0 && (
          <section className="mt-6">
            <h2 className={SUBTITULO}>Conceptos relacionados</h2>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {conceptos.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/docs/conceptos#${c.slug}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-tinta/15 px-3.5 text-sm text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                  >
                    {c.termino}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Otras lecciones" className="mt-8 grid grid-cols-2 gap-2">
          {anterior ? (
            <Link href={`/academy/essentials/${anterior.slug}`} className="flex min-h-14 flex-col justify-center rounded-2xl border border-tinta/10 px-3 py-2 hover:border-tinta/40">
              <span className="text-xs text-tinta/60">← Anterior</span>
              <span className="truncate text-sm font-medium text-tinta">{anterior.titulo}</span>
            </Link>
          ) : (
            <span />
          )}
          {siguiente && (
            <Link href={`/academy/essentials/${siguiente.slug}`} className="flex min-h-14 flex-col items-end justify-center rounded-2xl border border-tinta/10 px-3 py-2 text-right hover:border-tinta/40">
              <span className="text-xs text-tinta/60">Siguiente →</span>
              <span className="truncate text-sm font-medium text-tinta">{siguiente.titulo}</span>
            </Link>
          )}
        </nav>

        <p className="mt-8 text-xs leading-relaxed text-tinta/60">{AVISO_EDUCATIVO}</p>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </article>
    </main>
  );
}
