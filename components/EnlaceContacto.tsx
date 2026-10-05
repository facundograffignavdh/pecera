"use client";

import type { ComponentProps } from "react";
import type { Canal } from "@/lib/contacto";
import { registrarContacto } from "@/lib/medicion";

/** Un link a un canal de contacto que cuenta el toque (para páginas de servidor). */
export default function EnlaceContacto({
  perfilId,
  canal,
  ...props
}: ComponentProps<"a"> & { perfilId: string; canal: Canal["clave"] }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        registrarContacto({ perfilId, canal });
        props.onClick?.(e);
      }}
    />
  );
}
