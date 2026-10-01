import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import BuildPublico from "@/components/build/BuildPublico";
import InsigniaBuild from "@/components/build/InsigniaBuild";
import ProductoPublico from "@/components/empresa/ProductoPublico";
import Ronda from "@/components/empresa/Ronda";
import TransparenciaPublica from "@/components/empresa/TransparenciaPublica";
import PitchDestacado, { PosterPitch } from "@/components/PitchDestacado";
import Revelar from "@/components/Revelar";
import Encabezado from "@/components/Encabezado";
import { BarraEtapa, Etiqueta } from "@/components/Etiquetas";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { conProtocolo, hrefInstagram } from "@/lib/contacto";
import { getDocumentosPublicos, getEmpresa } from "@/lib/datos";
import { cargo, labelIndustria, labelRonda } from "@/lib/etiquetas";
import { defDato } from "@/lib/transparencia";

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

  const { empresa, miembros, pitches, producto, hitos, avances } = datos;
  const ronda = empresa.ronda && empresa.ronda !== "no_busca" ? labelRonda(empresa.ronda) : null;
  // El Pitch de la empresa es el más nuevo de su equipo; los demás, debajo.
  const [principal, ...otros] = [...pitches].sort((a, b) => b.orden - a.orden);
  const hayBuild = hitos.length > 0 || avances.length > 0;
  const hayRonda = !!ronda || datos.datos.some((d) => defDato(d.clave)?.categoria === "Ronda");
  const documentos = await getDocumentosPublicos(empresa.id);
  const hayTransparencia = documentos.length > 0 || datos.datos.some((d) => defDato(d.clave)?.categoria !== "Ronda");

  const canales = [
    empresa.web && { label: "Sitio web", href: conProtocolo(empresa.web) },
    empresa.linkedin && { label: "LinkedIn", href: conProtocolo(empresa.linkedin) },
    empresa.instagram && { label: "Instagram", href: hrefInstagram(empresa.instagram) },
  ].filter((c): c is { label: string; href: string } => !!c);

  // Índice de la página: solo las secciones que tienen contenido.
  const secciones = [
    producto && { id: "producto", label: producto.tipo === "servicio" ? "Servicio" : "Producto" },
    principal && { id: "pitch", label: "Pitch" },
    hayBuild && { id: "build", label: "Build in Public" },
    miembros.length > 0 && { id: "equipo", label: "Equipo" },
    hayRonda && { id: "ronda", label: "Ronda" },
    hayTransparencia && { id: "transparencia", label: "Transparencia" },
  ].filter((x): x is { id: string; label: string } => !!x);

  return (
    <main id="empresa" className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Revelar />
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />

        <header className="entrada mt-6 flex flex-col gap-3">
          <span className="self-start rounded-full bg-tinta px-2.5 py-0.5 text-xs font-medium text-marfil">
            Empresa
          </span>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{empresa.nombre}</h1>
          <BarraEtapa etapa={empresa.etapa} />
          {(ronda || empresa.industrias.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {ronda && <Etiqueta clase="bg-t-azul-suave text-t-azul">Levantando {ronda}</Etiqueta>}
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

        {secciones.length > 1 && (
          <nav aria-label="Secciones de la empresa" className="no-scrollbar -mx-5 mt-6 flex gap-1.5 overflow-x-auto px-5">
            {secciones.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-tinta/15 px-3.5 text-sm text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {producto && (
          <section id="producto" aria-labelledby="producto-titulo" className="mt-8 scroll-mt-24">
            <h2 id="producto-titulo" className={SUBTITULO}>
              Qué ofrece
            </h2>
            <ProductoPublico producto={producto} slug={empresa.slug} />
          </section>
        )}

        {principal && (
          <section id="pitch" aria-labelledby="pitch-titulo" className="mt-8 scroll-mt-24">
            <h2 id="pitch-titulo" className={SUBTITULO}>
              Pitch
            </h2>
            <div data-revelar className="mt-3">
              <PitchDestacado pitch={principal} nombre={principal.autor.nombre}>
                <p className="text-xs font-medium text-tinta/60">Por {principal.autor.nombre}</p>
              </PitchDestacado>
            </div>
            {otros.length > 0 && (
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-tinta/60">Más pitches del equipo</h3>
            )}
            {otros.length > 0 && (
              <ul className="mt-2 grid grid-cols-3 gap-2.5">
                {otros.map((pitch) => (
                  <li key={pitch.id}>
                    <Link
                      href={`/#${pitch.id}`}
                      className="block overflow-hidden rounded-xl bg-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                      aria-label={`Ver el pitch de ${pitch.autor.nombre} en el feed`}
                    >
                      <PosterPitch pitch={pitch} />
                    </Link>
                    <p className="mt-1.5 truncate text-xs font-medium text-tinta/60">{pitch.autor.nombre}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hayBuild && (
          <section id="build" aria-labelledby="build-titulo" className="mt-8 scroll-mt-24">
            <div className="flex items-center justify-between gap-3">
              <h2 id="build-titulo" className={SUBTITULO}>
                Build in Public
              </h2>
              <InsigniaBuild />
            </div>
            <BuildPublico hitos={hitos} avances={avances} ahora={new Date()} />
          </section>
        )}

        {miembros.length > 0 && (
          <section id="equipo" aria-labelledby="equipo-titulo" className="mt-8 scroll-mt-24">
            <h2 id="equipo-titulo" className={SUBTITULO}>
              El equipo
            </h2>
            <ul data-revelar className="mt-3 flex flex-col gap-2">
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

        {hayRonda && (
          <section id="ronda" aria-labelledby="ronda-titulo" className="mt-8 scroll-mt-24">
            <h2 id="ronda-titulo" className={SUBTITULO}>
              Ronda
            </h2>
            <Ronda ronda={empresa.ronda} datos={datos.datos} />
          </section>
        )}

        {hayTransparencia && (
          <section id="transparencia" aria-labelledby="transparencia-titulo" className="mt-8 scroll-mt-24">
            <h2 id="transparencia-titulo" className={SUBTITULO}>
              Transparencia
            </h2>
            <p className="mt-1 text-sm text-tinta/70">Datos que el equipo eligió compartir. Pecera no los verifica.</p>
            <TransparenciaPublica datos={datos.datos} />
            {documentos.length > 0 && (
              <Link
                href={`/e/${empresa.slug}/dataroom`}
                className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-tinta px-4 py-3 text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <span>
                  <span className="block font-medium">Ver el Dataroom</span>
                  <span className="block text-sm text-marfil/75">
                    {documentos.length} {documentos.length === 1 ? "documento transparente" : "documentos transparentes"}
                  </span>
                </span>
                <span aria-hidden>&rarr;</span>
              </Link>
            )}
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
