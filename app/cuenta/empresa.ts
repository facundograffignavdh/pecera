"use server";

import { revalidatePath } from "next/cache";
import { validarSlug } from "@/lib/cuenta";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  esValor,
} from "@/lib/etiquetas";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { faltaMigracion } from "@/lib/datos";
import { quitarLogo as quitarLogoEcosistema, subirLogo as subirLogoEcosistema } from "@/app/cuenta/logo";
import { guardarLogo } from "@/lib/foto";
import { FALLA_IMAGEN } from "@/lib/limites-imagen";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { CLAVES_DATO, esUrlSegura } from "@/lib/transparencia";

/**
 * Empresa, transparencia y participación en el evento. Todo pasa por funciones de
 * la base (security definer): la app nunca escribe `empresa_id` ni las tablas
 * nuevas directo. Ninguna tira: toda falla vuelve como mensaje.
 */

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refrescar(slug?: string) {
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/empresa");
  revalidatePath("/");
  revalidatePath("/explorar");
  if (slug) revalidatePath(`/e/${slug}`);
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function datosEmpresa(formData: FormData) {
  const industrias = [...new Set(formData.getAll("industrias").map(String))].filter((v) =>
    esValor(INDUSTRIAS, v)
  );
  const etapa = texto(formData, "etapa");
  const ronda = texto(formData, "ronda");
  return {
    nombre: texto(formData, "nombre"),
    descripcion: texto(formData, "descripcion"),
    web: texto(formData, "web"),
    linkedin: texto(formData, "linkedin"),
    instagram: texto(formData, "instagram"),
    industrias,
    etapa: esValor(ETAPAS, etapa) ? etapa : "",
    ronda: esValor(RONDAS, ronda) ? ronda : "",
    ubicacion: texto(formData, "ubicacion"),
  };
}

function validarEmpresa(d: ReturnType<typeof datosEmpresa>): string | null {
  if (!d.nombre || d.nombre.length > 80) return "Poné el nombre de la empresa (hasta 80 caracteres).";
  if (!d.descripcion || d.descripcion.length > 280) {
    return "Contá en pocas líneas qué hace la empresa (hasta 280 caracteres).";
  }
  if (d.industrias.length > MAX_INDUSTRIAS_PROYECTO) {
    return `Elegí hasta ${MAX_INDUSTRIAS_PROYECTO} industrias.`;
  }
  if (d.linkedin && !/linkedin\.com/i.test(d.linkedin)) return "El LinkedIn tiene que ser de linkedin.com.";
  if (d.ubicacion.length > 80) return "La ubicación va hasta 80 caracteres.";
  return null;
}

export async function crearEmpresa(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const d = datosEmpresa(formData);
  const slug = texto(formData, "slug").toLowerCase();
  const cargo = texto(formData, "cargo");
  const invalido = validarEmpresa(d) ?? validarSlug(slug);
  if (invalido) return { ok: false, mensaje: invalido };

  const { data, error } = await supabase.rpc("crear_empresa", {
    p_nombre: d.nombre,
    p_slug: slug,
    p_descripcion: d.descripcion,
    p_web: d.web || null,
    p_industrias: d.industrias,
    p_etapa: d.etapa || null,
    p_ronda: d.ronda || null,
    p_cargo: esValor(CARGOS, cargo) ? cargo : null,
  });
  if (error) return traducir(error, "crear_empresa");

  refrescar(String(data));
  return { ok: true, slug: String(data), mensaje: "¡Empresa creada! Invitá a tu equipo con el código." };
}

export async function unirseEmpresa(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const codigo = texto(formData, "codigo").toUpperCase().replace(/[^0-9A-F]/g, "");
  const cargo = texto(formData, "cargo");
  if (codigo.length !== 8) return { ok: false, mensaje: "El código tiene 8 letras y números." };

  const { data, error } = await supabase.rpc("unirse_empresa", {
    p_codigo: codigo,
    p_cargo: esValor(CARGOS, cargo) ? cargo : null,
  });
  if (error) return traducir(error, "unirse_empresa");
  if (!data) return { ok: false, mensaje: "Ese código no existe. Revisalo con tu equipo." };

  refrescar(String(data));
  return { ok: true, slug: String(data), mensaje: "¡Listo, ya sos parte de la empresa!" };
}

export async function editarEmpresa(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const d = datosEmpresa(formData);
  const invalido = validarEmpresa(d);
  if (invalido) return { ok: false, mensaje: invalido };

  const base = {
    p_nombre: d.nombre,
    p_descripcion: d.descripcion,
    p_web: d.web || null,
    p_linkedin: d.linkedin || null,
    p_instagram: d.instagram || null,
    p_industrias: d.industrias,
    p_etapa: d.etapa || null,
    p_ronda: d.ronda || null,
  };
  // Con feria_pro, también la ubicación; sin ella, la función de siempre.
  let { error } = await supabase.rpc("editar_empresa_v2", { ...base, p_ubicacion: d.ubicacion || null });
  if (faltaMigracion(error)) ({ error } = await supabase.rpc("editar_empresa", base));
  if (error) return traducir(error, "editar_empresa");

  refrescar(texto(formData, "slug_actual") || undefined);
  return { ok: true, mensaje: "Listo, guardado." };
}

export async function salirEmpresa(): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("salir_empresa");
  if (error) return traducir(error, "salir_empresa");
  refrescar();
  return { ok: true };
}

