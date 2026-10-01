import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { getPitchesDeTag, getTags } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { TAG_FERIA, normalizarTag } from "@/lib/hashtags";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getTags()).slice(0, 30).map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps<"/t/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  const limpio = normalizarTag(decodeURIComponent(tag));
  return {
    title: `#${limpio} — Pecera`,
    description: `Todos los pitches con #${limpio} en Pecera.`,
  };
}

/**
 * Sección de un hashtag: todos los pitches que lo llevan en la descripción. En
 * grilla para recorrer y buscar; "Mirar como feed" los pasa en vertical.
 */
export default async function TagPage({ params }: PageProps<"/t/[tag]">) {
  const { tag } = await params;
  const limpio = normalizarTag(decodeURIComponent(tag));
  const [items, tags] = await Promise.all([getPitchesDeTag(limpio), getTags()]);
  const esFeria = limpio === TAG_FERIA;
  const perfiles = new Set(items.map((i) => i.perfil.id)).size;
  const relacionados = tags.filter((t) => t.tag !== limpio).slice(0, 12);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <Link href="/explorar" className="inline-flex items-center gap-2 text-sm text-tinta/70 transition-colors duration-200 ease-pecera hover:text-arcilla">
          <span aria-hidden>&larr;</span> Explorar
        </Link>

        <header className="aparecer mt-6 flex flex-col gap-4 rounded-[2rem] bg-tinta px-6 py-7 text-marfil sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-marfil/65">
              {esFeria ? EVENTO_ACTUAL.nombre : "Sección"}
            </p>
            <h1 className="mt-1 break-all font-display text-5xl font-semibold leading-none">#{limpio}</h1>
            <p className="mt-3 text-sm text-marfil/75">
              {items.length} {items.length === 1 ? "pitch" : "pitches"} · {perfiles} {perfiles === 1 ? "perfil" : "perfiles"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.length > 0 && (
              <Link
                href={`/t/${limpio}/feed`}
                className="boton inline-flex min-h-12 items-center gap-2 rounded-full bg-arcilla px-5 font-semibold text-marfil"
              >
                <span aria-hidden>▶</span> Mirar como feed
              </Link>
            )}
            {esFeria && (
              <Link
                href={`/eventos/${EVENTO_ACTUAL.slug}`}
                className="boton inline-flex min-h-12 items-center rounded-full border border-marfil/30 px-5 font-medium text-marfil"
              >
                Programa y votación
              </Link>
            )}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-tinta/20 px-6 py-10 text-center">
            <p className="font-display text-2xl font-semibold text-tinta">Todavía no hay pitches con #{limpio}</p>
            <p className="max-w-sm text-sm text-tinta/70">
              Para aparecer acá, escribí <strong className="font-semibold">#{limpio}</strong> en la descripción de tu pitch
              cuando lo subís.
            </p>
            <Link href="/subir" className="boton mt-2 inline-flex min-h-12 items-center rounded-full bg-tinta px-6 font-medium text-marfil">
              Subir mi pitch
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map(({ pitch, perfil }, i) => (
              <li key={pitch.id} className="aparecer" style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <Link
                  href={`/t/${limpio}/feed#${pitch.id}`}
                  className="group relative block overflow-hidden rounded-2xl bg-tinta"
                  aria-label={`Ver el pitch de ${perfil.nombre}`}
                >
                  {pitch.poster_url ? (
                    <Image
                      src={pitch.poster_url}
                      alt=""
                      width={360}
                      height={640}
                      className="aspect-[9/16] w-full object-cover transition-transform duration-500 ease-pecera group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex aspect-[9/16] w-full items-center justify-center text-2xl text-marfil">▶</span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-tinta/90 to-transparent px-2.5 pb-2.5 pt-8 text-marfil">
                    <Avatar perfil={perfil} size={26} />
                    <span className="truncate text-sm font-semibold">{perfil.nombre}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {relacionados.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">Otras secciones</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {relacionados.map((t) => (
                <li key={t.tag}>
                  <Link
                    href={`/t/${t.tag}`}
                    className="boton inline-flex min-h-10 items-center gap-1.5 rounded-full border border-tinta/20 px-3.5 text-sm font-medium text-tinta hover:border-arcilla"
                  >
                    #{t.tag}
                    <span className="text-xs tabular-nums text-tinta/55">{t.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
