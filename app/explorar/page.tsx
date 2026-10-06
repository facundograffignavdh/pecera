import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Encabezado from "@/components/Encabezado";
import Explorar from "@/components/explorar/Explorar";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { SelloFeria21 } from "@/components/eventos/MarcaFeria21";
import { getTags, scoreActivo } from "@/lib/datos";
import { getDirectorio } from "@/lib/explorar";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { TAG_FERIA } from "@/lib/hashtags";

export const revalidate = 60;

const MAS = [
  { href: "/", label: "Feed", bajada: "Los pitches, uno atrás del otro" },
  { href: "/red", label: "Mi red", bajada: "Los perfiles que seguís" },
  { href: `/eventos/${EVENTO_ACTUAL.slug}`, label: EVENTO_ACTUAL.nombre, bajada: "Programa y votación" },
  { href: "/sumate", label: "Qué es Pecera", bajada: "Cómo funciona y cómo sumarte" },
];

export const metadata: Metadata = {
  title: "Explorar startups, inversores y aliados — Pecera",
  description: "Directorio del ecosistema: startups, inversores por tesis y portfolio, y aliados por servicio y experiencia.",
};

/**
 * Directorio del ecosistema. Estático (ISR, 1 minuto): los datos vienen con la
 * página y el filtro corre en el celular, sin una consulta por tecla. La URL guarda
 * la búsqueda (?q=…&ver=…) para compartirla.
 */
export default async function ExplorarPage() {
  const [fichas, tags, conScore] = await Promise.all([getDirectorio(), getTags(), scoreActivo()]);
  const feria = tags.find((t) => t.tag === TAG_FERIA);
  const otrosTags = tags.filter((t) => t.tag !== TAG_FERIA).slice(0, 12);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />
        <header className="mt-6 flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta lg:text-5xl">Explorar</h1>
          <p className="leading-relaxed text-tinta/80">
            Startups, inversores y aliados. Buscá por lo que hacen y por con quién trabajaron.
          </p>
        </header>
        <div className="mt-6">
          {/* Lee ?q= y ?ver= en el navegador: la página sigue estática. */}
          <Suspense fallback={<p className="text-sm text-tinta/60">Cargando el directorio…</p>}>
            <Explorar fichas={fichas} conScore={conScore} />
          </Suspense>
        </div>
        {/* Hashtags: cada uno es una sección con sus pitches; #feria21 es la feria. */}
        <section aria-labelledby="hashtags" className="mt-10">
          <h2 id="hashtags" className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
            Hashtags
          </h2>
          <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <Link
            href={`/t/${TAG_FERIA}`}
            className="boton group mt-3 flex items-center justify-between gap-4 rounded-[2rem] bg-tinta px-6 py-6 text-marfil"
          >
            <span>
              <SelloFeria21 chico />
              <span className="mt-1 block font-display text-3xl font-semibold leading-none">#{TAG_FERIA}</span>
              <span className="mt-2 block text-sm text-marfil/75">
                {feria ? `${feria.total} pitches de la feria` : "Todos los pitches de la feria, en un lugar"}
              </span>
            </span>
            <span aria-hidden className="text-2xl transition-transform duration-300 ease-pecera group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
          {otrosTags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {otrosTags.map((t) => (
                <li key={t.tag}>
                  <Link
                    href={`/t/${t.tag}`}
                    className="boton inline-flex min-h-10 items-center gap-1.5 rounded-full border border-tinta/15 px-3.5 text-sm text-tinta hover:border-tinta"
                  >
                    #{t.tag}
                    <span className="tabular-nums text-tinta/55">{t.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>

        {/* Lo que no entra en la barra de abajo. */}
        <section aria-labelledby="mas-en-pecera" className="mt-10">
          <h2 id="mas-en-pecera" className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/65">
            Más en Pecera
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {MAS.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className="boton group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-tinta/12 px-4 py-3 text-tinta hover:border-arcilla"
                >
                  <span>
                    <span className="block font-medium">{m.label}</span>
                    <span className="block text-sm text-tinta/70">{m.bajada}</span>
                  </span>
                  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
