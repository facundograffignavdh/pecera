import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Encabezado from "@/components/Encabezado";
import { BarraEtapa, Etiqueta } from "@/components/Etiquetas";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { conProtocolo, hrefInstagram } from "@/lib/contacto";
import { getEmpresa } from "@/lib/datos";
import { cargo, labelIndustria, labelRonda } from "@/lib/etiquetas";
import { CATEGORIAS_DATO, defDato } from "@/lib/transparencia";

export const revalidate = 60;
// Las empresas se generan en la primera visita y se revalidan cada minuto.
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) return { title: "Empresa no encontrada — Pecera" };
  const title = `${datos.empresa.nombre} — Pecera`;
  const poster = datos.pitches.find((p) => p.poster_url)?.poster_url;
  return {
    title,
    description: datos.empresa.descripcion,
    openGraph: {
      title,
      description: datos.empresa.descripcion,
      images: poster ? [poster] : undefined,
    },
  };
}

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";
const CLASE_CANAL =
  "inline-flex min-h-11 items-center rounded-full border border-tinta/25 px-4 text-sm text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla";

export default async function EmpresaPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) notFound();

  const { empresa, miembros, pitches } = datos;
  const ronda = empresa.ronda && empresa.ronda !== "no_busca" ? labelRonda(empresa.ronda) : null;
  const porCategoria = CATEGORIAS_DATO.map((categoria) => ({
    categoria,
    items: datos.datos
      .map((d) => ({ dato: d, def: defDato(d.clave) }))
      .filter((x) => x.def?.categoria === categoria),
  })).filter((g) => g.items.length > 0);

  const canales = [
    empresa.web && { label: "Sitio web", href: conProtocolo(empresa.web) },
    empresa.linkedin && { label: "LinkedIn", href: conProtocolo(empresa.linkedin) },
    empresa.instagram && { label: "Instagram", href: hrefInstagram(empresa.instagram) },
  ].filter((c): c is { label: string; href: string } => !!c);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />

        <header className="mt-6 flex flex-col gap-3">
          <span className="self-start rounded-full bg-tinta px-2.5 py-0.5 text-xs font-medium text-marfil">
            Empresa
          </span>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">{empresa.nombre}</h1>
          <BarraEtapa etapa={empresa.etapa} />
          {(ronda || empresa.industrias.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {ronda && <Etiqueta clase="bg-t-arcilla-suave text-t-arcilla">Busca {ronda}</Etiqueta>}
              {empresa.industrias.map((i) => (
                <Etiqueta key={i}>{labelIndustria(i)}</Etiqueta>
              ))}
            </div>
          )}
        </header>

        <p className="mt-5 leading-relaxed text-tinta/90">{empresa.descripcion}</p>

        {canales.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {canales.map((c) => (
              <li key={c.label}>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className={CLASE_CANAL}>
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {miembros.length > 0 && (
          <section className="mt-8">
            <h2 className={SUBTITULO}>El equipo</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {miembros.map((m) => {
                const c = cargo(m.cargo);
                return (
                  <li key={m.id}>
                    <Link
                      href={`/p/${m.slug}`}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-tinta/10 px-3 py-2 transition-colors duration-200 ease-pecera hover:border-arcilla"
                    >
                      <Avatar perfil={m} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-tinta">{m.nombre}</span>
                        <span className="block truncate text-sm text-tinta/60">{m.descripcion}</span>
                      </span>
                      {c && <Etiqueta clase={c.clase}>{c.label}</Etiqueta>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {pitches.length > 0 && (
          <section className="mt-8">
            <h2 className={SUBTITULO}>{pitches.length === 1 ? "Su pitch" : "Sus pitches"}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {pitches.map((pitch) => (
                <li key={pitch.id}>
                  <Link
                    href={`/#${pitch.id}`}
                    className="block overflow-hidden rounded-xl bg-tinta"
                    aria-label={`Ver el pitch de ${pitch.autor.nombre} en el feed`}
                  >
                    {pitch.poster_url ? (
                      <Image
                        src={pitch.poster_url}
                        alt=""
                        width={360}
                        height={640}
                        className="aspect-[9/16] w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-[9/16] w-full items-center justify-center text-2xl text-marfil">
                        &#9654;
                      </span>
                    )}
                  </Link>
                  <p className="mt-2 text-xs font-medium text-tinta/60">{pitch.autor.nombre}</p>
                  {pitch.descripcion && (
                    <p className="mt-0.5 line-clamp-3 text-sm leading-snug text-tinta/80">{pitch.descripcion}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {porCategoria.length > 0 && (
          <section className="mt-8">
            <h2 className={SUBTITULO}>Transparencia</h2>
            <p className="mt-1 text-sm text-tinta/70">Datos que el equipo eligió compartir.</p>
            <div className="mt-3 flex flex-col gap-4">
              {porCategoria.map(({ categoria, items }) => (
                <div key={categoria} className="rounded-2xl border border-tinta/10 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{categoria}</h3>
                  <dl className="mt-2 flex flex-col divide-y divide-tinta/10">
                    {items.map(({ dato, def }) => (
                      <div key={dato.clave} className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-sm text-tinta/80">
                          {def?.concepto ? (
                            <Link
                              href={`/docs/conceptos#${def.concepto}`}
                              className="underline decoration-tinta/30 underline-offset-4 hover:text-arcilla"
                            >
                              {def.label}
                            </Link>
                          ) : (
                            def?.label
                          )}
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-semibold text-tinta">
                          {dato.url ? (
                            <a
                              href={dato.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="underline underline-offset-4 hover:text-arcilla"
                            >
                              {dato.valor || "Ver documento"}
                            </a>
                          ) : (
                            dato.valor
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
