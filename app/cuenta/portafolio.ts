"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { TIPOS_PORTAFOLIO, esValor } from "@/lib/etiquetas";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { esUrlSegura } from "@/lib/transparencia";

/**
 * Portafolio del perfil (inversiones, casos, servicios, logros, prensa, documentos).
 * Todo pasa por funciones de la base; nunca tira: la falla vuelve como mensaje.
 */

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function refrescar(supabase: Awaited<ReturnType<typeof supabaseConSesion>>, userId: string) {
  revalidatePath("/cuenta");
  const { data } = await supabase.from("perfiles").select("slug").eq("usuario_id", userId).maybeSingle();
  if (data?.slug) revalidatePath(`/p/${data.slug}`);
}

export async function guardarItemPortafolio(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const texto = (c: string) => String(formData.get(c) ?? "").trim();
  const id = texto("id") || null;
  const tipo = texto("tipo");
  const titulo = texto("titulo");
  const descripcion = texto("descripcion");
  const url = texto("url");

  if (!esValor(TIPOS_PORTAFOLIO, tipo)) return { ok: false, mensaje: "Elegí qué tipo de ítem es." };
  if (!titulo || titulo.length > 80) return { ok: false, mensaje: "Poné un título (hasta 80 caracteres)." };
  if (descripcion.length > 200) return { ok: false, mensaje: "La descripción va hasta 200 caracteres." };
  if (url && !esUrlSegura(url)) return { ok: false, mensaje: "El link tiene que empezar con https://" };

  const { error } = await supabase.rpc("guardar_portafolio", {
    p_id: id,
    p_tipo: tipo,
    p_titulo: titulo,
    p_descripcion: descripcion || null,
    p_url: url || null,
    p_visible: formData.get("visible") === "on",
  });
  if (error) {
    if (error.message === "portafolio lleno") return { ok: false, mensaje: "Llegaste a 12 ítems: borrá uno para sumar otro." };
    return traducir(error, "guardar_portafolio");
  }
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: id ? "Guardado." : "¡Sumado a tu portafolio!" };
}

export async function borrarItemPortafolio(id: string): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("borrar_portafolio", { p_id: id });
  if (error) return traducir(error, "borrar_portafolio");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: "Borrado." };
}
