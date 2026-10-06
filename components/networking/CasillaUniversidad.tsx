"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { guardarConsentimiento } from "@/app/cuenta/consentimiento";
import { CONSENTIMIENTO_U21 } from "@/lib/networking";

export type Consentimiento = { acepta: boolean; fecha: string | null };

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

/**
 * La casilla OPCIONAL para compartir el perfil con la organización de la Feria 21 (Ley 25.326).
 * Separada de todo lo demás: nunca es condición para usar Pecera ni el networking. Se guarda al
 * tocarla (con su fecha) y se retira destildándola. Si falla, avisa y vuelve atrás.
 */
export default function CasillaUniversidad({
  valor,
  onCambio,
}: {
  valor: Consentimiento;
  onCambio: (c: Consentimiento) => void;
}) {
  const id = useId();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(acepta: boolean) {
    const anterior = valor;
    onCambio({ acepta, fecha: valor.fecha });
    setError(null);
    iniciar(async () => {
      try {
        const r = await guardarConsentimiento(acepta);
        if (r.ok) onCambio({ acepta, fecha: r.fecha ?? null });
        else {
          onCambio(anterior);
          setError(r.mensaje ?? "No pudimos guardar tu elección. Probá de nuevo.");
        }
      } catch {
        onCambio(anterior);
        setError("Sin conexión: tu elección todavía no se guardó.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-tinta/15 px-4 py-3">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={valor.acepta}
          disabled={pendiente}
          onChange={(e) => cambiar(e.target.checked)}
          aria-describedby={`${id}-ayuda`}
          className="mt-0.5 size-5 shrink-0 accent-tinta"
        />
        <label htmlFor={id} className="text-sm leading-snug text-tinta">
          {CONSENTIMIENTO_U21.texto}
        </label>
      </div>
      <p id={`${id}-ayuda`} className="pl-8 text-xs leading-snug text-tinta/70">
        Opcional: no la necesitás para usar Pecera ni el networking. La podés retirar cuando quieras.{" "}
        <Link href="/privacidad#universidad" target="_blank" className="font-medium text-tinta underline underline-offset-2">
          Qué implica
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </Link>
        {valor.fecha && !pendiente && (
          <span className="block pt-1">
            {valor.acepta ? "Aceptaste" : "Elegiste no compartir"} el {fechaCorta(valor.fecha)}.
          </span>
        )}
      </p>
      {error && (
        <p role="alert" className="pl-8 text-sm font-medium text-tinta">
          {error}
        </p>
      )}
    </div>
  );
}
