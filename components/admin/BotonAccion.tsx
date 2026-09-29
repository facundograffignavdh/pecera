"use client";

import { useState, useTransition } from "react";
import type { Resultado } from "@/lib/errores-base";

const ESTILOS = {
  primario: "bg-tinta text-marfil",
  secundario: "border border-tinta/30 text-tinta hover:border-tinta",
  peligro: "border-2 border-arcilla text-tinta",
} as const;

/**
 * Botón de una acción del panel. Recibe la server action ya atada a sus argumentos
 * (`accion.bind(null, id, valor)`), así el servidor decide todo. Si hay `confirmar`,
 * pregunta antes: sirve para lo que se ve en público (abrir la votación, ocultar).
 */
export default function BotonAccion({
  accion,
  children,
  confirmar,
  estilo = "secundario",
}: {
  accion: () => Promise<Resultado>;
  children: React.ReactNode;
  confirmar?: string;
  estilo?: keyof typeof ESTILOS;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          setError(null);
          iniciar(async () => {
            const r = await accion();
            if (!r.ok) setError(r.mensaje ?? "No se pudo.");
          });
        }}
        className={`inline-flex min-h-10 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60 ${ESTILOS[estilo]}`}
      >
        {pendiente ? "…" : children}
      </button>
      {error && (
        <span role="alert" className="text-xs font-medium text-t-arcilla">
          {error}
        </span>
      )}
    </span>
  );
}
