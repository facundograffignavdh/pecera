"use client";

import { useActionState } from "react";
import { guardarNewsletter } from "@/app/cuenta/newsletter";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { LIMITES_NEWSLETTER, type NewsletterLink } from "@/lib/newsletter";

const INICIAL: Resultado = { ok: false };

/**
 * "Tu newsletter" en /cuenta: el link a tu Substack (u otra plataforma) para que
 * aparezca en tu perfil. La escribís y la mandás desde allá.
 */
export default function TarjetaNewsletter({ newsletter }: { newsletter: NewsletterLink | null }) {
  const [estado, accion, pendiente] = useActionState(guardarNewsletter, INICIAL);
  return (
    <Tarjeta
      titulo="Tu newsletter"
      etiqueta={newsletter ? "En tu perfil" : undefined}
      bajada="¿Escribís una newsletter en Substack? Pegá el link y aparece en tu perfil para que te sigan. La escribís y la mandás desde allá."
    >
      <form action={accion} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="news-url" className="text-sm font-medium text-tinta">Link de tu newsletter</label>
          <input
            id="news-url"
            name="url"
            type="url"
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            maxLength={LIMITES_NEWSLETTER.url}
            defaultValue={newsletter?.url ?? ""}
            placeholder="https://tunombre.substack.com"
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="news-titulo" className="text-sm font-medium text-tinta">Nombre (opcional)</label>
          <input
            id="news-titulo"
            name="titulo"
            maxLength={LIMITES_NEWSLETTER.titulo}
            defaultValue={newsletter?.titulo ?? ""}
            placeholder="Ej.: Diario de una huerta urbana"
            autoComplete="off"
            className={INPUT}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {newsletter && (
            <button
              type="submit"
              formAction={(fd: FormData) => {
                fd.set("url", "");
                fd.set("titulo", "");
                return accion(fd);
              }}
              disabled={pendiente}
              className={BOTON_SECUNDARIO}
            >
              Sacar de mi perfil
            </button>
          )}
        </div>
        {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
      </form>
    </Tarjeta>
  );
}
