import { useSyncExternalStore } from "react";

/**
 * Tema de la app: "auto" sigue al sistema; "luz" y "noche" los elige la persona y
 * se recuerdan en el celular. El script del layout lo aplica antes de pintar.
 */

export type Tema = "auto" | "luz" | "noche";

const CLAVE = "pecera:tema";
const oyentes = new Set<() => void>();

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === "luz" || t === "noche" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function ponerTema(tema: Tema) {
  try {
    if (tema === "auto") localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin localStorage vale solo mientras dure la página.
  }
  if (tema === "auto") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
  for (const avisar of oyentes) avisar();
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

export function useTema(): Tema {
  return useSyncExternalStore(suscribir, leer, () => "auto");
}
