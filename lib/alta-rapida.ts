import { DESCRIPCION_MAX, NOMBRE_MAX } from "@/lib/cuenta";
import type { TipoEmpresa } from "@/lib/etiquetas";
import type { Rol } from "@/types/pecera";

/**
 * Alta rápida del equipo en un stand (/admin/alta) y edición desde /admin. Reglas compartidas
 * por el formulario (cliente) y las actions (servidor); las funciones `admin_*` de
 * 20261019120000_alta_rapida.sql las repiten en la base.
 */

export const EMPRESA_NOMBRE_MAX = 80;
export const EMPRESA_DESCRIPCION_MAX = 280;

/**
 * Lo que la persona acepta en el stand (Ley 25.326, art. 5 y 6: consentimiento libre,
 * expreso e informado). La versión se guarda con el alta: si cambia el texto, cambia la versión.
 */
export const CONSENTIMIENTO_ALTA = {
  version: "alta-equipo-2026-10",
  texto: "La persona aceptó que armemos y publiquemos su perfil en Pecera",
  /** `contacto`: CONTACTO_PRIVACIDAD (components/PaginaLegal.tsx), que pasa la página del servidor. */
  detalle: (contacto: string) =>
    `Antes de tildar, contale que se publican su nombre, una línea sobre lo que hace y su emprendimiento; que puede pedir corregirlo o borrarlo cuando quiera escribiendo a ${contacto}; y que la política de privacidad está en pecera.lat/privacidad. El email, si nos lo da, no se publica: solo sirve para que reclame su perfil.`,
} as const;

export type EntradaAlta = {
  nombre: string;
  descripcion: string;
  empresa: string;
  empresaDescripcion: string;
  empresaTipo: TipoEmpresa;
  /** Sumarla a una empresa existente en vez de crear otra. */
  sumarA: string | null;
  email: string;
  feria: boolean;
  rol: Rol;
  publicado: boolean;
  consentimiento: boolean;
};

export type CampoAlta = "nombre" | "descripcion" | "empresa" | "empresaDescripcion" | "email" | "consentimiento";
export type ErroresAlta = Partial<Record<CampoAlta, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALTO = /[\r\n]/;

function texto(valor: string, max: number, nombre: string, obligatorio: boolean): string | undefined {
  const v = valor.trim();
  if (!v) return obligatorio ? `Falta ${nombre}.` : undefined;
  if (SALTO.test(valor)) return "Tiene que ir en una sola línea.";
  if (v.length > max) return `Máximo ${max} caracteres (tiene ${v.length}).`;
  return undefined;
}

export function validarAlta(e: EntradaAlta): ErroresAlta {
  const errores: ErroresAlta = {
    nombre: texto(e.nombre, NOMBRE_MAX, "el nombre y apellido", true),
    descripcion: texto(e.descripcion, DESCRIPCION_MAX, "la línea sobre lo que hace", true),
    empresa: e.sumarA ? undefined : texto(e.empresa, EMPRESA_NOMBRE_MAX, "el nombre de la empresa", false),
    empresaDescripcion:
      e.sumarA || !e.empresa.trim() ? undefined : texto(e.empresaDescripcion, EMPRESA_DESCRIPCION_MAX, "", false),
    email:
      e.email.trim() && (e.email.trim().length > 200 || !EMAIL.test(e.email.trim()))
        ? "Revisá el email."
        : undefined,
    consentimiento: e.consentimiento ? undefined : "Sin su consentimiento no se puede crear el perfil.",
  };
  return Object.fromEntries(Object.entries(errores).filter(([, v]) => v)) as ErroresAlta;
}

/** Validación de nombre y descripción para la edición desde /admin. */
export function validarTextosPerfil(nombre: string, descripcion: string): ErroresAlta {
  return validarAlta({
    nombre,
    descripcion,
    empresa: "",
    empresaDescripcion: "",
    empresaTipo: "startup",
    sumarA: null,
    email: "",
    feria: false,
    rol: "emprendedor",
    publicado: true,
    consentimiento: true,
  });
}

/** Mensaje de la base ("dato inválido: <campo>") → campo del formulario. */
export function campoDeError(mensaje: string): CampoAlta | null {
  const m = /^dato inválido: (\w+)$/.exec(mensaje);
  if (!m) return mensaje === "email inválido" ? "email" : mensaje === "falta el consentimiento" ? "consentimiento" : null;
  const mapa: Record<string, CampoAlta> = {
    nombre: "nombre",
    descripcion: "descripcion",
    empresa: "empresa",
    empresa_descripcion: "empresaDescripcion",
  };
  return mapa[m[1]] ?? null;
}

export type Parecido = {
  id: string;
  slug: string;
  nombre: string;
  empresa: string | null;
  con_cuenta: boolean;
  publicado: boolean;
};

export type EmpresaParecida = {
  id: string;
  slug: string;
  nombre: string;
  miembros: number;
  participa: boolean;
  representante: string | null;
};

export type AltaReciente = {
  id: string;
  slug: string;
  nombre: string;
  empresa: string | null;
  publicado: boolean;
  created_at: string;
  puede_deshacer: boolean;
};

export type DetallePerfil = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  rol: Rol;
  tipo: string;
  publicado: boolean;
  oculto: boolean;
  con_cuenta: boolean;
  creado_equipo: boolean;
  email_reclamo: string | null;
  reclamo_rechazado: boolean | null;
  participa: boolean;
  representa: string | null;
  empresas: {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
    tipo: string | null;
    principal: boolean;
    con_dueno: boolean;
    miembros: number;
    participa: boolean;
  }[];
};

export const TOPE_EMPRESAS = 5;
