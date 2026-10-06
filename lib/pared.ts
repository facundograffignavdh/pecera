"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hayCookieSesion } from "@/lib/cuenta-local";
import { type EstadoPared, estaBloqueado, leerVistos, sumarVisto } from "@/lib/pared-reglas";
import { configFunciones, olvidarTraspaso } from "@/lib/visitas";

/**
 * Pared de pitches: sin cuenta, después de N pitches distintos (3 s cada uno, el criterio de las
 * vistas) hay que entrar con Google para seguir viendo pitches. Solo bloquea pitches: perfiles,
 * explorar, eventos y lo demás siguen libres. Se prende y apaga en /admin, sin deploy.
 *
 * El contador es por navegador (localStorage `pecera:pared`). Si el navegador no deja guardar,
 * vive en memoria y se reinicia al recargar: abierto a propósito. Se esquiva borrando los datos
 * del sitio o con una ventana privada: es una invitación, no una protección.
 */

const CLAVE = "pecera:pared";
const SIN_VISTOS: readonly string[] = [];

let enMemoria: readonly string[] | null = null;
const oyentes = new Set<() => void>();

function leer(): readonly string[] {
  if (enMemoria) return enMemoria;
  try {
    enMemoria = leerVistos(JSON.parse(localStorage.getItem(CLAVE) ?? "[]"));
  } catch {
    enMemoria = [];
  }
  return enMemoria;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Lo llama el reel a los 3 s. Con sesión no cuenta (no hay pared). */
export function contarParaPared(pitchId: string): void {
  try {
    if (hayCookieSesion()) return;
  } catch {
    return;
  }
  const nuevo = sumarVisto(leer(), pitchId);
  if (!nuevo) return;
  enMemoria = nuevo;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {}
  for (const o of oyentes) o();
}

type Config = { activa: boolean; libres: number; sesion: boolean; traspaso: boolean };
const APAGADA: Config = { activa: false, libres: 2, sesion: false, traspaso: false };

/**
 * `bloqueado(id)` para cada reel y si el pop-up ofrece el traspaso de la sesión. Mientras no
 * llega la config, nada bloqueado.
 */
export function usePared(): { bloqueado: (pitchId: string) => boolean; traspaso: boolean } {
  const vistos = useSyncExternalStore(suscribir, leer, () => SIN_VISTOS);
  const [config, setConfig] = useState<Config>(APAGADA);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let sesion = false;
      try {
        sesion = hayCookieSesion();
      } catch {}
      if (sesion) return; // con cuenta no hay pared
      const c = await configFunciones();
      if (vivo && c.pared_activa) {
        setConfig({ activa: true, libres: c.pared_libres, sesion: false, traspaso: c.visitas_activas && c.traspaso_activo });
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const estado: EstadoPared = { ...config, vistos };
  return { bloqueado: (pitchId) => estaBloqueado(estado, pitchId), traspaso: config.traspaso };
}

/** Marca de "entró desde la pared" para darle la bienvenida al volver de Google. */
const CLAVE_ENTRANDO = "pecera:pared-entrando";

export function marcarEntrandoDesdePared(): void {
  try {
    sessionStorage.setItem(CLAVE_ENTRANDO, "1");
  } catch {}
}

/** true una sola vez, si volvió de Google con sesión. */
export function tomarBienvenida(): boolean {
  try {
    if (sessionStorage.getItem(CLAVE_ENTRANDO) !== "1") return false;
    sessionStorage.removeItem(CLAVE_ENTRANDO);
    if (!hayCookieSesion()) return false;
    olvidarTraspaso(); // ya viajó en la cookie del login
    return true;
  } catch {
    return false;
  }
}
