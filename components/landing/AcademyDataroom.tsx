import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Seccion } from "@/components/landing/Seccion";
import SwitchDemo from "@/components/landing/SwitchDemo";
import { CATEGORIAS_DATAROOM } from "@/lib/dataroom";
import { LECCIONES } from "@/lib/essentials";
import { PLANTILLAS } from "@/lib/plantillas";

function Paso({
  n,
  titulo,
  texto,
  children,
  className = "",
}: {
  n: number;
  titulo: string;
  texto: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      data-revelar
      style={{ transitionDelay: `${n * 70}ms` }}
      className={`flex flex-col gap-5 rounded-[var(--radius-bloque)] border border-tinta/10 bg-marfil p-6 ${className}`}
    >
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">
          <span className="font-display text-sm normal-case tracking-normal text-naranja-texto">{n}</span>
          {titulo}
        </p>
        <p className="mt-2 font-display text-xl font-semibold leading-snug text-tinta">{texto}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </li>
  );
}

/**
 * Academy → Dataroom como un recorrido de transformación: aprender, completar
 * templates, ordenar por categoría, elegir qué se ve y exportar. Los números
 * (lecciones, templates, categorías) salen del código: son reales.
 */
export default function AcademyDataroom() {
  return (
    <Seccion
      id="academy"
      numero="08"
      etiqueta="Academy → Dataroom"
      titulo="Aprendé, documentá y llegá preparado."
      bajada="Pecera no es solo para que te encuentren. Lo que aprendés en la Academy se vuelve un documento, y tus documentos, un Dataroom que mostrás cuando vos querés."
    >
      <ol className="mt-14 grid gap-4 md:grid-cols-6">
        <Paso n={1} titulo="Aprendé" texto={`${LECCIONES.length} lecciones de Startup Essentials.`} className="md:col-span-3">
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
              <div className="barra-progreso h-full rounded-full bg-naranja" style={{ "--p": 0.3 } as CSSProperties} />
            </div>
            <span className="text-sm font-semibold tabular-nums text-tinta/70">4 de {LECCIONES.length}</span>
          </div>
          <Link href="/academy" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-naranja-texto underline-offset-4 hover:underline">
            Ver la Academy <span aria-hidden className="ml-1">&rarr;</span>
          </Link>
        </Paso>
        <Paso n={2} titulo="Completá" texto={`${PLANTILLAS.length} templates guiados, paso a paso.`} className="md:col-span-3">
          <div aria-hidden className="rounded-2xl bg-superficie p-4">
            <p className="text-sm font-semibold">TAM, SAM y SOM</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i <= 2 ? "bg-naranja" : "bg-tinta/15"}`} />
              ))}
            </div>
            <p className="mt-2 flex justify-between text-xs text-tinta/65">
              Paso 2 de 4 <span className="font-semibold text-aliado">✓ Guardado</span>
            </p>
          </div>
        </Paso>
        <Paso n={3} titulo="Organizá" texto="Todo en su categoría." className="md:col-span-2">
          <ul aria-hidden className="flex flex-wrap gap-1.5">
            {CATEGORIAS_DATAROOM.slice(0, 7).map((c) => (
              <li key={c.valor} className="rounded-full bg-superficie px-2.5 py-1 text-xs font-medium text-tinta/80">
                {c.label}
              </li>
            ))}
          </ul>
        </Paso>
        <Paso n={4} titulo="Elegí qué mostrar" texto="Privado o transparente, documento por documento." className="md:col-span-2">
          <div className="rounded-2xl bg-superficie p-4">
            <p className="mb-3 text-sm font-semibold">Análisis de competencia</p>
            <SwitchDemo />
          </div>
        </Paso>
        <Paso n={5} titulo="Exportá" texto="Un PDF para inversores, solo con lo que elegiste." className="md:col-span-2">
          <div aria-hidden className="relative mx-auto h-28 w-24">
            <span className="absolute inset-0 translate-x-3 translate-y-1 rotate-6 rounded-lg border border-tinta/10 bg-superficie" />
            <span className="absolute inset-0 flex flex-col gap-1.5 rounded-lg border border-tinta/15 bg-marfil p-2.5 shadow-[0_8px_20px_rgb(28_27_22/0.1)]">
              <span className="h-2 w-10 rounded-full bg-naranja" />
              <span className="h-1.5 w-full rounded-full bg-tinta/15" />
              <span className="h-1.5 w-4/5 rounded-full bg-tinta/15" />
              <span className="h-1.5 w-full rounded-full bg-tinta/15" />
              <span className="mt-auto text-[10px] font-bold tracking-wide text-tinta/65">PDF</span>
            </span>
          </div>
        </Paso>
      </ol>
    </Seccion>
  );
}
