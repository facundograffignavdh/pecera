import { crearBorrador } from "@/lib/borrador";

/**
 * Borrador del alta de perfil. Solo texto y elecciones (nunca la foto). Se borra al
 * tener perfil.
 */
export type Borrador = {
  valores: Record<string, string>;
  listas: Record<string, string[]>;
  slug: string;
};

const borrador = crearBorrador<Borrador>("pecera:borrador-perfil");

export function useBorradorGuardado(): Borrador | null {
  const b = borrador.useGuardado();
  return b && b.valores ? b : null;
}

export const guardarBorrador = borrador.guardar;
export const borrarBorrador = borrador.borrar;
