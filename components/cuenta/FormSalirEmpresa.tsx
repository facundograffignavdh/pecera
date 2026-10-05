"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { salirEmpresa } from "@/app/cuenta/empresa";
import { PALABRA_CONFIRMAR, confirmaBorrado } from "@/lib/borrar-cuenta";
import { boton } from "@/lib/ui";

/**
 * Salir de una empresa. Si la persona es la última integrante, la empresa se borra:
 * se confirma escribiendo ELIMINAR (el servidor lo vuelve a verificar). Al borrarla,
 * también se van de este navegador los borradores de sus templates.
 */
export default function FormSalirEmpresa({ empresaId, seBorra }: { empresaId: string; seBorra: boolean }) {
  const id = useId();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const listo = !seBorra || confirmaBorrado(texto);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!listo || pendiente) return;
    setError(null);
    iniciar(async () => {
      try {
        const r = await salirEmpresa(empresaId, seBorra ? texto : "");
        if (!r.ok) {
          setError(r.mensaje ?? "No pudimos sacarte de la empresa. Probá de nuevo.");
          return;
        }
        if (r.borrada) borrarBorradores(empresaId);
      } catch {
        setError("No llegó al servidor. Revisá tu conexión y probá de nuevo.");
        return;
      }
      router.push("/cuenta#seccion-empresas");
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {seBorra && (
        <>
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
        </>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta">
          {error}
        </p>
      )}
      <button type="submit" disabled={!listo || pendiente} className={`${boton(seBorra ? "peligro" : "secundario", "lg")} w-full`}>
        {pendiente ? "Saliendo…" : seBorra ? "Salir y borrar la empresa" : "Salir de la empresa"}
      </button>
    </form>
  );
}

/** Los borradores locales de templates de esa empresa (lib/borrador, clave por empresa). */
function borrarBorradores(empresaId: string) {
  try {
    const prefijo = `pecera:plantilla:${empresaId}:`;
    for (const clave of Object.keys(localStorage)) {
      if (clave.startsWith(prefijo)) localStorage.removeItem(clave);
    }
  } catch {
    // Sin localStorage no hay borradores.
  }
}
