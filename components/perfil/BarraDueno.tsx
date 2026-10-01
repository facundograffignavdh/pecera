"use client";

import Link from "next/link";
import { useCuentaLocal } from "@/lib/cuenta-local";
import { TAG_FERIA } from "@/lib/hashtags";

/**
 * Solo para el dueño de la tarjeta: subir pitch (destacado aunque sea opcional) y
 * editar. La página es estática; el navegador decide si mostrarla, así el caché
 * nunca se la muestra a otro. La seguridad real está en la RLS.
 */
export default function BarraDueno({ slug, sinPitch }: { slug: string; sinPitch: boolean }) {
  const cuenta = useCuentaLocal();
  if (cuenta?.perfil?.slug !== slug) return null;

  return (
    <section
      aria-label="Tu tarjeta"
      className="aparecer flex flex-col gap-3 rounded-3xl border-2 border-dashed border-arcilla/50 bg-t-arcilla-suave/40 px-4 py-4"
    >
      <p className="text-sm font-medium text-tinta">
        {sinPitch
          ? "Esta es tu tarjeta. Sumale tu pitch: los perfiles con video reciben muchos más contactos."
          : "Esta es tu tarjeta. Subí un video nuevo cada día y armá tu racha de progreso."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/subir"
          className="boton boton-brillo inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-arcilla px-5 font-semibold text-marfil shadow-[0_8px_20px_rgb(217_90_34/0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Subí tu pitch
        </Link>
        <Link
          href="/cuenta"
          className="boton inline-flex min-h-12 items-center justify-center rounded-full border border-tinta/30 bg-marfil px-5 font-medium text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        >
          Editar
        </Link>
      </div>
      <p className="text-xs text-tinta/65">
        Tip: poné <strong className="font-semibold">#{TAG_FERIA}</strong> en la descripción del pitch y aparece en la sección de
        la feria.
      </p>
    </section>
  );
}
