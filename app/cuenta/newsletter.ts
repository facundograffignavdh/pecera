"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { LIMITES_NEWSLETTER } from "@/lib/newsletter";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Newsletter: abrirla y publicar ediciones (desde /cuenta) y suscribirse (desde el
 * perfil, una página estática que pide la sesión por action). Todo por funciones de
 * la base. Ninguna tira.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function refrescarPropia(supabase: Supa, userId: string) {
  revalidatePath("/cuenta");
  const { data } = await supabase.from("perfiles").select("slug").eq("usuario_id", userId).maybeSingle();
  if (data?.slug) {
    revalidatePath(`/p/${data.slug}`);
    revalidatePath(`/p/${data.slug}/newsletter`);
  }
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function guardarNewsletter(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const titulo = texto(formData, "titulo");
  const descripcion = texto(formData, "descripcion");
  if (!titulo) return { ok: false, mensaje: "Poné un nombre para tu newsletter." };
  if (titulo.length > LIMITES_NEWSLETTER.titulo) return { ok: false, mensaje: `El nombre va hasta ${LIMITES_NEWSLETTER.titulo} caracteres.` };
  if (descripcion.length > LIMITES_NEWSLETTER.descripcion) {
    return { ok: false, mensaje: `La descripción va hasta ${LIMITES_NEWSLETTER.descripcion} caracteres.` };
  }
  const { error } = await supabase.rpc("guardar_newsletter", { p_titulo: titulo, p_descripcion: descripcion || null });
  if (error) return traducir(error, "guardar_newsletter");
  await refrescarPropia(supabase, user.id);
  return { ok: true, mensaje: "Newsletter guardada." };
}

export async function guardarEdicion(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const id = texto(formData, "id");
  const titulo = texto(formData, "titulo");
  const cuerpo = texto(formData, "cuerpo");
  if (!titulo) return { ok: false, mensaje: "Poné un título para la edición." };
  if (!cuerpo) return { ok: false, mensaje: "Escribí el contenido de la edición." };
  if (titulo.length > LIMITES_NEWSLETTER.tituloEdicion) {
    return { ok: false, mensaje: `El título va hasta ${LIMITES_NEWSLETTER.tituloEdicion} caracteres.` };
  }
  if (cuerpo.length > LIMITES_NEWSLETTER.cuerpo) {
    return { ok: false, mensaje: `El contenido va hasta ${LIMITES_NEWSLETTER.cuerpo} caracteres.` };
  }
  const { error } = await supabase.rpc("guardar_edicion", {
    p_id: UUID.test(id) ? id : null,
    p_titulo: titulo,
    p_cuerpo: cuerpo,
  });
  if (error) return traducir(error, "guardar_edicion");
  await refrescarPropia(supabase, user.id);
  return { ok: true, mensaje: UUID.test(id) ? "Edición corregida." : "¡Edición publicada! Ya la ven tus suscriptores." };
}

export async function borrarEdicion(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Esa edición no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("borrar_edicion", { p_id: id });
  if (error) return traducir(error, "borrar_edicion");
  await refrescarPropia(supabase, user.id);
  return { ok: true, mensaje: "Edición borrada." };
}

export type EstadoSuscripcion = {
  /** Hay sesión de Google. */
  sesion: boolean;
  suscripto: boolean;
  /** Es la newsletter de la propia cuenta. */
  propia: boolean;
};

/** Al montar el botón: con o sin sesión, y si ya está suscripto. */
export async function estadoSuscripcion(slug: string): Promise<EstadoSuscripcion> {
  if (!SLUG.test(slug)) return { sesion: false, suscripto: false, propia: false };
  const { supabase, user } = await conSesion();
  if (!user) return { sesion: false, suscripto: false, propia: false };
  const [suscripcion, perfil] = await Promise.all([
    supabase.rpc("mi_suscripcion", { p_slug: slug }),
    supabase.from("perfiles").select("slug").eq("usuario_id", user.id).maybeSingle(),
  ]);
  return { sesion: true, suscripto: suscripcion.data === true, propia: perfil.data?.slug === slug };
}

export async function suscribirse(slug: string, activa: boolean): Promise<Resultado & { total?: number }> {
  if (!SLUG.test(slug)) return { ok: false, mensaje: "Esa newsletter no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { data, error } = await supabase.rpc("suscribirme", { p_slug: slug, p_activa: activa });
  if (error) return traducir(error, "suscribirme");
  revalidatePath("/cuenta");
  return {
    ok: true,
    total: typeof data === "number" ? data : undefined,
    mensaje: activa ? "Listo, te suscribiste. Las ediciones nuevas te aparecen en Mi perfil." : "Te diste de baja.",
  };
}
