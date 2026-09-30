"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconoCerrar } from "@/components/Iconos";
import { DESCRIPCION_ROL } from "@/lib/cuenta";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

/**
 * Elegir rol antes de entrar: la landing ya no tiene un formulario propio. El alta
 * es una sola, en /cuenta con Google, y el rol viaja como `?rol=` para que el
 * formulario arranque en el paso correcto.
 */

export const EVENTO_ELEGIR_ROL = "pecera:elegir-rol";

/** Cualquier CTA de la landing llama esto — no hace falta prop-drilling. */
export function abrirElegirRol() {
  document.dispatchEvent(new CustomEvent(EVENTO_ELEGIR_ROL));
}

const ORDEN: Rol[] = ["emprendedor", "inversor", "aliado"];
const TITULO: Record<Rol, string> = {
  emprendedor: "Innovador",
  inversor: "Inversor",
  aliado: "Aliado",
};

export default function ElegirRol() {
  const ref = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);

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
      onClose={() => setAbierto(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl bg-marfil p-0 text-tinta shadow-[0_24px_64px_rgb(28_27_22/0.3)] backdrop:bg-tinta/50"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="elegir-rol-titulo" className="font-display text-2xl font-semibold leading-tight">
              ¿Cómo entrás a Pecera?
            </h2>
            <p className="mt-1 text-sm text-tinta/70">Entrás con Google y armás tu perfil en 2 minutos.</p>
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
          {ORDEN.map((rol) => (
            <li key={rol}>
              <Link
                href={`/cuenta?rol=${rol}`}
                className="group flex min-h-16 items-center gap-4 rounded-2xl border border-tinta/15 px-4 py-3 transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <span aria-hidden className={`size-3 shrink-0 rounded-full ${ROLES[rol].bg}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{TITULO[rol]}</span>
                  <span className="block text-sm leading-snug text-tinta/70">{DESCRIPCION_ROL[rol]}</span>
                </span>
                <span aria-hidden className="text-tinta/50 transition-transform duration-200 ease-pecera group-hover:translate-x-1">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-tinta/60">
          ¿Ya tenés perfil?{" "}
          <Link href="/cuenta" className="font-medium text-tinta underline underline-offset-4">
            Entrá acá
          </Link>
          .
        </p>
      </div>
    </dialog>
  );
}
