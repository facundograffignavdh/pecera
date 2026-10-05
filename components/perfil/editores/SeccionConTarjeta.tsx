"use client";

import type { ReactNode } from "react";
import SeccionEditable from "@/components/perfil/SeccionEditable";
import Hoja from "@/components/ui/Hoja";
import { boton } from "@/lib/ui";

/**
 * Sección del perfil propio que ya tenía su editor en /cuenta (links y documentos,
 * newsletter, tesis, servicios, portfolio): la tarjeta de siempre, adentro de una
 * hoja. Cada una guarda sola, como antes; la hoja solo la muestra.
 */
export default function SeccionConTarjeta({
  clave,
  titulo,
  vacia,
  agregar,
  bajadaVacia,
  tarjeta,
  children,
}: {
  clave: string;
  titulo: string;
  vacia: boolean;
  agregar: string;
  bajadaVacia?: string;
  /** El editor de siempre (TarjetaPortafolio, TarjetaNewsletter, …). */
  tarjeta: ReactNode;
  children?: ReactNode;
}) {
  return (
    <SeccionEditable
      clave={clave}
      titulo={titulo}
      vacia={vacia}
      agregar={agregar}
      bajadaVacia={bajadaVacia}
      editor={({ abierta, cerrar }) => (
        <Hoja
          abierta={abierta}
          onCerrar={cerrar}
          titulo={titulo}
          pie={
            <button type="button" onClick={cerrar} className={`${boton("secundario", "lg")} w-full`}>
              Listo
            </button>
          }
        >
          {tarjeta}
        </Hoja>
      )}
    >
      {children}
    </SeccionEditable>
  );
}
