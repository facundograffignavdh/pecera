"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import EscenaPique from "@/components/EscenaPique";
import { IconoCerrar } from "@/components/Iconos";
import { canalesDe } from "@/lib/contacto";
import type { ItemFeed } from "@/types/pecera";

const SALUDO = "¡Hola! Te vi en Pecera y me picó tu pitch";
const SALIDA_MS = 150;

type Props = {
  /** El reel al que se le acaba de dar pique; `null` = cerrado. */
  item: ItemFeed | null;
  /** Se llama cuando el diálogo terminó de cerrarse. */
  onCerrado: () => void;
};

/**
 * Pop-up de vidrio al dar un pique. `<dialog>` nativo con `showModal()`: el
 * resto de la página queda inerte (foco atrapado), Escape cierra y el foco
 * vuelve solo a donde estaba.
 */
export default function PopupPique({ item, onCerrado }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [saliendo, setSaliendo] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (item && dialogo && !dialogo.open) dialogo.showModal();
  }, [item]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  function cerrar() {
    if (timer.current !== null) return;
    setSaliendo(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      ref.current?.close();
    }, SALIDA_MS);
  }

  if (!item) return null;

  const { perfil, pitch } = item;
  const canales = canalesDe(perfil, SALUDO);
  const canal =
    canales.find((c) => c.clave === "whatsapp") ?? canales.find((c) => c.clave === "email");
  const clasesBoton =
    "flex w-full items-center justify-center rounded-full bg-arcilla px-4 py-3 text-lg font-bold text-marfil transition-colors duration-200 ease-pecera hover:bg-pecera";

  return (
    <dialog
      ref={ref}
      aria-labelledby="popup-pique-titulo"
      data-saliendo={saliendo || undefined}
      // Un click que cae en el propio <dialog> (no en la tarjeta) es "afuera".
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
      onClose={() => {
        setSaliendo(false);
        onCerrado();
      }}
      className="popup-pique m-0 h-dvh max-h-none w-full max-w-none items-center justify-center bg-transparent p-4 open:flex"
    >
      {/* Todo el texto en Tinta sólida: con el vidrio al 0,50 el peor caso (video
          negro) da 4,6:1. Cualquier transparencia en el texto baja de AA. */}
      <div className="popup-tarjeta vidrio vidrio-popup relative w-full max-w-[280px] rounded-2xl px-5 pb-4 pt-5 text-center text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_16px_40px_rgb(28_27_22/0.22)]">
        <EscenaPique className="mx-auto h-[72px] w-36" />

        <div className="texto-pique">
          <h2
            id="popup-pique-titulo"
            className="mt-2 font-display text-[26px] font-semibold leading-tight"
          >
            ¡Te picó!
          </h2>
          <p className="font-display text-lg leading-tight">¡Que no se te escape!</p>

          <p className="mt-2.5 break-words text-[15px] leading-snug">
            A {perfil.nombre} le va a gustar saber que te interesó. Arrancá la charla.
          </p>
        </div>

        <div className="mt-4">
          {canal ? (
            <a
              href={canal.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={cerrar}
              className={clasesBoton}
            >
              {canal.clave === "whatsapp" ? "Escribir por WhatsApp" : "Escribir por email"}
            </a>
          ) : (
            <Link href={`/p/${perfil.slug}?desde=${pitch.id}`} className={clasesBoton}>
              Ver perfil
            </Link>
          )}
        </div>

        <p className="mt-3 whitespace-nowrap text-xs">Un pique es interés, no compromiso.</p>

        {/* Último en el DOM para que showModal() enfoque primero la acción principal. */}
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="group absolute right-1 top-1 flex h-11 w-11 items-center justify-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-tinta/15 bg-marfil/55 transition-colors duration-200 ease-pecera group-hover:bg-marfil/80">
            <IconoCerrar className="h-[18px] w-[18px]" />
          </span>
        </button>
      </div>
    </dialog>
  );
}
