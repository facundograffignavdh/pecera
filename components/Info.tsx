"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

/**
 * Ícono "i" que explica un campo. El globo se abre debajo de la etiqueta, a todo el
 * ancho del campo (el contenedor de la etiqueta tiene que ser `relative`): así nunca
 * se sale de la pantalla en el celular. Toque afuera o Escape lo cierran.
 */
export default function Info({ children, titulo = "Más información" }: { children: ReactNode; titulo?: string }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <span ref={ref} className="inline-flex align-middle">
      <button
        type="button"
        aria-label={titulo}
        aria-expanded={abierto}
        aria-controls={id}
        onClick={(e) => {
          // Dentro de un <label> o <legend>, que el toque no marque la opción.
          e.preventDefault();
          e.stopPropagation();
          setAbierto((a) => !a);
        }}
        className={`relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border font-display text-[11px] font-bold italic leading-none transition-colors duration-200 ease-pecera after:absolute after:-inset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
          abierto ? "border-tinta bg-tinta text-marfil" : "border-tinta/40 text-tinta/70 hover:border-tinta hover:text-tinta"
        }`}
      >
        i
      </button>
      {abierto && (
        <span
          id={id}
          role="note"
          className="absolute inset-x-0 top-full z-30 mt-2 block rounded-2xl bg-tinta px-4 py-3 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-marfil shadow-[0_12px_32px_rgb(28_27_22/0.28)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
