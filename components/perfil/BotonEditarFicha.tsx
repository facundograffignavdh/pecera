"use client";

import Link from "next/link";
import { IconoEditar } from "@/components/Iconos";
import { useCuentaLocal } from "@/lib/cuenta-local";

/** El mismo botón en /p (link a /cuenta) y en /cuenta (abre la hoja de la ficha). */
export const CLASE_EDITAR_FICHA =
  "boton inline-flex min-h-9 items-center gap-1.5 rounded-full bg-marfil/90 px-3 text-sm font-semibold text-tinta shadow-[0_2px_10px_rgb(28_27_22/0.18)] backdrop-blur hover:bg-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta";

/**
 * "Editar" sobre la franja de la tarjeta, solo para el dueño. La página es estática:
 * el navegador decide si mostrarlo (para el resto no existe). Lleva a /cuenta, donde
 * está el perfil editable.
 */
export default function BotonEditarFicha({ slug }: { slug: string }) {
  const cuenta = useCuentaLocal();
  if (cuenta?.perfil?.slug !== slug) return null;
  return (
    <Link href="/cuenta" className={`aparecer ${CLASE_EDITAR_FICHA}`}>
      <IconoEditar className="size-4" />
      Editar
    </Link>
  );
}
