import { lugar, type Encaje } from "@/lib/cofundador";
import {
  NECESIDADES,
  categoriaDe,
  esNecesidadGeneral,
  labelComo,
  labelEtapa,
  labelIndustria,
  necesidad,
  type Como,
  type Necesidad,
} from "@/lib/etiquetas";
import type { Perfil } from "@/types/pecera";

/**
 * Encaje de networking (pestaña Networking de /cofundadores, todos los roles). Mide si lo
 * que una persona BUSCA es lo que la otra OFRECE, en las dos direcciones: la opción exacta
 * suma más que la misma categoría, y el "cómo" compatible suma un poco. Después zona,
 * industrias y etapa. Como el de cofundadores (lib/cofundador.ts, que no cambia), es una
 * guía para ORDENAR: se muestra el porqué, nunca un número suelto.
 */

export type DatosEncajeNetworking = Pick<
  Perfil,
  "busca" | "ofrece" | "busca_como" | "ofrece_como" | "ubicacion" | "industrias" | "etapa"
>;

/** Un par "lo que se busca" ↔ "lo que se ofrece". */
type Par = { busca: string; ofrece: string };

/** "Primeros clientes" → "primeros clientes"; "IA y automatización" y "APIs…" quedan igual. */
export function minuscula(t: string): string {
  return /^\p{Lu}\p{Ll}/u.test(t) ? t[0].toLocaleLowerCase("es") + t.slice(1) : t;
}

const etiqueta = (v: string) => minuscula(necesidad(v).label);

/** "a, b y c". */
function lista(textos: string[]): string {
  if (textos.length <= 1) return textos[0] ?? "";
  return `${textos.slice(0, -1).join(", ")} y ${textos[textos.length - 1]}`;
}

/**
 * Cruza lo que un lado busca con lo que el otro ofrece. Cada cosa buscada cuenta una sola
 * vez: primero la opción exacta y, si no hay, una de la misma categoría (las "en general" de
 * antes, inversion y talento, valen por toda su categoría).
 */
export function cruzar(busca: readonly string[] = [], ofrece: readonly string[] = []) {
  const exactas: string[] = [];
  const porCategoria: Par[] = [];
  for (const b of busca) {
    if (ofrece.includes(b)) {
      exactas.push(b);
      continue;
    }
    const cat = categoriaDe(b);
    if (!cat) continue;
    const o = ofrece.find((x) => categoriaDe(x) === cat);
    if (o) porCategoria.push({ busca: b, ofrece: o });
  }
  return { exactas, porCategoria };
}

/** Puntos de una dirección: 12 por opción exacta y 4 por misma categoría, hasta 30. */
const puntosCruce = (c: ReturnType<typeof cruzar>) => Math.min(30, c.exactas.length * 12 + c.porCategoria.length * 4);

/** "Cómo" compatible: alguno en común, o alguien "a conversar". Null si no se puede decir. */
export function comoCompatible(a: readonly string[] = [], b: readonly string[] = []): string[] | null {
  if (!a.length || !b.length) return null;
  const comunes = a.filter((x) => b.includes(x));
  if (comunes.length) return comunes;
  if (a.includes("a_conversar") || b.includes("a_conversar")) return ["a_conversar"];
  return null;
}

/** Primer nombre de una persona; el nombre entero si es un perfil de entidad (de antes). */
export function nombreCorto(p: Pick<Perfil, "nombre" | "tipo">): string {
  const nombre = p.nombre.trim();
  if (p.tipo && p.tipo !== "persona") return nombre;
  return nombre.split(/\s+/)[0] || nombre;
}

