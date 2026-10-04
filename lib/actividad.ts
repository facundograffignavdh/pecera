import { primerToque, ultimoToque } from "@/lib/atribucion";
import type { Canal } from "@/lib/contacto";
import { dispositivo } from "@/lib/dispositivo";
import { rpcConKeepalive } from "@/lib/medicion";
import { sesionActual } from "@/lib/sesion";

/**
 * Eventos de la tabla `actividad` (lista cerrada, la misma de la migración
 * super_dataroom). Vistas, piques y contactos siguen en lib/medicion.ts y
 * lib/piques.ts. Nada de esto tira ni frena la interfaz.
 */

export type MotivoContacto = "inversion" | "alianza" | "cliente" | "cofundador" | "otro";
export type DesdePerfil = "feed" | "explorar" | "tarjeta" | "directo" | "otro";

type Evento =
  | { nombre: "tarjeta_escaneada"; perfilId: string }
  | { nombre: "perfil_abierto"; perfilId: string; desde: DesdePerfil }
  | { nombre: "pitch_completado"; pitchId: string }
  | { nombre: "pitch_compartido"; perfilId: string; canal: "nativo" | "copiado" }
  | { nombre: "motivo_elegido"; perfilId: string; canal: Canal["clave"]; motivo: MotivoContacto };

const CLAVE_UNA_VEZ = "pecera:actividad-sesion";

/** Celular o compu, sin mirar el user agent. */
function clase(): "celular" | "compu" {
  try {
    return window.matchMedia("(pointer: coarse)").matches ? "celular" : "compu";
  } catch {
    return "compu";
  }
}

function enviar(
  nombre: string,
  sesion: string,
  extra: { perfilId?: string; pitchId?: string; canal?: string; props?: Record<string, string> }
) {
  const t = ultimoToque();
  rpcConKeepalive("registrar_actividad", {
    p_nombre: nombre,
    p_dispositivo: dispositivo(),
    p_sesion: sesion,
    p_perfil: extra.perfilId ?? null,
    p_pitch: extra.pitchId ?? null,
    p_canal: extra.canal ?? null,
    p_fuente: t?.fuente ?? null,
    p_medio: t?.medio ?? null,
    p_campania: t?.campania ?? null,
    p_tarjeta: t?.tarjeta ?? null,
    p_clase: clase(),
    p_props: extra.props ?? {},
  });
}

/**
 * Cuenta actividad de la sesión y, si arrancó una nueva, registra `sesion_iniciada`
 * con el origen (last-touch en las columnas, first-touch en props).
 */
export function tocarSesion(): string {
  const { id, nueva } = sesionActual();
  if (nueva) {
    const p = primerToque();
    const props: Record<string, string> = {};
    if (p?.fuente) props.primera_fuente = p.fuente;
    if (p?.medio) props.primera_medio = p.medio;
    if (p?.campania) props.primera_campania = p.campania;
    if (p?.tarjeta) props.primera_tarjeta = p.tarjeta;
    enviar("sesion_iniciada", id, { props });
  }
  return id;
}

/** true la primera vez que se pide `clave` en esta sesión (perfil abierto, pitch visto). */
function primeraVez(sesion: string, clave: string): boolean {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_UNA_VEZ) ?? "null");
    const vistos: string[] = guardado?.sesion === sesion && Array.isArray(guardado.vistos) ? guardado.vistos : [];
    if (vistos.includes(clave)) return false;
    sessionStorage.setItem(CLAVE_UNA_VEZ, JSON.stringify({ sesion, vistos: [...vistos, clave].slice(-300) }));
  } catch {
    // Sin sessionStorage se manda igual; la base no deduplica, pero no se rompe nada.
  }
  return true;
}

export function registrarActividad(evento: Evento) {
  try {
    const sesion = tocarSesion();
    switch (evento.nombre) {
      case "tarjeta_escaneada":
        enviar(evento.nombre, sesion, { perfilId: evento.perfilId });
        break;
      case "perfil_abierto":
        if (!primeraVez(sesion, `perfil:${evento.perfilId}`)) return;
        enviar(evento.nombre, sesion, { perfilId: evento.perfilId, props: { desde: evento.desde } });
        break;
      case "pitch_completado":
        if (!primeraVez(sesion, `pitch:${evento.pitchId}`)) return;
        enviar(evento.nombre, sesion, { pitchId: evento.pitchId });
        break;
      case "pitch_compartido":
        enviar(evento.nombre, sesion, { perfilId: evento.perfilId, canal: evento.canal });
        break;
      case "motivo_elegido":
        enviar(evento.nombre, sesion, {
          perfilId: evento.perfilId,
          canal: evento.canal,
          props: { motivo: evento.motivo },
        });
        break;
    }
  } catch {
    // La medición nunca rompe la página.
  }
}

/** ?equipo=1: este dispositivo deja de contar en las métricas. */
export function marcarEquipo() {
  rpcConKeepalive("marcar_equipo", { p_dispositivo: dispositivo() });
  try {
    localStorage.setItem("pecera:equipo", "1");
  } catch {
    // La marca vive en la base; esto es solo para mostrar el aviso.
  }
}
