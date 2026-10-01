import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Encabezado from "@/components/Encabezado";
import BotonSuscribir from "@/components/newsletter/BotonSuscribir";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { getNewsletter, getPerfil } from "@/lib/datos";
import { fechaEdicion, parrafos } from "@/lib/newsletter";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]/newsletter">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getPerfil(slug);
  const news = datos && (await getNewsletter(datos.perfil.id, slug));
  if (!datos || !news) return { title: "Newsletter no encontrada — Pecera" };
  return {
    title: `${news.newsletter.titulo} · ${datos.perfil.nombre} — Pecera`,
    description: news.newsletter.descripcion ?? undefined,
  };
}

/**
 * Las ediciones de una newsletter. La más nueva se lee entera; las anteriores, a
 * un toque. El texto es plano (sin HTML) y se puede seleccionar y copiar.
 */
export default async function NewsletterPage({ params }: PageProps<"/p/[slug]/newsletter">) {
  const { slug } = await params;
  const datos = await getPerfil(slug);
  if (!datos) notFound();
  const news = await getNewsletter(datos.perfil.id, slug);
  if (!news) notFound();

  const { perfil } = datos;
  const [ultima, ...anteriores] = news.ediciones;

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href={`/p/${slug}`} texto="Volver al perfil" />

        <header className="mt-6 flex flex-col gap-3">
          <span className="self-start rounded-full bg-tinta px-2.5 py-0.5 text-xs font-medium text-marfil">Newsletter</span>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{news.newsletter.titulo}</h1>
          <p className="flex items-center gap-2 text-sm text-tinta/70">
            <Avatar perfil={perfil} size={28} />
            Por {perfil.nombre}
          </p>
          {news.newsletter.descripcion && <p className="leading-relaxed text-tinta/85">{news.newsletter.descripcion}</p>}
          <BotonSuscribir slug={slug} total={news.suscriptores} />
        </header>

        {ultima ? (
          <article id={ultima.id} className="mt-8 scroll-mt-24 border-t border-tinta/15 pt-6">
            <p className="text-sm text-tinta/60">{fechaEdicion(ultima.publicada_at)}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-tinta">{ultima.titulo}</h2>
            <div className="mt-4 flex flex-col gap-4 leading-relaxed text-tinta/90">
              {parrafos(ultima.cuerpo).map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </article>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-tinta/20 px-4 py-3 text-sm text-tinta/70">
            Todavía no hay ediciones publicadas. Suscribite y te aparecen en Mi perfil cuando salga la primera.
          </p>
        )}

        {anteriores.length > 0 && (
          <section aria-labelledby="anteriores" className="mt-10">
            <h2 id="anteriores" className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
              Ediciones anteriores
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {anteriores.map((e) => (
                <li key={e.id} id={e.id} className="scroll-mt-24">
                  <details className="group rounded-2xl border border-tinta/10 bg-marfil">
                    <summary className="flex min-h-14 cursor-pointer list-none flex-col justify-center gap-0.5 px-4 py-2 [&::-webkit-details-marker]:hidden">
                      <span className="text-xs text-tinta/60">{fechaEdicion(e.publicada_at)}</span>
                      <span className="font-medium text-tinta">{e.titulo}</span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-tinta/10 px-4 py-4 text-sm leading-relaxed text-tinta/90">
                      {parrafos(e.cuerpo).map((p, i) => (
                        <p key={i} className="whitespace-pre-line">{p}</p>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