export function encajeNetworking(yo: DatosEncajeNetworking, otro: DatosEncajeNetworking, nombreOtro: string): Encaje {
  let puntos = 0;
  const razones: Array<[number, string]> = [];
  const quien = nombreOtro.trim() || "Esta persona";

  // 1) Lo que busco y el otro ofrece (hasta 30).
  const meSirve = cruzar(yo.busca, otro.ofrece);
  const pMe = puntosCruce(meSirve);
  puntos += pMe;
  if (meSirve.exactas.length) {
    razones.push([pMe + 1, `${quien} ofrece ${lista(meSirve.exactas.slice(0, 2).map(etiqueta))}, que es lo que buscás`]);
  } else if (meSirve.porCategoria.length) {
    const { busca, ofrece } = meSirve.porCategoria[0];
    razones.push([pMe + 1, `Buscás ${etiqueta(busca)} y ${quien} ofrece ${etiqueta(ofrece)}`]);
  }

  // 2) Lo que el otro busca y yo ofrezco (hasta 30).
  const lesSirvo = cruzar(otro.busca, yo.ofrece);
  const pLes = puntosCruce(lesSirvo);
  puntos += pLes;
  if (lesSirvo.exactas.length) {
    razones.push([pLes, `Busca ${lista(lesSirvo.exactas.slice(0, 2).map(etiqueta))}, que es lo que ofrecés vos`]);
  } else if (lesSirvo.porCategoria.length) {
    const { busca, ofrece } = lesSirvo.porCategoria[0];
    razones.push([pLes, `Busca ${etiqueta(busca)} y vos ofrecés ${etiqueta(ofrece)}`]);
  }

  // 3) "Cómo" compatible en cada dirección con coincidencia (+4 cada una).
  const comos: string[] = [];
  if (pMe > 0) {
    const c = comoCompatible(yo.busca_como, otro.ofrece_como);
    if (c) {
      puntos += 4;
      comos.push(...c);
    }
  }
  if (pLes > 0) {
    const c = comoCompatible(otro.busca_como, yo.ofrece_como);
    if (c) {
      puntos += 4;
      comos.push(...c);
    }
  }
  if (comos.length) {
    const unicos = [...new Set(comos)];
    razones.push([
      6,
      unicos.length === 1 && unicos[0] === "a_conversar"
        ? "El cómo, a conversar"
        : `Coinciden en el cómo: ${lista(unicos.map((c) => labelComo(c).toLowerCase()))}`,
    ]);
  }

  // 4) Zona (hasta 12): la misma ciudad pesa más que el mismo país.
  const l1 = lugar(yo.ubicacion);
  const l2 = lugar(otro.ubicacion);
  if (l1 && l2) {
    if (l1.ciudad === l2.ciudad) {
      puntos += 12;
      razones.push([11, `Misma zona: ${otro.ubicacion}`]);
    } else if (l1.pais === l2.pais) {
      puntos += 6;
      razones.push([5, `Mismo país: ${otro.ubicacion}`]);
    }
  }

  // 5) Industrias en común (hasta 8).
  const comunes = (yo.industrias ?? []).filter((i) => (otro.industrias ?? []).includes(i));
  if (comunes.length > 0) {
    puntos += comunes.length >= 2 ? 8 : 5;
    razones.push([7, `Industrias en común: ${comunes.slice(0, 2).map(labelIndustria).join(", ")}`]);
  }

  // 6) Etapa (4).
  if (yo.etapa && otro.etapa && yo.etapa === otro.etapa) {
    puntos += 4;
    razones.push([3, `Misma etapa: ${labelEtapa(yo.etapa) ?? yo.etapa}`]);
  }

  puntos = Math.max(0, Math.min(100, puntos));
  return {
    puntos,
    nivel: puntos >= 45 ? "alto" : puntos >= 20 ? "medio" : "bajo",
    razones: razones.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, t]) => t),
  };
}

/** Busca y ofrece completos: lo que pide el networking para no volver a avisar. */
export const buscaOfreceCompleto = (p: Pick<Perfil, "busca" | "ofrece">) =>
  (p.busca ?? []).length > 0 && (p.ofrece ?? []).length > 0;

/** Algo en busca u ofrece: lo mínimo para aparecer en el networking y mostrar interés. */
export const haceNetworking = (p: Pick<Perfil, "busca" | "ofrece">) =>
  (p.busca ?? []).length > 0 || (p.ofrece ?? []).length > 0;

