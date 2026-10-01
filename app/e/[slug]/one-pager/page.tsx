import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import BotonImprimir from "@/components/BotonImprimir";
import { conProtocolo } from "@/lib/contacto";
import { labelEtapaBuild, ordenarHitos, fechaHito } from "@/lib/build";
import LogoEntidad from "@/components/LogoEntidad";
import { getEmpresa, getLogos } from "@/lib/datos";
import { cargo, labelEtapa, labelIndustria, labelRonda } from "@/lib/etiquetas";
import { defDato } from "@/lib/transparencia";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]/one-pager">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) return { title: "Empresa no encontrada — Pecera" };
  return {
    title: `${datos.empresa.nombre} · One Pager — Pecera`,
    description: datos.producto?.propuesta ?? datos.empresa.descripcion,
  };
}

const FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const TITULO = "text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-tinta/55";
const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

/**
 * One Pager de la empresa: una hoja para mandar o imprimir. Junta lo que el equipo
 * cargó y compartió (producto, hitos, métricas, ronda, equipo). Lo que falta no se
 * dibuja: nunca hay campos vacíos ni datos de ejemplo.
 */
export default async function OnePagerPage({ params }: PageProps<"/e/[slug]/one-pager">) {
  const { slug } = await params;
  const datos = await getEmpresa(slug);
  if (!datos) notFound();

  const { empresa, miembros, producto, hitos } = datos;
  const { actual, logrados } = ordenarHitos(hitos);
  const metricas = datos.datos.filter((d) => {
    const c = defDato(d.clave)?.categoria;
    return (c === "Tracción" || c === "Unit economics") && d.valor;
  });
  const deRonda = datos.datos.filter((d) => defDato(d.clave)?.categoria === "Ronda" && (d.valor || d.url));
  const documentos = datos.datos.filter((d) => defDato(d.clave)?.categoria === "Documentos" && d.url);
  const ronda = empresa.ronda && empresa.ronda !== "no_busca" ? labelRonda(empresa.ronda) : null;
  const brief = producto
    ? [
        { titulo: "El problema", texto: producto.problema },
        { titulo: "La solución", texto: producto.solucion },
        { titulo: "Para quién", texto: producto.para_quien },
        { titulo: "Cómo se usa", texto: producto.como_usar },
      ].filter((b): b is { titulo: string; texto: string } => !!b.texto)
    : [];
  const urlPagina = `${SITIO}/e/${empresa.slug}`;
  const logo = (await getLogos([empresa.id])).get(empresa.id) ?? null;

  return (
    <main className="h-dvh overflow-y-auto bg-tinta/[0.06] py-6 print:py-0">
      <div className="no-imprimir mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4">
        <Link href={`/e/${empresa.slug}`} className="inline-flex min-h-11 items-center text-sm font-medium text-tinta underline underline-offset-4">
          ← Volver a la empresa
        </Link>
        <BotonImprimir className="inline-flex min-h-11 items-center rounded-full bg-naranja px-5 text-sm font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]">
          Descargar PDF
        </BotonImprimir>
      </div>

      <article className="hoja mx-auto flex w-full max-w-[210mm] flex-col gap-6 bg-marfil px-6 py-8 shadow-[0_10px_40px_rgb(28_27_22/0.12)] sm:px-10">
        <header className="flex flex-col gap-3 border-b border-tinta/15 pb-5">
          <div className="flex items-center justify-between gap-3">
            <span className={TITULO}>One Pager</span>
            <Image src="/brand/wordmark-tinta.png" alt="Pecera" width={92} height={20} />
          </div>
          <div className="flex items-center gap-4">
            {logo && <LogoEntidad nombre={empresa.nombre} logoUrl={logo} tamano="lg" />}
            <h1 className="font-display text-4xl font-semibold leading-tight text-tinta text-balance">{empresa.nombre}</h1>
          </div>
          <p className="text-lg leading-snug text-tinta/85 text-pretty">{producto?.propuesta ?? empresa.descripcion}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-tinta/70">
            {labelEtapa(empresa.etapa) && <span>Etapa: {labelEtapa(empresa.etapa)}</span>}
            {ronda && <span>Levantando {ronda}</span>}
            {empresa.industrias.length > 0 && <span>{empresa.industrias.map(labelIndustria).join(" · ")}</span>}
          </p>
        </header>

        {producto && (
          <section className="sin-corte flex flex-col gap-3">
            <h2 className={TITULO}>{producto.tipo === "servicio" ? "El servicio" : "El producto"}: {producto.nombre}</h2>
            {producto.imagenes[0] && (
              <Image
                src={producto.imagenes[0]}
                alt={`${producto.nombre}`}
                width={1280}
                height={960}
                className="aspect-[16/9] w-full rounded-2xl object-cover"
              />
            )}
            {brief.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {brief.map((b) => (
                  <div key={b.titulo}>
                    <h3 className="text-sm font-semibold text-tinta">{b.titulo}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-tinta/85">{b.texto}</p>
                  </div>
                ))}
              </div>
            )}
            {producto.caracteristicas.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {producto.caracteristicas.map((c) => (
                  <li key={c} className="rounded-full bg-celeste-suave px-3 py-1 text-xs font-medium text-tinta">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {metricas.length > 0 && (
          <section className="sin-corte flex flex-col gap-3">
            <h2 className={TITULO}>Tracción y números</h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metricas.slice(0, 9).map((d) => (
                <div key={d.clave} className="flex flex-col rounded-xl border border-tinta/10 px-3 py-2.5">
                  <dd className="font-display text-xl font-semibold leading-tight text-tinta">{d.valor}</dd>
                  <dt className="text-xs text-tinta/65">{defDato(d.clave)?.label}</dt>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(actual || logrados.length > 0) && (
          <section className="sin-corte flex flex-col gap-3">
            <h2 className={TITULO}>Recorrido</h2>
            {actual && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-tinta">
                  <strong className="font-semibold">Ahora:</strong> {actual.titulo}
                  {labelEtapaBuild(actual.etapa) && <span className="text-tinta/60"> · {labelEtapaBuild(actual.etapa)}</span>}
                </p>
                {actual.progreso !== null && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
                      <div
                        className="h-full origin-left rounded-full bg-t-ocre"
                        style={{ transform: `scaleX(${actual.progreso / 100})` } as CSSProperties}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-tinta">{actual.progreso}%</span>
                  </div>
                )}
              </div>
            )}
            {logrados.length > 0 && (
              <ul className="flex flex-col gap-1">
                {logrados.slice(0, 4).map((h) => (
                  <li key={h.id} className="text-sm text-tinta/85">
                    ✓ {h.titulo}
                    {h.fecha && <span className="text-tinta/55"> · {fechaHito(h.fecha)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {deRonda.length > 0 && (
          <section className="sin-corte flex flex-col gap-2">
            <h2 className={TITULO}>Ronda</h2>
            <dl className="flex flex-col gap-1.5">
              {deRonda.map((d) => (
                <div key={d.clave} className="flex flex-wrap gap-x-2 text-sm">
                  <dt className="font-semibold text-tinta">{defDato(d.clave)?.label}:</dt>
                  <dd className="text-tinta/85">{d.valor ?? d.url}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {miembros.length > 0 && (
          <section className="sin-corte flex flex-col gap-2">
            <h2 className={TITULO}>Equipo</h2>
            <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {miembros.map((m) => (
                <li key={m.id} className="text-sm text-tinta">
                  <span className="font-semibold">{m.nombre}</span>
                  {cargo(m.cargo) && <span className="text-tinta/65"> · {cargo(m.cargo)?.label}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {documentos.length > 0 && (
          <section className="sin-corte flex flex-col gap-2">
            <h2 className={TITULO}>Documentos</h2>
            <ul className="flex flex-col gap-1">
              {documentos.map((d) => (
                <li key={d.clave} className="text-sm">
                  <a href={d.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-tinta underline underline-offset-4">
                    {defDato(d.clave)?.label}
                  </a>
                  <span className="block break-all text-xs text-tinta/55">{d.url}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-2 flex flex-col gap-1 border-t border-tinta/15 pt-4 text-xs text-tinta/65">
          <p>
            Más en{" "}
            <a href={urlPagina} className="font-medium text-tinta underline underline-offset-4">
              {urlPagina.replace(/^https?:\/\//, "")}
            </a>
            {empresa.web && (
              <>
                {" · "}
                <a href={conProtocolo(empresa.web)} className="font-medium text-tinta underline underline-offset-4">
                  {empresa.web.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </p>
          <p>Generado el {FECHA.format(new Date())}. Datos cargados por el equipo; Pecera no los verifica.</p>
          <p>
            Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos
            ni realiza oferta pública de valores o asesoramiento financiero.
          </p>
        </footer>
      </article>
    </main>
  );
}
