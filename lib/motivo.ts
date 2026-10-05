import type { Canal } from "@/lib/contacto";

/**
 * "¿Para qué?" después de tocar un contacto (opcional, un toque, sin texto libre).
 * registrarContacto pide la pregunta; PreguntaMotivo (en el layout) la muestra, así
 * sigue ahí cuando la persona vuelve de WhatsApp o del correo. Una vez por perfil y
 * pestaña. Store chico sin React para que lib/medicion no dependa de componentes.
 */

export type Pedido = { perfilId: string; canal: Canal["clave"] };

const CLAVE = "pecera:motivos";
const oyentes = new Set<() => void>();
let pendiente: Pedido | null = null;

function yaPreguntado(perfilId: string): boolean {
  try {
    const lista: unknown = JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]");
    if (Array.isArray(lista) && lista.includes(perfilId)) return true;
    sessionStorage.setItem(CLAVE, JSON.stringify([...(Array.isArray(lista) ? lista : []), perfilId].slice(-100)));
  } catch {
    // Sin sessionStorage se pregunta igual.
  }
  return false;
}

export function pedirMotivo(pedido: Pedido) {
  if (yaPreguntado(pedido.perfilId)) return;
  pendiente = pedido;
  for (const avisar of oyentes) avisar();
}

export function cerrarMotivo() {
  pendiente = null;
  for (const avisar of oyentes) avisar();
}

export function motivoPendiente(): Pedido | null {
  return pendiente;
}

export function suscribirMotivo(cambio: () => void) {
  oyentes.add(cambio);
  return () => {
    oyentes.delete(cambio);
  };
}
