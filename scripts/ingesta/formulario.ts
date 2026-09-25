import type { Rol, TipoPerfil } from "../../types/pecera.ts";

/**
 * Traduce una fila del Form a lo que se guarda. Funciones puras: no leen el
 * entorno ni tocan la red, así se pueden probar sueltas.
 */

export const COL = {
  timestamp: "Timestamp",
  nombre: "Nombre del proyecto o persona",
  tipo: "¿Qué sos?",
  rol: "Tu rol en el ecosistema",
  descripcion: "Descripción en una línea",
  whatsapp: "WhatsApp",
  email: "Email de contacto",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  web: "Web",
  consentimiento: "Consentimiento",
  video: "Pitch - Video",
  foto: "Foto o Logo",
} as const;

const TIPOS: Record<string, TipoPerfil> = {
  Startup: "startup",
  Emprendimiento: "emprendimiento",
  Aceleradora: "aceleradora",
  Incubadora: "incubadora",
  "Inversor ángel": "angel",
  "Fondo de inversión": "fondo",
  "Coach / mentor": "coach",
};

const ROLES: Record<string, Rol> = {
  Emprendedor: "emprendedor",
  Inversor: "inversor",
  Aliado: "aliado",
};

export type DatosPerfil = {
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

export type Entrada = {
  /** ID de Drive del video: la huella de la fila. */
  origenId: string;
  fotoId: string | null;
  /** Segundos epoch del Timestamp: ordena el feed por llegada. */
  orden: number;
  slugBase: string;
  perfil: DatosPerfil;
};

export type Lectura =
  | { tipo: "salteada"; motivo: "sin consentimiento" | "sin video" }
  | { tipo: "invalida"; origenId: string; error: string }
  | { tipo: "valida"; entrada: Entrada };

/** "https://drive.google.com/open?id=<ID>" → ID. Si hay varios, el primero. */
export function idDeDrive(valor: string): string | null {
  return valor.match(/[?&]id=([\w-]+)/)?.[1] ?? valor.match(/\/d\/([\w-]+)/)?.[1] ?? null;
}

/** "M/D/YYYY HH:mm:ss" → segundos epoch (tomado como UTC: solo sirve para ordenar). */
export function segundosDe(timestamp: string): number | null {
  const m = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, mes, dia, anio, h, min, s] = m.map(Number);
  return Math.floor(Date.UTC(anio, mes - 1, dia, h, min, s) / 1000);
}

/** Nombre → slug: sin tildes, minúsculas, guiones. Nunca "test-" (lo borra la limpieza). */
export function slugBase(nombre: string): string {
  const slug =
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "perfil";
  return slug.startsWith("test-") ? `p-${slug}` : slug;
}

const vacioANull = (v: string) => v || null;

function limpiarWhatsapp(v: string): string | null {
  return vacioANull(v.replace(/\D/g, ""));
}

function limpiarEmail(v: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

function limpiarLinkedin(v: string): string | null {
  return /linkedin\.com/i.test(v) ? v : null;
}

/** Tiene que parecer un dominio: "algo.com", "www.algo.com.ar/ruta", con o sin protocolo. */
function limpiarWeb(v: string): string | null {
  const sinProtocolo = v.replace(/^https?:\/\//i, "");
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(sinProtocolo) ? v : null;
}

export function leerFila(fila: Record<string, string>): Lectura {
  const consentimiento = fila[COL.consentimiento] ?? "";
  if (!consentimiento || /^no\b/i.test(consentimiento)) {
    return { tipo: "salteada", motivo: "sin consentimiento" };
  }

  const origenId = idDeDrive(fila[COL.video] ?? "");
  if (!origenId) return { tipo: "salteada", motivo: "sin video" };

  const invalida = (error: string): Lectura => ({ tipo: "invalida", origenId, error });

  const orden = segundosDe(fila[COL.timestamp] ?? "");
  if (orden === null) return invalida("Timestamp con formato inesperado");

  const nombre = fila[COL.nombre] ?? "";
  if (!nombre) return invalida("Falta el nombre");

  const descripcion = fila[COL.descripcion] ?? "";
  if (!descripcion) return invalida("Falta la descripción");

  const tipo = TIPOS[fila[COL.tipo] ?? ""];
  if (!tipo) return invalida("Valor de '¿Qué sos?' desconocido");

  const rol = ROLES[fila[COL.rol] ?? ""];
  if (!rol) return invalida("Valor de rol desconocido");

  return {
    tipo: "valida",
    entrada: {
      origenId,
      fotoId: idDeDrive(fila[COL.foto] ?? ""),
      orden,
      slugBase: slugBase(nombre),
      perfil: {
        nombre,
        tipo,
        rol,
        descripcion,
        whatsapp: limpiarWhatsapp(fila[COL.whatsapp] ?? ""),
        email: limpiarEmail(fila[COL.email] ?? ""),
        linkedin: limpiarLinkedin(fila[COL.linkedin] ?? ""),
        instagram: vacioANull(fila[COL.instagram] ?? ""),
        web: limpiarWeb(fila[COL.web] ?? ""),
      },
    },
  };
}
