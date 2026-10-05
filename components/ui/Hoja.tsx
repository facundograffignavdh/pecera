"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { IconoCerrar } from "@/components/Iconos";
import { boton } from "@/lib/ui";

/** Lo que dura la salida (igual que `hoja-salida` en globals.css). */
const SALIDA_MS = 160;

/**
 * Modal reutilizable sobre `<dialog>` nativo: en el celular sube desde abajo (bottom
 * sheet) y desde `sm` aparece centrado. Escape, tocar afuera y la cruz cierran; si
 * hay cambios sin guardar (`sucio`), antes pregunta. El contenido scrollea adentro y
 * el pie queda fijo: un form adentro conecta su botón del pie con `form="<id>"`.
 */
export default function Hoja({
  abierta,
  onCerrar,
  titulo,
  bajada,
  sucio = false,
  pie,
  children,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  bajada?: string;
  sucio?: boolean;
  pie?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (abierta && !dialog.open) {
      delete dialog.dataset.saliendo;
      dialog.showModal();
    } else if (!abierta && dialog.open) {
      // Salida animada y después el cierre real.
      dialog.dataset.saliendo = "";
      const t = setTimeout(() => {
        dialog.close();
        delete dialog.dataset.saliendo;
      }, SALIDA_MS);
      return () => clearTimeout(t);
    }
  }, [abierta]);

  function intentarCerrar() {
    if (sucio) setConfirmando(true);
    else cerrar();
  }

  function cerrar() {
    setConfirmando(false);
    onCerrar();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        // Escape: pasa por la misma pregunta que la cruz.
        e.preventDefault();
        intentarCerrar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) intentarCerrar();
      }}
      className="hoja bg-marfil p-0 text-tinta"
    >
      <div className="hoja-tarjeta flex max-h-[inherit] flex-col">
        <header className="relative flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-tinta/20 sm:hidden" />
          <div className="min-w-0 pt-3 sm:pt-0">
            <h2 id={idTitulo} className="font-display text-xl font-semibold leading-tight">
              {titulo}
            </h2>
            {bajada && <p className="mt-1 text-sm leading-relaxed text-tinta/70">{bajada}</p>}
          </div>
          <button
            type="button"
            onClick={intentarCerrar}
            aria-label="Cerrar"
            className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-arcilla sm:mt-0"
          >
            <IconoCerrar className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>

        {(pie || confirmando) && (
          <footer className="border-t border-tinta/10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {confirmando ? (
              <div role="alertdialog" aria-label="Cambios sin guardar" className="flex flex-col gap-3">
                <p className="text-sm font-medium">Tenés cambios sin guardar. ¿Los descartás?</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={cerrar} className={boton("peligro", "md")}>
                    Descartar
                  </button>
                  <button type="button" onClick={() => setConfirmando(false)} className={boton("secundario", "md")}>
                    Seguir editando
                  </button>
                </div>
              </div>
            ) : (
              pie
            )}
          </footer>
        )}
      </div>
    </dialog>
  );
}
