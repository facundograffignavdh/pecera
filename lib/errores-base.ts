import type { PostgrestError } from "@supabase/supabase-js";
import { faltaMigracion } from "@/lib/datos";

/** Respuesta de las actions de empresa, transparencia, evento y admin. */
export type Resultado = { ok: boolean; mensaje?: string; slug?: string; codigo?: string };

export const SIN_SESION = "Se cerró tu sesión. Volvé a entrar.";
export const NO_DISPONIBLE = "Esta parte todavía se está activando. Probá de nuevo en un rato.";

/** Mensajes de la base (raise exception de feria_lista) → texto para la persona. */
const MENSAJES: Record<string, string> = {
  "ya tenés empresa": "Ya sos parte de una empresa. Salí de esa primero.",
  // multi_empresa
  "tope de empresas": "Ya sos parte de 5 empresas, el máximo. Salí de alguna para sumar otra.",
  "ya sos parte de esa empresa": "Ya sos parte de esa empresa.",
  "no sos parte de esa empresa": "Esa empresa no está entre las tuyas. Recargá la página.",
  "confirmá el borrado": "Sos la única integrante: si salís, la empresa se borra. Confirmalo en la pantalla de salida.",
  "sos la única integrante": "Sos la única integrante: si salís, la empresa se borra. Confirmalo en la pantalla de salida.",
  "primero creá tu perfil": "Primero creá tu perfil.",
  "demasiados intentos": "Probaste muchos códigos. Esperá una hora y volvé a intentar.",
  "solo el dueño edita la empresa": "Solo quien administra la empresa puede editarla.",
  "solo el dueño renueva el código": "Solo quien administra la empresa puede renovar el código.",
  "primero sumate a una empresa": "Primero creá o sumate a una empresa.",
  "votación cerrada": "La votación no está abierta.",
  "no podés votarte": "No podés votarte a vos.",
  "no podés votar a tu empresa": "No podés votar a tu propia empresa.",
  "participante inexistente": "Ese proyecto ya no participa.",
  "evento inexistente": "Ese evento no está activo.",
  // networking_feria
  "evento inválido": "Ese evento no está activo.",
  // panel_organizacion
  "email inválido": "Revisá el email.",
  "sin sesión": SIN_SESION,
  "no autorizado": "Esta acción es solo para el equipo de Pecera.",
  "ese pitch no es tuyo": "Ese pitch no es de tu perfil.",
  "ya hay un hito en curso": "Ya hay un hito en curso. Marcalo como logrado o pasalo a próximo primero.",
  "demasiados hitos": "Llegaste a 40 hitos. Borrá alguno viejo para sumar otro.",
  "ese hito no es de tu empresa": "Ese hito no es de tu empresa.",
  "demasiados avances": "Ya publicaste 5 avances hoy. Mañana podés sumar más.",
  "primero guardá el producto": "Primero guardá el producto; después sumá las imágenes.",
  "imagen inválida": "Esa imagen no es válida. Probá subirla de nuevo.",
  "demasiados documentos": "Llegaste a 100 documentos. Archivá alguno viejo para sumar otro.",
  "ese documento no es de tu empresa": "Ese documento no es de tu empresa.",
  "ya hay otro documento de ese template": "Ya tenés otro documento de ese template. Archivalo primero.",
  "empresa inexistente": "Esa empresa ya no está en Pecera. Cargala a mano.",
  "esa entrada no es tuya": "Esa entrada no es de tu portfolio.",
  "demasiadas entradas": "Llegaste a 60 entradas. Borrá alguna para sumar otra.",
  "esa relación no espera tu respuesta": "Esa relación ya fue respondida o no nombra a tu empresa.",
  "demasiados servicios": "Llegaste a 12 servicios. Borrá alguno para sumar otro.",
  "ese servicio no es tuyo": "Ese servicio no es tuyo.",
  // vivo_feria
  "la empresa no tiene una integrante emprendedora visible": "La empresa no tiene una integrante emprendedora visible que la represente.",
  "la empresa no tiene una integrante visible": "La empresa no tiene una integrante con el perfil visible que la represente.",
  "esa persona ya representa a otra empresa": "Esa persona ya representa a otra empresa en la feria.",
  "la empresa no participa": "La empresa no participa. Sumala primero.",
  "tiene que ser una integrante emprendedora visible": "Tiene que ser una integrante emprendedora con el perfil visible.",
  "tiene que ser una integrante visible": "Tiene que ser una integrante de la empresa con el perfil visible.",
  "pitch inexistente": "Ese pitch ya no existe. Recargá la página.",
  "el tag no entra en la descripción (máx. 150)": "#feria21 no entra: la descripción ya tiene casi 150 caracteres. Acortala primero.",
  // quien_vio
  "demasiadas acciones": "Fueron muchos cambios seguidos. Esperá un minuto y probá de nuevo.",
  "pitches libres: entre 0 y 20": "Los pitches libres van de 0 a 20.",
  // alta_rapida
  "falta el consentimiento": "Falta el consentimiento.",
  "dato inválido: nombre": "Revisá el nombre: de 1 a 80 caracteres, en una línea.",
  "dato inválido: descripcion": "Revisá la descripción: de 1 a 150 caracteres, en una línea.",
  "dato inválido: empresa": "Revisá el nombre de la empresa: de 1 a 80 caracteres.",
  "dato inválido: empresa_descripcion": "Revisá la línea de la empresa: hasta 280 caracteres, en una línea.",
  "dato inválido: empresa_tipo": "Elegí un tipo de empresa de la lista.",
  "dato inválido: rol": "Elegí un rol de la lista.",
  "dato inválido: tipo": "Elegí un tipo de la lista.",
  "dato inválido: cargo": "Elegí un cargo de la lista.",
  "ya no se puede deshacer": "Ya no se puede deshacer (pasaron 10 minutos o ya tiene cuenta). Usá Editar.",
  "solo perfiles del equipo sin cuenta": "Solo se borran desde acá perfiles creados por el equipo y sin cuenta.",
  "el perfil tiene cuenta": "Ese perfil ya tiene cuenta: lo edita su dueña.",
  "perfil inexistente": "Ese perfil ya no existe. Recargá la página.",
  "ya es parte de esa empresa": "Ya es parte de esa empresa.",
  "ese perfil ya tiene dueña": "Ese perfil ya tiene una cuenta vinculada.",
};

/** Error de Supabase → Resultado con un mensaje que se entiende. Nunca tira. */
export function traducir(error: PostgrestError, donde: string): Resultado {
  if (faltaMigracion(error)) return { ok: false, mensaje: NO_DISPONIBLE };
  const conocido = MENSAJES[error.message];
  if (conocido) return { ok: false, mensaje: conocido };
  if (error.code === "23505") {
    return {
      ok: false,
      mensaje: error.message.includes("portfolio_sin_duplicados")
        ? "Ya tenés esa relación con esa empresa en tu portfolio."
        : "Esa dirección ya está tomada, probá otra.",
    };
  }
  if (error.code === "23514") return { ok: false, mensaje: "Revisá los datos: alguno no es válido." };
  console.error(`Supabase (${donde}): ${error.code} ${error.message}`);
  return { ok: false, mensaje: "No pudimos guardar. Probá de nuevo en un rato." };
}
