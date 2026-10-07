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

/** Interruptor del score crediticio (score_switch). Revalida todo: el cambio se ve en la próxima carga. */
export async function interruptorScore(activo: boolean) {
  return rpc("admin_score", { p_activo: activo }, "/");
}

// ---------------------------------------------------------------------------
// Editar perfiles y empresas desde /admin/perfil/[id] (alta_rapida). Todo queda en
// `equipo_acciones` (quién, cuándo y qué columnas; nunca los valores).
// ---------------------------------------------------------------------------

/** Como `rpc`, pero el mensaje del tope habla de la persona, no de quien usa el panel. */
async function rpcEquipo(nombre: string, args: Record<string, unknown>): Promise<Resultado & { datos?: unknown }> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    if (error.message === "tope de empresas") return { ok: false, mensaje: "Esa persona ya está en 5 empresas, el máximo." };
    if (error.message === "esa persona ya representa a otra empresa") {
      return { ok: false, mensaje: "Ya representa a otra empresa en la feria: destildá «Anotar en la feria» o cambiá el representante." };
    }
    return traducir(error, nombre);
  }
  // Se ve en /p/<slug>, /e/<slug>, el feed y el evento.
  revalidatePath("/", "layout");
  return { ok: true, datos: data };
}

export type DatosPerfilEquipo = {
  nombre: string;
  descripcion: string;
  rol: string;
  tipo: string;
  publicado: boolean;
  oculto: boolean;
};

/** Perfil sin cuenta: todo. */
export async function editarPerfilEquipo(perfil: string, d: DatosPerfilEquipo): Promise<Resultado> {
  return rpcEquipo("admin_editar_perfil_equipo", {
    p_perfil: perfil,
    p_nombre: d.nombre.trim(),
    p_descripcion: d.descripcion.trim(),
    p_rol: d.rol,
    p_tipo: d.tipo,
    p_publicado: d.publicado,
    p_oculto: d.oculto,
  });
}

/** Perfil con cuenta: solo nombre y descripción, para corregir. */
export async function editarPerfilCuenta(perfil: string, nombre: string, descripcion: string): Promise<Resultado> {
  return rpcEquipo("admin_editar_perfil_cuenta", {
    p_perfil: perfil,
    p_nombre: nombre.trim(),
    p_descripcion: descripcion.trim(),
  });
}

export async function editarEmpresaEquipo(empresa: string, nombre: string, descripcion: string): Promise<Resultado> {
  return rpcEquipo("admin_editar_empresa_equipo", {
    p_empresa: empresa,
    p_nombre: nombre.trim(),
    p_descripcion: descripcion.trim() || null,
  });
}

export async function agregarEmpresa(
  perfil: string,
  nombre: string,
  descripcion: string,
  tipo: string,
  feria: boolean
): Promise<Resultado> {
  const r = await rpcEquipo("admin_agregar_empresa", {
    p_perfil: perfil,
    p_nombre: nombre.trim(),
    p_descripcion: descripcion.trim() || null,
    p_tipo: tipo,
    p_evento: feria ? EVENTO_ACTUAL.slug : null,
  });
  return r.ok ? { ok: true, slug: (r.datos as { slug: string }).slug } : r;
}

/** Suma el perfil a una empresa existente: no cambia quién la administra ni quién la representa. */
export async function sumarAEmpresa(perfil: string, empresa: string, cargo: string, feria: boolean): Promise<Resultado> {
  const r = await rpcEquipo("admin_sumar_a_empresa", {
    p_perfil: perfil,
    p_empresa: empresa,
    p_cargo: cargo || null,
    p_evento: feria ? EVENTO_ACTUAL.slug : null,
  });
  return r.ok ? { ok: true, slug: r.datos as string } : r;
}

/** Email de Google para que la persona reclame su perfil (vacío = borrarlo). */
export async function emailReclamo(perfil: string, email: string): Promise<Resultado> {
  return rpcEquipo("admin_email_reclamo", { p_perfil: perfil, p_email: email.trim() });
}

/**
 * Vincula el perfil sin dueña con la cuenta de ese email. La base no dice por qué no pudo (no
 * revela qué emails tienen cuenta): el mensaje cubre los casos.
 */
export async function vincularCuenta(perfil: string, email: string): Promise<Resultado> {
  const r = await rpcEquipo("admin_vincular_cuenta", { p_perfil: perfil, p_email: email.trim() });
  if (!r.ok) return r;
  return r.datos === true
    ? { ok: true }
    : {
        ok: false,
        mensaje:
          "No se pudo vincular: la cuenta no existe, no confirmó el email o ya tiene perfil. Pedile que entre una vez con Google y probá de nuevo.",
      };
}

/** Derecho de supresión: borra un perfil creado por el equipo que todavía no tiene cuenta. */
export async function borrarPerfilEquipo(perfil: string): Promise<Resultado> {
  return rpcEquipo("admin_borrar_perfil_equipo", { p_perfil: perfil });
}
