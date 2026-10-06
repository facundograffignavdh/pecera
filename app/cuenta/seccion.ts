"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CAMPOS_LISTA,
  CAMPOS_SIMPLES,
  COLUMNAS_NETWORKING,
  type CampoLista,
  type CampoPerfil,
  type CampoSimple,
  type DatosEditables,
  type EntradaPerfil,
  type Errores,
  TIPOS_POR_ROL,
  soloBase,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import { faltaMigracion } from "@/lib/datos";
import { guardarFoto } from "@/lib/foto";
import {
  AVISO_SIN_MIGRACION,
  COLUMNAS_PROPIO,
  COLUMNAS_PROPIO_BASE,
  COLUMNAS_PROPIO_LISTA,
  COLUMNAS_PROPIO_NETWORKING,
  ERROR_GENERAL,
  type EstadoGuardar,
  errorDeLaBase,
  faltaTipoPersona,
  revalidarPerfil,
} from "@/lib/perfil-servidor";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { Rol, TipoPerfil } from "@/types/pecera";

/** Las partes del perfil que se editan cada una en su hoja. */
export type Seccion = "ficha" | "etiquetas" | "trayectoria" | "buscaOfrece" | "cofundador";

/** Lo que manda cada hoja (los nombres del form) y, por eso, lo único que se escribe. */
const CAMPOS_SECCION: Record<Seccion, CampoPerfil[]> = {
  ficha: ["nombre", "rol", "ubicacion", "descripcion", "whatsapp", "email", "linkedin", "instagram", "web"],
  etiquetas: ["etapa", "ronda", "ticket", "industrias", "especialidades", "rondas_interes"],
  trayectoria: ["experiencia", "educacion", "skills"],
  buscaOfrece: ["busca", "ofrece", "busca_detalle", "ofrece_detalle", "busca_como", "ofrece_como"],
  cofundador: ["busca_cofundador", "cofundador_aporta", "cofundador_busca", "cofundador_dedicacion", "cofundador_nota"],
};

/** Etiquetas del rol: si cambia el rol, las que ya no corresponden se vacían. */
const COLUMNAS_ROL: (keyof DatosEditables)[] = ["etapa", "ronda", "ticket", "industrias", "especialidades", "rondas_interes"];

/** Si la base todavía no acepta 'persona', el alta usa un tipo según el rol. */
const TIPO_RESPALDO: Record<Rol, TipoPerfil> = { emprendedor: "emprendimiento", inversor: "angel", aliado: "profesional" };

type Fila = Record<string, unknown> & { id: string; slug: string; rol: Rol; tipo: TipoPerfil };

/** La fila del perfil propio (en cascada si faltan migraciones), como entrada del validador. */
function entradaDesdeFila(fila: Fila): EntradaPerfil {
  const simples = Object.fromEntries(
    CAMPOS_SIMPLES.map((c) => [c, fila[c] == null ? "" : String(fila[c])])
  ) as Record<CampoSimple, string>;
  const listas = Object.fromEntries(
    CAMPOS_LISTA.map((c) => [c, Array.isArray(fila[c]) ? (fila[c] as string[]) : []])
  ) as Record<CampoLista, string[]>;
  return { ...simples, ...listas, busca_cofundador: fila.busca_cofundador === true };
}

function quedarse<T extends object>(objeto: T, claves: (keyof T)[]): Partial<T> {
  return Object.fromEntries(claves.filter((k) => k in objeto).map((k) => [k, objeto[k]])) as Partial<T>;
}

/**
 * Guarda una sección del perfil propio (la hoja que se abrió en /cuenta). Mezcla lo
 * que llega sobre lo que ya está guardado, valida con las mismas reglas de siempre y
 * escribe solo las columnas de esa sección. Nunca tira: toda falla vuelve como
 * mensaje (los de la base van al campo, como en guardarPerfil).
 */
