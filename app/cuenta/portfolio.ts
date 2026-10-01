"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { ESPECIALIDADES, INDUSTRIAS, esValor } from "@/lib/etiquetas";
import {
  COLUMNAS_PORTFOLIO,
  type EntradaPortfolio,
  GEOGRAFIAS,
  LIMITES_PORTFOLIO as L,
  MODALIDADES,
  MODELOS,
  RONDAS_PORTFOLIO,
  esEstado,
  esTipo,
  esVisibilidad,
} from "@/lib/portfolio";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { esUrlSegura } from "@/lib/transparencia";

/**
 * Portfolio, servicios y tesis desde /cuenta, y la respuesta de una empresa a una
 * relación que la nombra. Todo por funciones de la base. Ninguna tira.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEB = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** El perfil propio, el directorio y, si se nombra una, la página de esa empresa. */
async function refrescar(supabase: Supa, userId: string, empresaId?: string | null) {
  revalidatePath("/cuenta");
  revalidatePath("/explorar");
  const { data } = await supabase.from("perfiles").select("slug").eq("usuario_id", userId).maybeSingle();
  if (data?.slug) revalidatePath(`/p/${data.slug}`);
  if (empresaId) {
    const { data: e } = await supabase.from("empresas").select("slug").eq("id", empresaId).maybeSingle();
    if (e?.slug) revalidatePath(`/e/${e.slug}`);
  }
}

const recortar = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type DatosEntrada = {
  id: string | null;
  tipo: string;
  empresa_id: string | null;
  nombre: string;
  web: string;
  industria: string;
  ubicacion: string;
  estado: string;
  ronda: string;
  lider: boolean | null;
  anio: string;
  rol: string;
  descripcion: string;
  desafio: string;
  solucion: string;
  resultados: string[];
  enlace: string;
  visibilidad: string;
};

