"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { especialidad, industria } from "@/lib/etiquetas";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

export type PerfilExplorar = {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  avatar_url: string | null;
  descripcion: string;
  industrias: string[];
  especialidades: string[];
  pitches: number;
};

const PLURAL: Record<Rol, string> = { emprendedor: "Emprendedores", inversor: "Inversores", aliado: "Aliados" };

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Busca en hashtags y perfiles a la vez, sin tildes ni mayúsculas. */
export default function BuscadorExplorar({
  tags,
  perfiles,
}: {
  tags: Array<{ tag: string; total: number }>;
  perfiles: PerfilExplorar[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<Rol | null>(null);
  const q = normalizar(useDeferredValue(busqueda).trim().replace(/^#/, ""));

  const indice = useMemo(
    () =>
      perfiles.map((p) => ({
        perfil: p,
        texto: normalizar(
          [
            p.nombre,
            p.descripcion,
            ...p.industrias.map((i) => industria(i).label),
            ...p.especialidades.map((e) => especialidad(e).label),
          ].join(" ")
        ),
      })),
    [perfiles]
  );

  const tagsVisibles = q ? tags.filter((t) => t.tag.includes(q)) : tags.slice(0, 24);
  const perfilesVisibles = indice
    .filter(({ perfil, texto }) => (!rol || perfil.rol === rol) && (!q || texto.includes(q)))
    .map((x) => x.perfil);

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-0 z-10 -mx-5 flex flex-col gap-3 bg-marfil/95 px-5 pb-3 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.75rem)] backdrop-blur lg:-mx-8 lg:px-8">
        <label htmlFor="buscar" className="sr-only">
          Buscar en Pecera
        </label>
        <div className="relative">
          <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta/50" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            id="buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscá #feria21, agtech, marketing, un nombre…"
            className="w-full rounded-full border border-tinta/30 bg-marfil py-3 pl-12 pr-4 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
          />
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {([null, "emprendedor", "inversor", "aliado"] as const).map((r) => (
            <button
              key={r ?? "todos"}
              type="button"
              aria-pressed={rol === r}
              onClick={() => setRol(r)}
              className={`boton min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
                rol === r ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta hover:border-tinta/50"
              }`}
            >
              {r ? PLURAL[r] : "Todos"}
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="tit-tags">
        <h2 id="tit-tags" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">
          Secciones
        </h2>
        {tagsVisibles.length === 0 ? (
          <p className="mt-3 text-sm text-tinta/65">No hay hashtags que coincidan.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {tagsVisibles.map((t) => (
              <li key={t.tag}>
                <Link
                  href={`/t/${t.tag}`}
                  className="boton inline-flex min-h-11 items-center gap-1.5 rounded-full border border-tinta/15 bg-tinta/[0.03] px-4 font-medium text-tinta hover:border-arcilla"
                >
                  <span className="text-arcilla">#</span>
                  {t.tag}
                  <span className="text-xs tabular-nums text-tinta/55">{t.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tit-perfiles">
        <h2 id="tit-perfiles" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">
          Perfiles · {perfilesVisibles.length}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {perfilesVisibles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.slug}`}
                className="boton flex h-full items-start gap-3 rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-3.5 py-3 hover:border-arcilla"
              >
                <Avatar perfil={p} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-tinta">{p.nombre}</span>
                    <span className={`size-2 shrink-0 rounded-full ${ROLES[p.rol].bg}`} aria-label={ROLES[p.rol].label} />
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-tinta/70">{p.descripcion}</span>
                  {p.pitches > 0 && (
                    <span className="mt-1 block text-xs text-tinta/55">
                      ▶ {p.pitches} {p.pitches === 1 ? "pitch" : "pitches"}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {perfilesVisibles.length === 0 && <p className="mt-3 text-sm text-tinta/65">Nadie coincide con esa búsqueda.</p>}
      </section>
    </div>
  );
}
