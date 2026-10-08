"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Reclamo del perfil que el equipo armó en un evento (alta_rapida). La base decide todo con el
 * email VERIFICADO de la sesión: acá no viaja ningún email.
 */

/** "Sí, es mío": con el consentimiento de la persona, queda como dueña. Si sale bien, a /cuenta. */
export async function reclamarPerfil(perfil: string, consentimiento: boolean): Promise<Resultado> {
  if (!consentimiento) return { ok: false, mensaje: "Tildá la casilla para confirmar." };
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { data, error } = await supabase.rpc("reclamar_perfil", { p_perfil: perfil, p_consentimiento: true });
  if (error) return traducir(error, "reclamar_perfil");
  if (!data) {
    return {
      ok: false,
      mensaje: "No pudimos pasarte ese perfil. Si es tuyo, escribinos desde Privacidad y lo resolvemos.",
    };
  }

  // Su perfil y sus empresas cambian de dueña (/p, /e y lo que los lista).
  revalidatePath("/", "layout");
  redirect("/cuenta?reclamado=1");
}

/** "No es mío": deja de ofrecerse y el equipo lo revisa. */
export async function rechazarReclamo(perfil: string): Promise<Resultado> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("rechazar_reclamo", { p_perfil: perfil });
  if (error) return traducir(error, "rechazar_reclamo");
  revalidatePath("/cuenta");
  return { ok: true };
}
