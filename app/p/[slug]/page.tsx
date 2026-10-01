import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Avatar from "@/components/Avatar";
import CanalesPerfil from "@/components/CanalesPerfil";
import Encabezado from "@/components/Encabezado";
import { EtiquetasPerfil } from "@/components/Etiquetas";
import GrillaPitches from "@/components/GrillaPitches";
import PieLegal from "@/components/PieLegal";
import VolverAlFeed, { EnlaceVolver } from "@/components/VolverAlFeed";
import AccionesPerfil from "@/components/perfil/AccionesPerfil";
import BarraDueno from "@/components/perfil/BarraDueno";
import {
  BloqueCofundador,
  BloquePortafolio,
  BloqueRacha,
  SUBTITULO,
  TarjetaEmpresaPerfil,
} from "@/components/perfil/Bloques";
import DescripcionConTags from "@/components/DescripcionConTags";
import { urlPerfil } from "@/lib/cuenta";
import { getMetricasPerfil, getPerfil, getSeguidores, getSlugs } from "@/lib/datos";
import { cargo } from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";

export const revalidate = 60;

// Un perfil aprobado después del build se genera en la primera visita.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getPerfil(slug);
  if (!datos) return { title: "Perfil no encontrado — Pecera" };

  const { perfil, pitches } = datos;
  const title = `${perfil.nombre} — Pecera`;
  const imagen = pitches.find((p) => p.poster_url)?.poster_url ?? perfil.avatar_url;

  return {
    title,
    description: perfil.descripcion,
    openGraph: {
      title,
      description: perfil.descripcion,
      type: "profile",
      images: imagen ? [imagen] : undefined,
    },
  };
}

/** Degradé de la franja de arriba según el rol: se reconoce de un vistazo. */
const FRANJA: Record<string, string> = {
  emprendedor: "from-arcilla via-pecera to-t-ocre-suave",
  inversor: "from-inversor via-t-azul to-t-azul-suave",
  aliado: "from-aliado via-t-verde to-t-verde-suave",
};

export default async function PerfilPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const [datos, metricas, seguidores] = await Promise.all([
    getPerfil(slug),
    getMetricasPerfil(slug),
    getSeguidores(slug),
  ]);
  if (!datos) notFound();

  const { perfil, pitches, portafolio, racha } = datos;
  const rol = ROLES[perfil.rol];
  const c = cargo(perfil.cargo);
  const detalle = perfil.empresa ? `${c?.label ?? "Equipo"} en ${perfil.empresa.nombre}` : null;

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-6xl lg:px-8">
        <Suspense fallback={<EnlaceVolver href="/" />}>
          <VolverAlFeed />
        </Suspense>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* ---- La tarjeta (a la izquierda y fija en PC) ---- */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">
            <article className="aparecer overflow-hidden rounded-[2rem] border border-tinta/10 bg-marfil shadow-[0_18px_50px_rgb(28_27_22/0.10)]">
              <div className={`relative h-24 bg-gradient-to-br ${FRANJA[perfil.rol]}`}>
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(255_255_255/0.35),transparent_45%)]" />
                {racha.actual > 1 && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-tinta/70 px-2.5 py-1 text-xs font-semibold text-marfil backdrop-blur">
                    <span className="llama" aria-hidden>
                      🔥
                    </span>
                    {racha.actual} días
                  </span>
                )}
              </div>
              <div className="relative -mt-12 flex flex-col gap-4 px-5 pb-5">
                <span className="self-start rounded-full ring-4 ring-marfil">
                  <Avatar perfil={perfil} size={96} />
                </span>
                <header className="flex flex-col gap-1.5">
                  <h1 className="font-display text-3xl font-semibold leading-[1.05] text-tinta">{perfil.nombre}</h1>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-marfil ${rol.bg}`}>{rol.label}</span>
                    <span className="text-tinta/65">{TIPOS[perfil.tipo] ?? ""}</span>
                  </p>
                </header>
                <EtiquetasPerfil perfil={perfil} conCargo={!perfil.empresa} />
                <DescripcionConTags texto={perfil.descripcion} className="leading-relaxed text-tinta/90" />
                <AccionesPerfil
                  perfil={perfil}
                  url={urlPerfil(perfil.slug)}
                  seguidores={seguidores}
                  detalle={detalle}
                  empresa={perfil.empresa?.nombre ?? null}
                  cargo={c?.label ?? null}
                />
              </div>
            </article>

            {perfil.empresa && <TarjetaEmpresaPerfil empresa={perfil.empresa} cargo={c?.label ?? null} />}
            <CanalesPerfil perfil={perfil} />
          </div>

          {/* ---- El contenido ---- */}
          <div className="flex flex-col gap-7">
            <BarraDueno slug={perfil.slug} sinPitch={pitches.length === 0} />

            {pitches.length > 0 && (
              <section aria-label={pitches.length === 1 ? "Su pitch" : "Sus pitches"}>
                <h2 className={SUBTITULO}>{pitches.length === 1 ? "Su pitch" : `Sus pitches · ${pitches.length}`}</h2>
                <GrillaPitches slug={perfil.slug} nombre={perfil.nombre} pitches={pitches} metricas={metricas} />
              </section>
            )}

            {pitches.length === 0 && (
              <section className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-tinta/20 px-6 py-10 text-center">
                <span aria-hidden className="text-3xl">
                  🎬
                </span>
                <p className="font-display text-xl font-semibold text-tinta">Todavía no subió su pitch</p>
                <p className="max-w-sm text-sm leading-relaxed text-tinta/65">
                  Tocá <strong className="font-semibold">Seguir</strong>: cuando suba uno, lo vas a ver en la pestaña
                  Stakeholding del feed.
                </p>
              </section>
            )}

            <BloqueRacha racha={racha} />
            <BloqueCofundador perfil={perfil} />
            <BloquePortafolio items={portafolio} rol={perfil.rol} />
          </div>
        </div>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
