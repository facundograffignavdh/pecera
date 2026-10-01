"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import Avatar from "@/components/Avatar";
import { dejarDeSeguir, useRed } from "@/lib/red";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const formatoFecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** "Mi red": los perfiles que seguís, con búsqueda y filtro por rol. */
export default function ListaRed() {
  const red = useRed();
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<Rol | null>(null);
  const q = normalizar(useDeferredValue(busqueda).trim());

  const visibles = red.filter(
    (s) =>
      (!rol || s.rol === rol) && (!q || normalizar(`${s.nombre} ${s.descripcion} ${s.detalle ?? ""}`).includes(q))
  );

  if (red.length === 0) {
    return (
      <div className="aparecer mt-8 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-tinta/20 px-6 py-12 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-t-verde-suave text-3xl">
          🗂️
        </span>
        <p className="font-display text-2xl font-semibold text-tinta">Tu red está vacía</p>
        <p className="max-w-sm text-sm leading-relaxed text-tinta/70">
          Cuando toques <strong className="font-semibold">Seguir</strong> en un perfil (o el + en un reel), queda
          guardado acá. Ideal para la feria: escaneás una tarjeta, seguís y después escribís con calma.
        </p>
        <Link href="/explorar" className="boton mt-2 inline-flex min-h-12 items-center rounded-full bg-tinta px-6 font-medium text-marfil">
          Explorar perfiles
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en tu red…"
          aria-label="Buscar en tu red"
          className="w-full rounded-full border border-tinta/30 bg-marfil px-4 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla sm:max-w-xs"
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {([null, "emprendedor", "inversor", "aliado"] as const).map((r) => {
            const cuantos = r ? red.filter((s) => s.rol === r).length : red.length;
            return (
              <button
                key={r ?? "todos"}
                type="button"
                aria-pressed={rol === r}
                onClick={() => setRol(r)}
                className={`boton min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
                  rol === r ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta hover:border-tinta/50"
                }`}
              >
                {r ? ROLES[r].label : "Todos"} <span className="ml-1 tabular-nums opacity-60">{cuantos}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((s, i) => (
          <li key={s.id} className="aparecer" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
            <div className="flex h-full items-start gap-3 rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-3.5 py-3">
              <Link href={`/p/${s.slug}`} className="shrink-0" aria-label={`Ver el perfil de ${s.nombre}`}>
                <Avatar perfil={s} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/p/${s.slug}`} className="block truncate font-semibold text-tinta hover:text-arcilla">
                  {s.nombre}
                </Link>
                <p className="truncate text-xs text-tinta/60">
                  {s.detalle ?? ROLES[s.rol].label} · desde {formatoFecha.format(s.desde)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-tinta/75">{s.descripcion}</p>
                <div className="mt-2 flex gap-3 text-sm">
                  <Link href={`/p/${s.slug}`} className="font-medium text-tinta underline decoration-tinta/30 underline-offset-4">
                    Escribile
                  </Link>
                  <button type="button" onClick={() => dejarDeSeguir(s.id)} className="text-tinta/55 hover:text-tinta">
                    Dejar de seguir
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && <p className="text-sm text-tinta/65">Nadie de tu red coincide con esa búsqueda.</p>}
    </div>
  );
}
