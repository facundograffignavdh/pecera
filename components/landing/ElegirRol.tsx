"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconoCerrar } from "@/components/Iconos";
import { FEED_DESDE_LANDING } from "@/lib/landing";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

/**
 * "¿Qué te trae a Pecera?": el paso entre la landing y el alta. La landing no
 * tiene formulario propio: el alta es una sola, en /cuenta con Google, y el rol
 * viaja como `?rol=` para que el formulario arranque en el paso correcto. Quien
 * solo quiere mirar va al feed, sin cuenta.
 */

export const EVENTO_ELEGIR_ROL = "pecera:elegir-rol";

/** Cualquier CTA de la landing llama esto: no hace falta prop-drilling. */
export function abrirElegirRol() {
  document.dispatchEvent(new CustomEvent(EVENTO_ELEGIR_ROL));
}

const OPCIONES: { rol: Rol; titulo: string; texto: string }[] = [
  { rol: "emprendedor", titulo: "Estoy construyendo", texto: "Tengo una startup o un proyecto y quiero mostrarlo." },
  { rol: "inversor", titulo: "Invierto", texto: "Busco startups para invertir y quiero escribirles directo." },
  { rol: "aliado", titulo: "Acompaño startups", texto: "Mentoría, coaching, aceleración, incubación o servicios." },
];

export default function ElegirRol() {
  const ref = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [yendo, setYendo] = useState<Rol | null>(null);

  useEffect(() => {
    const abrir = () => setAbierto(true);
    document.addEventListener(EVENTO_ELEGIR_ROL, abrir);
    return () => document.removeEventListener(EVENTO_ELEGIR_ROL, abrir);
  }, []);

  useEffect(() => {
    const dialogo = ref.current;
    if (abierto && dialogo && !dialogo.open) dialogo.showModal();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="elegir-rol-titulo"
      onClose={() => {
        setAbierto(false);
        setYendo(null);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="elegir-rol m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-bloque)] bg-marfil p-0 text-tinta shadow-[0_24px_64px_rgb(28_27_22/0.3)] backdrop:bg-tinta/55"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="elegir-rol-titulo" className="font-display text-[1.75rem] font-semibold leading-tight">
              ¿Qué te trae a Pecera?
            </h2>
            <p className="mt-1 text-sm text-tinta/70">Elegí y entrás con Google. Tu perfil, en 2 minutos.</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar"
            className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            <IconoCerrar className="size-4" />
          </button>
        </div>
        <ul className="flex flex-col gap-2.5">
          {OPCIONES.map((o) => (
            <li key={o.rol}>
              <Link
                href={`/cuenta?rol=${o.rol}`}
                onClick={() => setYendo(o.rol)}
                aria-busy={yendo === o.rol || undefined}
                className={`group flex min-h-16 items-center gap-4 rounded-2xl border px-4 py-3 transition-[border-color,background-color] duration-[var(--duracion)] ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
                  yendo === o.rol ? "border-naranja bg-naranja-suave" : "border-tinta/15"
                }`}
              >
                <span aria-hidden className={`size-3 shrink-0 rounded-full ${ROLES[o.rol].bg}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{o.titulo}</span>
                  <span className="block text-sm leading-snug text-tinta/70">{o.texto}</span>
                </span>
                {yendo === o.rol ? (
                  <span role="status" className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-tinta">
                    <span aria-hidden className="punto-vivo size-2 rounded-full bg-naranja" />
                    Abriendo…
                  </span>
                ) : (
                  <span aria-hidden className="text-tinta/50 transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-1">
                    &rarr;
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-tinta/10 pt-4 text-sm">
          <Link
            href={FEED_DESDE_LANDING}
            className="inline-flex min-h-11 items-center font-semibold text-tinta underline-offset-4 hover:underline"
          >
            Solo quiero mirar <span aria-hidden className="ml-1">&rarr;</span>
          </Link>
          <p className="text-tinta/65">
            ¿Ya tenés perfil?{" "}
            <Link href="/cuenta" className="font-medium text-tinta underline underline-offset-4">
              Entrá
            </Link>
          </p>
        </div>
      </div>
    </dialog>
  );
}
