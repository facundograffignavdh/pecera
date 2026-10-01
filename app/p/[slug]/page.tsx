import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Avatar from "@/components/Avatar";
import CanalesPerfil from "@/components/CanalesPerfil";
import EditarPerfil from "@/components/EditarPerfil";
import Encabezado from "@/components/Encabezado";
import { EtiquetasPerfil } from "@/components/Etiquetas";
import GrillaPitches from "@/components/GrillaPitches";
import PieLegal from "@/components/PieLegal";
import VolverAlFeed, { EnlaceVolver } from "@/components/VolverAlFeed";
import BuildPublico from "@/components/build/BuildPublico";
import NewsletterPerfil from "@/components/newsletter/NewsletterPerfil";
import Revelar from "@/components/Revelar";
import PortfolioPublico from "@/components/portfolio/PortfolioPublico";
import { getBuildEmpresa, getMetricasPerfil, getNewsletter, getPerfil, getPortfolio, getSlugs } from "@/lib/datos";
import { cargo } from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";

export const revalidate = 60;

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";

// Un perfil aprobado después del build se genera en la primera visita.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getPerfil(slug);
  if (!datos) return { title: "Perfil no encontrado — Pecera" };

  const { perfil, pitches } = datos;
  const title = `${perfil.nombre} — Pecera`;
  const poster = pitches.find((p) => p.poster_url)?.poster_url;

  return {
    title,
    description: perfil.descripcion,
    openGraph: {
      title,
      description: perfil.descripcion,
      type: "profile",
      images: poster ? [poster] : undefined,
    },
  };
}

export default async function PerfilPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const [datos, metricas] = await Promise.all([getPerfil(slug), getMetricasPerfil(slug)]);
  if (!datos) notFound();

  const { perfil, pitches } = datos;
  const rol = ROLES[perfil.rol];
  const conPortfolio = perfil.rol === "inversor" || perfil.rol === "aliado";
  const [build, newsletter, portfolio] = await Promise.all([
    perfil.empresa_id ? getBuildEmpresa(perfil.empresa_id) : null,
    getNewsletter(perfil.id),
    conPortfolio ? getPortfolio(perfil.id) : null,
  ]);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Revelar />
      <Encabezado variante="perfil" />
      {/* El padding de arriba deja "Volver" debajo de la píldora fija. */}
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Suspense fallback={<EnlaceVolver href="/" />}>
          <VolverAlFeed />
        </Suspense>

        <header className="mt-6 flex items-center gap-4">
          <Avatar perfil={perfil} size={72} />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight text-tinta">
              {perfil.nombre}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium text-marfil ${rol.bg}`}
              >
                {rol.label}
              </span>
              <span className="text-tinta/60">{TIPOS[perfil.tipo]}</span>
            </div>
          </div>
        </header>

        <EditarPerfil slug={perfil.slug} />

        {perfil.empresa && (
          <Link
            href={`/e/${perfil.empresa.slug}`}
            className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-tinta/15 px-4 py-2.5 text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla"
          >
            <span className="min-w-0">
              <span className="block text-xs text-tinta/60">
                {cargo(perfil.cargo)?.label ?? "Equipo"} en
              </span>
              <span className="block truncate font-display text-lg font-semibold leading-tight">
                {perfil.empresa.nombre}
              </span>
            </span>
            <span aria-hidden className="text-tinta/60">
              &rarr;
            </span>
          </Link>
        )}

        <div className="mt-5">
          <EtiquetasPerfil perfil={perfil} conCargo={!perfil.empresa} />
        </div>

        <p className="mt-5 leading-relaxed text-tinta/90">{perfil.descripcion}</p>

        {/* El Pitch va primero después de la presentación: es la identidad del perfil. */}
        <section aria-labelledby="pitch-titulo" className="mt-7">
          <h2 id="pitch-titulo" className={SUBTITULO}>
            Pitch
          </h2>
          {pitches.length > 0 ? (
            <GrillaPitches
              slug={perfil.slug}
              nombre={perfil.nombre}
              pitches={pitches}
              metricas={metricas}
            />
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-tinta/20 px-4 py-3 text-sm text-tinta/70">
              Todavía no hay un pitch publicado.
            </p>
          )}
        </section>

        {portfolio && <PortfolioPublico rol={perfil.rol} perfilId={perfil.id} datos={portfolio} />}

        {build && perfil.empresa && (build.hitos.length > 0 || build.avances.length > 0) && (
          <section aria-labelledby="build-titulo" className="mt-7">
            <h2 id="build-titulo" className={SUBTITULO}>
              Build in Public
            </h2>
            <BuildPublico
              hitos={build.hitos}
              avances={build.avances}
              ahora={new Date()}
              completo={false}
              hrefEmpresa={`/e/${perfil.empresa.slug}`}
            />
          </section>
        )}

        {newsletter && (
          <section aria-labelledby="newsletter-titulo" className="mt-7">
            <h2 id="newsletter-titulo" className={SUBTITULO}>
              Newsletter
            </h2>
            <NewsletterPerfil newsletter={newsletter} />
          </section>
        )}

        <CanalesPerfil perfil={perfil} />

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
