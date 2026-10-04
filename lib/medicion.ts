import type { Canal } from "@/lib/contacto";
import { dispositivo } from "@/lib/dispositivo";
import { pedirMotivo } from "@/lib/motivo";
import { supabase } from "@/lib/supabase";

/**
 * Medición anónima de vistas y contactos, con el mismo uuid de los piques. Nada de
 * esto tira ni frena la interfaz: si falla, se pierde ese dato y listo.
 */

const CLAVE_VISTAS = "pecera:vistas";
/** Una vista por dispositivo y pitch cada 12 h (la base lo vuelve a controlar). */
const VENTANA_VISTA_MS = 12 * 60 * 60 * 1000;

let vistasEnMemoria: Record<string, number> | null = null;

function leerVistas(): Record<string, number> {
  if (vistasEnMemoria) return vistasEnMemoria;
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? "{}");
    vistasEnMemoria = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
  } catch {
    vistasEnMemoria = {};
  }
  return vistasEnMemoria!;
}

function escribirVistas(vistas: Record<string, number>) {
  vistasEnMemoria = vistas;
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(vistas));
  } catch {
    // Sin localStorage queda en memoria.
  }
}

/** El video se reprodujo 3 s: cuenta la vista si no hubo otra en 12 h. */
export function registrarVista(pitchId: string) {
  const ahora = Date.now();
  const previas = leerVistas();
  if (ahora - (previas[pitchId] ?? -Infinity) < VENTANA_VISTA_MS) return;
  // Solo lo vigente: el registro no crece para siempre.
  const vigentes = Object.fromEntries(
    Object.entries(previas).filter(([, t]) => ahora - t < VENTANA_VISTA_MS)
  );
  escribirVistas({ ...vigentes, [pitchId]: ahora });

  supabase
    .rpc("registrar_vista", { p_pitch: pitchId, p_dispositivo: dispositivo() })
    .then(({ error }) => {
      // Sin red o sin la migración: se olvida, así la próxima vez lo reintenta.
      if (!error) return;
      const sinEsta = { ...leerVistas() };
      delete sinEsta[pitchId];
      escribirVistas(sinEsta);
    });
}

/**
 * Llama a una función de la base con `keepalive` (supabase-js no lo deja pasar): el
 * toque suele abrir WhatsApp o el correo, y el navegador puede soltar la página
 * antes de que termine. Nunca tira.
 */
export function rpcConKeepalive(funcion: string, cuerpo: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return;
  try {
    fetch(`${url}/rest/v1/rpc/${funcion}`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    }).catch(() => {});
  } catch {
    // Nunca frena el link.
  }
}

/**
 * Un toque en un canal de contacto. `pitchId` solo desde el pop-up del pique.
 * Después se ofrece el "¿Para qué?" (opcional, ver PreguntaMotivo).
 */
export function registrarContacto({
  perfilId,
  pitchId = null,
  canal,
}: {
  perfilId: string;
  pitchId?: string | null;
  canal: Canal["clave"];
}) {
  rpcConKeepalive("registrar_contacto", {
    p_perfil: perfilId,
    p_pitch: pitchId,
    p_canal: canal,
    p_dispositivo: dispositivo(),
  });
  pedirMotivo({ perfilId, canal });
}
