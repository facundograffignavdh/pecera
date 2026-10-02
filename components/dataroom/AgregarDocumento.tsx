"use client";

import Link from "next/link";
import { useRef } from "react";
import { IconoCerrar } from "@/components/Iconos";
import { useConEmpresa } from "@/components/cuenta/EmpresaActual";

const OPCION =
  "flex min-h-16 flex-col justify-center gap-0.5 rounded-2xl border border-tinta/15 px-4 py-3 text-left transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

/**
 * "¿Cómo querés agregar este documento?": con un template de Academy, escribiéndolo
 * o vinculando uno que ya tenés. `<dialog>` nativo: Escape y tocar afuera cierran.
 */
export default function AgregarDocumento({ categoria, className }: { categoria?: string; className: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const q = categoria ? `&categoria=${categoria}` : "";
  const ruta = useConEmpresa();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className} aria-haspopup="dialog">
        + Agregar documento
      </button>
      <dialog
        ref={ref}
        aria-labelledby="agregar-titulo"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
        className="popup-pique m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-marfil p-0 text-tinta backdrop:bg-tinta/45"
      >
        <div className="popup-tarjeta flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="agregar-titulo" className="font-display text-xl font-semibold">
              ¿Cómo querés agregarlo?
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center rounded-full hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-arcilla"
            >
              <IconoCerrar className="size-4" />
            </button>
          </div>
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
          <p className="text-xs leading-relaxed text-tinta/60">
            Subir archivos a Pecera todavía no está disponible: por ahora, subilo a tu Drive y pegá el link (revisá
            quién puede abrirlo).
          </p>
        </div>
      </dialog>
    </>
  );
}
