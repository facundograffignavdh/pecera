import { createHash } from "node:crypto";
import { DESCRIPCION_MAX, REGEX_EMAIL } from "./config.ts";

/**
 * Traduce una fila del Form de pitches a lo que se guarda y decide a qué perfil
 * va. Funciones puras: no leen el entorno ni tocan la red, así se pueden probar
 * sueltas.
 */

/** Encabezados exactos del Form. `leerHoja` ya les saca los espacios de los extremos. */
export const COL = {
  marca: "Marca temporal",
  emailVerificado: "Dirección de correo electrónico",
  emailEscrito: "Email de tu cuenta de Pecera",
  video: "Pitch - Video",
  descripcion: "Descripción del pitch",
} as const;

/** Columnas que faltan en el encabezado. Una sola que falte corta la corrida. */
export function faltantes(encabezado: string[]): string[] {
  const hay = new Set(encabezado);
  return Object.values(COL).filter((c) => !hay.has(c));
}

export type Entrada = {
  /** ID de Drive del video: la huella de la fila. */
  origenId: string;
  /** Segundos epoch de la Marca temporal: ordena el feed por llegada. */
  orden: number;
  /** La Marca temporal como fecha real (hora de Argentina, -03:00). */
  fecha: string;
  /** Quién envió (verificado por Google), en minúsculas. */
  emailVerificado: string;
  /** Para quién es el pitch (lo escribe la persona), en minúsculas. */
  emailEscrito: string;
  descripcion: string | null;
};

export type Lectura =
  | { tipo: "salteada"; motivo: "sin video" }
  | { tipo: "invalida"; origenId: string; error: string }
  | { tipo: "valida"; entrada: Entrada };

/** "https://drive.google.com/open?id=<ID>" → ID. Si hay varios, el primero. */
export function idDeDrive(valor: string): string | null {
  return valor.match(/[?&]id=([\w-]+)/)?.[1] ?? valor.match(/\/d\/([\w-]+)/)?.[1] ?? null;
}

/**
 * "D/M/YYYY HH:mm:ss" (día primero, como la hoja en español) → segundos epoch
 * tomando la hora como UTC (solo sirve para ordenar) y la fecha real en -03:00.
 */
export function leerMarca(marca: string): { orden: number; fecha: string } | null {
  const m = marca.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dia, mes, anio, h, min, s] = m.map(Number);
  const utc = Date.UTC(anio, mes - 1, dia, h, min, s);
  const fecha = new Date(utc);
  // Date.UTC acepta 31/2 y lo corre de mes: eso es una marca inválida.
  if (fecha.getUTCDate() !== dia || fecha.getUTCMonth() !== mes - 1 || h > 23) return null;
  return {
    orden: Math.floor(utc / 1000),
    fecha: new Date(utc + 3 * 60 * 60 * 1000).toISOString(),
  };
}

const email = (v: string) => {
  const limpio = v.trim().toLowerCase();
  return REGEX_EMAIL.test(limpio) ? limpio : null;
};

/** Espacios colapsados; vacía → null; más larga que el máximo → cortada. */
export function limpiarDescripcion(v: string): string | null {
  const limpia = v.replace(/\s+/g, " ").trim();
  if (!limpia) return null;
  return [...limpia].slice(0, DESCRIPCION_MAX).join("").trim();
}

export function leerFila(fila: Record<string, string>): Lectura {
  const origenId = idDeDrive(fila[COL.video] ?? "");
  if (!origenId) return { tipo: "salteada", motivo: "sin video" };

  const invalida = (error: string): Lectura => ({ tipo: "invalida", origenId, error });

  const marca = leerMarca(fila[COL.marca] ?? "");
  if (!marca) return invalida("Marca temporal con formato inesperado");

  const emailVerificado = email(fila[COL.emailVerificado] ?? "");
  if (!emailVerificado) return invalida("Falta el email verificado");

  const emailEscrito = email(fila[COL.emailEscrito] ?? "");
  if (!emailEscrito) return invalida("El email de la cuenta de Pecera no es válido");

  return {
    tipo: "valida",
    entrada: {
      origenId,
      ...marca,
      emailVerificado,
      emailEscrito,
      descripcion: limpiarDescripcion(fila[COL.descripcion] ?? ""),
    },
  };
}

