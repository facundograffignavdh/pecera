"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type CampoPerfil,
  type Errores,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import { guardarFoto } from "@/lib/foto";
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
  /** Se guardó (solo al editar: al crear, la action redirige). */
  guardado?: boolean;
  /** El perfil se guardó pero la foto no: se puede volver a subir. */
  errorFoto?: string;
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

/**
 * Error de Supabase → mensaje para la persona. El trigger `perfiles_guardian`
 * levanta 22023 con "dato inválido: <campo>": ese va al campo; el resto, general.
 */
function errorDeLaBase(error: PostgrestError, errores: Errores): EstadoGuardar {
  console.error(`Supabase (guardarPerfil): ${error.code} ${error.message}`);
  if (error.code === "22023") {
    const campo = /^dato inválido: (\w+)$/.exec(error.message)?.[1] as CampoPerfil | undefined;
    if (campo && CAMPOS.includes(campo)) return { errores: { [campo]: "Revisá este dato." } };
    if (error.message === "slug inválido") {
      return { errores: { slug: "Revisá la dirección: solo minúsculas, números y guiones." } };
    }
    if (error.message === "falta el consentimiento") {
      return { errores: { consentimiento: "Para crear tu perfil tenés que aceptar." } };
    }
  }
  return { errores, general: ERROR_GENERAL };
}

function revalidar(slug: string) {
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/cuenta");
}

/**
 * Crea o edita el perfil del usuario. La RLS y el trigger de la base mandan.
 * Nunca tira: toda falla vuelve como mensaje. Al crear termina con redirect() a la
 * confirmación, que viene del servidor y no depende de que el cliente navegue.
 */
export async function guardarPerfil(
  _previo: EstadoGuardar,
  formData: FormData
): Promise<EstadoGuardar> {
  let destino: string;
  try {
    const resultado = await guardar(formData);
    if (!("ir" in resultado)) return resultado;
    destino = resultado.ir;
  } catch (e) {
    console.error(`guardarPerfil: ${(e as Error).message}`);
    return { errores: {}, general: ERROR_GENERAL };
  }
  // Fuera del try: redirect() tira a propósito.
  redirect(destino);
}

async function guardar(formData: FormData): Promise<EstadoGuardar | { ir: string }> {
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
  const archivo = formData.get("foto");
  const foto = archivo instanceof Blob && archivo.size > 0 ? archivo : null;

  const { data: actual, error: errorLectura } = await supabase
    .from("perfiles")
    .select("id, slug, avatar_url")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (errorLectura) return errorDeLaBase(errorLectura, errores);

  if (actual) {
    if (Object.keys(errores).length) return { errores };
    const { error } = await supabase
      .from("perfiles")
      .update({ ...datos, oculto })
      .eq("id", actual.id);
    if (error) return errorDeLaBase(error, errores);

    const errorFoto = foto ? await guardarFoto(supabase, user.id, actual, foto) : null;
    revalidar(actual.slug);
    return { errores: {}, guardado: true, ...(errorFoto && { errorFoto }) };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const errorSlug = validarSlug(slug);
  if (errorSlug) errores.slug = errorSlug;
  if (formData.get("consentimiento") !== "on") {
    errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
  }
  if (Object.keys(errores).length) return { errores };

  const { data: creado, error } = await supabase
    .from("perfiles")
    .insert({
      ...datos,
      slug,
      oculto,
      usuario_id: user.id,
      // El trigger lo pisa con now(); acá solo marca que se aceptó.
      consentimiento_at: new Date().toISOString(),
    })
    .select("id, avatar_url")
    .single();
  if (error?.code === "23505" && error.message.includes("usuario_id")) {
    // Esta cuenta ya tiene perfil (doble envío o reintento): a editarlo.
    revalidatePath("/cuenta");
    return { ir: "/cuenta" };
  }
  if (error?.code === "23505" && error.message.includes("slug")) {
    return { errores: { slug: "Esa dirección ya está tomada, probá otra." } };
  }
  if (error) return errorDeLaBase(error, errores);

  // La foto va después de crear: si falla, se llega igual a la confirmación y se
  // vuelve a subir desde la edición.
  const errorFoto = foto ? await guardarFoto(supabase, user.id, creado, foto) : null;
  revalidar(slug);
  return { ir: `/cuenta?creado=1${errorFoto ? "&foto=error" : ""}` };
}
