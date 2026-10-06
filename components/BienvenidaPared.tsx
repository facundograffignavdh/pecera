"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { tomarBienvenida } from "@/lib/pared";

let bienvenida: boolean | null = null;
/** Se toma una sola vez por carga (la marca se borra al leerla). */
function leer(): boolean {
  bienvenida ??= tomarBienvenida();
  return bienvenida;
}
const sinCambios = () => () => {};

/**
 * Al volver de Google después de la pared: ya puede seguir, y se le ofrece armar el perfil sin
 * bloquear (la alta mínima va después, nunca antes de ver pitches).
 */
export default function BienvenidaPared() {
  const mostrar = useSyncExternalStore(sinCambios, leer, () => false);
  const [cerrada, setCerrada] = useState(false);
  if (!mostrar || cerrada) return null;
  return (
    <section
      aria-label="Ya entraste"
      className="aparecer vidrio fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)_+_4rem))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-tinta shadow-lg"
    >
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <strong className="font-semibold">¡Listo! Ya podés seguir viendo pitches.</strong> ¿Armás tu perfil? Es un minuto.
      </p>
      <Link href="/cuenta" className="shrink-0 rounded-full bg-tinta px-3.5 py-2 text-sm font-semibold text-marfil">
        Mi perfil
      </Link>
      <button
        type="button"
        onClick={() => setCerrada(true)}
        aria-label="Cerrar"
        className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
      >
        ×
      </button>
    </section>
  );
}
