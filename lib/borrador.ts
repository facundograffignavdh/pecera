import { useSyncExternalStore } from "react";

/**
 * Borradores en el celular (localStorage): lo que se está escribiendo sobrevive a
 * cerrar la pestaña o a un corte de conexión, y se ofrece recuperarlo al volver.
 * Si el navegador no deja usar localStorage, no hay borrador y todo anda igual.
 */
export function crearBorrador<T extends object>(clave: string) {
  const oyentes = new Set<() => void>();

  function leer(): string {
    try {
      return localStorage.getItem(clave) ?? "";
    } catch {
      return "";
    }
  }

  function suscribir(avisar: () => void) {
    oyentes.add(avisar);
    return () => {
      oyentes.delete(avisar);
    };
  }

  return {
    /** El borrador guardado (o null). En el servidor y en el primer render, null. */
    useGuardado(): T | null {
      const crudo = useSyncExternalStore(suscribir, leer, () => "");
      if (!crudo) return null;
      try {
        const valor = JSON.parse(crudo) as T;
        return valor && typeof valor === "object" ? valor : null;
      } catch {
        return null;
      }
    },
    /** Guarda sin avisar: quien escribe ya tiene los datos en su estado. */
    guardar(valor: T) {
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
      } catch {
        // Sin localStorage no hay borrador.
      }
    },
    borrar() {
      try {
        localStorage.removeItem(clave);
      } catch {
        // Nada que borrar.
      }
      for (const avisar of oyentes) avisar();
    },
  };
}
