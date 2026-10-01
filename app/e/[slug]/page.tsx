import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DescripcionConTags from "@/components/DescripcionConTags";
import Encabezado from "@/components/Encabezado";
import { BarraEtapa, Etiqueta } from "@/components/Etiquetas";
import Info from "@/components/Info";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { LogoEmpresa, SUBTITULO } from "@/components/perfil/Bloques";
import { IconoUbicacion } from "@/components/perfil/IconosMarca";
import { canalesDe, conProtocolo, hrefInstagram } from "@/lib/contacto";
import { getEmpresa } from "@/lib/datos";
import { cargo, industria, labelRonda } from "@/lib/etiquetas";
import { getConcepto } from "@/lib/glosario";
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
  const imagen = datos.empresa.logo_url ?? datos.pitches.find((p) => p.poster_url)?.poster_url;
  return {
    title,
    description: datos.empresa.descripcion,
    openGraph: { title, description: datos.empresa.descripcion, images: imagen ? [imagen] : undefined },
  };
}

const CLASE_CANAL =
  "boton inline-flex min-h-11 items-center rounded-full border border-tinta/20 px-4 text-sm font-medium text-tinta hover:border-arcilla";

export default async function EmpresaPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) notFound();

  const { empresa, miembros, pitches } = datos;
  const ronda = empresa.ronda && empresa.ronda !== "no_busca" ? labelRonda(empresa.ronda) : null;
  const porCategoria = CATEGORIAS_DATO.map((categoria) => ({
    categoria,
    items: datos.datos.map((d) => ({ dato: d, def: defDato(d.clave) })).filter((x) => x.def?.categoria === categoria),
  })).filter((g) => g.items.length > 0);

  // Fundadores: quienes tienen un cargo de dirección o de fundador; el resto, equipo.
  const DIRECCION = new Set(["ceo", "cto", "cfo", "coo", "cmo", "cpo", "fundador", "cofundador"]);
  const fundadores = miembros.filter((m) => m.cargo && DIRECCION.has(m.cargo));
  const equipo = miembros.filter((m) => !m.cargo || !DIRECCION.has(m.cargo));

  // "Escribile al equipo": el primer miembro con WhatsApp (o email), priorizando al CEO.
  const ordenados = [...miembros].sort((a, b) => Number(b.cargo === "ceo") - Number(a.cargo === "ceo"));
  const contacto = ordenados
    .map((m) => ({
      miembro: m,
      canal: canalesDe(m, `¡Hola! Vi ${empresa.nombre} en Pecera`).find((c) => c.clave === "whatsapp" || c.clave === "email"),
    }))
    .find((x) => x.canal);

  const redes = [
    empresa.web && { label: "Sitio web", href: conProtocolo(empresa.web) },
    empresa.linkedin && { label: "LinkedIn", href: conProtocolo(empresa.linkedin) },
    empresa.instagram && { label: "Instagram", href: hrefInstagram(empresa.instagram) },
  ].filter((c): c is { label: string; href: string } => !!c);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* ---- Tarjeta de la empresa ---- */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">
            <article className="aparecer overflow-hidden rounded-[2rem] border border-tinta/10 bg-marfil shadow-[0_18px_50px_rgb(28_27_22/0.10)]">
              <div className="relative h-24 bg-tinta">
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgb(248_124_67/0.55),transparent_55%)]" />
                <span className="absolute left-5 top-4 rounded-full bg-marfil/15 px-2.5 py-0.5 text-xs font-semibold text-marfil ring-1 ring-marfil/20">
                  Empresa
                </span>
              </div>
              <div className="relative -mt-11 flex flex-col gap-4 px-5 pb-5">
                <span className="self-start rounded-2xl ring-4 ring-marfil">
                  <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={88} />
                </span>
                <h1 className="font-display text-3xl font-semibold leading-[1.05] text-tinta">{empresa.nombre}</h1>
                {empresa.ubicacion && (
                  <p className="-mt-2 flex items-center gap-1.5 text-sm text-tinta/65">
                    <IconoUbicacion />
                    {empresa.ubicacion}
                  </p>
                )}
                <BarraEtapa etapa={empresa.etapa} />
                {(ronda || empresa.industrias.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {ronda && <Etiqueta clase="bg-t-arcilla-suave text-t-arcilla">Busca {ronda}</Etiqueta>}
                    {empresa.industrias.map((i) => (
                      <Etiqueta key={i} clase={industria(i).clase}>
                        {industria(i).label}
                      </Etiqueta>
                    ))}
                  </div>
                )}
                <DescripcionConTags texto={empresa.descripcion} className="leading-relaxed text-tinta/90" />

                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    [miembros.length, miembros.length === 1 ? "miembro" : "miembros"],
                    [pitches.length, pitches.length === 1 ? "pitch" : "pitches"],
                    [datos.datos.length, datos.datos.length === 1 ? "dato abierto" : "datos abiertos"],
                  ].map(([n, label]) => (
                    <div key={String(label)} className="rounded-2xl bg-tinta/[0.04] px-2 py-2.5">
                      <dt className="sr-only">{label}</dt>
                      <dd className="font-display text-2xl font-semibold tabular-nums text-tinta">{n}</dd>
                      <dd className="text-xs text-tinta/60">{label}</dd>
                    </div>
                  ))}
                </dl>

                {contacto?.canal && (
                  <a
                    href={contacto.canal.href}
                    {...(contacto.canal.externo && { target: "_blank", rel: "noopener noreferrer" })}
                    className="boton flex min-h-13 items-center justify-center gap-2 rounded-full bg-arcilla px-5 font-semibold text-marfil shadow-[0_8px_20px_rgb(217_90_34/0.28)]"
                  >
                    Escribile al equipo
                    <span className="text-sm font-normal text-marfil/80">· {contacto.miembro.nombre.split(" ")[0]}</span>
                  </a>
                )}
                {redes.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {redes.map((c) => (
                      <li key={c.label}>
                        <a href={c.href} target="_blank" rel="noopener noreferrer" className={CLASE_CANAL}>
                          {c.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>

          {/* ---- Contenido ---- */}
          <div className="flex flex-col gap-8">
            {[
              { titulo: "Fundadores", lista: fundadores },
              { titulo: fundadores.length ? "Equipo" : "El equipo", lista: equipo },
            ]
              .filter((g) => g.lista.length > 0)
              .map((g) => (
                <section key={g.titulo} aria-label={g.titulo}>
                  <h2 className={SUBTITULO}>{g.titulo}</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {g.lista.map((m, i) => {
                      const c = cargo(m.cargo);
                      return (
                        <li key={m.id} className="aparecer" style={{ "--i": i } as React.CSSProperties}>
                          <Link
                            href={`/p/${m.slug}`}
                            className="boton flex min-h-16 items-center gap-3 rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-3 py-2.5 hover:border-arcilla"
                          >
                            <Avatar perfil={m} size={48} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-tinta">{m.nombre}</span>
                              <span className="line-clamp-1 block text-sm text-tinta/60">{m.descripcion}</span>
                            </span>
                            {c && <Etiqueta clase={c.clase}>{c.label}</Etiqueta>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

            <section aria-label="Pitches">
              <h2 className={SUBTITULO}>{pitches.length === 1 ? "Su pitch" : "Sus pitches"}</h2>
              {pitches.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-tinta/20 px-4 py-6 text-center text-sm text-tinta/65">
                  El equipo todavía no subió su pitch.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pitches.map((pitch) => (
                    <li key={pitch.id}>
                      <Link
                        href={`/#${pitch.id}`}
                        className="group block overflow-hidden rounded-2xl bg-tinta"
                        aria-label={`Ver el pitch de ${pitch.autor.nombre} en el feed`}
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
                      </Link>
                      <p className="mt-2 text-xs font-medium text-tinta/60">{pitch.autor.nombre}</p>
                      {pitch.descripcion && (
                        <DescripcionConTags texto={pitch.descripcion} className="mt-0.5 line-clamp-3 text-sm leading-snug text-tinta/80" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {porCategoria.length > 0 && (
              <section aria-label="Transparencia">
                <h2 className={SUBTITULO}>Transparencia</h2>
                <p className="mt-1 text-sm text-tinta/65">Datos que el equipo eligió compartir.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {porCategoria.map(({ categoria, items }) => (
                    <div key={categoria} className="rounded-2xl border border-tinta/10 px-4 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{categoria}</h3>
                      <dl className="mt-2 flex flex-col divide-y divide-tinta/10">
                        {items.map(({ dato, def }) => {
                          const concepto = def?.concepto ? getConcepto(def.concepto) : undefined;
                          return (
                            <div key={dato.clave} className="relative flex items-center justify-between gap-4 py-2.5">
                              <dt className="flex items-center gap-2 text-sm text-tinta/80">
                                {def?.label}
                                {concepto && (
                                  <Info titulo={`Qué es ${concepto.termino}`}>
                                    {concepto.definicion}
                                  </Info>
                                )}
                              </dt>
                              <dd className="min-w-0 text-right text-sm font-semibold text-tinta">
                                {dato.url ? (
                                  <a href={dato.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4 hover:text-arcilla">
                                    {dato.valor || "Ver documento"}
                                  </a>
                                ) : (
                                  dato.valor
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
