"use server";

import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { CONSENTIMIENTO_U21 } from "@/lib/networking";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Guarda (o retira) el consentimiento OPCIONAL para compartir el perfil con la organización
 * de la Feria 21. Se guarda la elección, su fecha y la versión del texto. Nunca tira.
 */
export async function guardarConsentimiento(acepta: boolean): Promise<Resultado & { fecha?: string }> {
  try {
    const supabase = await supabaseConSesion();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, mensaje: SIN_SESION };
    const { data, error } = await supabase.rpc("guardar_consentimiento_evento", {
      p_evento: EVENTO_ACTUAL.slug,
      p_acepta: acepta === true,
      p_version: CONSENTIMIENTO_U21.version,
    });
    if (error) return traducir(error, "guardar_consentimiento_evento");
    return { ok: true, fecha: typeof data === "string" ? data : new Date().toISOString() };
  } catch (e) {
    console.error(`guardarConsentimiento: ${(e as Error).message}`);
    return { ok: false, mensaje: "No pudimos guardar. Probá de nuevo en un rato." };
  }
}
