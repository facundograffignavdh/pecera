"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hayCookieSesion } from "@/lib/cuenta-local";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import { boton } from "@/lib/ui";
import { AVISO_VISITAS, configFunciones } from "@/lib/visitas";

/** Ya se consultó (o se eligió) en esta pestaña: no se vuelve a pedir. */
const CLAVE = "pecera:aviso-visitas";

function yaConsultado(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === AVISO_VISITAS.version;
  } catch {
    return false;
  }
}

function marcarConsultado() {
  try {
    sessionStorage.setItem(CLAVE, AVISO_VISITAS.version);
  } catch {}
}

/** Mi CRM ya lo muestra arriba; el stand, la landing y las imprimibles no lo llevan. */
function sinAviso(ruta: string): boolean {
  return (
    ruta.startsWith("/cuenta/crm") ||
    ruta.startsWith("/admin/vivo") ||
    ruta.startsWith("/sumate") ||
    ruta.startsWith("/auth") ||
    ruta.endsWith("/one-pager") ||
    ruta.endsWith("/exportar")
  );
}

/**
 * "Quién vio tu perfil": a quien tiene sesión y todavía no vio el aviso se lo muestra una vez, sin
 * bloquear. Hasta que elija, sus visitas no se registran (lo decide la base). Va en el layout.
 */
export default function AvisoVisitas() {
  const ruta = usePathname();
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!hayCookieSesion() || yaConsultado()) return;
        if (!(await configFunciones()).visitas_activas) return;
        const { data, error } = await supabaseNavegador().rpc("mi_estado_visitas");
        if (error || !data) return;
        if (data.aviso_visto_at) marcarConsultado();
        else if (vivo) setVisible(true);
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function elegir(mostrar: boolean) {
    setGuardando(true);
    setError(false);
    try {
      const { error } = await supabaseNavegador().rpc("guardar_aviso_visitas", {
        p_version: AVISO_VISITAS.version,
        p_mostrar: mostrar,
      });
      if (error) throw error;
      marcarConsultado();
      setVisible(false);
    } catch {
      setError(true);
    } finally {
      setGuardando(false);
    }
  }

  if (!visible || sinAviso(ruta)) return null;
  return (
    <section
      aria-labelledby="aviso-visitas-titulo"
      className="tema-fijo aparecer vidrio fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom),calc(var(--alto-nav)_+_0.5rem))] z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-tinta shadow-lg"
    >
      <h2 id="aviso-visitas-titulo" className="text-sm font-semibold">
        Nuevo: quién vio tu perfil
      </h2>
      <p className="mt-1 text-sm leading-snug">{AVISO_VISITAS.texto}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={guardando} onClick={() => elegir(true)} className={boton("primario", "sm")}>
          Entendido
        </button>
        <button type="button" disabled={guardando} onClick={() => elegir(false)} className={boton("secundario", "sm")}>
          Usar modo privado
        </button>
        <Link href="/privacidad#visitas" className="text-sm underline underline-offset-2">
          Más info
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          No pudimos guardar tu elección. Probá de nuevo en un rato.
        </p>
      )}
    </section>
  );
}
