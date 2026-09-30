import type { PostgrestError } from "@supabase/supabase-js";
import { faltaMigracion } from "@/lib/datos";

/** Respuesta de las actions de empresa, transparencia, evento y admin. */
export type Resultado = { ok: boolean; mensaje?: string; slug?: string; codigo?: string };

export const SIN_SESION = "Se cerró tu sesión. Volvé a entrar.";
const NO_DISPONIBLE = "Esta parte todavía se está activando. Probá de nuevo en un rato.";

/** Mensajes de la base (raise exception de feria_lista) → texto para la persona. */
const MENSAJES: Record<string, string> = {
  "ya tenés empresa": "Ya sos parte de una empresa. Salí de esa primero.",
  "primero creá tu perfil": "Primero creá tu perfil.",
  "demasiados intentos": "Probaste muchos códigos. Esperá una hora y volvé a intentar.",
  "solo el dueño edita la empresa": "Solo quien creó la empresa puede editarla.",
  "solo el dueño renueva el código": "Solo quien creó la empresa puede renovar el código.",
  "primero sumate a una empresa": "Primero creá o sumate a una empresa.",
  "votación cerrada": "La votación no está abierta.",
  "no podés votarte": "No podés votarte a vos.",
  "no podés votar a tu empresa": "No podés votar a tu propia empresa.",
  "participante inexistente": "Ese proyecto ya no participa.",
  "evento inexistente": "Ese evento no está activo.",
  "sin sesión": SIN_SESION,
  "no autorizado": "Esta acción es solo para el equipo de Pecera.",
};

/** Error de Supabase → Resultado con un mensaje que se entiende. Nunca tira. */
export function traducir(error: PostgrestError, donde: string): Resultado {
  if (faltaMigracion(error)) return { ok: false, mensaje: NO_DISPONIBLE };
  const conocido = MENSAJES[error.message];
  if (conocido) return { ok: false, mensaje: conocido };
  if (error.code === "23505") return { ok: false, mensaje: "Esa dirección ya está tomada, probá otra." };
  if (error.code === "23514") return { ok: false, mensaje: "Revisá los datos: alguno no es válido." };
  console.error(`Supabase (${donde}): ${error.code} ${error.message}`);
  return { ok: false, mensaje: "No pudimos guardar. Probá de nuevo en un rato." };
}
