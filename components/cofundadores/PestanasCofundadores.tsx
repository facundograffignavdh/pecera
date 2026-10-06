"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ListaCofundadores from "@/components/explorar/ListaCofundadores";
import ListaNetworking, { type Alcance } from "@/components/networking/ListaNetworking";
import type { Perfil } from "@/types/pecera";

type Ver = "cofundadores" | "networking";

const PESTANAS: Array<{ id: Ver; label: string }> = [
  { id: "cofundadores", label: "Cofundadores" },
  { id: "networking", label: "Networking" },
];

/** Cambia un parámetro de la URL sin navegar (la página es estática: se puede compartir). */
function ponerEnUrl(cambios: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null) params.delete(clave);
    else params.set(clave, valor);
  }
  const q = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
}

/**
 * /cofundadores con dos pestañas: «Cofundadores» (el cofounder match de siempre, sin cambios)
 * y «Networking» (todos los roles, por qué buscás y qué ofrecés). Pestaña y alcance viven en
 * la URL (?ver=networking&alcance=feria) y se leen en el navegador: la página sigue estática.
 */
export default function PestanasCofundadores({
  cofundadores,
  networking,
  idsFeria,
}: {
  cofundadores: Perfil[];
  networking: Perfil[];
  idsFeria: string[];
}) {
  const params = useSearchParams();
  const [ver, setVer] = useState<Ver>(() => (params.get("ver") === "networking" ? "networking" : "cofundadores"));
  const [alcance, setAlcance] = useState<Alcance | null>(() => {
    const a = params.get("alcance");
    return a === "feria" || a === "plataforma" ? a : null;
  });
  const [editar] = useState(() => params.get("editar") === "1");

  function cambiarVer(v: Ver) {
    setVer(v);
    ponerEnUrl({ ver: v === "cofundadores" ? null : v, editar: null });
  }

  function cambiarAlcance(a: Alcance) {
    setAlcance(a);
    ponerEnUrl({ alcance: a });
  }

  return (
    <>
      <header className="aparecer mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {ver === "cofundadores" ? (
          <>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-arcilla">Cofounder match</p>
              <h1 className="mt-1 font-display text-4xl font-semibold leading-tight text-tinta sm:text-5xl">Encontrá a tu socio/a</h1>
              <p className="mt-3 leading-relaxed text-tinta/75">
                Como el Co-Founder Matching de YC, pero para el ecosistema de acá. Cada uno cuenta qué aporta, qué perfil le
                falta y cuánto tiempo le dedica. La lista se ordena por quién te complementa; si hay interés de los dos, hay match
                y se habilita el contacto.
              </p>
            </div>
            <Link
              href="/cuenta"
              className="boton inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-tinta px-6 font-medium text-marfil"
            >
              Quiero aparecer acá
            </Link>
          </>
        ) : (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-arcilla">Networking</p>
            <h1 className="mt-1 font-display text-4xl font-semibold leading-tight text-tinta sm:text-5xl">Conectá con quien te sirve</h1>
            <p className="mt-3 leading-relaxed text-tinta/75">
              Para todos: emprendedores, inversores, aliados, estudiantes y empresas. Contá qué buscás y qué ofrecés; la lista se
              ordena por quién te complementa y, si hay interés de los dos, hay match.
            </p>
          </div>
        )}
      </header>

      <div role="tablist" aria-label="Secciones" className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-tinta/[0.06] p-1 sm:max-w-md">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={ver === p.id}
            aria-controls="panel-cofundadores"
            onClick={() => cambiarVer(p.id)}
            className={`boton min-h-11 rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              ver === p.id ? "bg-tinta text-marfil" : "text-tinta hover:bg-tinta/[0.06]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div id="panel-cofundadores" role="tabpanel" aria-labelledby={`pestana-${ver}`} className="mt-8">
        {ver === "networking" ? (
          <ListaNetworking
            perfiles={networking}
            idsFeria={idsFeria}
            alcanceUrl={alcance}
            editarAlEntrar={editar}
            onCambiarAlcance={cambiarAlcance}
          />
        ) : cofundadores.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-tinta/20 px-6 py-12 text-center">
            <p className="font-display text-2xl font-semibold text-tinta">Todavía nadie se sumó al match</p>
            <p className="max-w-sm text-sm text-tinta/70">
              Sé el primero: en tu perfil, tocá «Editar perfil», prendé «Busco cofundador/a» y contá qué aportás y qué buscás.
            </p>
          </div>
        ) : (
          <ListaCofundadores perfiles={cofundadores} />
        )}
      </div>
    </>
  );
}
