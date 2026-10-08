"use server";

import { revalidatePath } from "next/cache";
import {
  CONSENTIMIENTO_ALTA,
  type CampoAlta,
  type EmpresaParecida,
  type EntradaAlta,
  type Parecido,
  campoDeError,
  validarAlta,
} from "@/lib/alta-rapida";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Alta rápida del equipo en el stand. La base decide quién es admin (cada `admin_*` llama a
 * `exigir_admin()`); acá no hay listas ni service key. Los logs, solo con código y mensaje.
 */

export type ResultadoAlta =
  | { ok: true; id: string; slug: string; empresaSlug: string | null }
  | { ok: false; mensaje?: string; campo?: CampoAlta; parecidos?: Parecido[] };

async function sesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/**
 * Crea el perfil. Sin `forzar`, antes busca parecidos: si hay, no crea y los devuelve para que
 * el equipo confirme que es otra persona ("Crear igual").
 */
export async function crearAlta(entrada: EntradaAlta, forzar: boolean): Promise<ResultadoAlta> {
  const errores = validarAlta(entrada);
  const primero = Object.keys(errores)[0] as CampoAlta | undefined;
  if (primero) return { ok: false, campo: primero, mensaje: errores[primero] };

  const supabase = await sesion();
  if (!supabase) return { ok: false, mensaje: SIN_SESION };

  if (!forzar) {
    const { data, error } = await supabase.rpc("admin_parecidos", {
      p_nombre: entrada.nombre.trim(),
      p_empresa: entrada.sumarA ? null : entrada.empresa.trim() || null,
    });
    if (error) return { ok: false, mensaje: traducir(error, "admin_parecidos").mensaje };
    if (data?.length) return { ok: false, parecidos: data as Parecido[] };
  }

  const empresa = entrada.sumarA ? null : entrada.empresa.trim() || null;
  const { data, error } = await supabase.rpc("admin_alta_rapida", {
    p_nombre: entrada.nombre.trim(),
    p_descripcion: entrada.descripcion.trim(),
    p_empresa_nombre: empresa,
    p_empresa_descripcion: empresa ? entrada.empresaDescripcion.trim() || null : null,
    p_empresa_tipo: entrada.empresaTipo,
    p_sumar_a: entrada.sumarA,
    p_email_reclamo: entrada.email.trim() || null,
    p_evento: entrada.feria ? EVENTO_ACTUAL.slug : null,
    p_rol: entrada.rol,
    p_publicado: entrada.publicado,
    p_consentimiento: entrada.consentimiento,
    p_version: CONSENTIMIENTO_ALTA.version,
  });
  if (error) {
    const campo = campoDeError(error.message);
    return { ...traducir(error, "admin_alta_rapida"), ok: false, ...(campo ? { campo } : {}) };
  }

  const r = data as { id: string; slug: string; empresa_slug: string | null };
  // El perfil (y su empresa) se ven en el feed, /p, /e y el evento.
  revalidatePath("/", "layout");
  return { ok: true, id: r.id, slug: r.slug, empresaSlug: r.empresa_slug };
}

/** Parecidos mientras se escribe (al salir del campo). Si falla, lista vacía: no traba el alta. */
export async function buscarParecidos(
  nombre: string,
  empresa: string
): Promise<{ perfiles: Parecido[]; empresas: EmpresaParecida[] }> {
  const vacio = { perfiles: [], empresas: [] };
  const supabase = await sesion();
  if (!supabase) return vacio;
  const [perfiles, empresas] = await Promise.all([
    nombre.trim().length >= 3
      ? supabase.rpc("admin_parecidos", { p_nombre: nombre.trim(), p_empresa: null })
      : null,
    empresa.trim().length >= 2
      ? supabase.rpc("admin_empresas_parecidas", { p_nombre: empresa.trim(), p_evento: EVENTO_ACTUAL.slug })
      : null,
  ]);
  if (perfiles?.error) console.error(`Supabase (admin_parecidos): ${perfiles.error.code} ${perfiles.error.message}`);
  if (empresas?.error) console.error(`Supabase (admin_empresas_parecidas): ${empresas.error.code} ${empresas.error.message}`);
  return {
    perfiles: ((!perfiles?.error && perfiles?.data) || []) as Parecido[],
    empresas: ((!empresas?.error && empresas?.data) || []) as EmpresaParecida[],
  };
}

/** Deshace un alta propia de hace menos de 10 minutos. */
export async function deshacerAlta(perfil: string): Promise<Resultado> {
  const supabase = await sesion();
  if (!supabase) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("admin_deshacer_alta", { p_perfil: perfil });
  if (error) return traducir(error, "admin_deshacer_alta");
  revalidatePath("/", "layout");
  return { ok: true };
}
