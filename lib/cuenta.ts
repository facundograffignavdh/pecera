import {
  APORTES,
  CARGOS,
  DEDICACIONES,
  ESPECIALIDADES,
  ETAPAS,
  INDUSTRIAS,
  MAX_ESPECIALIDADES,
  MAX_INDUSTRIAS_INTERES,
  MAX_INDUSTRIAS_PROYECTO,
  NOTA_COFUNDADOR_MAX,
  RONDAS,
  RONDAS_INTERES,
  TICKETS,
  esValor,
} from "@/lib/etiquetas";
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

const FORMULARIO_PITCH =
  "https://docs.google.com/forms/d/e/1FAIpQLScJjGCBLksepeDEdBZhfVVNNYVK-iFgqVwI-cf7QaJ_QBMNFg/viewform";

/**
 * Form de pitches con el email de la cuenta ya escrito y esa cuenta de Google
 * elegida (`authuser`), así el email verificado coincide con el escrito.
 */
export function urlFormularioPitch(email: string): string {
  const e = encodeURIComponent(email);
  return `${FORMULARIO_PITCH}?usp=pp_url&entry.481163043=${e}&authuser=${e}`;
}

/** URL pública de una ruta interna ("/docs" → "https://…/docs"). */
export function urlSitio(ruta: string): string {
  return `${siteUrl}${ruta}`;
}

/** URL pública del perfil: la que va en la tarjeta NFC. */
export function urlPerfil(slug: string): string {
  return urlSitio(`/p/${slug}`);
}

/** Opciones del select, con las etiquetas del Form ("Fondo de inversión"). */
export const OPCIONES_TIPO = Object.entries({
  ...TIPOS,
  fondo: "Fondo de inversión",
}) as Array<[TipoPerfil, string]>;

export const OPCIONES_ROL = Object.entries(ROLES).map(
  ([valor, { label }]) => [valor, label] as [Rol, string]
);

/** "¿Qué sos?" según el rol: menos ruido que todas las opciones juntas. */
export const TIPOS_POR_ROL: Record<Rol, TipoPerfil[]> = {
  emprendedor: ["startup", "emprendimiento"],
  inversor: ["angel", "fondo", "aceleradora", "empresa"],
  aliado: ["profesional", "coach", "aceleradora", "incubadora", "empresa", "institucion"],
};

/** Una línea que explica cada "¿Qué sos?" (el ícono de info del formulario). */
export const AYUDA_TIPO: Record<TipoPerfil, string> = {
  startup: "Producto escalable, pensado para crecer rápido y levantar inversión.",
  emprendimiento: "Negocio propio que crece a su ritmo: comercio, servicio, producción.",
  angel: "Invertís plata propia en proyectos que recién arrancan.",
  fondo: "Invertís plata de terceros desde un fondo de capital de riesgo.",
  aceleradora: "Programa con fecha que acompaña (y a veces invierte en) startups.",
  incubadora: "Espacio y formación para ideas y proyectos tempranos.",
  coach: "Acompañás founders con tu experiencia: mentoría o coaching.",
  profesional: "Ofrecés un servicio: marketing, desarrollo, diseño, legal, finanzas…",
  empresa: "Empresa o corporación que busca innovación, proveedores o invertir.",
  institucion: "Universidad, gobierno, cámara u ONG que apoya al ecosistema.",
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  emprendedor: "Tengo una startup o un proyecto y quiero mostrarlo.",
  inversor: "Busco proyectos para invertir y quiero escribirles directo.",
  aliado: "Sumo a los proyectos: mentoría, servicios profesionales, aceleración o apoyo institucional.",
};

/**
 * Nombre → slug: sin tildes, minúsculas, guiones. Nunca "test-" (lo borra la
 * limpieza).
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

/**
 * A dónde volver después de entrar: solo rutas internas. La barra invertida también
 * se rechaza: `new URL("/\\otro.com", origen)` la lee como "//otro.com" (open redirect).
 */
export function destinoSeguro(valor: string | null | undefined): string {
  return valor && valor.startsWith("/") && !valor.startsWith("//") && !valor.includes("\\")
    ? valor
    : "/cuenta";
}

/** Campos de texto (un valor). */
export type CampoSimple =
  | "nombre"
  | "tipo"
  | "rol"
  | "descripcion"
  | "whatsapp"
  | "email"
  | "linkedin"
  | "instagram"
  | "web"
  | "etapa"
  | "ronda"
  | "cargo"
  | "ticket"
  | "cofundador_aporta"
  | "cofundador_dedicacion"
  | "cofundador_nota";

/** Campos de varias opciones (chips). */
export type CampoLista = "industrias" | "especialidades" | "rondas_interes" | "cofundador_busca";

export type CampoPerfil = CampoSimple | CampoLista | "slug" | "consentimiento" | "busca_cofundador";

