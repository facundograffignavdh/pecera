"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import Compartir from "@/components/docs/Compartir";
import { CATEGORIAS_CONCEPTO, CONCEPTOS, type CategoriaConcepto, getConcepto } from "@/lib/glosario";
import { DATOS } from "@/lib/transparencia";

/** Sin tildes ni mayúsculas: "valuacion" encuentra "Valuación". */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const INDICE = CONCEPTOS.map((c) => ({
  concepto: c,
  texto: normalizar(`${c.termino} ${c.sigla ?? ""} ${c.definicion}`),
}));

/** Conceptos que una empresa puede cargar en su transparencia. */
const EN_TRANSPARENCIA = new Set(DATOS.flatMap((d) => (d.concepto ? [d.concepto] : [])));

export default function BuscadorConceptos() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<CategoriaConcepto | null>(null);
  const diferida = useDeferredValue(busqueda);
  const q = normalizar(diferida.trim());

  const visibles = INDICE.filter(
    ({ concepto, texto }) => (!categoria || concepto.categoria === categoria) && (!q || texto.includes(q))
  ).map((x) => x.concepto);

  const limpiar = () => {
    setBusqueda("");
    setCategoria(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-10 -mx-5 flex flex-col gap-3 bg-marfil/95 px-5 pb-3 pt-2 backdrop-blur">
        <label className="sr-only" htmlFor="buscar-concepto">
          Buscar un concepto
        </label>
        <input
          id="buscar-concepto"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscá: churn, SAFE, cliff…"
          className="w-full rounded-full border border-tinta/40 bg-marfil px-4 py-2.5 text-base text-tinta placeholder:text-tinta/55 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
        />
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {[null, ...CATEGORIAS_CONCEPTO].map((cat) => {
            const activa = categoria === cat;
            return (
              <button
                key={cat ?? "todas"}
                type="button"
                aria-pressed={activa}
                onClick={() => setCategoria(cat)}
                className={`min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ease-pecera ${
                  activa ? "border-tinta bg-tinta text-marfil" : "border-tinta/25 text-tinta hover:border-tinta/60"
                }`}
              >
                {cat ?? "Todos"}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-tinta/60" aria-live="polite">
        {visibles.length === CONCEPTOS.length
          ? `${CONCEPTOS.length} conceptos`
          : `${visibles.length} de ${CONCEPTOS.length} conceptos`}
      </p>

      {visibles.length === 0 && (
        <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
          No encontramos «{busqueda}».{" "}
          <button type="button" onClick={limpiar} className="font-medium underline underline-offset-4">
            Ver todos
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visibles.map((c) => (
          <article
            key={c.slug}
            id={c.slug}
            className="concepto scroll-mt-44 rounded-3xl border border-tinta/10 bg-tinta/[0.02] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold leading-tight text-tinta">{c.termino}</h2>
                {c.sigla && <p className="mt-0.5 text-sm text-tinta/60">{c.sigla}</p>}
              </div>
              <span className="shrink-0 rounded-full border border-tinta/15 px-2 py-0.5 text-xs text-tinta/70">
                {c.categoria}
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-tinta/90">{c.definicion}</p>
            <p className="mt-3 rounded-2xl bg-t-ocre-suave px-3.5 py-2.5 text-sm leading-relaxed text-t-ocre">
              <span className="font-semibold">Ejemplo: </span>
              {c.ejemplo}
            </p>

            {c.ver && c.ver.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-tinta/60">Ver también:</span>
                {c.ver.map((slug) => (
                  <a
                    key={slug}
                    href={`#${slug}`}
                    onClick={limpiar}
                    className="font-medium text-tinta underline decoration-tinta/30 underline-offset-4 hover:text-arcilla"
                  >
                    {getConcepto(slug)?.termino ?? slug}
                  </a>
                ))}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {EN_TRANSPARENCIA.has(c.slug) ? (
                <Link
                  href="/cuenta"
                  className="text-sm font-medium text-t-verde underline decoration-t-verde/30 underline-offset-4"
                >
                  Cargalo en tu empresa (privado)
                </Link>
              ) : (
                <span />
              )}
              <Compartir titulo={c.termino} ruta={`/docs/conceptos#${c.slug}`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
