"use client";

import { useId, useState, useTransition } from "react";
import { eliminarCuenta } from "@/app/cuenta/acciones";
import { PALABRA_CONFIRMAR, confirmaBorrado, limpiarNavegador, marcarAvisoEliminada } from "@/lib/borrar-cuenta";
import { boton } from "@/lib/ui";

/**
 * Confirmación escribiendo una palabra. Al borrar: limpia el navegador y vuelve al
 * inicio con una recarga entera (así no queda nada de la cuenta en memoria), donde
 * `AvisoCuentaEliminada` muestra el mensaje.
 */
export default function FormEliminarCuenta() {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const listo = confirmaBorrado(texto);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!listo || pendiente) return;
    setError(null);
    iniciar(async () => {
      let dispositivo: string | null = null;
      try {
        dispositivo = localStorage.getItem("pecera:dispositivo");
      } catch {
        // Sin localStorage no hubo piques ni vistas guardados con ese uuid.
      }
      try {
        const r = await eliminarCuenta(texto, dispositivo);
        if (!r.ok) {
          setError(r.mensaje);
          return;
        }
      } catch {
        setError("No pudimos eliminar tu cuenta. Revisá tu conexión y probá de nuevo.");
        return;
      }
      limpiarNavegador();
      marcarAvisoEliminada();
      window.location.replace("/");
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label htmlFor={`${id}-palabra`} className="text-sm font-medium text-tinta">
        Para confirmar, escribí <strong className="font-semibold">{PALABRA_CONFIRMAR}</strong>
      </label>
      <input
        id={`${id}-palabra`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        disabled={pendiente}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-12 w-full rounded-xl border border-tinta/55 bg-marfil px-4 text-base uppercase tracking-wide text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta">
          {error}
        </p>
      )}
      <button type="submit" disabled={!listo || pendiente} className={`${boton("peligro", "lg")} w-full`}>
        {pendiente ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
      </button>
    </form>
  );
}
