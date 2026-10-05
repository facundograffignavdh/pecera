"use client";

import Link from "next/link";
import { useState } from "react";
import Hoja from "@/components/ui/Hoja";
import { useConEmpresa } from "@/components/cuenta/EmpresaActual";

const OPCION =
  "flex min-h-16 flex-col justify-center gap-0.5 rounded-2xl border border-tinta/15 px-4 py-3 text-left transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

/**
 * "¿Cómo querés agregar este documento?": con un template de Academy, escribiéndolo
 * o vinculando uno que ya tenés. En una `Hoja`: Escape y tocar afuera cierran.
 */
export default function AgregarDocumento({ categoria, className }: { categoria?: string; className: string }) {
  const [abierta, setAbierta] = useState(false);
  const q = categoria ? `&categoria=${categoria}` : "";
  const ruta = useConEmpresa();
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={className} aria-haspopup="dialog">
        + Agregar documento
      </button>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="¿Cómo querés agregarlo?">
        <div className="flex flex-col gap-4">
          <Link href="/academy/docs#templates" className={OPCION}>
            <span className="font-medium">Crear con un template</span>
            <span className="text-sm text-tinta/70">Guiado por pasos, con ejemplos. Ideal para empezar.</span>
          </Link>
          <Link href={ruta(`/cuenta/dataroom/nuevo?tipo=escrito${q}`)} className={OPCION}>
            <span className="font-medium">Escribir desde cero</span>
            <span className="text-sm text-tinta/70">Un texto propio, con guardado automático.</span>
          </Link>
          <Link href={ruta(`/cuenta/dataroom/nuevo?tipo=link${q}`)} className={OPCION}>
            <span className="font-medium">Vincular un documento</span>
            <span className="text-sm text-tinta/70">Un PDF, deck o planilla que ya tenés en Drive, Notion o Docsend.</span>
          </Link>
          <p className="text-xs leading-relaxed text-tinta/65">
            Subir archivos a Pecera todavía no está disponible: por ahora, subilo a tu Drive y pegá el link (revisá
            quién puede abrirlo).
          </p>
        </div>
      </Hoja>
    </>
  );
}
