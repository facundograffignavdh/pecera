"use client";

import { abrirElegirRol } from "@/components/landing/ElegirRol";
import ArrowFillButton from "@/components/ui/arrow-fill-button";

/**
 * EL CTA de la landing: todos los "Sumate" abren la elección de rol y de ahí se
 * entra con Google a armar el perfil (/cuenta?rol=…). Naranja con texto Tinta; al
 * pasar, tocar o enfocar, el círculo de la flecha se expande en Tinta y el texto
 * pasa a Marfil (ArrowFillButton). Imán hacia el cursor solo con mouse.
 */
export default function BotonForm({
  children = "Sumate a Pecera",
  tamano = "lg",
  className = "",
}: {
  children?: string;
  tamano?: "lg" | "md";
  className?: string;
}) {
  return (
    <ArrowFillButton
      btnText={children}
      tamano={tamano}
      onClick={abrirElegirRol}
      aria-haspopup="dialog"
      data-magnetic
      className={`shadow-[0_1px_2px_rgb(28_27_22/0.15),0_8px_22px_rgb(244_124_60/0.32)] active:scale-[0.98] ${className}`}
    />
  );
}
