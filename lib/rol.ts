import type { Rol, TipoPerfil } from "@/types/pecera";

/**
 * Única fuente de verdad del color por rol: lo usan el badge y el avatar,
 * así no se duplican los hex del manual de marca.
 */
export const ROLES: Record<Rol, { label: string; bg: string }> = {
  emprendedor: { label: "Emprendedor", bg: "bg-arcilla" },
  inversor: { label: "Inversor", bg: "bg-inversor" },
  aliado: { label: "Aliado", bg: "bg-aliado" },
};

export const TIPOS: Record<TipoPerfil, string> = {
  startup: "Startup",
  emprendimiento: "Emprendimiento",
  aceleradora: "Aceleradora",
  incubadora: "Incubadora",
  angel: "Inversor ángel",
  fondo: "Fondo",
  coach: "Coach / mentor",
};

/** Iniciales de hasta dos palabras: "Raíz Verde" → "RV". */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? "")
    .join("");
}
