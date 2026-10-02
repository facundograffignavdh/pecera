"use server";

import { revalidatePath } from "next/cache";
import {
  type CategoriaDataroom,
  type Documento,
  LIMITES_DOCUMENTO,
  type TipoDocumento,
  type ValorCampo,
  esCategoriaDataroom,
} from "@/lib/dataroom";
import { empresaParaAccion, leerMisEmpresas, rpcEn } from "@/lib/cuenta-empresa";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import {
  camposDe,
  formatoValor,
  limpiarValores,
  plantilla as buscarPlantilla,
  progresoPlantilla,
} from "@/lib/plantillas";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { esUrlSegura } from "@/lib/transparencia";

/**
 * Dataroom: documentos de la empresa (templates de Academy, textos propios y links).
 * Todo por funciones de la base, que verifican que la sesión sea miembro. Ninguna
 * tira: toda falla vuelve como mensaje.
 *
 * multi_empresa: lo nuevo se guarda en la empresa que manda la pantalla (`empresaId`);
 * lo que ya existe se toca por su id y la empresa sale del documento.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS_DOC =
  "id, empresa_id, plantilla, categoria, tipo, titulo, campos, cuerpo, url, completo, visible, archivado, updated_at";
const NO_ES_TUYA = "Esa empresa no está entre las tuyas. Recargá la página.";

type DatoPropio = { clave: string; valor: string | null; url: string | null; visible: boolean };

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Lo público de la empresa (su página, su Dataroom y el One Pager) se regenera. */
async function refrescarPublico(supabase: Supa, empresaId: string | null | undefined) {
  const { empresas } = await leerMisEmpresas(supabase);
  const slug = (empresas.find((e) => e.id === empresaId) ?? (empresaId ? null : empresas[0]))?.slug;
  if (!slug) return;
  revalidatePath(`/e/${slug}`);
  revalidatePath(`/e/${slug}/dataroom`);
  revalidatePath(`/e/${slug}/one-pager`);
}

async function leerDocumento(supabase: Supa, id: string): Promise<(Documento & { empresa_id: string }) | null> {
  const { data } = await supabase
    .from("empresa_documentos")
    .select(COLUMNAS_DOC)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<(Documento & { empresa_id: string }) | null, { merge: false }>();
  return data;
}

/** Transparencia de esa empresa (con multi_empresa) o de la única. */
async function misDatos(supabase: Supa, empresaId: string): Promise<DatoPropio[]> {
  const { data } = await rpcEn(supabase, "mis_datos_en", "mis_datos_empresa", empresaId, {});
  return (data as DatoPropio[] | null) ?? [];
}

function guardarDatoEn(supabase: Supa, empresaId: string, d: { clave: string; valor: string | null; url: string | null; visible: boolean }) {
  return rpcEn(supabase, "guardar_dato_en", "guardar_dato_empresa", empresaId, {
    p_clave: d.clave,
    p_valor: d.valor,
    p_url: d.url,
    p_visible: d.visible,
  });
}

/**
 * Los campos con `dato` mantienen al día ese dato de Transparencia. Solo se escribe
 * lo que cambió y nunca se borra: si el campo queda vacío, el dato sigue como estaba
 * (pudo cargarse a mano). Un dato nuevo nace con la visibilidad del documento; uno
 * que ya existía conserva la suya.
 */
async function espejarDatos(
  supabase: Supa,
  empresaId: string,
  plantillaId: string,
  valores: Record<string, ValorCampo>,
  visibleDoc: boolean
): Promise<boolean> {
  const p = buscarPlantilla(plantillaId);
  if (!p) return false;
  const conDato = camposDe(p).filter((c) => c.dato);
  if (conDato.length === 0) return false;

  const actuales = new Map((await misDatos(supabase, empresaId)).map((d) => [d.clave, d]));
  let cambio = false;
  for (const c of conDato) {
    const valor = formatoValor(c, valores[c.id], valores).slice(0, 280);
    if (!valor) continue;
    const previo = actuales.get(c.dato!);
    if (previo?.valor === valor) continue;
    const { error } = await guardarDatoEn(supabase, empresaId, {
      clave: c.dato!,
      valor,
      url: previo?.url ?? null,
      visible: previo ? previo.visible : visibleDoc,
    });
    if (error) console.error(`Supabase (espejarDatos ${c.dato}): ${error.code} ${error.message}`);
    else cambio = true;
  }
  return cambio;
}