/** Valida una entrada (mismas reglas que la base). Devuelve el error para la persona o null. */
function validar(d: DatosEntrada): string | null {
  if (!esTipo(d.tipo)) return "Elegí qué tipo de relación es.";
  if (!d.empresa_id && !recortar(d.nombre)) return "Poné el nombre de la empresa u organización.";
  if (recortar(d.nombre).length > L.nombre) return `El nombre va hasta ${L.nombre} caracteres.`;
  if (d.web && (d.web.length > L.web || !WEB.test(d.web.replace(/^https?:\/\//i, "")))) return "Revisá la web (ej.: empresa.com).";
  if (d.industria && !esValor(INDUSTRIAS, d.industria)) return "Elegí una industria de la lista.";
  if (recortar(d.ubicacion).length > L.ubicacion) return `La ubicación va hasta ${L.ubicacion} caracteres.`;
  if (!esEstado(d.estado)) return "Elegí si es actual o pasado.";
  if (d.tipo !== "inversion" && (d.ronda || d.lider !== null)) return "La ronda solo va en una inversión.";
  if (d.ronda && !RONDAS_PORTFOLIO.some((r) => r.valor === d.ronda)) return "Elegí una ronda de la lista.";
  if (d.anio && !/^(19[89]\d|20\d\d|2100)$/.test(d.anio)) return "Revisá el año (ej.: 2024).";
  if (recortar(d.rol).length > L.rol) return `El rol va hasta ${L.rol} caracteres.`;
  if (recortar(d.descripcion).length > L.descripcion) return `La descripción va hasta ${L.descripcion} caracteres.`;
  if (recortar(d.desafio).length > L.desafio) return `El desafío va hasta ${L.desafio} caracteres.`;
  if (recortar(d.solucion).length > L.solucion) return `La solución va hasta ${L.solucion} caracteres.`;
  const resultados = d.resultados.map(recortar).filter(Boolean);
  if (resultados.length > L.resultados) return `Hasta ${L.resultados} resultados.`;
  if (resultados.some((r) => r.length > L.resultado)) return `Cada resultado va hasta ${L.resultado} caracteres.`;
  if (d.enlace && !esUrlSegura(d.enlace)) return "El link tiene que empezar con https://";
  if (!esVisibilidad(d.visibilidad)) return "Elegí quién la ve.";
  if (d.id && !UUID.test(d.id)) return "Esa entrada no existe.";
  if (d.empresa_id && !UUID.test(d.empresa_id)) return "Esa empresa no existe.";
  return null;
}

export async function guardarEntrada(d: DatosEntrada): Promise<Resultado & { id?: string }> {
  const invalido = validar(d);
  if (invalido) return { ok: false, mensaje: invalido };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { data, error } = await supabase.rpc("guardar_portfolio", {
    p_id: d.id,
    p_tipo: d.tipo,
    p_empresa: d.empresa_id,
    p_nombre: recortar(d.nombre) || "—",
    p_web: d.web || null,
    p_industria: d.industria || null,
    p_ubicacion: recortar(d.ubicacion) || null,
    p_estado: d.estado,
    p_ronda: d.tipo === "inversion" ? d.ronda || null : null,
    p_lider: d.tipo === "inversion" ? d.lider : null,
    p_anio: d.anio ? Number(d.anio) : null,
    p_rol: recortar(d.rol) || null,
    p_descripcion: recortar(d.descripcion) || null,
    p_desafio: recortar(d.desafio) || null,
    p_solucion: recortar(d.solucion) || null,
    p_resultados: d.resultados.map(recortar).filter(Boolean),
    p_enlace: recortar(d.enlace) || null,
    p_visibilidad: d.visibilidad,
  });
  if (error) return traducir(error, "guardar_portfolio");
  await refrescar(supabase, user.id, d.empresa_id);
  return {
    ok: true,
    id: String(data),
    mensaje:
      d.empresa_id && d.visibilidad !== "privado"
        ? "Guardado. La empresa lo va a ver en Pecera para confirmarlo."
        : "Guardado en tu portfolio.",
  };
}

export async function borrarEntrada(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Esa entrada no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { data: previa } = await supabase.from("portfolio").select("empresa_id").eq("id", id).maybeSingle();
  const { error } = await supabase.rpc("borrar_portfolio", { p_id: id });
  if (error) return traducir(error, "borrar_portfolio");
  await refrescar(supabase, user.id, previa?.empresa_id as string | null | undefined);
  return { ok: true, mensaje: "Borrada." };
}

/** La empresa confirma (o no) una relación que la nombra. */
export async function responderRelacion(id: string, confirmar: boolean): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Esa relación no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { data: fila } = await supabase.from("portfolio").select("perfil_id, empresa_id").eq("id", id).maybeSingle();
  const { error } = await supabase.rpc("responder_relacion", { p_id: id, p_confirmar: confirmar });
  if (error) return traducir(error, "responder_relacion");
  revalidatePath("/cuenta");
  revalidatePath("/explorar");
  revalidatePath("/p/[slug]", "page");
  if (fila?.empresa_id) await refrescar(supabase, user.id, fila.empresa_id as string);
  return { ok: true, mensaje: confirmar ? "Confirmada: ahora se ve como confirmada por tu empresa." : "Listo, no la confirmaste." };
}

export type DatosServicio = {
  id: string | null;
  nombre: string;
  categoria: string;
  descripcion: string;
  modalidad: string;
  precio: string;
};

export async function guardarServicio(d: DatosServicio): Promise<Resultado> {
  const nombre = recortar(d.nombre);
  if (!nombre) return { ok: false, mensaje: "Poné el nombre del servicio." };
  if (nombre.length > L.servicio) return { ok: false, mensaje: `El nombre va hasta ${L.servicio} caracteres.` };
  if (d.categoria && !esValor(ESPECIALIDADES, d.categoria)) return { ok: false, mensaje: "Elegí una categoría de la lista." };
  if (recortar(d.descripcion).length > L.servicioDescripcion) return { ok: false, mensaje: `La descripción va hasta ${L.servicioDescripcion} caracteres.` };
  if (d.modalidad && !MODALIDADES.some((m) => m.valor === d.modalidad)) return { ok: false, mensaje: "Elegí la modalidad." };
  if (recortar(d.precio).length > L.precio) return { ok: false, mensaje: `El precio va hasta ${L.precio} caracteres.` };
  if (d.id && !UUID.test(d.id)) return { ok: false, mensaje: "Ese servicio no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("guardar_servicio", {
    p_id: d.id,
    p_nombre: nombre,
    p_categoria: d.categoria || null,
    p_descripcion: recortar(d.descripcion) || null,
    p_modalidad: d.modalidad || null,
    p_precio: recortar(d.precio) || null,
  });
  if (error) return traducir(error, "guardar_servicio");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: "Servicio guardado." };
}

export async function borrarServicio(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese servicio no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("borrar_servicio", { p_id: id });
  if (error) return traducir(error, "borrar_servicio");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: "Servicio borrado." };
}

export async function guardarTesis(d: {
  texto: string;
  geografias: string[];
  modelos: string[];
  busca: string;
}): Promise<Resultado> {
  if (recortar(d.texto).length > L.tesis) return { ok: false, mensaje: `La tesis va hasta ${L.tesis} caracteres.` };
  if (recortar(d.busca).length > L.busca) return { ok: false, mensaje: `Hasta ${L.busca} caracteres.` };
  const geografias = [...new Set(d.geografias)].filter((g) => GEOGRAFIAS.some((x) => x.valor === g));
  const modelos = [...new Set(d.modelos)].filter((m) => MODELOS.some((x) => x.valor === m));
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("guardar_tesis", {
    p_texto: recortar(d.texto) || null,
    p_geografias: geografias,
    p_modelos: modelos,
    p_busca: recortar(d.busca) || null,
  });
  if (error) return traducir(error, "guardar_tesis");
  await refrescar(supabase, user.id);
  return { ok: true, mensaje: "Tesis guardada." };
}

/**
 * Entradas "solo cuentas de Pecera" de un perfil, para quien entró con su cuenta.
 * La RLS decide: sin sesión, vacío.
 */
export async function portfolioMiembros(perfilId: string): Promise<EntradaPortfolio[]> {
  if (!UUID.test(perfilId)) return [];
  const { supabase, user } = await conSesion();
  if (!user) return [];
  const { data } = await supabase
    .from("portfolio")
    .select(`${COLUMNAS_PORTFOLIO}, empresa:empresas(slug, nombre)`)
    .eq("perfil_id", perfilId)
    .eq("visibilidad", "miembros")
    .order("created_at", { ascending: false });
  return (data as EntradaPortfolio[] | null) ?? [];
}