export const CAMPOS_SIMPLES: CampoSimple[] = [
  "nombre",
  "tipo",
  "rol",
  "descripcion",
  "whatsapp",
  "email",
  "linkedin",
  "instagram",
  "web",
  "etapa",
  "ronda",
  "cargo",
  "ticket",
  "cofundador_aporta",
  "cofundador_dedicacion",
  "cofundador_nota",
];
export const CAMPOS_LISTA: CampoLista[] = [
  "industrias",
  "especialidades",
  "rondas_interes",
  "cofundador_busca",
];

export type EntradaPerfil = Partial<Record<CampoSimple, string>> &
  Partial<Record<CampoLista, string[]>> & { busca_cofundador?: boolean };

/** Lo que existe desde v2-cuentas: si la base no tiene la migración nueva, se guarda esto. */
export type DatosBase = {
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

/** Campos de la migración feria_lista. Los que no corresponden al rol van vacíos. */
export type DatosRol = {
  etapa: string | null;
  ronda: string | null;
  cargo: string | null;
  ticket: string | null;
  industrias: string[];
  especialidades: string[];
  rondas_interes: string[];
};

/** Cofounder match (migración feria_pro). Sin la búsqueda prendida, todo vacío. */
export type DatosCofundador = {
  busca_cofundador: boolean;
  cofundador_aporta: string | null;
  cofundador_busca: string[];
  cofundador_dedicacion: string | null;
  cofundador_nota: string | null;
};

export type DatosEditables = DatosBase & DatosRol & DatosCofundador;

/**
 * WhatsApp: Argentina se guarda como 10 dígitos (área + número, sin 0 ni 15);
 * el resto, internacional con "+" (hasta 15 dígitos). Espejo del guardián.
 */
export const WHATSAPP = /^([1-9]\d{9}|\+[1-9]\d{7,14})$/;

export type Errores = Partial<Record<CampoPerfil, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const opcional = (v: string) => v.trim() || null;

/** Sin repetidos y solo valores del vocabulario. */
function limpiarLista(lista: string[] | undefined, vocabulario: readonly { valor: string }[]) {
  return [...new Set(lista ?? [])].filter((v) => esValor(vocabulario, v));
}

/** Valida y normaliza lo que viene del formulario. */
export function validarPerfil(entrada: EntradaPerfil): { datos: DatosEditables; errores: Errores } {
  const errores: Errores = {};
  const v = (campo: CampoSimple) => entrada[campo] ?? "";

  const nombre = v("nombre").trim();
  if (!nombre) errores.nombre = "Poné tu nombre o el de tu proyecto.";
  else if (nombre.length > NOMBRE_MAX) errores.nombre = `Hasta ${NOMBRE_MAX} caracteres.`;

  const rol = v("rol") as Rol;
  if (!(rol in ROLES)) errores.rol = "Elegí cómo entrás a Pecera.";

  const tipo = v("tipo") as TipoPerfil;
  if (!(tipo in TIPOS)) errores.tipo = "Elegí qué sos.";
  else if (rol in ROLES && !TIPOS_POR_ROL[rol].includes(tipo)) {
    errores.tipo = "Elegí una opción que vaya con tu rol.";
  }

  const descripcion = v("descripcion").trim();
  if (!descripcion) errores.descripcion = "Contá en una línea qué hacés.";
  else if (descripcion.length > DESCRIPCION_MAX) {
    errores.descripcion = `Hasta ${DESCRIPCION_MAX} caracteres.`;
  }

  const crudo = v("whatsapp").trim();
  const whatsapp = opcional(crudo.startsWith("+") ? `+${crudo.replace(/\D/g, "")}` : crudo.replace(/\D/g, ""));
  if (whatsapp && !WHATSAPP.test(whatsapp)) {
    errores.whatsapp = whatsapp.startsWith("+")
      ? "Revisá el número: código de país y número, sin espacios."
      : "Son 10 dígitos: código de área sin 0 y número sin 15.";
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

  const rolDatos = validarRol(rol, entrada, errores);
  const cofundador = validarCofundador(entrada, errores);

  return {
    datos: {
      nombre,
      tipo,
      rol,
      descripcion,
      whatsapp,
      email,
      linkedin,
      instagram,
      web,
      ...rolDatos,
      ...cofundador,
    },
    errores,
  };
}

/** Cofounder match: opcional para todos los roles. Apagado = todo vacío. */
function validarCofundador(entrada: EntradaPerfil, errores: Errores): DatosCofundador {
  if (!entrada.busca_cofundador) {
    return {
      busca_cofundador: false,
      cofundador_aporta: null,
      cofundador_busca: [],
      cofundador_dedicacion: null,
      cofundador_nota: null,
    };
  }
  const aporta = (entrada.cofundador_aporta ?? "").trim();
  const busca = limpiarLista(entrada.cofundador_busca, APORTES);
  const dedicacion = (entrada.cofundador_dedicacion ?? "").trim();
  const nota = (entrada.cofundador_nota ?? "").trim();
  if (!esValor(APORTES, aporta)) errores.cofundador_aporta = "Elegí qué aportás vos.";
  if (!busca.length) errores.cofundador_busca = "Elegí qué perfil buscás.";
  if (nota.length > NOTA_COFUNDADOR_MAX) errores.cofundador_nota = `Hasta ${NOTA_COFUNDADOR_MAX} caracteres.`;
  return {
    busca_cofundador: true,
    cofundador_aporta: esValor(APORTES, aporta) ? aporta : null,
    cofundador_busca: busca,
    cofundador_dedicacion: esValor(DEDICACIONES, dedicacion) ? dedicacion : null,
    cofundador_nota: nota || null,
  };
}

/**
 * Lo que se pide según el rol. Lo que no corresponde se guarda vacío: si alguien
 * pasa de emprendedor a inversor, no le queda una etapa colgada.
 */
function validarRol(rol: Rol, entrada: EntradaPerfil, errores: Errores): DatosRol {
  const vacio: DatosRol = {
    etapa: null,
    ronda: null,
    cargo: null,
    ticket: null,
    industrias: [],
    especialidades: [],
    rondas_interes: [],
  };
  const texto = (campo: CampoSimple) => (entrada[campo] ?? "").trim();

  if (rol === "emprendedor") {
    const etapa = texto("etapa");
    if (!esValor(ETAPAS, etapa)) errores.etapa = "Elegí en qué etapa está tu proyecto.";

    const ronda = texto("ronda");
    const cargo = texto("cargo");
    const industrias = limpiarLista(entrada.industrias, INDUSTRIAS);
    if (!industrias.length) errores.industrias = "Elegí al menos una industria.";
    else if (industrias.length > MAX_INDUSTRIAS_PROYECTO) {
      errores.industrias = `Hasta ${MAX_INDUSTRIAS_PROYECTO} industrias.`;
    }

    return {
      ...vacio,
      etapa: esValor(ETAPAS, etapa) ? etapa : null,
      ronda: esValor(RONDAS, ronda) ? ronda : null,
      cargo: esValor(CARGOS, cargo) ? cargo : null,
      industrias,
    };
  }

  if (rol === "inversor") {
    const ticket = texto("ticket");
    const rondas = limpiarLista(entrada.rondas_interes, RONDAS_INTERES);
    if (!rondas.length) errores.rondas_interes = "Elegí al menos una ronda.";
    const industrias = limpiarLista(entrada.industrias, INDUSTRIAS);
    if (!industrias.length) errores.industrias = "Elegí al menos una industria que mirás.";
    else if (industrias.length > MAX_INDUSTRIAS_INTERES) {
      errores.industrias = `Hasta ${MAX_INDUSTRIAS_INTERES} industrias.`;
    }

    return {
      ...vacio,
      ticket: esValor(TICKETS, ticket) ? ticket : null,
      rondas_interes: rondas,
      industrias,
    };
  }

  if (rol === "aliado") {
    const especialidades = limpiarLista(entrada.especialidades, ESPECIALIDADES);
    if (!especialidades.length) errores.especialidades = "Elegí al menos una especialidad.";
    else if (especialidades.length > MAX_ESPECIALIDADES) {
      errores.especialidades = `Hasta ${MAX_ESPECIALIDADES} especialidades.`;
    }
    const industrias = limpiarLista(entrada.industrias, INDUSTRIAS);
    if (industrias.length > MAX_INDUSTRIAS_INTERES) {
      errores.industrias = `Hasta ${MAX_INDUSTRIAS_INTERES} industrias.`;
    }

    return { ...vacio, especialidades, industrias };
  }

  return vacio;
}

/** Todo menos el cofounder match: para guardar si la base no tiene feria_pro. */
export function sinCofundador(datos: DatosEditables): DatosBase & DatosRol {
  const {
    busca_cofundador: _b,
    cofundador_aporta: _a,
    cofundador_busca: _c,
    cofundador_dedicacion: _d,
    cofundador_nota: _n,
    ...resto
  } = datos;
  return resto;
}

/** Separa lo de siempre de lo nuevo, para guardar sin la migración si hace falta. */
export function soloBase(datos: DatosEditables): DatosBase {
  const { nombre, tipo, rol, descripcion, whatsapp, email, linkedin, instagram, web } = datos;
  return { nombre, tipo, rol, descripcion, whatsapp, email, linkedin, instagram, web };
}

/** El slug solo se elige al crear y queda fijo para siempre. */
export function validarSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 60) return "Entre 3 y 60 caracteres.";
  if (!SLUG.test(slug)) return "Solo minúsculas, números y guiones sueltos.";
  if (slug.startsWith("test-")) return "No puede empezar con «test-».";
  return null;
}
