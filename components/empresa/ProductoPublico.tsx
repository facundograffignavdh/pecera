import Image from "next/image";
import Link from "next/link";
import type { Producto } from "@/lib/producto";

/**
 * "Qué ofrece" en la página de la empresa: lo primero después del encabezado. La
 * propuesta en grande, las imágenes en una tira que se desliza y el brief en tres
 * bloques cortos. Solo lo cargado: un bloque vacío no se dibuja.
 */
export default function ProductoPublico({ producto, slug }: { producto: Producto; slug: string }) {
  const brief = [
    { titulo: "El problema", texto: producto.problema },
    { titulo: "Cómo funciona", texto: producto.solucion },
    { titulo: "Para quién", texto: producto.para_quien },
    { titulo: "Cómo se usa", texto: producto.como_usar },
  ].filter((b): b is { titulo: string; texto: string } => !!b.texto);

  return (
    <div className="mt-3 overflow-hidden rounded-3xl bg-tinta text-marfil">
      <div data-revelar className="flex flex-col gap-3 px-5 pb-5 pt-5">
        <span className="self-start rounded-full bg-marfil/15 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em]">
          {producto.tipo === "servicio" ? "Servicio" : "Producto"}
        </span>
        <h3 className="font-display text-2xl font-semibold leading-tight text-balance">{producto.nombre}</h3>
        <p className="text-lg leading-snug text-marfil/90 text-pretty">{producto.propuesta}</p>
      </div>

      {producto.imagenes.length > 0 && (
        <ul
          aria-label="Imágenes del producto"
          className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-5"
        >
          {producto.imagenes.map((url, i) => (
            <li key={url} className="w-[82%] shrink-0 snap-center first:snap-start">
              <Image
                src={url}
                alt={`${producto.nombre}: imagen ${i + 1} de ${producto.imagenes.length}`}
                width={1280}
                height={960}
                sizes="(max-width: 448px) 82vw, 360px"
                className="aspect-[4/3] w-full rounded-2xl bg-marfil/10 object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {(brief.length > 0 || producto.caracteristicas.length > 0) && (
        <div data-revelar className="flex flex-col gap-4 bg-marfil/[0.06] px-5 py-5">
          {brief.map((b) => (
            <div key={b.titulo}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-marfil/60">{b.titulo}</h4>
              <p className="mt-1 text-sm leading-relaxed text-marfil/90">{b.texto}</p>
            </div>
          ))}
          {producto.caracteristicas.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {producto.caracteristicas.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm">
                  <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-celeste text-tinta">
                    <svg viewBox="0 0 12 12" className="size-2.5">
                      <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 px-5 py-4">
        {producto.demo_url && (
          <a
            href={producto.demo_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center rounded-full bg-marfil px-4 text-sm font-semibold text-tinta transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-celeste"
          >
            Ver la demo
          </a>
        )}
        <Link
          href={`/e/${slug}/one-pager`}
          className="inline-flex min-h-11 items-center rounded-full border border-marfil/35 px-4 text-sm font-medium text-marfil transition-colors duration-200 ease-pecera hover:border-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-celeste"
        >
          One Pager
        </Link>
      </div>
    </div>
  );
}
