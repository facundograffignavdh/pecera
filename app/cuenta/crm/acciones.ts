"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { AVISO_VISITAS } from "@/lib/visitas-dia";

/**
 * Acciones de Mi CRM. Todo por funciones de la base con la sesión (auth.uid()): nunca un id que
 * mande el navegador.
 */

/** Aviso visto + "Mostrar mis visitas". Apagarlo vuelve anónimas las visitas que ya hiciste. */
export async function guardarMostrarVisitas(mostrar: boolean): Promise<Resultado> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("guardar_aviso_visitas", {
    p_version: AVISO_VISITAS.version,
    p_mostrar: mostrar,
  });
  if (error) return traducir(error, "guardar_aviso_visitas");
  revalidatePath("/cuenta/crm");
  return { ok: true };
}

/** Borra las visitas que hiciste y que otros ven con tu nombre. */
export async function borrarMisVisitas(): Promise<Resultado> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("borrar_mis_visitas_hechas");
  if (error) return traducir(error, "borrar_mis_visitas_hechas");
  revalidatePath("/cuenta/crm");
  return { ok: true };
}
