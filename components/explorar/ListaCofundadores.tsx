"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { Etiqueta } from "@/components/Etiquetas";
import { APORTES, aporte, industria, labelDedicacion } from "@/lib/etiquetas";
import { ROLES } from "@/lib/rol";
import type { Perfil } from "@/types/pecera";

/**
 * Cofounder match (como el de YC): filtrás por el perfil que te falta y ves a quién
 * le encajás. El match es de ida y vuelta: "Te busca a vos" marca a quienes buscan
 * justo lo que elegiste que aportás.
 */
export default function ListaCofundadores({ perfiles }: { perfiles: Perfil[] }) {
  const [busco, setBusco] = useState<string | null>(null);
  const [aporto, setAporto] = useState<string | null>(null);

  const visibles = perfiles.filter((p) => !busco || p.cofundador_aporta === busco);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4 sm:grid-cols-2 sm:px-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">Busco a alguien…</legend>
          <div className="flex flex-wrap gap-2">
            {[null, ...APORTES.map((a) => a.valor)].map((v) => {
              const a = v ? aporte(v) : null;
              const elegido = busco === v;
              return (
                <button
                  key={v ?? "todos"}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => setBusco(v)}
                  className={`boton min-h-10 rounded-full border px-3.5 text-sm font-medium ${
                    elegido ? (a ? `border-transparent ${a.clase}` : "border-tinta bg-tinta text-marfil") : "border-tinta/20 text-tinta"
                  }`}
                >
                  {a ? a.label : "De cualquier perfil"}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">Yo aporto… (para ver a quién le encajás)</legend>
          <div className="flex flex-wrap gap-2">
            {APORTES.map((a) => {
              const elegido = aporto === a.valor;
              return (
                <button
                  key={a.valor}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => setAporto(elegido ? null : a.valor)}
                  className={`boton min-h-10 rounded-full border px-3.5 text-sm font-medium ${
                    elegido ? `border-transparent ${aporte(a.valor)?.clase}` : "border-tinta/20 text-tinta"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <p className="text-sm text-tinta/60" aria-live="polite">
        {visibles.length} {visibles.length === 1 ? "persona busca" : "personas buscan"} cofundador/a
      </p>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visibles.map((p, i) => {
          const propio = aporte(p.cofundador_aporta);
          const teBusca = !!aporto && (p.cofundador_busca ?? []).includes(aporto);
          return (
            <li key={p.id} className="aparecer" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
              <Link
                href={`/p/${p.slug}`}
                className={`boton flex h-full flex-col gap-3 rounded-3xl border px-4 py-4 ${
                  teBusca ? "border-arcilla bg-t-arcilla-suave/40" : "border-tinta/10 bg-tinta/[0.02] hover:border-tinta/40"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Avatar perfil={p} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{p.nombre}</span>
                    <span className="block text-xs text-tinta/60">
                      {ROLES[p.rol].label}
                      {labelDedicacion(p.cofundador_dedicacion) ? ` · ${labelDedicacion(p.cofundador_dedicacion)}` : ""}
                    </span>
                  </span>
                  {teBusca && (
                    <span className="shrink-0 rounded-full bg-arcilla px-2 py-0.5 text-xs font-semibold text-marfil">Te busca</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  {propio && (
                    <>
                      <span className="text-tinta/60">Aporta</span>
                      <Etiqueta clase={propio.clase}>{propio.label}</Etiqueta>
                    </>
                  )}
                  {(p.cofundador_busca ?? []).length > 0 && <span className="ml-1 text-tinta/60">Busca</span>}
                  {(p.cofundador_busca ?? []).map((b) => {
                    const a = aporte(b);
                    return a ? (
                      <Etiqueta key={b} clase={a.clase}>
                        {a.label}
                      </Etiqueta>
                    ) : null;
                  })}
                </span>
                {p.cofundador_nota ? (
                  <span className="text-sm leading-relaxed text-tinta/85">“{p.cofundador_nota}”</span>
                ) : (
                  <span className="line-clamp-2 text-sm leading-relaxed text-tinta/75">{p.descripcion}</span>
                )}
                {(p.industrias ?? []).length > 0 && (
                  <span className="mt-auto flex flex-wrap gap-1.5">
                    {(p.industrias ?? []).slice(0, 3).map((ind) => (
                      <Etiqueta key={ind} clase={industria(ind).clase}>
                        {industria(ind).label}
                      </Etiqueta>
                    ))}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
