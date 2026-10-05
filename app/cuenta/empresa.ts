"use server";

import { revalidatePath } from "next/cache";
import { slugDesdeNombre, validarSlug } from "@/lib/cuenta";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  TIPOS_EMPRESA,
  esValor,
} from "@/lib/etiquetas";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { faltaMigracion } from "@/lib/datos";
import { quitarLogo as quitarLogoEcosistema, subirLogo as subirLogoEcosistema } from "@/app/cuenta/logo";
import { confirmaBorrado } from "@/lib/borrar-cuenta";
import { empresaParaAccion, rpcEn } from "@/lib/cuenta-empresa";
import { guardarLogo } from "@/lib/foto";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { CLAVES_DATO, esUrlSegura } from "@/lib/transparencia";

/**
 * Empresa, transparencia y participación en el evento. Todo pasa por funciones de
 * la base (security definer): la app nunca escribe `empresa_id` ni las tablas
 * nuevas directo. Ninguna tira: toda falla vuelve como mensaje.
 *
 * multi_empresa: cada action recibe la empresa sobre la que trabaja (`empresa_id` en
 * el form o como argumento) y la base verifica que la sesión sea parte.
 */

const NO_ES_TUYA = "Esa empresa no está entre las tuyas. Recargá la página.";

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refrescar(slug?: string, conPerfiles = false) {
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/empresa");
  revalidatePath("/");
  revalidatePath("/explorar");
  if (slug) revalidatePath(`/e/${slug}`);
  // Entrar, salir o cambiar la principal cambia la lista de empresas del perfil.
  if (conPerfiles) revalidatePath("/p/[slug]", "page");
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

/**
 * Empresa o proyecto con lo mínimo: nombre, tipo y el cargo propio (persona_empresa).
 * La dirección sale del nombre; si está tomada, prueba con -2, -3… El logo, la
 * descripción y el resto se cargan después en "Administrar".
 */
export async function crearEmpresaBasica(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const nombre = texto(formData, "nombre");
  const tipo = texto(formData, "tipo");
  const cargo = texto(formData, "cargo");
  if (!nombre || nombre.length > 80) return { ok: false, mensaje: "Poné el nombre (hasta 80 caracteres)." };
  const base = slugDesdeNombre(nombre).slice(0, 55).replace(/-+$/, "");
  if (validarSlug(base)) return { ok: false, mensaje: "Usá un nombre con al menos 3 letras o números." };

  for (let intento = 1; intento <= 5; intento++) {
    const slug = intento === 1 ? base : `${base}-${intento}`;
    const { data, error } = await supabase.rpc("crear_empresa_basica", {
      p_nombre: nombre,
      p_slug: slug,
      p_tipo: esValor(TIPOS_EMPRESA, tipo) ? tipo : null,
      p_cargo: esValor(CARGOS, cargo) ? cargo : null,
    });
    if (error?.code === "23505" && error.message.includes("slug")) continue;
    if (faltaMigracion(error)) {
      return { ok: false, mensaje: "Estamos actualizando Pecera: en un rato vas a poder crear la empresa desde acá." };
    }
    if (error) return traducir(error, "crear_empresa_basica");
    refrescar(String(data), true);
    return { ok: true, slug: String(data), mensaje: "¡Listo! Completá el logo y los datos en Administrar." };
  }
  return { ok: false, mensaje: "Ya hay empresas con ese nombre. Probá con uno un poco distinto." };
}

export async function unirseEmpresa(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const codigo = texto(formData, "codigo").toUpperCase().replace(/[^0-9A-F]/g, "");
  const cargo = texto(formData, "cargo");
  if (codigo.length !== 8) return { ok: false, mensaje: "El código tiene 8 letras y números." };

  const args = { p_codigo: codigo, p_cargo: esValor(CARGOS, cargo) ? cargo : null };
  let { data, error } = await supabase.rpc("unirse_empresa_v2", args);
  if (faltaMigracion(error)) ({ data, error } = await supabase.rpc("unirse_empresa", args));
  if (error) return traducir(error, "unirse_empresa");
  if (!data) return { ok: false, mensaje: "Ese código no existe. Revisalo con tu equipo." };

  refrescar(String(data), true);
  return { ok: true, slug: String(data), mensaje: "¡Listo, ya sos parte de la empresa!" };
}

export async function editarEmpresa(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const d = datosEmpresa(formData);
  const invalido = validarEmpresa(d);
  if (invalido) return { ok: false, mensaje: invalido };
  const empresa = await empresaParaAccion(supabase, formData.get("empresa_id"));
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };

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
  // multi_empresa: esa empresa. Sin ella, con feria_pro también la ubicación; si no,
  // la función de siempre.
  let { error } = await rpcEn(supabase, "editar_empresa_en", "editar_empresa_v2", empresa.id, {
    ...base,
    p_ubicacion: d.ubicacion || null,
  });
  if (faltaMigracion(error)) ({ error } = await supabase.rpc("editar_empresa", base));
  if (error) return traducir(error, "editar_empresa");

  refrescar(empresa.slug);
  return { ok: true, mensaje: "Listo, guardado." };
}

/**
 * "Guardar cambios" de una pestaña de Administrar (Información o Contacto). El form
 * trae todos los campos (los de la otra pestaña, como estaban guardados), porque la
 * base edita la empresa entera. Con persona_empresa, el tipo y la descripción
 * opcional; sin ella, la función de antes (que pide descripción). Si cambió el
 * cargo propio, también lo guarda.
 */
