"use server";

import { revalidatePath } from "next/cache";
import { NO_DISPONIBLE, type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
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

/** Suma o saca una empresa: participa a través de quien la administra. */
export async function participanteEmpresa(empresa: string, participa: boolean) {
  return rpc("admin_empresa_participante", {
    p_evento: EVENTO_ACTUAL.slug,
    p_empresa: empresa,
    p_participa: participa,
  });
}

/** Cambia quién representa a una empresa participante (sus votos pasan a la nueva). */
export async function representante(empresa: string, perfil: string) {
  return rpc("admin_representante", { p_evento: EVENTO_ACTUAL.slug, p_empresa: empresa, p_perfil: perfil });
}

/** Agrega o quita #feria21 de la descripción de un pitch. */
export async function pitchFeria(pitch: string, con: boolean) {
  return rpc("admin_pitch_feria", { p_pitch: pitch, p_con: con });
}

/** Original de una cuenta eliminada que el equipo ya borró a mano en Drive. */
export async function marcarOriginalBorrado(origen: string) {
  return rpc("admin_marcar_original_borrado", { p_origen: origen }, "/admin");
}

/**
 * Demo Day: guarda filas inmutables con los números de la feria hasta ahora, una de
 * toda la plataforma y otra de los participantes del evento. Sin la migración
 * vivo_feria, una sola fila (la de la plataforma), como antes.
 */
export async function congelarDemoDay(): Promise<Resultado> {
  const r = await rpc("admin_congelar_demo_day_en", { p_evento: EVENTO_ACTUAL.slug }, "/admin");
  if (r.ok || r.mensaje !== NO_DISPONIBLE) return r;
  return rpc("admin_congelar_demo_day", {}, "/admin");
}

/** Habilita (o saca) un email de la Universidad para el panel /organizacion de la feria. */
export async function organizador(email: string, habilitar: boolean) {
  return rpc(
    "admin_organizador",
    { p_evento: EVENTO_ACTUAL.slug, p_email: email, p_habilitar: habilitar },
    "/admin"
  );
}

/** Interruptores de emergencia (quien_vio): visitas, pared de pitches (y cuántos libres) y traspaso. */
export async function funciones(visitas: boolean, pared: boolean, libres: number, traspaso: boolean) {
  return rpc("admin_funciones", { p_visitas: visitas, p_pared: pared, p_libres: libres, p_traspaso: traspaso }, "/admin");
}

/**
 * Juego del stand (juego_stand): abrir o cerrar, cuántas tarjetas y el número (null = no tocarlo).
 * El número viaja solo de ida: la base nunca lo devuelve. Revalida la Feria, que muestra cuántas quedan.
 */
export async function configurarStand(activo: boolean, premios: number, secreto: number | null) {
  return rpc("admin_stand_config", { p_activo: activo, p_premios: premios, p_secreto: secreto }, "/eventos");
}

/** Marca (o desmarca) que la tarjeta de un ganador ya se entregó en el stand. */
export async function entregarStand(jugador: string, entregado: boolean) {
  return rpc("admin_stand_entregar", { p_jugador: jugador, p_entregado: entregado }, "/admin");
}

/** Interruptor del score crediticio (score_switch). Revalida todo: el cambio se ve en la próxima carga. */
export async function interruptorScore(activo: boolean) {
  return rpc("admin_score", { p_activo: activo }, "/");
}
