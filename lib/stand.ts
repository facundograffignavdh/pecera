import { WHATSAPP } from "@/lib/cuenta";
import { supabase } from "@/lib/supabase";

/**
 * Juego del stand de la Feria 21 (/stand): adivinar un número de 3 cifras con 3 intentos; hay
 * N tarjetas NFC en juego. Todo lo decide la base (migración juego_stand): el número nunca llega
 * al navegador y los intentos y el tope de tarjetas se cuentan allá. Acá solo se llama a las RPC
 * con el cliente anon y se traducen los errores. Nunca tira.
 */

export const INTENTOS = 3;
/** El navegador recuerda su jugador para retomar si se recarga la página. */
const CLAVE = "pecera:stand";

export type EstadoStand = { activo: boolean; listo: boolean; premios: number; quedan: number };

export type Resultado = "gano" | "agotado" | "fallo" | "sin_intentos" | "ya_gano";

export type Juego = {
  jugador: string;
  nombre: string;
  intentos_restantes: number;
  acerto: boolean;
  gano: boolean;
  codigo: string | null;
  quedan: number;
  resultado?: Resultado;
};

/** `motivo` es el mensaje crudo de la base (para decidir qué hacer); `mensaje`, el que se muestra. */
export type Respuesta<T> = { ok: true; datos: T } | { ok: false; mensaje: string; motivo?: string; noDisponible?: boolean };

/** Códigos de "esto todavía no existe en la base" (los mismos que lib/datos.ts faltaMigracion). */
const SIN_MIGRACION = new Set(["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

const MENSAJES: Record<string, string> = {
  "el juego todavía no arrancó": "El juego todavía no arrancó. Probá en un rato.",
  "el juego está cerrado": "El juego está cerrado por ahora.",
  "nombre o apellido inválido": "Revisá tu nombre y apellido.",
  "teléfono inválido": "Revisá el teléfono: 10 números con el código de área, sin 0 ni 15.",
  "falta la respuesta de la tarjeta NFC": "Contanos si te gustaría la tarjeta NFC.",
  "falta el consentimiento": "Para jugar tenés que aceptar que guardemos tus datos.",
  "ese teléfono ya está jugando desde otro celular": "Ese teléfono ya está jugando desde otro celular. Seguí desde ese, o acercate al stand.",
  "no encontramos tu juego": "No encontramos tu juego en este celular. Volvé a anotarte.",
  "tiene que ser un número de 3 cifras": "Tiene que ser un número de 3 cifras.",
  "demasiadas acciones": "Fueron muchos intentos seguidos. Esperá un minuto y probá de nuevo.",
  "datos inválidos": "Algo no salió bien. Recargá la página y probá de nuevo.",
};

async function llamar<T>(fn: string, args: Record<string, unknown> = {}): Promise<Respuesta<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      if (SIN_MIGRACION.has(error.code ?? "")) return { ok: false, mensaje: "El juego todavía no está activo.", noDisponible: true };
      return { ok: false, mensaje: MENSAJES[error.message] ?? "No pudimos conectarnos. Probá de nuevo en un rato.", motivo: error.message };
    }
    return { ok: true, datos: data as T };
  } catch {
    return { ok: false, mensaje: "No pudimos conectarnos. Revisá tu internet y probá de nuevo." };
  }
}

export const estadoStand = () => llamar<EstadoStand>("stand_estado");

export function registrar(datos: { nombre: string; apellido: string; telefono: string; quiereNfc: boolean; consiento: boolean }, dispositivo: string) {
  return llamar<Juego>("stand_registrar", {
    p_nombre: datos.nombre.trim(),
    p_apellido: datos.apellido.trim(),
    p_telefono: normalizarTelefono(datos.telefono),
    p_quiere_nfc: datos.quiereNfc,
    p_consiento: datos.consiento,
    p_dispositivo: dispositivo,
  });
}

export const miJuego = (jugador: string, dispositivo: string) => llamar<Juego | null>("stand_mi_juego", { p_jugador: jugador, p_dispositivo: dispositivo });

export const adivinar = (jugador: string, dispositivo: string, numero: number) =>
  llamar<Juego>("stand_adivinar", { p_jugador: jugador, p_dispositivo: dispositivo, p_numero: numero });

/** "351 123-4567" → "3511234567"; "+54 9 351…" → "+549351…". Igual que stand_telefono en la base. */
export function normalizarTelefono(t: string): string {
  const limpio = t.trim();
  return limpio.startsWith("+") ? `+${limpio.replace(/\D/g, "")}` : limpio.replace(/\D/g, "");
}

export type ErroresDatos = Partial<Record<"nombre" | "apellido" | "telefono" | "nfc" | "consiento", string>>;

/** Las mismas reglas que la base, para avisar antes de mandar. */
export function validar(d: { nombre: string; apellido: string; telefono: string; quiereNfc: boolean | null; consiento: boolean }): ErroresDatos {
  const e: ErroresDatos = {};
  if (!d.nombre.trim()) e.nombre = "Escribí tu nombre.";
  else if (d.nombre.trim().length > 60) e.nombre = "Hasta 60 letras.";
  if (!d.apellido.trim()) e.apellido = "Escribí tu apellido.";
  else if (d.apellido.trim().length > 60) e.apellido = "Hasta 60 letras.";
  if (!WHATSAPP.test(normalizarTelefono(d.telefono))) e.telefono = "10 números con el código de área, sin 0 ni 15. Ej.: 351 123 4567.";
  if (d.quiereNfc === null) e.nfc = "Elegí sí o no.";
  if (!d.consiento) e.consiento = "Para jugar tenés que aceptar.";
  return e;
}

export function jugadorGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function guardarJugador(id: string | null): void {
  try {
    if (id) localStorage.setItem(CLAVE, id);
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin localStorage el juego anda igual; solo no se retoma al recargar.
  }
}

/** El juego terminó para esta persona (ganó, acertó sin tarjeta o se quedó sin intentos). */
export const termino = (j: Juego) => j.gano || j.acerto || j.intentos_restantes <= 0;
