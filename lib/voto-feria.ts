import { dispositivo } from "@/lib/dispositivo";
import { supabase } from "@/lib/supabase";

/**
 * Voto sin cuenta de la Feria 21 (migración feria_stands_votos): un voto por evento y
 * por dispositivo (el uuid anónimo de la medición), con las RPC `votar_dispositivo`,
 * `quitar_voto_dispositivo` y `mi_voto_dispositivo`. Vale lo mismo que el voto con
 * cuenta. Además guarda en el navegador si ya votó (`pecera:voto-feria`): con eso el
 * pop-up y el sello del borde (`AvisoFeria`) dejan de molestar. Nada de esto lanza.
 */

export type ResultadoVoto = { ok: boolean; mensaje: string };

const CLAVE_VOTO = "pecera:voto-feria";
const EVENTO_CAMBIO = "pecera:voto-feria";

/** "Esto todavía no existe en la base": función, tabla o columna (mismo criterio que `faltaMigracion`). */
const SIN_MIGRACION = new Set(["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

const MENSAJES: Record<string, string> = {
  "votación cerrada": "La votación no está abierta.",
  "participante inexistente": "Ese proyecto ya no participa.",
  "evento inexistente": "Ese evento no está activo.",
  "no podés votarte": "No podés votarte a vos.",
  "no podés votar a tu empresa": "No podés votar a tu propia empresa.",
  "ya votaste con tu cuenta": "Ya votaste con tu cuenta desde este celular. Entrá para cambiar tu voto.",
  "demasiadas acciones": "Fuiste muy rápido. Esperá un minuto y probá de nuevo.",
  "con sesión se vota con la cuenta": "Recargá la página: entraste con tu cuenta.",
};

function mensajeDe(error: { message: string }): string {
  return MENSAJES[error.message] ?? "No pudimos guardar tu voto. Probá de nuevo en un rato.";
}

/** Lo que se sabe del voto sin cuenta de este dispositivo. `disponible` = la migración corrió. */
export async function miVotoSinCuenta(evento: string): Promise<{ disponible: boolean; voto: string | null }> {
  try {
    const { data, error } = await supabase.rpc("mi_voto_dispositivo", {
      p_evento: evento,
      p_dispositivo: dispositivo(),
    });
    if (error) return { disponible: false, voto: null };
    return { disponible: true, voto: (data as string | null) ?? null };
  } catch {
    return { disponible: false, voto: null };
  }
}

export async function votarSinCuenta(evento: string, perfilId: string): Promise<ResultadoVoto> {
  try {
    const { error } = await supabase.rpc("votar_dispositivo", {
      p_evento: evento,
      p_perfil: perfilId,
      p_dispositivo: dispositivo(),
    });
    if (error) {
      if (error.code && SIN_MIGRACION.has(error.code)) {
        return { ok: false, mensaje: "Para votar, entrá con tu cuenta de Google." };
      }
      return { ok: false, mensaje: mensajeDe(error) };
    }
    marcarVoto(evento, true);
    return { ok: true, mensaje: "¡Voto registrado! Podés cambiarlo mientras la votación siga abierta." };
  } catch {
    return { ok: false, mensaje: "No pudimos guardar tu voto. Revisá la conexión y probá de nuevo." };
  }
}

/** Saca el voto sin cuenta de este dispositivo. También se usa después de votar con la cuenta. */
export async function quitarVotoSinCuenta(evento: string): Promise<ResultadoVoto> {
  try {
    const { error } = await supabase.rpc("quitar_voto_dispositivo", {
      p_evento: evento,
      p_dispositivo: dispositivo(),
    });
    if (error) return { ok: false, mensaje: mensajeDe(error) };
    return { ok: true, mensaje: "Sacaste tu voto." };
  } catch {
    return { ok: false, mensaje: "No pudimos sacar tu voto. Probá de nuevo en un rato." };
  }
}

// ---------------------------------------------------------------------------
// "Ya votó" en este navegador
// ---------------------------------------------------------------------------

export function marcarVoto(evento: string, voto: boolean) {
  try {
    if (voto) localStorage.setItem(CLAVE_VOTO, evento);
    else localStorage.removeItem(CLAVE_VOTO);
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  } catch {
    // Sin storage: el sello sigue a la vista, nada más.
  }
}

export function yaVoto(evento: string): boolean {
  try {
    return localStorage.getItem(CLAVE_VOTO) === evento;
  } catch {
    return false;
  }
}

/** Para `useSyncExternalStore`: avisa cuando cambia la marca (en esta pestaña o en otra). */
export function suscribirVoto(avisar: () => void): () => void {
  window.addEventListener(EVENTO_CAMBIO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, avisar);
    window.removeEventListener("storage", avisar);
  };
}
