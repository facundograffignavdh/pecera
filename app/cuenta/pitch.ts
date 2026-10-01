"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { DESCRIPCION_PITCH_MAX } from "@/lib/pitch";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Lo que la persona maneja de sus pitches: la descripción y si se ve. Publicar
 * sigue siendo del equipo y de la ingesta. Todo por funciones de la base, que
 * verifican que el pitch sea del perfil de la sesión. Ninguna tira.
 */

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** El feed, la cuenta y el perfil propio muestran el pitch: los tres se regeneran. */
async function refrescar(supabase: Awaited<ReturnType<typeof supabaseConSesion>>, userId: string) {
  revalidatePath("/");
  revalidatePath("/cuenta");
  const { data } = await supabase.from("perfiles").select("slug").eq("usuario_id", userId).maybeSingle();
  if (data?.slug) revalidatePath(`/p/${data.slug}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function editarDescripcionPitch(id: string, descripcion: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese pitch no existe." };
  const texto = descripcion.trim();
  if (texto.length > DESCRIPCION_PITCH_MAX) {
    return { ok: false, mensaje: `Hasta ${DESCRIPCION_PITCH_MAX} caracteres.` };
  }
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("editar_mi_pitch", { p_pitch: id, p_descripcion: texto });
  if (error) return traducir(error, "editar_mi_pitch");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: "Guardado." };
}

export async function ocultarPitch(id: string, oculto: boolean): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese pitch no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("ocultar_mi_pitch", { p_pitch: id, p_oculto: oculto });
  if (error) return traducir(error, "ocultar_mi_pitch");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: oculto ? "Oculto." : "Visible otra vez." };
}
