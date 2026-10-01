"use client";

import type { ReactNode } from "react";
import { abrirElegirRol } from "@/components/landing/ElegirRol";

function Flecha({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** CTA principal: elegir rol y entrar con Google a armar el perfil (/cuenta?rol=…). */
export default function BotonForm({
  children = "Sumate a Pecera",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={abrirElegirRol}
      data-magnetic
      className={`brillo group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-naranja px-8 text-[19px] font-bold text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.15),0_8px_20px_rgb(217_90_34/0.28)] transition-shadow duration-200 ease-pecera hover:shadow-[0_1px_2px_rgb(28_27_22/0.15),0_12px_28px_rgb(217_90_34/0.4)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta hover:bg-pecera active:scale-[0.98]${className}`}
    >
      {children}
      <Flecha className="h-5 w-5 transition-transform duration-200 ease-pecera group-hover:translate-x-1" />
    </button>
  );
}
