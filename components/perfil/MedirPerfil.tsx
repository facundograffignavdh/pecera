"use client";

import { useEffect } from "react";
import { type DesdePerfil, registrarActividad } from "@/lib/actividad";
import { tomarLlegada } from "@/lib/atribucion";
import { registrarVisita } from "@/lib/visitas";

/** ¿Esta página es la primera que se cargó (no se llegó navegando dentro de la app)? */
function esPrimeraPagina(): boolean {
  try {
    const entrada = performance.getEntriesByType("navigation")[0];
    return !!entrada && new URL(entrada.name).pathname === window.location.pathname;
  } catch {
    return false;
  }
}

/**
 * Sin interfaz: registra `perfil_abierto` (una vez por sesión) y, si se llegó con
 * una tarjeta NFC (`?src=nfc&t=s16`), antes `tarjeta_escaneada`. Con sesión, además, la
 * visita "vio tu perfil" (lib/visitas.ts).
 */
export default function MedirPerfil({ perfilId }: { perfilId: string }) {
  useEffect(() => {
    const llegada = tomarLlegada(window.location.pathname);
    const porNfc = llegada?.fuente === "nfc";
    if (porNfc && llegada.tarjeta) registrarActividad({ nombre: "tarjeta_escaneada", perfilId });

    const desde: DesdePerfil = porNfc
      ? "tarjeta"
      : new URLSearchParams(window.location.search).has("desde")
        ? "feed"
        : esPrimeraPagina()
          ? "directo"
          : "otro";
    registrarActividad({ nombre: "perfil_abierto", perfilId, desde });
    registrarVisita("perfil", perfilId);
  }, [perfilId]);

  return null;
}
