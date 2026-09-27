"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Rol } from "@/types/pecera";

/**
 * Lo que las páginas públicas saben de la cuenta, sin leer cookies en el servidor
 * (así siguen estáticas). /cuenta guarda en el navegador un dato chico y público
 * del perfil; la sesión cuenta solo si además está la cookie de Supabase. Es solo
 * interfaz: la seguridad está en la RLS y el trigger.
 */

export type PerfilLocal = {
  slug: string;
  nombre: string;
  rol: Rol;
  /** URL lista de la foto, o null. */
  avatar: string | null;
  /** publicado y no oculto. */
  visible: boolean;
};

export type CuentaLocal = { perfil: PerfilLocal | null };

const CLAVE = "pecera:cuenta";
const EVENTO = "pecera:cuenta";

// Nombre literal: Next solo inyecta las NEXT_PUBLIC_* si aparecen así.
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://x").hostname.split(".")[0];
const COOKIE = `sb-${ref}-auth-token`;

/**
 * ¿Está la cookie de sesión? Se llama `sb-<ref>-auth-token` o viene partida en
 * `.0`, `.1`… No cuenta la del code verifier de un login a medio hacer.
 */
export function hayCookieSesion(cookies = document.cookie): boolean {
  return cookies.split(";").some((par) => {
    const nombre = par.slice(0, par.indexOf("=")).trim();
    if (nombre === COOKIE) return true;
    const resto = nombre.startsWith(`${COOKIE}.`) ? nombre.slice(COOKIE.length + 1) : "";
    return resto !== "" && [...resto].every((c) => c >= "0" && c <= "9");
  });
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO));
}

export function recordarCuenta(cuenta: CuentaLocal): void {
  try {
    const valor = JSON.stringify(cuenta);
    if (localStorage.getItem(CLAVE) === valor) return;
    localStorage.setItem(CLAVE, valor);
  } catch {
    return;
  }
  avisar();
}

export function olvidarCuenta(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    return;
  }
  avisar();
}

// Volver con el gesto de atrás restaura la página vieja (bfcache) sin re-render:
// por eso también `pageshow` y `visibilitychange`.
const EVENTOS = ["storage", EVENTO, "focus", "pageshow", "visibilitychange"] as const;

function suscribir(cambio: () => void) {
  for (const e of EVENTOS) window.addEventListener(e, cambio);
  return () => {
    for (const e of EVENTOS) window.removeEventListener(e, cambio);
  };
}

/** String para que el snapshot sea estable entre lecturas iguales. */
function leer(): string {
  if (!hayCookieSesion()) return "";
  try {
    return `1|${localStorage.getItem(CLAVE) ?? ""}`;
  } catch {
    return "1|";
  }
}

/**
 * null = sin sesión. `{ perfil: undefined }` = con sesión pero /cuenta todavía no
 * guardó nada (por ejemplo, entró antes de este cambio).
 */
export function useCuentaLocal(): { perfil: PerfilLocal | null | undefined } | null {
  const crudo = useSyncExternalStore(suscribir, leer, () => "");
  return useMemo(() => {
    if (!crudo) return null;
    try {
      const guardado = JSON.parse(crudo.slice(2)) as CuentaLocal;
      return { perfil: guardado.perfil };
    } catch {
      return { perfil: undefined };
    }
  }, [crudo]);
}
