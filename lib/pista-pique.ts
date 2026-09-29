import { useSyncExternalStore } from "react";

/**
 * Pista "tocá dos veces para dar pique": se muestra hasta que la persona da su
 * primer pique con doble toque o la ve completa una vez. Se recuerda en el celular.
 */

const CLAVE = "pecera:pista-pique";
const oyentes = new Set<() => void>();
let vista: boolean | null = null;

function leer(): boolean {
  if (vista === null) {
    try {
      vista = localStorage.getItem(CLAVE) === "1";
    } catch {
      // Sin localStorage no molestamos: se mostraría en cada visita.
      vista = true;
    }
  }
  return vista;
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

export function marcarPistaVista() {
  if (vista === true) return;
  vista = true;
  try {
    localStorage.setItem(CLAVE, "1");
  } catch {}
  for (const avisar of oyentes) avisar();
}

/** `true` si todavía hay que mostrar la pista. En el servidor, nunca. */
export function usePistaPendiente(): boolean {
  return !useSyncExternalStore(suscribir, leer, () => true);
}
