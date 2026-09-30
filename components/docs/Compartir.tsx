"use client";

import { useState } from "react";
import { urlSitio } from "@/lib/cuenta";

/**
 * Comparte un concepto o documento: el menú nativo del celular si existe, si no copia
 * el link. El link lleva el ancla, así abre justo en esa definición.
 */
export default function Compartir({ titulo, ruta }: { titulo: string; ruta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const url = urlSitio(ruta);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${titulo} — Pecera`, url });
        return;
      } catch (e) {
        // Cancelar el menú no es un error; cualquier otra cosa cae a copiar.
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copiá el link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-tinta/70 transition-colors duration-200 ease-pecera hover:bg-tinta/5 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      <span aria-live="polite">{copiado ? "¡Link copiado!" : "Compartir"}</span>
    </button>
  );
}