export async function renovarCodigo(): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { data, error } = await supabase.rpc("renovar_codigo_empresa");
  if (error) return traducir(error, "renovar_codigo_empresa");
  refrescar();
  return { ok: true, codigo: String(data), mensaje: "Código nuevo. El anterior ya no sirve." };
}

/** Guarda un dato de transparencia (vacío = borrarlo). */
export async function guardarDato(formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const clave = texto(formData, "clave");
  if (!CLAVES_DATO.has(clave)) return { ok: false, mensaje: "Dato desconocido." };
  const valor = texto(formData, "valor");
  const url = texto(formData, "url");
  if (valor.length > 280) return { ok: false, mensaje: "Hasta 280 caracteres." };
  if (url && !esUrlSegura(url)) {
    return { ok: false, mensaje: "El link tiene que empezar con https://" };
  }

  const { error } = await supabase.rpc("guardar_dato_empresa", {
    p_clave: clave,
    p_valor: valor || null,
    p_url: url || null,
    p_visible: formData.get("visible") === "on",
  });
  if (error) return traducir(error, "guardar_dato_empresa");

  refrescar(texto(formData, "slug_empresa") || undefined);
  return { ok: true, mensaje: valor || url ? "Guardado." : "Borrado." };
}

/** Anota (o saca) el perfil de la sesión del evento actual. */
export async function participar(participa: boolean): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("participar_evento", {
    p_evento: EVENTO_ACTUAL.slug,
    p_participa: participa,
  });
  if (error) return traducir(error, "participar_evento");
  revalidatePath("/cuenta");
  revalidatePath(`/eventos/${EVENTO_ACTUAL.slug}`);
  return { ok: true };
}

/** Sube (o saca) el logo de la empresa apenas se elige. Cualquier miembro puede. */
export async function subirLogo(formData: FormData): Promise<Resultado & { url?: string | null }> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { data, error } = await supabase.rpc("mi_empresa_v2");
  if (error) {
    console.error(`Supabase (mi_empresa_v2): ${error.code} ${error.message}`);
    return { ok: false, mensaje: FALLA_IMAGEN.nuestra };
  }
  const empresa = ((data ?? []) as Array<{ id: string; slug: string; logo_url: string | null }>)[0];
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };

  // Un solo logo: el de empresa_logos (migración logos) es el que se lee primero. Si esa
  // tabla todavía no existe, se usa la columna empresas.logo_url (feria_pro).
  const tabla = await supabase.from("empresa_logos").select("clave").eq("empresa_id", empresa.id).maybeSingle();
  const conTablaLogos = !faltaMigracion(tabla.error);

  if (formData.get("quitar") === "1") {
    // Se borra de los dos lados: si no, reaparecería el de la columna vieja.
    if (conTablaLogos) {
      const r = await quitarLogoEcosistema();
      if (!r.ok) return r;
    }
    const { error: e } = await supabase.rpc("cambiar_logo_empresa", { p_logo: null });
    if (e && !faltaMigracion(e)) return traducir(e, "cambiar_logo_empresa");
    refrescar(empresa.slug);
    return { ok: true, url: null, mensaje: "Sacaste el logo." };
  }

  if (conTablaLogos) {
    const r = await subirLogoEcosistema(formData);
    if (!r.ok) return r;
    const { data: nuevo } = await supabase.from("empresa_logos").select("clave").eq("empresa_id", empresa.id).maybeSingle();
    refrescar(empresa.slug);
    return { ok: true, url: nuevo?.clave ? urlMedia(nuevo.clave as string) : null, mensaje: "Logo actualizado." };
  }

  const logo = formData.get("logo");
  if (!(logo instanceof Blob) || logo.size === 0) return { ok: false, mensaje: "Elegí una imagen." };
  const fallo = await guardarLogo(supabase, empresa, logo);
  if (fallo) return { ok: false, mensaje: fallo };

  const { data: nueva } = await supabase.rpc("mi_empresa_v2");
  const clave = ((nueva ?? []) as Array<{ logo_url: string | null }>)[0]?.logo_url ?? null;
  refrescar(empresa.slug);
  return { ok: true, url: clave && urlMedia(clave), mensaje: "Logo actualizado." };
}
