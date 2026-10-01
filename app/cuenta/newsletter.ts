"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { LIMITES_NEWSLETTER } from "@/lib/newsletter";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { esUrlSegura } from "@/lib/transparencia";

/** Guarda (o saca, si viene vacío) el link a la newsletter del perfil. Nunca tira. */
export async function guardarNewsletter(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const url = String(formData.get("url") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (url && (url.length > LIMITES_NEWSLETTER.url || !esUrlSegura(url))) {
    return { ok: false, mensaje: "Pegá el link completo de tu newsletter (empieza con https://)." };
  }
  if (titulo.length > LIMITES_NEWSLETTER.titulo) {
    return { ok: false, mensaje: `El nombre va hasta ${LIMITES_NEWSLETTER.titulo} caracteres.` };
  }

  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("guardar_newsletter", { p_url: url || null, p_titulo: titulo || null });
  if (error) return traducir(error, "guardar_newsletter");

  revalidatePath("/cuenta");
  const { data } = await supabase.from("perfiles").select("slug").eq("usuario_id", user.id).maybeSingle();
  if (data?.slug) revalidatePath(`/p/${data.slug}`);
  return { ok: true, mensaje: url ? "Listo: tu newsletter aparece en tu perfil." : "Sacamos el link de tu perfil." };
}
