import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Avatar from "@/components/Avatar";
import VolverAlFeed, { EnlaceVolver } from "@/components/VolverAlFeed";
import { canalesDe } from "@/lib/contacto";
import { getPerfil, getSlugs } from "@/lib/mock-data";
import { ROLES, TIPOS } from "@/lib/rol";

const LEGAL =
  "Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza oferta pública de valores o asesoramiento financiero.";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const datos = getPerfil(slug);
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
  const datos = getPerfil(slug);
  if (!datos) notFound();

  const { perfil, pitches } = datos;
  const rol = ROLES[perfil.rol];
  const canales = canalesDe(perfil);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <div className="mx-auto w-full max-w-md px-5 py-6">
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

        <p className="mt-5 leading-relaxed text-tinta/90">{perfil.descripcion}</p>

        {canales.length > 0 && (
          <section className="mt-7">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
              Escribile
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {canales.map((canal) => (
                <li key={canal.clave}>
                  <a
                    href={canal.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-tinta/25 px-4 py-2 text-sm text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla"
                  >
                    {canal.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {pitches.length > 0 && (
          <section className="mt-7">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
              {pitches.length === 1 ? "Su pitch" : "Sus pitches"}
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {pitches.map((pitch) => (
                <li key={pitch.id}>
                  <Link
                    href={`/#${pitch.id}`}
                    className="block overflow-hidden rounded-xl bg-tinta"
                    aria-label={`Ver el pitch de ${perfil.nombre} en el feed`}
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
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 pb-8 text-xs leading-relaxed text-tinta/55">
          {LEGAL}
        </p>
      </div>
    </main>
  );
}
