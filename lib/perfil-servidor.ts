import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { CAMPOS_LISTA, CAMPOS_SIMPLES, type CampoPerfil, type Errores } from "@/lib/cuenta";

/**
 * Piezas compartidas por las actions del perfil (app/cuenta/acciones.ts y
 * app/cuenta/seccion.ts). Solo del servidor: un archivo "use server" no puede
 * exportar funciones comunes.
 */

/** Columnas del perfil propio, en cascada: feria_pro → feria_lista → lo de siempre. */
export const COLUMNAS_PROPIO_BASE =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado, oculto";
export const COLUMNAS_PROPIO_LISTA = `${COLUMNAS_PROPIO_BASE}, etapa, ronda, industrias, cargo, especialidades, ticket, rondas_interes, empresa_id`;
export const COLUMNAS_PROPIO = `${COLUMNAS_PROPIO_LISTA}, busca_cofundador, cofundador_aporta, cofundador_busca, cofundador_dedicacion, cofundador_nota, ubicacion, experiencia, educacion, skills, busca, ofrece`;

export const ERROR_GENERAL = "No pudimos guardar. Probá de nuevo en un rato.";
export const AVISO_SIN_MIGRACION =
  "Guardamos tu perfil. Etapa, industrias y etiquetas se van a poder guardar en un rato: estamos actualizando Pecera.";

const CAMPOS: CampoPerfil[] = [...CAMPOS_SIMPLES, ...CAMPOS_LISTA, "busca_cofundador"];

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

/**
 * Error de Supabase → mensaje para la persona. El trigger `perfiles_guardian`
 * levanta 22023 con "dato inválido: <campo>" y los CHECK de feria_lista, 23514
 * con "perfiles_<campo>_valid...": los dos van al campo; el resto, general.
 */
export function errorDeLaBase(error: PostgrestError, errores: Errores): EstadoGuardar {
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

/** Lo que muestra el perfil: el feed, Explorar, la página pública y /cuenta. */
export function revalidarPerfil(slug: string) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/cuenta");
}

/** La base todavía no acepta el tipo 'persona' (falta la migración persona_empresa). */
export function faltaTipoPersona(error: PostgrestError | null): boolean {
  return error?.code === "23514" && error.message.includes("perfiles_tipo_check");
}