export type ResultadoGuardado = Resultado & {
  id?: string;
  completo?: boolean;
  proporcion?: number;
  faltan?: string[];
};

/**
 * Guarda las respuestas de un template (autosave y "Guardar"). El servidor limpia
 * lo que llega con la definición del template y recalcula si está completo.
 */
export async function guardarPlantilla(
  empresaId: string,
  plantillaId: string,
  crudos: Record<string, unknown>,
  final = false
): Promise<ResultadoGuardado> {
  const p = buscarPlantilla(plantillaId);
  if (!p) return { ok: false, mensaje: "Ese template no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };

  const valores = limpiarValores(p, crudos);
  const progreso = progresoPlantilla(p, valores);
  const { data, error } = await rpcEn(supabase, "guardar_documento_en", "guardar_documento", empresa.id, {
    p_id: null,
    p_plantilla: p.id,
    p_categoria: p.categoria,
    p_tipo: "plantilla",
    p_titulo: p.nombre,
    p_campos: valores,
    p_cuerpo: null,
    p_url: null,
    p_completo: progreso.completo,
  });
  if (error) return traducir(error, "guardar_documento");

  const id = String(data);
  const doc = await leerDocumento(supabase, id);
  const cambioDatos = await espejarDatos(supabase, empresa.id, p.id, valores, doc?.visible ?? false);
  // El autosave no regenera nada (sería en cada pausa al escribir); "Guardar" sí.
  if (final || cambioDatos || doc?.visible) {
    revalidatePath("/cuenta");
    revalidatePath("/cuenta/dataroom");
    if (cambioDatos || doc?.visible) await refrescarPublico(supabase, empresa.id);
  }
  return {
    ok: true,
    id,
    completo: progreso.completo,
    proporcion: progreso.proporcion,
    faltan: progreso.faltan,
    mensaje: final ? (progreso.completo ? "Listo, quedó completo en tu Dataroom." : "Guardado como borrador en tu Dataroom.") : "Guardado",
  };
}

/** Texto propio o link. `final`: lo pidió la persona (no el autosave). */
export async function guardarDocumento(datos: {
  empresaId: string;
  id: string | null;
  tipo: TipoDocumento;
  categoria: string;
  titulo: string;
  cuerpo?: string;
  url?: string;
  final?: boolean;
}): Promise<ResultadoGuardado> {
  if (datos.tipo === "plantilla") return { ok: false, mensaje: "Los templates se guardan desde su editor." };
  const titulo = datos.titulo.trim();
  const cuerpo = (datos.cuerpo ?? "").trim();
  const url = (datos.url ?? "").trim();
  if (!titulo) return { ok: false, mensaje: "Poné un título." };
  if (titulo.length > LIMITES_DOCUMENTO.titulo) return { ok: false, mensaje: `El título va hasta ${LIMITES_DOCUMENTO.titulo} caracteres.` };
  if (!esCategoriaDataroom(datos.categoria)) return { ok: false, mensaje: "Elegí una categoría." };
  if (cuerpo.length > LIMITES_DOCUMENTO.cuerpo) return { ok: false, mensaje: `Hasta ${LIMITES_DOCUMENTO.cuerpo} caracteres.` };
  if (url && !esUrlSegura(url)) return { ok: false, mensaje: "El link tiene que empezar con https://" };
  if (datos.tipo === "link" && !url) return { ok: false, mensaje: "Pegá el link al documento." };
  if (datos.id && !UUID.test(datos.id)) return { ok: false, mensaje: "Ese documento no existe." };

  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, datos.empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };

  const completo = datos.tipo === "link" ? !!url : cuerpo.length > 0;
  const { data, error } = await rpcEn(supabase, "guardar_documento_en", "guardar_documento", empresa.id, {
    p_id: datos.id,
    p_plantilla: null,
    p_categoria: datos.categoria as CategoriaDataroom,
    p_tipo: datos.tipo,
    p_titulo: titulo,
    p_campos: {},
    p_cuerpo: cuerpo || null,
    p_url: url || null,
    p_completo: completo,
  });
  if (error) return traducir(error, "guardar_documento");
  const id = String(data);
  if (datos.final) {
    revalidatePath("/cuenta");
    revalidatePath("/cuenta/dataroom");
    const doc = await leerDocumento(supabase, id);
    if (doc?.visible) await refrescarPublico(supabase, empresa.id);
  }
  return { ok: true, id, completo, mensaje: datos.final ? "Guardado en tu Dataroom." : "Guardado" };
}

