"use client";

import { type Tema, ponerTema, useTema } from "@/lib/tema";

const OPCIONES: Array<{ valor: Tema; label: string; icono: React.ReactNode }> = [
  {
    valor: "luz",
    label: "Luz",
    icono: (
      <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    ),
  },
  {
    valor: "noche",
    label: "Noche",
    icono: (
      <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    ),
  },
  {
    valor: "auto",
    label: "Auto",
    icono: (
      <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

/** Luz / Noche / Auto, como control segmentado. */
export default function SelectorTema() {
  const tema = useTema();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-full bg-tinta/[0.06] p-1">
      {OPCIONES.map((o) => {
        const elegido = tema === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={elegido}
            onClick={() => ponerTema(o.valor)}
            className={`boton inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              elegido ? "bg-marfil text-tinta shadow-[0_2px_8px_rgb(28_27_22/0.12)]" : "text-tinta/65 hover:text-tinta"
            }`}
          >
            {o.icono}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
