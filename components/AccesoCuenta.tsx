"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconoPersona } from "@/components/Iconos";

// Nombre literal: Next solo inyecta las NEXT_PUBLIC_* si aparecen así.
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://x").hostname.split(".")[0];
// La sesión de @supabase/ssr: "sb-<ref>-auth-token", a veces partida en ".0", ".1"…
// No confundir con la cookie del code verifier del login a medio hacer.
const COOKIE_SESION = new RegExp(`(^|;\s*)sb-${ref}-auth-token(\.\d+)?=`);

function suscribir(avisar: () => void) {
  // Las cookies no avisan cuando cambian: se revisa al volver a la pestaña.
  window.addEventListener("focus", avisar);
  return () => window.removeEventListener("focus", avisar);
}

/**
 * Píldora "Entrar" / "Mi perfil". Mira si hay cookie de sesión solo en el
 * navegador (sin validarla: /cuenta lo hace), así el feed y los perfiles no leen
 * cookies en el servidor y siguen estáticos.
 */
export default function AccesoCuenta({ compacto = false }: { compacto?: boolean }) {
  const conSesion = useSyncExternalStore(
    suscribir,
    () => COOKIE_SESION.test(document.cookie),
    () => false
  );
  const texto = conSesion ? "Mi perfil" : "Entrar";

  return (
    <Link
      href="/cuenta"
      aria-label={texto}
      className="vidrio pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:text-arcilla"
    >
      <IconoPersona className="size-5" />
      <span className={compacto ? "hidden min-[400px]:inline" : undefined}>{texto}</span>
    </Link>
  );
}