/**
 * Privado ↔ Transparente. En un template, sus números en Transparencia acompañan:
 * un documento privado no deja sus cifras a la vista en la página de la empresa.
 */
export async function cambiarVisibilidad(id: string, visible: boolean): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese documento no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("visibilidad_documento", { p_id: id, p_visible: visible });
  if (error) return traducir(error, "visibilidad_documento");

  // El documento dice de qué empresa es (la base ya verificó que sea de la sesión).
  const doc = await leerDocumento(supabase, id);
  const p = buscarPlantilla(doc?.plantilla);
  if (p && doc) {
    const claves = new Set(camposDe(p).flatMap((c) => (c.dato ? [c.dato] : [])));
    for (const d of await misDatos(supabase, doc.empresa_id)) {
      if (!claves.has(d.clave) || d.visible === visible) continue;
      await guardarDatoEn(supabase, doc.empresa_id, { ...d, visible });
    }
  }

  revalidatePath("/cuenta");
  revalidatePath("/cuenta/dataroom");
  await refrescarPublico(supabase, doc?.empresa_id);
  return {
    ok: true,
    mensaje: visible
      ? "Ahora es transparente: se ve en la página de tu empresa."
      : "Ahora es privado: solo lo ve tu equipo.",
  };
}

/** Visibilidad de un dato de Transparencia desde el Dataroom (mismo valor y link). */
export async function cambiarVisibilidadDato(empresaId: string, clave: string, visible: boolean): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await empresaParaAccion(supabase, empresaId);
  if (!empresa) return { ok: false, mensaje: NO_ES_TUYA };
  const dato = (await misDatos(supabase, empresa.id)).find((d) => d.clave === clave);
  if (!dato) return { ok: false, mensaje: "Ese dato no existe." };
  const { error } = await guardarDatoEn(supabase, empresa.id, { ...dato, visible });
  if (error) return traducir(error, "guardar_dato_empresa");
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/dataroom");
  await refrescarPublico(supabase, empresa.id);
  return {
    ok: true,
    mensaje: visible ? "Ahora es transparente: se ve en la página de tu empresa." : "Ahora es privado: solo lo ve tu equipo.",
  };
}

export async function archivarDocumento(id: string, archivado: boolean): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese documento no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("archivar_documento", { p_id: id, p_archivado: archivado });
  if (error) return traducir(error, "archivar_documento");
  const doc = await leerDocumento(supabase, id);
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/dataroom");
  await refrescarPublico(supabase, doc?.empresa_id);
  return { ok: true, mensaje: archivado ? "Archivado. Lo podés recuperar desde Archivados." : "Recuperado." };
}

export type ProgresoAcademy = {
  sesion: boolean;
  conEmpresa: boolean;
  /** Por id de template: proporción de lo obligatorio y si está completo. */
  plantillas: Record<string, { proporcion: number; completo: boolean }>;
};

/**
 * Para /academy (página estática): cuánto completó la empresa de la sesión. Con
 * varias empresas, la principal (la página no sabe con cuál se está trabajando).
 */
export async function progresoAcademy(): Promise<ProgresoAcademy> {
  const { supabase, user } = await conSesion();
  if (!user) return { sesion: false, conEmpresa: false, plantillas: {} };
  const { data: yo } = await supabase.from("perfiles").select("empresa_id").eq("usuario_id", user.id).maybeSingle();
  if (!yo?.empresa_id) return { sesion: true, conEmpresa: false, plantillas: {} };
  const { data } = await supabase
    .from("empresa_documentos")
    .select("plantilla, campos, completo")
    .eq("empresa_id", yo.empresa_id)
    .eq("tipo", "plantilla")
    .eq("archivado", false);
  const plantillas: ProgresoAcademy["plantillas"] = {};
  for (const fila of (data as Array<{ plantilla: string; campos: Record<string, ValorCampo>; completo: boolean }> | null) ?? []) {
    const p = buscarPlantilla(fila.plantilla);
    if (!p) continue;
    const { proporcion, completo } = progresoPlantilla(p, fila.campos);
    plantillas[p.id] = { proporcion, completo };
  }
  return { sesion: true, conEmpresa: true, plantillas };
}
