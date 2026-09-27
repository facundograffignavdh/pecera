"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type CampoPerfil,
  type Errores,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** Origen de la request: anda igual en localhost, en las vistas previas y en producción. */
async function origen(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${h.get("host")}`;
}

/** "Entrar con Google" (PKCE: el verifier queda en una cookie). */
export async function entrar(): Promise<void> {
  const supabase = await supabaseConSesion();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origen()}/auth/callback?next=/cuenta` },
  });
  if (error || !data.url) {
    console.error(`Supabase (entrar): ${error?.code ?? ""} ${error?.message ?? "sin url"}`);
    redirect("/cuenta?error=login");
  }
  redirect(data.url);
}

export async function salir(): Promise<void> {
  const supabase = await supabaseConSesion();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

export type EstadoGuardar = {
  errores: Errores;
  general?: string;
  /** Slug del perfil guardado: el form lo usa para subir la foto después. */
  guardado?: { slug: string; creado: boolean };
};

const CAMPOS: CampoPerfil[] = [
  "nombre",
  "tipo",
  "rol",
  "descripcion",
  "whatsapp",
  "email",
  "linkedin",
  "instagram",
  "web",
];

const ERROR_GENERAL = "No pudimos guardar. Probá de nuevo en un rato.";

/** Crea o edita el perfil del usuario. La RLS y el trigger de la base mandan. */
export async function guardarPerfil(
  _previo: EstadoGuardar,
  formData: FormData
): Promise<EstadoGuardar> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errores: {}, general: "Se cerró tu sesión. Volvé a entrar." };

  const entrada = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "")])
  );
  const { datos, errores } = validarPerfil(entrada);
  const oculto = formData.get("oculto") === "on";

  const { data: actual, error: errorLectura } = await supabase
    .from("perfiles")
    .select("id, slug")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (errorLectura) {
    console.error(`Supabase (guardarPerfil): ${errorLectura.code} ${errorLectura.message}`);
    return { errores, general: ERROR_GENERAL };
  }

  let slug: string;
  let creado = false;

  if (actual) {
    if (Object.keys(errores).length) return { errores };
    slug = actual.slug;
    const { error } = await supabase
      .from("perfiles")
      .update({ ...datos, oculto })
      .eq("id", actual.id);
    if (error) {
      console.error(`Supabase (guardarPerfil): ${error.code} ${error.message}`);
      return { errores, general: ERROR_GENERAL };
    }
  } else {
    slug = String(formData.get("slug") ?? "").trim();
    const errorSlug = validarSlug(slug);
    if (errorSlug) errores.slug = errorSlug;
    if (formData.get("consentimiento") !== "on") {
      errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
    }
    if (Object.keys(errores).length) return { errores };

    const { error } = await supabase.from("perfiles").insert({
      ...datos,
      slug,
      oculto,
      usuario_id: user.id,
      // El trigger lo pisa con now(); acá solo marca que se aceptó.
      consentimiento_at: new Date().toISOString(),
    });
    if (error?.code === "23505" && error.message.includes("slug")) {
      return { errores: { slug: "Esa dirección ya está tomada, probá otra." } };
    }
    if (error) {
      console.error(`Supabase (guardarPerfil): ${error.code} ${error.message}`);
      return { errores, general: ERROR_GENERAL };
    }
    creado = true;
  }

  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/cuenta");
  return { errores: {}, guardado: { slug, creado } };
}
