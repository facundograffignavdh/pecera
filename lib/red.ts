import { useSyncExternalStore } from "react";
import { dispositivo } from "@/lib/dispositivo";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/pecera";

/**
 * "Mi red": los perfiles que seguís (= guardás). Vive en el celular, sin cuenta, como
 * los piques: en la feria se sigue gente sin haber entrado. Arma el feed
 * Stakeholding y la página /red. La base solo cuenta seguidores (por dispositivo
 * anónimo); si la llamada falla, lo local vale igual.
 */

export type Seguido = {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  avatar_url: string | null;
  descripcion: string;
  /** "CEO en Raíz Verde", si hay. */
  detalle?: string | null;
  desde: number;
};

const CLAVE = "pecera:red";
const oyentes = new Set<() => void>();
const VACIA: Seguido[] = [];
let enMemoria: Seguido[] | null = null;

function leer(): Seguido[] {
  if (enMemoria) return enMemoria;
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    enMemoria = Array.isArray(valor)
      ? valor.filter((s): s is Seguido => s && typeof s.id === "string" && typeof s.slug === "string")
      : [];
  } catch {
    enMemoria = [];
  }
  return enMemoria;
}

function escribir(lista: Seguido[]) {
  enMemoria = lista;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin localStorage vale mientras dure la página.
  }
  for (const avisar of oyentes) avisar();
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  // Otra pestaña cambió la red: releer.
  const alCambiar = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      enMemoria = null;
      avisar();
    }
  };
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function useRed(): Seguido[] {
  return useSyncExternalStore(suscribir, leer, () => VACIA);
}

export function useSigo(id: string): boolean {
  return useRed().some((s) => s.id === id);
}

export function seguir(perfil: Omit<Seguido, "desde">) {
  if (leer().some((s) => s.id === perfil.id)) return;
  escribir([{ ...perfil, desde: Date.now() }, ...leer()]);
  supabase.rpc("seguir", { p_perfil: perfil.id, p_dispositivo: dispositivo() }).then(() => {});
}

export function dejarDeSeguir(id: string) {
  escribir(leer().filter((s) => s.id !== id));
  supabase.rpc("dejar_de_seguir", { p_perfil: id, p_dispositivo: dispositivo() }).then(() => {});
}
