"use client";

import { abrirElegirRol } from "@/components/landing/ElegirRol";
import ArrowFillButton from "@/components/ui/arrow-fill-button";

/**
 * EL CTA de la landing: todos los "Sumate" abren la elección de rol y de ahí se
 * entra con Google a armar el perfil (/cuenta?rol=…). Blanco con letra naranja
 * profundo (#AD3D0D, 6,3:1) y el círculo de la flecha en Arcilla; al pasar, tocar o
 * enfocar, el círculo se expande y el texto pasa a blanco (ArrowFillButton). Los
 * colores son fijos: el botón se ve igual sobre las franjas blancas y naranjas.
 * Imán hacia el cursor solo con mouse.
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
      bgColor="#fffdf9"
      textColor="#ad3d0d"
      fillBgColor="#d95a22"
      fillTextColor="#fffdf9"
      className={`ring-1 ring-black/10 shadow-[0_1px_2px_rgb(28_27_22/0.15),0_8px_22px_rgb(28_27_22/0.22)] active:scale-[0.98] ${className}`}
    />
  );
}