export async function guardarEmpresaPestana(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, formData.get("empresa_id"));
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };

  if (formData.get("es_dueno") === "1") {
    const d = datosEmpresa(formData);
    const tipo = texto(formData, "tipo");
    const invalido = validarEmpresa({ ...d, descripcion: d.descripcion || "-" });
    if (invalido) return { ok: false, mensaje: invalido };
    let { error } = await supabase.rpc("editar_empresa_v3_en", {
      p_empresa: empresa.id,
      p_nombre: d.nombre,
      p_tipo: esValor(TIPOS_EMPRESA, tipo) ? tipo : null,
      p_descripcion: d.descripcion || null,
      p_web: d.web || null,
      p_linkedin: d.linkedin || null,
      p_instagram: d.instagram || null,
      p_industrias: d.industrias,
      p_etapa: d.etapa || null,
      p_ronda: d.ronda || null,
      p_ubicacion: d.ubicacion || null,
    });
    if (faltaMigracion(error)) {
      if (!d.descripcion) return { ok: false, mensaje: "Contá en pocas líneas qué hace la empresa." };
      const r = await editarEmpresa(_previo, formData);
      if (!r.ok) return r;
      error = null;
    }
    if (error) return traducir(error, "editar_empresa");
  }

  const cargoNuevo = texto(formData, "cargo");
  if (formData.has("cargo") && cargoNuevo !== texto(formData, "cargo_actual")) {
    const r = await cambiarCargo(empresa.id, cargoNuevo);
    if (!r.ok) return r;
  }

  refrescar(empresa.slug, true);
  return { ok: true, mensaje: "Cambios guardados." };
}

/**
 * Sale de la empresa. Si es la última integrante, la empresa se borra con todo, y
 * solo si `confirmacion` es la palabra de la pantalla de salida (ELIMINAR); si no,
 * la base corta y no se borra nada.
 */
export async function salirEmpresa(empresaId: string, confirmacion = ""): Promise<Resultado & { borrada?: boolean }> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };

  let { data, error } = await supabase.rpc("salir_de_empresa", {
    p_empresa: empresa.id,
    p_borrar: confirmaBorrado(confirmacion),
  });
  if (faltaMigracion(error)) ({ data, error } = await supabase.rpc("salir_empresa"));
  if (error) return traducir(error, "salir_empresa");

  const borrada = !!(data as { borrada?: boolean } | null)?.borrada;
  refrescar(empresa.slug, true);
  if (borrada) {
    revalidatePath(`/e/${empresa.slug}/dataroom`);
    revalidatePath(`/e/${empresa.slug}/one-pager`);
  }
  return { ok: true, borrada };
}

export async function renovarCodigo(empresaId: string): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };
  const { data, error } = await rpcEn(supabase, "renovar_codigo_en", "renovar_codigo_empresa", empresa.id, {});
  if (error) return traducir(error, "renovar_codigo_empresa");
  refrescar();
  return { ok: true, codigo: String(data), mensaje: "Código nuevo. El anterior ya no sirve." };
}

/** La empresa que va primero en el perfil y el reel. */
export async function elegirPrincipal(empresaId: string): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };
  const { error } = await supabase.rpc("elegir_empresa_principal", { p_empresa: empresa.id });
  if (error) return traducir(error, "elegir_empresa_principal");
  refrescar(empresa.slug, true);
  return { ok: true, mensaje: `${empresa.nombre} es tu empresa principal.` };
}

/** Su cargo en una empresa (vacío = sin cargo). */
export async function cambiarCargo(empresaId: string, valor: string): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };
  const { error } = await supabase.rpc("cambiar_cargo_en", {
    p_empresa: empresa.id,
    p_cargo: esValor(CARGOS, valor) ? valor : null,
  });
  if (error) return traducir(error, "cambiar_cargo_en");
  refrescar(empresa.slug, true);
  return { ok: true, mensaje: "Cargo guardado." };
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

  const empresa = await empresaParaAccion(supabase, formData.get("empresa_id"));
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };
  const { error } = await rpcEn(supabase, "guardar_dato_en", "guardar_dato_empresa", empresa.id, {
    p_clave: clave,
    p_valor: valor || null,
    p_url: url || null,
    p_visible: formData.get("visible") === "on",
  });
  if (error) return traducir(error, "guardar_dato_empresa");

  refrescar(empresa.slug);
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

  const empresa = await empresaParaAccion(supabase, formData.get("empresa_id"));
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };

  // Un solo logo: el de empresa_logos (migración logos) es el que se lee primero. Si esa
  // tabla todavía no existe, se usa la columna empresas.logo_url (feria_pro).
  const tabla = await supabase.from("empresa_logos").select("clave").eq("empresa_id", empresa.id).maybeSingle();
  const conTablaLogos = !faltaMigracion(tabla.error);

  if (formData.get("quitar") === "1") {
    // Se borra de los dos lados: si no, reaparecería el de la columna vieja.
    if (conTablaLogos) {
      const r = await quitarLogoEcosistema(empresa.id);
      if (!r.ok) return r;
    }
    // Con multi_empresa, poner_logo_en ya vació la columna vieja (feria_pro); sin ella,
    // se vacía acá (la función de siempre trabaja sobre la única empresa).
    if (!empresa.multi) {
      const { error: e } = await supabase.rpc("cambiar_logo_empresa", { p_logo: null });
      if (e && !faltaMigracion(e)) return traducir(e, "cambiar_logo_empresa");
    }
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
  // Solo sin la migración logos (base vieja): la columna de feria_pro, sobre la única empresa.
  const fallo = await guardarLogo(supabase, { id: empresa.id, logo_url: null }, logo);
  if (fallo) return { ok: false, mensaje: fallo };

  const { data: nueva } = await supabase.rpc("mi_empresa_v2");
  const clave = ((nueva ?? []) as Array<{ logo_url: string | null }>)[0]?.logo_url ?? null;
  refrescar(empresa.slug);
  return { ok: true, url: clave && urlMedia(clave), mensaje: "Logo actualizado." };
}
