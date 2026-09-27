import { ROLES, TIPOS } from "@/lib/rol";
import type { Rol, TipoPerfil } from "@/types/pecera";

/**
 * Reglas de "Mi perfil", compartidas por el formulario (cliente) y la action
 * (servidor). Son las del Google Form; el trigger `perfiles_guardian` las repite
 * en la base.
 */

export const DESCRIPCION_MAX = 150;
export const NOMBRE_MAX = 80;

export const CONSENTIMIENTO =
  "Acepto que mi perfil, mis pitches y mis datos de contacto se publiquen en Pecera";

// Nombre literal: Next solo inyecta las NEXT_PUBLIC_* si aparecen así.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

/** URL pública del perfil: la que va en la tarjeta NFC. */
export function urlPerfil(slug: string): string {
  return `${siteUrl}/p/${slug}`;
}

/** Opciones del select, con las etiquetas del Form ("Fondo de inversión"). */
export const OPCIONES_TIPO = Object.entries({
  ...TIPOS,
  fondo: "Fondo de inversión",
}) as Array<[TipoPerfil, string]>;

export const OPCIONES_ROL = Object.entries(ROLES).map(
  ([valor, { label }]) => [valor, label] as [Rol, string]
);

/**
 * Nombre → slug: sin tildes, minúsculas, guiones. Nunca "test-" (lo borra la
 * limpieza). Misma regla que `slugBase` de la ingesta, que no se toca desde esta
 * rama: unificarlas cuando se toque la ingesta.
 */
export function slugDesdeNombre(nombre: string): string {
  const slug = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug.startsWith("test-") ? `p-${slug}` : slug;
}

/** A dónde volver después de entrar: solo rutas internas. */
export function destinoSeguro(valor: string | null | undefined): string {
  return valor && valor.startsWith("/") && !valor.startsWith("//") ? valor : "/cuenta";
}

export type CampoPerfil =
  | "nombre"
  | "tipo"
  | "rol"
  | "descripcion"
  | "whatsapp"
  | "email"
  | "linkedin"
  | "instagram"
  | "web"
  | "slug"
  | "consentimiento";

export type DatosEditables = {
  nombre: string;
  tipo: TipoPerfil;
  rol: Rol;
  descripcion: string;
  whatsapp: string | null;
  email: string | null;
  linkedin: string | null;
  instagram: string | null;
  web: string | null;
};

export type Errores = Partial<Record<CampoPerfil, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const opcional = (v: string) => v.trim() || null;

/** Valida y normaliza lo que viene del formulario. */
export function validarPerfil(
  entrada: Partial<Record<CampoPerfil, string>>
): { datos: DatosEditables; errores: Errores } {
  const errores: Errores = {};
  const v = (campo: CampoPerfil) => entrada[campo] ?? "";

  const nombre = v("nombre").trim();
  if (!nombre) errores.nombre = "Poné tu nombre o el de tu proyecto.";
  else if (nombre.length > NOMBRE_MAX) errores.nombre = `Hasta ${NOMBRE_MAX} caracteres.`;

  const tipo = v("tipo") as TipoPerfil;
  if (!(tipo in TIPOS)) errores.tipo = "Elegí qué sos.";

  const rol = v("rol") as Rol;
  if (!(rol in ROLES)) errores.rol = "Elegí tu rol.";

  const descripcion = v("descripcion").trim();
  if (!descripcion) errores.descripcion = "Contá en una línea qué hacés.";
  else if (descripcion.length > DESCRIPCION_MAX) {
    errores.descripcion = `Hasta ${DESCRIPCION_MAX} caracteres.`;
  }

  const whatsapp = opcional(v("whatsapp").replace(/\D/g, ""));
  if (whatsapp && !/^[1-9]\d{9}$/.test(whatsapp)) {
    errores.whatsapp = "Son 10 dígitos: código de área sin 0 y número sin 15.";
  }

  const email = opcional(v("email"));
  if (email && (!EMAIL.test(email) || email.length > 200)) {
    errores.email = "Revisá el email.";
  }

  const linkedin = opcional(v("linkedin"));
  if (linkedin && (!/linkedin\.com/i.test(linkedin) || linkedin.length > 200)) {
    errores.linkedin = "Tiene que ser un link de linkedin.com.";
  }

  const instagram = opcional(v("instagram"));
  if (instagram && instagram.length > 100) errores.instagram = "Es demasiado largo.";

  const web = opcional(v("web"));
  if (web && (!WEB.test(web.replace(/^https?:\/\//i, "")) || web.length > 200)) {
    errores.web = "Revisá la dirección (por ejemplo, tuweb.com.ar).";
  }

  return {
    datos: { nombre, tipo, rol, descripcion, whatsapp, email, linkedin, instagram, web },
    errores,
  };
}

/** El slug solo se elige al crear y queda fijo para siempre. */
export function validarSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 60) return "Entre 3 y 60 caracteres.";
  if (!SLUG.test(slug)) return "Solo minúsculas, números y guiones sueltos.";
  if (slug.startsWith("test-")) return "No puede empezar con «test-».";
  return null;
}
