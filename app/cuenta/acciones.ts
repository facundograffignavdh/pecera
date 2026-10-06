"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { destinoSeguro } from "@/lib/cuenta";
import { PALABRA_CONFIRMAR, confirmaBorrado } from "@/lib/borrar-cuenta";
import { faltaMigracion } from "@/lib/datos";
import { guardarFoto } from "@/lib/foto";
import { urlMedia } from "@/lib/media";
import { revalidarPerfil } from "@/lib/perfil-servidor";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { COOKIE_TRASPASO, leerTraspaso } from "@/lib/traspaso";
import { COOKIE_VINCULO, dispositivoValido, vincularSinFallar } from "@/lib/vinculo";

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
 * (campo del form, solo rutas internas) o a /cuenta. El uuid del dispositivo (campo
 * `dispositivo`, ver AvisoEntrar) viaja en una cookie httpOnly hasta el callback,
 * que lo vincula con la cuenta; si algo de eso falla, el login sigue igual. Desde la pared de
 * pitches puede venir `traspaso` (lo de esa visita y la casilla): viaja igual, en otra cookie.
 */
export async function entrar(formData?: FormData): Promise<void> {
  const next = destinoSeguro(String(formData?.get("next") ?? ""));
  const dispositivo = dispositivoValido(formData?.get("dispositivo"));
  if (dispositivo) {
    try {
      (await cookies()).set(COOKIE_VINCULO, dispositivo, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/auth",
        maxAge: 600,
      });
    } catch {
      // Sin cookie no hay vínculo; el login sigue.
    }
  }
  const traspaso = leerTraspaso(formData?.get("traspaso"));
  if (traspaso) {
    try {
      (await cookies()).set(COOKIE_TRASPASO, JSON.stringify(traspaso), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/auth",
        maxAge: 600,
      });
    } catch {
      // Sin cookie no hay traspaso; el login sigue.
    }
  }
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

/**
 * Respaldo del vínculo para sesiones que ya estaban abiertas (RecordarCuenta lo
 * llama una vez desde /cuenta). Nunca tira.
 */
export async function vincularEsteDispositivo(dispositivo: string): Promise<boolean> {
  try {
    return await vincularSinFallar(await supabaseConSesion(), dispositivo);
  } catch {
    return false;
  }
}

export type ResultadoEliminar = { ok: true } | { ok: false; mensaje: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Elimina la cuenta de la sesión con todo lo suyo (`borrar_mi_cuenta`, en una
 * transacción: si falla, no se borra nada) y cierra la sesión. `dispositivo` es el
 * uuid anónimo de este navegador: se van también sus piques, vistas y seguidos.
 * La limpieza del navegador la hace el cliente al recibir `ok`.
 */
export async function eliminarCuenta(confirmacion: string, dispositivo: string | null): Promise<ResultadoEliminar> {
  if (!confirmaBorrado(confirmacion)) {
    return { ok: false, mensaje: `Escribí ${PALABRA_CONFIRMAR} para confirmar.` };
  }
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Tu sesión se cerró. Entrá de nuevo para eliminar tu cuenta." };

  // Si el login no llegó a vincular este navegador, se vincula ahora: así borrar la
  // cuenta se lleva también la actividad anónima de este dispositivo.
  await vincularSinFallar(supabase, dispositivo);
  const { data, error } = await supabase.rpc("borrar_mi_cuenta", {
    p_dispositivo: dispositivo && UUID.test(dispositivo) ? dispositivo : null,
  });
  if (error) {
    console.error(`Supabase (borrar_mi_cuenta): ${error.code} ${error.message}`);
    return {
      ok: false,
      mensaje: faltaMigracion(error)
        ? "Todavía no se puede eliminar la cuenta desde acá. Escribinos y la borramos nosotros."
        : "No pudimos eliminar tu cuenta y no se borró nada. Probá de nuevo en un rato.",
    };
  }

  // La cuenta ya no existe: solo quedan las cookies, que se van acá.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

  const borrado = (data ?? {}) as {
    perfil?: string | null;
    empresa?: string | null;
    /** multi_empresa: cada una de sus empresas. */
    empresas?: Array<{ slug: string; borrada: boolean }>;
  };
  revalidatePath("/");
  revalidatePath("/explorar");
  if (borrado.perfil) revalidatePath(`/p/${borrado.perfil}`);
  const slugs = new Set([...(borrado.empresas ?? []).map((e) => e.slug), ...(borrado.empresa ? [borrado.empresa] : [])]);
  for (const slug of slugs) revalidatePath(`/e/${slug}`, "layout");
  return { ok: true };
}

const revalidar = revalidarPerfil;

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
