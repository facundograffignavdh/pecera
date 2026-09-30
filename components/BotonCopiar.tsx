"use client";

import { useRef, useState } from "react";

/** Copia al portapapeles. Si la API no está (http, navegadores viejos), usa un input oculto. */
async function copiar(texto: string, respaldo: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    if (!respaldo) return false;
    respaldo.value = texto;
    respaldo.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }
}

export default function BotonCopiar({
  texto,
  etiqueta,
  className,
  onCopiado,
}: {
  texto: string;
  etiqueta: string;
  className?: string;
  /** Después de copiar bien (el perfil lo mide como contacto por email). */
  onCopiado?: () => void;
}) {
  const [estado, setEstado] = useState<"listo" | "copiado" | "error">("listo");
  const respaldo = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function alTocar() {
    const ok = await copiar(texto, respaldo.current);
    setEstado(ok ? "copiado" : "error");
    if (ok) onCopiado?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setEstado("listo"), 2000);
  }

  return (
    <>
      <button type="button" onClick={alTocar} className={className}>
        <span aria-live="polite">
          {estado === "copiado" ? "Copiado" : estado === "error" ? "No se pudo copiar" : etiqueta}
        </span>
      </button>
      <input
        ref={respaldo}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] opacity-0"
      />
    </>
  );
}
