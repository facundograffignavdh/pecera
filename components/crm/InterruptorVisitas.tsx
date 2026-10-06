"use client";

import { useState, useTransition } from "react";
import { guardarMostrarVisitas } from "@/app/cuenta/crm/acciones";
import { boton } from "@/lib/ui";
import { AVISO_VISITAS } from "@/lib/visitas-dia";

const CONFIRMAR_APAGAR =
  "¿Pasar a modo privado? Nadie va a ver tu nombre en sus visitas y vos tampoco vas a ver quién te visitó. Las visitas que ya hiciste quedan sin tu nombre, aunque lo vuelvas a encender.";

/**
 * Encabezado de Mi CRM: el interruptor "Mostrar mis visitas" y la reciprocidad. Si todavía no vio
 * el aviso, primero el aviso con las dos opciones (la misma función de la base guarda las dos).
 */
export default function InterruptorVisitas({ mostrar, avisoVisto }: { mostrar: boolean; avisoVisto: boolean }) {
  const [valor, setValor] = useState(mostrar);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function cambiar(nuevo: boolean) {
    if (!nuevo && avisoVisto && !window.confirm(CONFIRMAR_APAGAR)) return;
    const antes = valor;
    setValor(nuevo);
    setError(null);
    empezar(async () => {
      const r = await guardarMostrarVisitas(nuevo);
      if (!r.ok) {
        setValor(antes);
        setError(r.mensaje ?? "No pudimos guardar. Probá de nuevo en un rato.");
      }
    });
  }

  if (!avisoVisto) {
    return (
      <section aria-labelledby="aviso-crm-titulo" className="rounded-2xl border border-tinta/15 bg-tinta/[0.03] p-4">
        <h2 id="aviso-crm-titulo" className="font-semibold text-tinta">
          Antes de empezar
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-tinta/80">{AVISO_VISITAS.texto}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={pendiente} onClick={() => cambiar(true)} className={boton("primario", "md")}>
            Mostrar mis visitas
          </button>
          <button type="button" disabled={pendiente} onClick={() => cambiar(false)} className={boton("secundario", "md")}>
            Usar modo privado
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-tinta">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="interruptor-visitas" className="rounded-2xl border border-tinta/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="interruptor-visitas" className="font-semibold text-tinta">
          Mostrar mis visitas
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={valor}
          aria-labelledby="interruptor-visitas"
          disabled={pendiente}
          onClick={() => cambiar(!valor)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-[var(--duracion)] ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60 ${
            valor ? "bg-tinta" : "bg-tinta/25"
          }`}
        >
          <span
            aria-hidden
            className={`absolute left-1 top-1 size-6 rounded-full bg-marfil transition-transform duration-[var(--duracion)] ease-pecera ${
              valor ? "translate-x-6" : ""
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-tinta/75">
        {valor
          ? "Los perfiles que visitás ven tu nombre, rol, empresa y el día. Es recíproco: por eso vos también ves quién te visitó."
          : "Modo privado: nadie ve tu nombre en sus visitas (solo suman como “en modo privado”). Es recíproco: mientras esté apagado, vos tampoco ves quién te visitó."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-tinta">
          {error}
        </p>
      )}
    </section>
  );
}
