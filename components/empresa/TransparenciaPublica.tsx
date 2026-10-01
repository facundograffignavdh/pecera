import Link from "next/link";
import { type CategoriaDato, defDato } from "@/lib/transparencia";
import type { DatoEmpresa } from "@/types/pecera";

/**
 * Lo que la empresa compartió, para leerse de un vistazo: las métricas como
 * tarjetas (el número grande, tal como lo cargó el equipo), la estrategia como
 * filas y los documentos como links. La ronda va en su propio bloque.
 */
export default function TransparenciaPublica({ datos }: { datos: DatoEmpresa[] }) {
  const de = (categorias: CategoriaDato[]) =>
    datos
      .map((dato) => ({ dato, def: defDato(dato.clave) }))
      .filter((x): x is { dato: DatoEmpresa; def: NonNullable<ReturnType<typeof defDato>> } =>
        !!x.def && categorias.includes(x.def.categoria)
      );
  const metricas = de(["Tracción", "Unit economics"]);
  const estrategia = de(["Estrategia"]);
  const documentos = de(["Documentos"]).filter((x) => x.dato.url);
  if (metricas.length + estrategia.length + documentos.length === 0) return null;

  const etiqueta = (def: NonNullable<ReturnType<typeof defDato>>) =>
    def.concepto ? (
      <Link href={`/docs/conceptos#${def.concepto}`} className="underline decoration-tinta/30 underline-offset-4 hover:text-arcilla">
        {def.label}
      </Link>
    ) : (
      def.label
    );

  return (
    <div className="mt-3 flex flex-col gap-5">
      {metricas.length > 0 && (
        <dl data-revelar className="grid grid-cols-2 gap-2">
          {metricas.map(({ dato, def }, i) => (
            <div
              key={dato.clave}
              style={{ transitionDelay: `${Math.min(i, 6) * 60}ms` }}
              className="flex flex-col gap-1 rounded-2xl border border-tinta/10 bg-tinta/[0.03] px-3.5 py-3"
            >
              <dt className="order-2 text-xs text-tinta/70">{etiqueta(def)}</dt>
              <dd className="order-1 break-words font-display text-xl font-semibold leading-tight text-tinta">
                {dato.url ? (
                  <a href={dato.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                    {dato.valor || "Ver"}
                  </a>
                ) : (
                  dato.valor
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {estrategia.length > 0 && (
        <dl data-revelar className="flex flex-col divide-y divide-tinta/10 rounded-2xl border border-tinta/10 px-4">
          {estrategia.map(({ dato, def }) => (
            <div key={dato.clave} className="flex flex-col gap-0.5 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{etiqueta(def)}</dt>
              <dd className="text-sm leading-relaxed text-tinta">{dato.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {documentos.length > 0 && (
        <ul data-revelar className="flex flex-col gap-2">
          {documentos.map(({ dato, def }) => (
            <li key={dato.clave}>
              <a
                href={dato.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex min-h-12 items-center gap-3 rounded-2xl border border-tinta/10 px-4 py-2.5 text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-tinta/60">
                  <path d="M5 2.5h6.5L15 6v11.5H5z M11.5 2.5V6H15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{def.label}</span>
                  {dato.valor && <span className="block truncate text-xs text-tinta/60">{dato.valor}</span>}
                </span>
                <span aria-hidden className="text-tinta/50">↗</span>
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
