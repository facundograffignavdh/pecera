import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferencia de subtítulos, recordada en el celular. Activados por defecto.
 * Si el navegador no deja usar localStorage (modo privado, sitio bloqueado),
 * vale en memoria mientras dure la página.
 */

const CLAVE = "pecera:subtitulos";
const oyentes = new Set<() => void>();
let enMemoria = true;

function leer(): boolean {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === null ? enMemoria : valor !== "0";
  } catch {
    return enMemoria;
  }
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  // Otra pestaña cambió la preferencia.
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

export function useSubtitulosActivos(): [boolean, (activos: boolean) => void] {
  const activos = useSyncExternalStore(suscribir, leer, () => true);
  const cambiar = useCallback((valor: boolean) => {
    enMemoria = valor;
    try {
      localStorage.setItem(CLAVE, valor ? "1" : "0");
    } catch {
      // Sin localStorage queda en memoria.
    }
    for (const avisar of oyentes) avisar();
  }, []);
  return [activos, cambiar];
}