export async function guardarSeccion(_previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> {
  try {
    return await guardarSeccionAdentro(formData);
  } catch (e) {
    console.error(`guardarSeccion: ${(e as Error).message}`);
    return { errores: {}, general: ERROR_GENERAL };
  }
}

async function guardarSeccionAdentro(formData: FormData): Promise<EstadoGuardar> {
  const seccion = String(formData.get("seccion") ?? "") as Seccion;
  const campos = CAMPOS_SECCION[seccion];
  if (!campos) return { errores: {}, general: ERROR_GENERAL };

  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errores: {}, general: "Se cerró tu sesión. Volvé a entrar." };

  const leer = (columnas: string) =>
    supabase
      .from("perfiles")
      .select(columnas)
      .eq("usuario_id", user.id)
      .maybeSingle()
      .overrideTypes<Fila | null, { merge: false }>();
  let { data: fila, error: errorLectura } = await leer(COLUMNAS_PROPIO_NETWORKING);
  if (faltaMigracion(errorLectura)) ({ data: fila, error: errorLectura } = await leer(COLUMNAS_PROPIO));
  if (faltaMigracion(errorLectura)) ({ data: fila, error: errorLectura } = await leer(COLUMNAS_PROPIO_LISTA));
  if (faltaMigracion(errorLectura)) ({ data: fila, error: errorLectura } = await leer(COLUMNAS_PROPIO_BASE));
  if (errorLectura) return errorDeLaBase(errorLectura, {});
  if (!fila) return { errores: {}, general: "Primero creá tu perfil." };

  // Lo guardado, con lo de esta hoja encima.
  const entrada = entradaDesdeFila(fila);
  for (const c of campos) {
    if (c === "busca_cofundador") entrada.busca_cofundador = formData.get(c) === "on";
    else if ((CAMPOS_LISTA as string[]).includes(c)) entrada[c as CampoLista] = formData.getAll(c).map(String);
    else entrada[c as CampoSimple] = String(formData.get(c) ?? "");
  }
  const rolNuevo = entrada.rol as Rol;
  const cambiaRol = seccion === "ficha" && rolNuevo !== fila.rol;
  // Un tipo de entidad (perfiles de antes) que no va con el rol nuevo pasa a 'persona'.
  if (cambiaRol && fila.tipo !== "persona" && !TIPOS_POR_ROL[rolNuevo]?.includes(fila.tipo)) entrada.tipo = "persona";

  const { datos, errores } = validarPerfil(entrada, { pedirEtiquetas: false });
  const propios: Errores = Object.fromEntries(
    Object.entries(errores).filter(([c]) => campos.includes(c as CampoPerfil) || c === "tipo")
  );
  if (Object.keys(propios).length) return { errores: propios };

  const columnas = new Set<keyof DatosEditables>(campos.filter((c) => c in datos) as (keyof DatosEditables)[]);
  if (cambiaRol) for (const c of [...COLUMNAS_ROL, "tipo" as const]) columnas.add(c);
  const cambios: Record<string, unknown> = quedarse(datos, [...columnas]);
  if (seccion === "ficha") cambios.oculto = formData.get("oculto") === "on";

  const editar = (c: object) => supabase.from("perfiles").update(c).eq("id", fila.id);
  let { error } = await editar(cambios);
  if (faltaTipoPersona(error)) {
    cambios.tipo = TIPOS_POR_ROL[rolNuevo][0];
    ({ error } = await editar(cambios));
  }
  let aviso: string | undefined;
  if (faltaMigracion(error) && COLUMNAS_NETWORKING.some((c) => c in cambios)) {
    // Sin networking_feria: lo de siempre de busca/ofrece, sin detalle ni "cómo".
    for (const c of COLUMNAS_NETWORKING) delete cambios[c];
    ({ error } = await editar(cambios));
  }
  if (faltaMigracion(error)) {
    // La base no tiene las columnas nuevas: solo lo de siempre (si hay algo).
    const base = quedarse(cambios, Object.keys(soloBase(datos)).concat("oculto"));
    if (Object.keys(base).length === 0) return { errores: {}, general: AVISO_SIN_MIGRACION };
    ({ error } = await editar(base));
    aviso = AVISO_SIN_MIGRACION;
  }
  if (error) return errorDeLaBase(error, {});

  revalidarPerfil(fila.slug);
  return { errores: {}, guardado: true, ...(aviso && { aviso }) };
}

/**
 * Alta mínima del perfil personal: nombre y apellido, rol, una línea, la dirección y
 * el consentimiento (la foto, si viene). Lo demás se suma después desde el perfil.
 * Nunca tira, salvo el redirect() final a /cuenta?creado=1.
 */
export async function crearPerfilPersonal(_previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> {
  let destino: string;
  try {
    const r = await crear(formData);
    if (!("ir" in r)) return r;
    destino = r.ir;
  } catch (e) {
    console.error(`crearPerfilPersonal: ${(e as Error).message}`);
    return { errores: {}, general: ERROR_GENERAL };
  }
  redirect(destino);
}

async function crear(formData: FormData): Promise<EstadoGuardar | { ir: string }> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errores: {}, general: "Se cerró tu sesión. Volvé a entrar." };

  const texto = (c: string) => String(formData.get(c) ?? "");
  const { datos, errores } = validarPerfil(
    { nombre: texto("nombre"), rol: texto("rol"), tipo: "persona", descripcion: texto("descripcion") },
    { pedirEtiquetas: false }
  );
  const slug = texto("slug").trim();
  const errorSlug = validarSlug(slug);
  if (errorSlug) errores.slug = errorSlug;
  if (formData.get("consentimiento") !== "on") errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
  if (Object.keys(errores).length) return { errores };

  const archivo = formData.get("foto");
  const foto = archivo instanceof Blob && archivo.size > 0 ? archivo : null;

  const insertar = (tipo: TipoPerfil) =>
    supabase
      .from("perfiles")
      .insert({
        ...soloBase({ ...datos, tipo }),
        slug,
        usuario_id: user.id,
        // El trigger lo pisa con now(); acá solo marca que se aceptó.
        consentimiento_at: new Date().toISOString(),
      })
      .select("id, avatar_url")
      .single();

  let { data: creado, error } = await insertar("persona");
  if (faltaTipoPersona(error)) ({ data: creado, error } = await insertar(TIPO_RESPALDO[datos.rol]));
  if (error?.code === "23505" && error.message.includes("usuario_id")) {
    // Esta cuenta ya tiene perfil (doble envío o reintento).
    revalidatePath("/cuenta");
    return { ir: "/cuenta" };
  }
  if (error?.code === "23505" && error.message.includes("slug")) {
    return { errores: { slug: "Esa dirección ya está tomada, probá otra." } };
  }
  if (error || !creado) return errorDeLaBase(error ?? ({ code: "PGRST116", message: "sin fila" } as PostgrestError), {});

  // La foto va después: si falla, se llega igual y se vuelve a subir desde el perfil.
  const errorFoto = foto ? await guardarFoto(supabase, user.id, creado, foto) : null;
  revalidarPerfil(slug);
  return { ir: `/cuenta?creado=1${errorFoto ? "&foto=error" : ""}` };
}