/** Lo que devuelve `ingesta_cuentas` por email: si es cuenta y su perfil, si tiene. */
export type Cuenta = { perfilId: string | null; slug: string | null };
export type Perfil = { id: string; slug: string };

export type Regla =
  | "mismo_email"
  | "equipo"
  | "equipo_espera"
  | "respaldo_verificado"
  | "otra_cuenta_espera"
  | "sin_cuenta_espera"
  | "a_mano"
  | "bloqueado";

export type Resolucion =
  | { estado: "asignado"; regla: Regla; perfil: Perfil }
  | { estado: "en_espera"; regla: Regla }
  | { estado: "rechazado"; regla: "bloqueado" };

/**
 * A qué perfil va el pitch. El bloqueo manda; después, el email escrito si
 * coincide con el verificado o si envía alguien del equipo (sin respaldo, para
 * que un error del equipo no termine en su propio perfil). Si no es del equipo
 * y el email escrito no es ninguna cuenta, se prueba con el verificado: es su
 * propia cuenta. Si el escrito es otra cuenta, espera al equipo.
 */
export function resolver(
  entrada: Pick<Entrada, "emailVerificado" | "emailEscrito">,
  cuentas: Map<string, Cuenta>,
  equipo: Set<string>,
  bloqueados: Set<string>
): Resolucion {
  if (bloqueados.has(entrada.emailVerificado)) return { estado: "rechazado", regla: "bloqueado" };

  const perfilDe = (email: string): Perfil | null => {
    const c = cuentas.get(email);
    return c?.perfilId && c.slug ? { id: c.perfilId, slug: c.slug } : null;
  };
  const escrito = perfilDe(entrada.emailEscrito);

  if (entrada.emailEscrito === entrada.emailVerificado) {
    return escrito
      ? { estado: "asignado", regla: "mismo_email", perfil: escrito }
      : { estado: "en_espera", regla: "sin_cuenta_espera" };
  }

  if (equipo.has(entrada.emailVerificado)) {
    return escrito
      ? { estado: "asignado", regla: "equipo", perfil: escrito }
      : { estado: "en_espera", regla: "equipo_espera" };
  }

  if (cuentas.has(entrada.emailEscrito)) return { estado: "en_espera", regla: "otra_cuenta_espera" };

  const propio = perfilDe(entrada.emailVerificado);
  return propio
    ? { estado: "asignado", regla: "respaldo_verificado", perfil: propio }
    : { estado: "en_espera", regla: "sin_cuenta_espera" };
}

/** Cuentas eliminadas: sha256 del email → cuándo se borró (ms epoch). */
export type EmailsBorrados = Map<string, number>;

/** sha256 del email en minúsculas, igual que `hash_email` en la base. */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

/** ¿El email es de una cuenta que se eliminó después de esta respuesta? */
function borradoDespues(email: string, fecha: string, borrados: EmailsBorrados): boolean {
  if (!email) return false;
  const cuando = borrados.get(hashEmail(email));
  return cuando !== undefined && Date.parse(fecha) <= cuando;
}

/**
 * Una respuesta que la base nunca registró es de una cuenta eliminada si la mandó
 * esa cuenta o la mandaron para ella antes del borrado. Lo posterior es de la
 * cuenta nueva (si la hay) y se procesa normal.
 */
export function deCuentaBorrada(
  entrada: Pick<Entrada, "emailVerificado" | "emailEscrito" | "fecha">,
  borrados: EmailsBorrados
): boolean {
  return (
    borradoDespues(entrada.emailVerificado, entrada.fecha, borrados) ||
    borradoDespues(entrada.emailEscrito, entrada.fecha, borrados)
  );
}

/**
 * Lo que se guarda en `envios`: sin los emails de cuentas eliminadas (por ejemplo,
 * alguien del equipo que cargó un pitch para otra persona y después borró su cuenta).
 */
export function sinEmailsBorrados<T extends Pick<Entrada, "emailVerificado" | "emailEscrito" | "fecha">>(
  entrada: T,
  borrados: EmailsBorrados
): T {
  return {
    ...entrada,
    emailVerificado: borradoDespues(entrada.emailVerificado, entrada.fecha, borrados) ? "" : entrada.emailVerificado,
    emailEscrito: borradoDespues(entrada.emailEscrito, entrada.fecha, borrados) ? "" : entrada.emailEscrito,
  };
}
