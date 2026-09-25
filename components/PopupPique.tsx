"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const invitacion =
    canal?.clave === "whatsapp"
      ? "Escribile por WhatsApp y arrancá la charla."
      : canal?.clave === "email"
        ? "Escribile por email y arrancá la charla."
        : "Pasá por su perfil y arrancá la charla.";
  const clasesBoton =
    "flex w-full items-center justify-center rounded-full bg-arcilla px-5 py-3 text-[19px] font-bold text-marfil transition-colors duration-200 ease-pecera hover:bg-pecera";

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
      <div className="popup-tarjeta vidrio vidrio-denso w-full max-w-sm rounded-2xl px-6 pb-5 pt-6 text-center text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_16px_40px_rgb(28_27_22/0.22)]">
        <div aria-hidden className="pez-nado mx-auto h-16 w-20">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG chico y local, sin optimizar */}
          <img src="/brand/pez.svg" alt="" className="pez-ondula h-full w-full object-contain" />
        </div>

        <h2
          id="popup-pique-titulo"
          className="mt-3 font-display text-3xl font-semibold leading-tight"
        >
          ¡Te picó!
        </h2>
        <p className="font-display text-xl leading-tight">¿Nadamos juntos?</p>

        <p className="mt-3 leading-relaxed">
          A {perfil.nombre} le va a gustar saber que te interesó. {invitacion}
        </p>

        <div className="mt-5 flex flex-col gap-2">
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
          <button
            type="button"
            onClick={cerrar}
            className="rounded-full px-5 py-3 font-medium text-tinta transition-colors duration-200 ease-pecera hover:bg-tinta/5"
          >
            Seguir scrolleando
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-tinta/75">
          Un pique es una muestra de interés, no un compromiso.
        </p>
      </div>
    </dialog>
  );
}
