"use server";

import { revalidatePath } from "next/cache";
import {
  AVANCE_MAX,
  DETALLE_HITO_MAX,
  type EstadoHito,
  type Hito,
  METAS_RACHA,
  TITULO_HITO_MAX,
  calcularRacha,
  esEstadoHito,
  esEtapaBuild,
} from "@/lib/build";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Build in Public desde /cuenta: hitos y avances de la empresa. Todo por funciones
 * de la base, que verifican que la sesión sea miembro. Ninguna tira.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * El hito en curso sale en el feed, en la empresa y en el perfil de cada miembro:
 * se regeneran todos (los perfiles, en su próxima visita).
 */
async function refrescar(supabase: Supa) {
  revalidatePath("/");
  revalidatePath("/cuenta");
  revalidatePath("/p/[slug]", "page");
  const { data } = await supabase.rpc("mi_empresa");
  const slug = (data as Array<{ slug: string }> | null)?.[0]?.slug;
  if (slug) revalidatePath(`/e/${slug}`);
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

type DatosHito = {
  id: string | null;
  titulo: string;
  detalle: string;
  etapa: string;
  estado: EstadoHito;
  progreso: number | null;
  fecha: string | null;
};

function validarHito(d: DatosHito): string | null {
  if (!d.titulo) return "Poné un título para el hito.";
  if (d.titulo.length > TITULO_HITO_MAX) return `El título va hasta ${TITULO_HITO_MAX} caracteres.`;
  if (d.detalle.length > DETALLE_HITO_MAX) return `El detalle va hasta ${DETALLE_HITO_MAX} caracteres.`;
  if (d.etapa && !esEtapaBuild(d.etapa)) return "Elegí una etapa de la lista.";
  if (d.progreso !== null && (!Number.isInteger(d.progreso) || d.progreso < 0 || d.progreso > 100)) {
    return "El progreso va de 0 a 100.";
  }
  if (d.fecha && !DIA.test(d.fecha)) return "Revisá la fecha.";
  return null;
}

async function llamarGuardar(supabase: Supa, d: DatosHito): Promise<Resultado> {
  const invalido = validarHito(d);
  if (invalido) return { ok: false, mensaje: invalido };
  const { error } = await supabase.rpc("guardar_hito", {
    p_id: d.id,
    p_titulo: d.titulo,
    p_detalle: d.detalle || null,
    p_etapa: d.etapa || null,
    p_estado: d.estado,
    p_progreso: d.estado === "en_curso" ? (d.progreso ?? 0) : null,
    p_fecha: d.fecha,
  });
  if (error) return traducir(error, "guardar_hito");
  await refrescar(supabase);
  return { ok: true, mensaje: "Hito guardado." };
}

/** Crea o edita un hito desde el formulario. */
export async function guardarHito(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const id = texto(formData, "id");
  const estado = texto(formData, "estado");
  if (!esEstadoHito(estado)) return { ok: false, mensaje: "Elegí si está logrado, en curso o es el próximo." };
  const progresoCrudo = texto(formData, "progreso");
  return llamarGuardar(supabase, {
    id: UUID.test(id) ? id : null,
    titulo: texto(formData, "titulo"),
    detalle: texto(formData, "detalle"),
    etapa: texto(formData, "etapa"),
    estado,
    progreso: progresoCrudo === "" ? null : Number(progresoCrudo),
    fecha: texto(formData, "fecha") || null,
  });
}

/**
 * Atajos de un toque sobre un hito existente: "Lo logramos" (con la fecha de hoy),
 * "Empezar" (pasa a en curso desde 0) y "Pausar" (vuelve a próximo).
 */
export async function moverHito(id: string, estado: EstadoHito): Promise<Resultado> {
  if (!UUID.test(id) || !esEstadoHito(estado)) return { ok: false, mensaje: "Ese hito no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { data: hito, error } = await supabase
    .from("empresa_hitos")
    .select("id, titulo, detalle, etapa, estado, progreso, fecha, created_at")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Hito | null, { merge: false }>();
  if (error) return traducir(error, "moverHito");
  if (!hito) return { ok: false, mensaje: "Ese hito no existe." };

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const r = await llamarGuardar(supabase, {
    id,
    titulo: hito.titulo,
    detalle: hito.detalle ?? "",
    etapa: hito.etapa ?? "",
    estado,
    progreso: estado === "en_curso" ? (hito.estado === "en_curso" ? hito.progreso : 0) : null,
    fecha: estado === "logrado" ? hoy : estado === "proximo" ? hito.fecha : null,
  });
  if (!r.ok) return r;
  const mensajes: Record<EstadoHito, string> = {
    logrado: "¡Hito logrado! Ya figura en tu historial.",
    en_curso: "Es tu hito actual. Actualizá el progreso cuando avances.",
    proximo: "Vuelve a la lista de próximos.",
  };
  return { ok: true, mensaje: mensajes[estado] };
}

/** Progreso del hito en curso (el control deslizante de la tarjeta). */
export async function actualizarProgreso(id: string, progreso: number): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese hito no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { data: hito, error } = await supabase
    .from("empresa_hitos")
    .select("id, titulo, detalle, etapa, estado, progreso, fecha, created_at")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Hito | null, { merge: false }>();
  if (error) return traducir(error, "actualizarProgreso");
  if (!hito || hito.estado !== "en_curso") return { ok: false, mensaje: "Ese hito ya no está en curso." };
  const r = await llamarGuardar(supabase, {
    id,
    titulo: hito.titulo,
    detalle: hito.detalle ?? "",
    etapa: hito.etapa ?? "",
    estado: "en_curso",
    progreso: Math.round(progreso),
    fecha: hito.fecha,
  });
  return r.ok ? { ok: true, mensaje: `Progreso: ${Math.round(progreso)}%.` } : r;
}

export async function borrarHito(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese hito no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("borrar_hito", { p_id: id });
  if (error) return traducir(error, "borrar_hito");
  await refrescar(supabase);
  return { ok: true, mensaje: "Hito borrado." };
}

/**
 * Publica un avance. Si con este la racha llega a una meta (2, 4, 8… semanas),
 * el mensaje lo festeja: es el único momento en que se sabe que se acaba de lograr.
 */
export async function publicarAvance(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const textoAvance = texto(formData, "texto");
  const hito = texto(formData, "hito");
  if (!textoAvance) return { ok: false, mensaje: "Contá en una o dos líneas qué avanzaron." };
  if (textoAvance.length > AVANCE_MAX) return { ok: false, mensaje: `Hasta ${AVANCE_MAX} caracteres.` };

  const { error } = await supabase.rpc("publicar_avance", {
    p_texto: textoAvance,
    p_hito: UUID.test(hito) ? hito : null,
  });
  if (error) return traducir(error, "publicar_avance");
  await refrescar(supabase);

  // La RLS deja leer los avances de todas las empresas visibles: se filtra la propia.
  const { data: yo } = await supabase.from("perfiles").select("empresa_id").eq("usuario_id", user.id).maybeSingle();
  if (!yo?.empresa_id) return { ok: true, mensaje: "Avance publicado." };
  const { data } = await supabase
    .from("empresa_avances")
    .select("created_at")
    .eq("empresa_id", yo.empresa_id)
    .order("created_at", { ascending: false })
    .limit(400);
  const racha = calcularRacha((data ?? []).map((a) => a.created_at as string), new Date());
  const meta = METAS_RACHA.find((m) => m === racha.semanas);
  return {
    ok: true,
    mensaje:
      meta && racha.estaSemana
        ? `¡Avance publicado! Llegaste a ${meta} semanas seguidas construyendo en público.`
        : "Avance publicado.",
  };
}

export async function borrarAvance(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Ese avance no existe." };
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const { error } = await supabase.rpc("borrar_avance", { p_id: id });
  if (error) return traducir(error, "borrar_avance");
  await refrescar(supabase);
  return { ok: true, mensaje: "Avance borrado." };
}
