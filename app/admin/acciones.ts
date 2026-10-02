"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Acciones del panel del equipo. La base decide quién es admin (`es_admin()` con el
 * email de la sesión en la tabla `admins`): acá no hay ninguna lista de emails ni
 * service key. Cada RPC vuelve a chequearlo.
 */

/** `revalidar`: qué se vuelve a armar (por defecto todo lo público, que es lo que suele cambiar). */
async function rpc(nombre: string, args: Record<string, unknown>, revalidar = "/"): Promise<Resultado> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc(nombre, args);
  if (error) return traducir(error, nombre);

  // Lo que cambia el panel se ve en el feed, perfiles, empresas y el evento.
  revalidatePath(revalidar, "layout");
  return { ok: true };
}

export async function publicarPerfil(perfil: string, publicado: boolean) {
  return rpc("admin_publicar_perfil", { p_perfil: perfil, p_publicado: publicado });
}

export async function publicarPitch(pitch: string, publicado: boolean) {
  return rpc("admin_publicar_pitch", { p_pitch: pitch, p_publicado: publicado });
}

export async function ocultarEmpresa(empresa: string, oculta: boolean) {
  return rpc("admin_ocultar_empresa", { p_empresa: empresa, p_oculta: oculta });
}

export async function autopublicar(valor: boolean) {
  return rpc("admin_autopublicar", { p_valor: valor });
}

export async function configurarEvento(votacionAbierta: boolean, resultadosVisibles: boolean) {
  return rpc("admin_configurar_evento", {
    p_evento: EVENTO_ACTUAL.slug,
    p_votacion_abierta: votacionAbierta,
    p_resultados_visibles: resultadosVisibles,
  });
}

export async function participante(perfil: string, participa: boolean) {
  return rpc("admin_participante", {
    p_evento: EVENTO_ACTUAL.slug,
    p_perfil: perfil,
    p_participa: participa,
  });
}

/** Original de una cuenta eliminada que el equipo ya borró a mano en Drive. */
export async function marcarOriginalBorrado(origen: string) {
  return rpc("admin_marcar_original_borrado", { p_origen: origen }, "/admin");
}
