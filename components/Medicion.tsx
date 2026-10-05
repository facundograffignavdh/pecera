"use client";

import { useEffect, useSyncExternalStore } from "react";
import { tomarEquipo } from "@/lib/atribucion";
import { marcarEquipo, tocarSesion } from "@/lib/actividad";

/**
 * Medición global, sin interfaz (salvo el aviso de `?equipo=1`): lee el origen de la
 * URL, arranca o renueva la sesión y la mantiene viva mientras haya actividad. Va en
 * el layout; no lee cookies ni rompe el ISR.
 */

const ACTIVIDAD_CADA_MS = 60 * 1000;

const oyentes = new Set<() => void>();
let avisoEquipo = false;

function suscribir(cambio: () => void) {
  oyentes.add(cambio);
  return () => {
    oyentes.delete(cambio);
  };
}

function mostrarAviso(visible: boolean) {
  avisoEquipo = visible;
  for (const avisar of oyentes) avisar();
}

export default function Medicion() {
  const aviso = useSyncExternalStore(suscribir, () => avisoEquipo, () => false);

  useEffect(() => {
    let cierre: ReturnType<typeof setTimeout> | undefined;
    if (tomarEquipo()) {
      marcarEquipo();
      mostrarAviso(true);
      cierre = setTimeout(() => mostrarAviso(false), 6000);
    }
    tocarSesion();

    let ultimo = Date.now();
    const alActuar = () => {
      const ahora = Date.now();
      if (ahora - ultimo < ACTIVIDAD_CADA_MS) return;
      ultimo = ahora;
      tocarSesion();
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") tocarSesion();
    };
    window.addEventListener("pointerdown", alActuar, { passive: true });
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(cierre);
      window.removeEventListener("pointerdown", alActuar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  if (!aviso) return null;
  return (
    <div
      role="status"
      className="aparecer fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-sm rounded-2xl bg-tinta px-4 py-3 text-sm text-marfil shadow-lg"
    >
      Este dispositivo quedó marcado como del equipo: no cuenta en las métricas.
    </div>
  );
}
