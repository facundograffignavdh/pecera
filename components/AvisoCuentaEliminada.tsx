"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AVISO_CUENTA_ELIMINADA } from "@/lib/borrar-cuenta";

/**
 * Mensaje al llegar al inicio después de eliminar la cuenta. Lo deja
 * `FormEliminarCuenta` en sessionStorage y se muestra una sola vez.
 */

const oyentes = new Set<() => void>();

function leer(): boolean {
  try {
    return sessionStorage.getItem(AVISO_CUENTA_ELIMINADA) === "1";
  } catch {
    return false;
  }
}

function suscribir(cambio: () => void) {
  oyentes.add(cambio);
  return () => {
    oyentes.delete(cambio);
  };
}

function cerrar() {
  try {
    sessionStorage.removeItem(AVISO_CUENTA_ELIMINADA);
  } catch {
    // Nada que borrar.
  }
  for (const avisar of oyentes) avisar();
}

export default function AvisoCuentaEliminada() {
  const visible = useSyncExternalStore(suscribir, leer, () => false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(cerrar, 10000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="aparecer fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-tinta px-4 py-3 text-sm text-marfil shadow-lg"
    >
      <p className="flex-1 leading-relaxed">
        Tu cuenta se eliminó. Tus videos y fotos se borran de nuestros servidores en la próxima hora.
      </p>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar"
        className="-m-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
