"use client";

import type { CSSProperties } from "react";
import { abrirFormulario } from "@/components/landing/FormularioSumate";
import type { Rol } from "@/types/pecera";

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

function Tilde({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`mt-1 h-[18px] w-[18px] shrink-0 ${className}`}>
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type Oferta = {
  titulo: string;
  rol: Rol;
  color: string;
  borde: string;
  foco: string;
  tilde: string;
  texto: string;
  puntos: string[];
  cta: string;
};

/** Tarjeta de "Todo el ecosistema": entra directo al formulario propio, con el rol ya elegido. */
export default function TarjetaOferta({ o }: { o: Oferta }) {
  return (
    <button
      type="button"
      onClick={() => abrirFormulario(o.rol)}
      data-tilt
      style={{ "--foco": o.foco } as CSSProperties}
      className={`group flex h-full w-full flex-col rounded-3xl border border-t-[3px] border-tinta/10 bg-[#FBFAF4] p-8 text-left shadow-[0_1px_2px_rgb(28_27_22/0.06),0_10px_30px_rgb(28_27_22/0.06)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta ${o.borde}`}
    >
      <h3 className={`font-display text-3xl font-semibold ${o.color}`}>{o.titulo}</h3>
      <p className="mt-3 leading-relaxed text-tinta/80">{o.texto}</p>
      <ul className="mb-8 mt-6 grid gap-3.5">
        {o.puntos.map((p) => (
          <li key={p} className="flex gap-3 leading-snug text-tinta/80">
            <Tilde className={o.tilde} />
            {p}
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center gap-2 font-bold text-tinta">
        {o.cta}
        <Flecha className="h-[18px] w-[18px] transition-transform duration-200 ease-pecera group-hover:translate-x-1" />
      </span>
    </button>
  );
}
