"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CAMPOS_LISTA,
  CAMPOS_SIMPLES,
  type CampoPerfil,
  type EntradaPerfil,
  type Errores,
  destinoSeguro,
  sinCofundador,
  soloBase,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import { faltaMigracion } from "@/lib/datos";
import { guardarFoto } from "@/lib/foto";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** Origen de la request: anda igual en localhost, en las vistas previas y en producción. */
async function origen(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${h.get("host")}`;
}

/**
 * "Entrar con Google" (PKCE: el verifier queda en una cookie). Vuelve a `next`
 * (campo del form, solo rutas internas) o a /cuenta.
 */
export async function entrar(formData?: FormData): Promise<void> {
  const next = destinoSeguro(String(formData?.get("next") ?? ""));
  const supabase = await supabaseConSesion();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origen()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
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
  /** Se guardó lo básico: la base todavía no tiene los campos nuevos. */
  aviso?: string;
};

const CAMPOS: CampoPerfil[] = [...CAMPOS_SIMPLES, ...CAMPOS_LISTA, "busca_cofundador"];

const ERROR_GENERAL = "No pudimos guardar. Probá de nuevo en un rato.";
const SIN_FILA = {
  code: "PGRST116",
  message: "el alta no devolvió la fila",
  details: "",
  hint: "",
  name: "PostgrestError",
} as PostgrestError;
const AVISO_SIN_MIGRACION =
  "Guardamos tu perfil. Etapa, industrias y etiquetas se van a poder guardar en un rato: estamos actualizando Pecera.";

/**
 * Error de Supabase → mensaje para la persona. El trigger `perfiles_guardian`
 * levanta 22023 con "dato inválido: <campo>" y los CHECK de feria_lista, 23514
 * con "perfiles_<campo>_valid...": los dos van al campo; el resto, general.
 */
function errorDeLaBase(error: PostgrestError, errores: Errores): EstadoGuardar {
  console.error(`Supabase (guardarPerfil): ${error.code} ${error.message}`);
  if (error.code === "23514") {
    const campo = CAMPOS.find((c) => error.message.includes(`perfiles_${c}_valid`));
    if (campo) return { errores: { [campo]: "Revisá este dato." } };
  }
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

  const entrada: EntradaPerfil = {
    ...Object.fromEntries(CAMPOS_SIMPLES.map((c) => [c, String(formData.get(c) ?? "")])),
    ...Object.fromEntries(CAMPOS_LISTA.map((c) => [c, formData.getAll(c).map(String)])),
    busca_cofundador: formData.get("busca_cofundador") === "on",
  };
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
    const editar = (campos: object) =>
      supabase.from("perfiles").update({ ...campos, oculto }).eq("id", actual.id);

    // En cascada: todo → sin cofounder (falta feria_pro) → lo básico (falta feria_lista).
    let { error } = await editar(datos);
    let aviso: string | undefined;
    if (faltaMigracion(error)) ({ error } = await editar(sinCofundador(datos)));
    if (faltaMigracion(error)) {
      ({ error } = await editar(soloBase(datos)));
      aviso = AVISO_SIN_MIGRACION;
    }
    if (error) return errorDeLaBase(error, errores);

    const errorFoto = foto ? await guardarFoto(supabase, user.id, actual, foto) : null;
    revalidar(actual.slug);
    return { errores: {}, guardado: true, ...(errorFoto && { errorFoto }), ...(aviso && { aviso }) };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const errorSlug = validarSlug(slug);
  if (errorSlug) errores.slug = errorSlug;
  if (formData.get("consentimiento") !== "on") {
    errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
  }
  if (Object.keys(errores).length) return { errores };

  const crear = (campos: object) =>
    supabase
      .from("perfiles")
      .insert({
        ...campos,
        slug,
        oculto,
        usuario_id: user.id,
        // El trigger lo pisa con now(); acá solo marca que se aceptó.
        consentimiento_at: new Date().toISOString(),
      })
      .select("id, avatar_url")
      .single();

  let { data: creado, error } = await crear(datos);
  if (faltaMigracion(error)) ({ data: creado, error } = await crear(sinCofundador(datos)));
  if (faltaMigracion(error)) ({ data: creado, error } = await crear(soloBase(datos)));
  if (error?.code === "23505" && error.message.includes("usuario_id")) {
    // Esta cuenta ya tiene perfil (doble envío o reintento): a editarlo.
    revalidatePath("/cuenta");
    return { ir: "/cuenta" };
  }
  if (error?.code === "23505" && error.message.includes("slug")) {
    return { errores: { slug: "Esa dirección ya está tomada, probá otra." } };
  }
  if (error || !creado) return errorDeLaBase(error ?? SIN_FILA, errores);

  // La foto va después de crear: si falla, se llega igual a la confirmación y se
  // vuelve a subir desde la edición.
  const errorFoto = foto ? await guardarFoto(supabase, user.id, creado, foto) : null;
  revalidar(slug);
  return { ir: `/cuenta?creado=1${errorFoto ? "&foto=error" : ""}` };
}

/**
 * Sube la foto apenas se elige (perfil ya creado): sin esperar a "Guardar", así no
 * se pierde si la persona sale del formulario. Devuelve la URL nueva para mostrarla.
 */
export async function subirFoto(formData: FormData): Promise<{ ok: boolean; mensaje?: string; url?: string }> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Se cerró tu sesión. Volvé a entrar." };

  const foto = formData.get("foto");
  if (!(foto instanceof Blob) || foto.size === 0) return { ok: false, mensaje: "Elegí una foto." };

  const { data: actual, error } = await supabase
    .from("perfiles")
    .select("id, slug, avatar_url")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (error || !actual) return { ok: false, mensaje: "Primero creá tu perfil." };

  const errorFoto = await guardarFoto(supabase, user.id, actual, foto);
  if (errorFoto) return { ok: false, mensaje: errorFoto };

  const { data: nuevo } = await supabase.from("perfiles").select("avatar_url").eq("id", actual.id).single();
  revalidar(actual.slug);
  return { ok: true, url: nuevo?.avatar_url ? urlMedia(nuevo.avatar_url) : undefined };
}

/** Saca la foto del perfil. La vieja la manda a r2_borrar el trigger de la base. */
export async function quitarFoto(): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Se cerró tu sesión. Volvé a entrar." };
  const { data: actual } = await supabase.from("perfiles").select("id, slug").eq("usuario_id", user.id).maybeSingle();
  if (!actual) return { ok: false, mensaje: "Primero creá tu perfil." };
  const { error } = await supabase.from("perfiles").update({ avatar_url: null }).eq("id", actual.id);
  if (error) {
    console.error(`Supabase (quitarFoto): ${error.code} ${error.message}`);
    return { ok: false, mensaje: "No pudimos sacar la foto. Probá de nuevo." };
  }
  revalidar(actual.slug);
  return { ok: true };
}
