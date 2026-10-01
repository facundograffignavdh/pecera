"use client";

import { useEffect, useState } from "react";
import { type ProgresoAcademy, progresoAcademy } from "@/app/cuenta/dataroom";

// Uno por carga de página: varias piezas de Academy comparten el mismo pedido.
let pedido: Promise<ProgresoAcademy> | null = null;

/** Progreso de la empresa de la sesión en los templates. null mientras carga. */
export function useProgreso(): ProgresoAcademy | null {
  const [progreso, setProgreso] = useState<ProgresoAcademy | null>(null);
  useEffect(() => {
    let cancelado = false;
    pedido ??= progresoAcademy().catch(() => ({ sesion: false, conEmpresa: false, plantillas: {} }));
    pedido.then((p) => {
      if (!cancelado) setProgreso(p);
    });
    return () => {
      cancelado = true;
      // La próxima visita (otra navegación) vuelve a preguntar: pudo cambiar.
      pedido = null;
    };
  }, []);
  return progreso;
}
