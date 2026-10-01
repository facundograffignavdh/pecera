import { useSyncExternalStore } from "react";

/**
 * Borrador del alta de perfil, en el celular. Si la persona cierra la pestaña o se
 * le corta la conexión a mitad del formulario, al volver se le ofrece recuperarlo.
 * Solo texto y elecciones (nunca la foto). Se borra al tener perfil.
 */

const CLAVE = "pecera:borrador-perfil";
const oyentes = new Set<() => void>();

export type Borrador = {
  valores: Record<string, string>;
  listas: Record<string, string[]>;
  slug: string;
};

function leer(): string {
  try {
    return localStorage.getItem(CLAVE) ?? "";
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

function avisar() {
  for (const oyente of oyentes) oyente();
}

/** El borrador guardado (o null). En el servidor y en el primer render, null. */
export function useBorradorGuardado(): Borrador | null {
  const crudo = useSyncExternalStore(suscribir, leer, () => "");
  if (!crudo) return null;
  try {
    const b = JSON.parse(crudo) as Borrador;
    return b && typeof b === "object" && b.valores ? b : null;
  } catch {
    return null;
  }
}

/** Guarda sin avisar a los oyentes: el formulario que escribe ya tiene los datos. */
export function guardarBorrador(b: Borrador) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(b));
  } catch {
    // Sin localStorage no hay borrador: el formulario anda igual.
  }
}

export function borrarBorrador() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
  avisar();
}
