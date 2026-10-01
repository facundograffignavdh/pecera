import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DocumentoLectura from "@/components/dataroom/DocumentoLectura";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { CATEGORIAS_DATAROOM, CATEGORIA_DE_DATO } from "@/lib/dataroom";
import { getDocumentosPublicos, getEmpresa } from "@/lib/datos";
import { defDato } from "@/lib/transparencia";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]/dataroom">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  return datos ? { title: `Dataroom de ${datos.empresa.nombre} — Pecera` } : { title: "Empresa no encontrada — Pecera" };
}

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";

/**
 * Lo que la empresa hizo transparente de su Dataroom, por categoría, para leerse
 * rápido. Solo lo compartido: lo privado nunca llega a esta página (RLS).
 */
export default async function DataroomPublicoPage({ params }: PageProps<"/e/[slug]/dataroom">) {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) notFound();
  const docs = await getDocumentosPublicos(datos.empresa.id);

  const categorias = CATEGORIAS_DATAROOM.map((c) => ({
    c,
    docs: docs.filter((d) => d.categoria === c.valor),
    datos: datos.datos.filter((d) => CATEGORIA_DE_DATO[d.clave] === c.valor),
  })).filter((x) => x.docs.length + x.datos.length > 0);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href={`/e/${slug}`} texto="Volver a la empresa" />
        <header className="mt-6 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Dataroom</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{datos.empresa.nombre}</h1>
          <p className="text-sm text-tinta/70">Lo que el equipo eligió hacer transparente. Pecera no verifica estos datos.</p>
        </header>

        {categorias.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-tinta/20 px-4 py-3 text-sm text-tinta/70">
            Todavía no hay información transparente.
          </p>
        ) : (
          <>
            <nav aria-label="Categorías" className="no-scrollbar -mx-5 mt-6 flex gap-1.5 overflow-x-auto px-5">
              {categorias.map(({ c }) => (
                <a key={c.valor} href={`#${c.valor}`} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-tinta/15 px-3.5 text-sm text-tinta hover:border-tinta">
                  {c.label}
                </a>
              ))}
            </nav>
            {categorias.map(({ c, docs: lista, datos: deDatos }) => (
              <section key={c.valor} id={c.valor} aria-labelledby={`cat-${c.valor}`} className="mt-8 scroll-mt-24">
                <h2 id={`cat-${c.valor}`} className={SUBTITULO}>
                  {c.label}
                </h2>
                {deDatos.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    {deDatos.map((d) => (
                      <div key={d.clave} className="flex flex-col rounded-2xl border border-tinta/10 px-3.5 py-3">
                        <dt className="order-2 text-xs text-tinta/65">
                          {defDato(d.clave)?.concepto ? (
                            <Link href={`/docs/conceptos#${defDato(d.clave)?.concepto}`} className="underline decoration-tinta/30 underline-offset-4">
                              {defDato(d.clave)?.label}
                            </Link>
                          ) : (
                            defDato(d.clave)?.label
                          )}
                        </dt>
                        <dd className="order-1 break-words font-display text-lg font-semibold leading-tight text-tinta">
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                              {d.valor || "Ver"} ↗
                            </a>
                          ) : (
                            d.valor
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-4 flex flex-col gap-6">
                  {lista.map((d) => (
                    <div key={d.id} className="rounded-3xl border border-tinta/10 px-4 py-4">
                      <DocumentoLectura doc={d} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
