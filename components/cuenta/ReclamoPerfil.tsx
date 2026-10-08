"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { rechazarReclamo, reclamarPerfil } from "@/app/cuenta/reclamo";
import { MensajeError } from "@/components/perfil/editores/campos";
import { CONSENTIMIENTO, urlPerfil } from "@/lib/cuenta";
import { boton } from "@/lib/ui";

export type PerfilReclamable = {
  perfil_id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  empresa: string | null;
};

/**
 * Antes del alta: el equipo armó un perfil en la feria con el email verificado de esta cuenta.
 * "Sí, es mío" (con la casilla) lo pasa a la persona; "No es mío" sigue al alta de siempre y el
 * equipo lo revisa. Nada se fusiona solo.
 */
export default function ReclamoPerfil({ perfiles }: { perfiles: PerfilReclamable[] }) {
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function correr(accion: () => Promise<{ ok: boolean; mensaje?: string }>) {
    setError(null);
    iniciar(async () => {
      try {
        const r = await accion();
        if (!r.ok) setError(r.mensaje ?? "No se pudo. Probá de nuevo.");
      } catch (e) {
        unstable_rethrow(e);
        setError("Se cortó la conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <section aria-labelledby="reclamo-titulo" className="flex flex-col gap-4">
      <h1 id="reclamo-titulo" className="font-display text-3xl font-semibold leading-tight text-tinta">
        Encontramos tu perfil de la feria: ¿es tuyo?
      </h1>
      <p className="leading-relaxed text-tinta/80">
        Alguien del equipo de Pecera lo armó con vos en un stand. Si es tuyo, pasa a tu cuenta y lo editás vos.
      </p>
      {perfiles.map((p) => (
        <article key={p.perfil_id} className="flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-tinta/5 px-4 py-4 text-tinta">
          <div>
            <p className="font-display text-xl font-semibold">{p.nombre}</p>
            {p.empresa && <p className="text-sm font-medium text-tinta/80">{p.empresa}</p>}
            <p className="mt-1 font-editorial leading-relaxed">{p.descripcion}</p>
          </div>
          <a href={urlPerfil(p.slug)} target="_blank" rel="noreferrer" className="self-start text-sm font-medium underline underline-offset-4">
            Ver cómo se ve
          </a>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                if (!consentimiento) return setError("Tildá la casilla para confirmar.");
                correr(() => reclamarPerfil(p.perfil_id, true));
              }}
              className={boton("primario", "lg")}
            >
              Sí, es mío
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => rechazarReclamo(p.perfil_id))}
              className={boton("secundario", "lg")}
            >
              No es mío
            </button>
          </div>
        </article>
      ))}
      <label className="flex items-start gap-3 text-tinta">
        <input
          type="checkbox"
          checked={consentimiento}
          onChange={(e) => {
            setConsentimiento(e.target.checked);
            setError(null);
          }}
          className="mt-0.5 size-5 shrink-0 accent-arcilla"
        />
        <span className="text-sm leading-relaxed">
          {CONSENTIMIENTO}, según la{" "}
          <a href="/privacidad" target="_blank" className="font-medium underline underline-offset-4">
            política de privacidad
          </a>{" "}
          y las{" "}
          <a href="/terminos" target="_blank" className="font-medium underline underline-offset-4">
            condiciones
          </a>
          .
        </span>
      </label>
      {error && <MensajeError>{error}</MensajeError>}
      {pendiente && (
        <p role="status" className="text-sm text-tinta/80">
          Un momento…
        </p>
      )}
    </section>
  );
}
