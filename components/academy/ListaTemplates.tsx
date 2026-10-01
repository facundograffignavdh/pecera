"use client";

import Link from "next/link";
import { useProgreso } from "@/components/academy/useProgreso";
import { CATEGORIAS_DATAROOM } from "@/lib/dataroom";
import { PLANTILLAS } from "@/lib/plantillas";

/** Los templates por categoría del Dataroom, con su estado para la empresa de la sesión. */
export default function ListaTemplates() {
  const progreso = useProgreso();
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIAS_DATAROOM.filter((c) => PLANTILLAS.some((p) => p.categoria === c.valor)).map((c) => (
        <div key={c.valor} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{c.label}</h3>
          <ul className="flex flex-col gap-2">
            {PLANTILLAS.filter((p) => p.categoria === c.valor).map((p) => {
              const estado = progreso?.plantillas[p.id];
              return (
                <li key={p.id}>
                  <Link
                    href={`/cuenta/dataroom/plantilla/${p.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-tinta/10 bg-marfil px-4 py-3 transition-colors duration-200 ease-pecera hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-tinta">{p.nombre}</span>
                      <span className="block text-sm text-tinta/70">{p.bajada}</span>
                      <span className="mt-1 block text-xs text-tinta/55">
                        {p.pasos.length} {p.pasos.length === 1 ? "paso" : "pasos"} · {p.minutos} min
                      </span>
                    </span>
                    {estado && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                          estado.completo ? "bg-t-verde-suave text-t-verde" : "bg-t-ocre-suave text-t-ocre"
                        }`}
                      >
                        {estado.completo ? "Completo" : `${Math.round(estado.proporcion * 100)}%`}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
