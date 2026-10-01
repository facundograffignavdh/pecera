"use client";

import type { ReactNode } from "react";
import { abrirElegirRol } from "@/components/landing/ElegirRol";
import { Flecha } from "@/components/landing/Seccion";

const TAMANOS = {
  lg: "min-h-14 px-8 text-[18px]",
  md: "min-h-12 px-6 text-base",
};

/**
 * EL CTA de la landing: todos los "Sumate" abren la elección de rol y de ahí se
 * entra con Google a armar el perfil (/cuenta?rol=…). Naranja con texto Tinta,
 * brillo al pasar, imán hacia el cursor (solo con mouse) y foco visible.
 */
export default function BotonForm({
  children = "Sumate a Pecera",
  tamano = "lg",
  className = "",
}: {
  children?: ReactNode;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={abrirElegirRol}
      aria-haspopup="dialog"
      data-magnetic
      className={`brillo group inline-flex items-center justify-center gap-2 rounded-full bg-naranja font-bold text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.15),0_8px_22px_rgb(244_124_60/0.32)] transition-[background-color,box-shadow,scale] duration-[var(--duracion)] ease-pecera hover:bg-pecera hover:shadow-[0_1px_2px_rgb(28_27_22/0.15),0_14px_30px_rgb(244_124_60/0.42)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta active:scale-[0.98] ${TAMANOS[tamano]} ${className}`}
    >
      {children}
      <Flecha className="h-5 w-5 transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-1" />
    </button>
  );
}