/** Opciones para elegir (sin las "en general" de antes). */
export const OPCIONES_ELEGIBLES = NECESIDADES.filter((n) => !esNecesidadGeneral(n.valor));

/**
 * Ejemplos por rol para arrancar: tocarlos SUMA estas opciones (nunca reemplaza). Son
 * ejemplos, no reglas: cada persona elige lo suyo.
 */
export type EjemploBuscaOfrece = {
  id: string;
  titulo: string;
  busca: Necesidad[];
  ofrece: Necesidad[];
  busca_como?: Como[];
  ofrece_como?: Como[];
};

export const EJEMPLOS_BUSCA_OFRECE: EjemploBuscaOfrece[] = [
  {
    id: "startup-mvp",
    titulo: "Una startup en etapa de MVP",
    busca: ["inversion_angel", "pilotos", "clientes", "mentoria", "creditos_nube", "pruebas_usuarios"],
    ofrece: ["pasantias", "colaboracion", "networking"],
    busca_como: ["canje", "a_conversar"],
  },
  {
    id: "inversora-angel",
    titulo: "Una inversora ángel",
    busca: ["networking", "alianzas", "aceleracion"],
    ofrece: ["inversion_angel", "mentoria", "asesores", "networking"],
    ofrece_como: ["a_conversar"],
  },
  {
    id: "estudio-contable",
    titulo: "Un estudio contable",
    busca: ["clientes", "alianzas", "networking"],
    ofrece: ["contable", "legal", "capacitacion"],
    ofrece_como: ["pago", "a_conversar"],
  },
  {
    id: "laboratorio",
    titulo: "Un laboratorio universitario",
    busca: ["alianzas", "fondos_publicos", "pilotos", "innovacion_abierta"],
    ofrece: ["laboratorio", "investigacion", "universidad_empresa", "equipamiento", "pasantias"],
    ofrece_como: ["pago", "canje", "a_conversar"],
  },
  {
    id: "empresa-grande",
    titulo: "Una empresa grande",
    busca: ["innovacion_abierta", "proveedores", "ia", "alianzas"],
    ofrece: ["pilotos", "distribucion", "mentoria", "empleo"],
    ofrece_como: ["pago", "a_conversar"],
  },
  {
    id: "freelance-dev",
    titulo: "Una desarrolladora freelance",
    busca: ["proyectos_freelance", "clientes", "networking"],
    ofrece: ["desarrollo", "mvp", "ia", "apis"],
    ofrece_como: ["pago", "canje"],
  },
  {
    id: "estudiante",
    titulo: "Un estudiante",
    busca: ["pasantias", "empleo", "capacitacion", "mentoria"],
    ofrece: ["colaboracion", "pruebas_usuarios"],
    ofrece_como: ["sin_costo"],
  },
];

/**
 * Consentimiento OPCIONAL para compartir el perfil con la organización de la Feria 21 (Ley
 * 25.326). Nunca es condición para usar Pecera ni el networking. Si cambia el texto, cambia la
 * versión (la base guarda cuál se aceptó).
 */
export const CONSENTIMIENTO_U21 = {
  version: "u21-v1",
  texto:
    "Acepto compartir mi perfil y lo que busco y ofrezco con la Universidad Siglo 21, organizadora de la Feria 21, para facilitar conexiones durante el evento.",
} as const;

/** El aviso de networking de la feria se cerró hoy en este dispositivo (localStorage). */
const CLAVE_AVISO = "pecera:aviso-networking";

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

export function avisoCerradoHoy(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_AVISO) === hoy();
  } catch {
    return false;
  }
}

const oyentesAviso = new Set<() => void>();

/** Para useSyncExternalStore: avisa cuando se cierra el aviso. */
export function suscribirAviso(oyente: () => void): () => void {
  oyentesAviso.add(oyente);
  return () => oyentesAviso.delete(oyente);
}

export function cerrarAvisoHoy(): void {
  try {
    window.localStorage.setItem(CLAVE_AVISO, hoy());
  } catch {
    // Sin almacenamiento: vuelve a aparecer la próxima vez, nada más.
  }
  for (const oyente of oyentesAviso) oyente();
}
