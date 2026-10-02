import { aporte, labelDedicacion, labelEtapa, labelIndustria } from "@/lib/etiquetas";
import type { Perfil } from "@/types/pecera";

/**
 * Encaje entre dos personas que buscan cofundador/a. Mide COMPLEMENTO y no parecido: lo
 * que más pesa es que lo que una aporta sea lo que la otra busca (una persona de producto
 * y una técnica encajan mejor que dos de producto), después la dedicación, la zona, las
 * industrias y la etapa. Es una guía para ORDENAR la lista, no una verdad sobre si dos
 * personas van a trabajar bien juntas: por eso se muestra el porqué de cada encaje y nunca
 * un número suelto.
 */

export type DatosEncaje = Pick<
  Perfil,
  "cofundador_aporta" | "cofundador_busca" | "cofundador_dedicacion" | "ubicacion" | "industrias" | "etapa"
>;

export type Encaje = {
  /** 0-100: solo para ordenar. */
  puntos: number;
  nivel: "alto" | "medio" | "bajo";
  /** Hasta tres razones concretas, en el orden en que más pesan. */
  razones: string[];
};

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** "Córdoba, Argentina" → ["cordoba", "argentina"]: ciudad y país, sin tildes. */
function lugar(t?: string | null): { ciudad: string; pais: string } | null {
  if (!t) return null;
  const partes = sinAcentos(t).split(/[,/·-]/).map((x) => x.trim()).filter(Boolean);
  if (partes.length === 0) return null;
  return { ciudad: partes[0], pais: partes[partes.length - 1] };
}

export function encaje(yo: DatosEncaje, otro: DatosEncaje): Encaje {
  let puntos = 0;
  const razones: Array<[number, string]> = [];

  // 1) Complemento (hasta 50): lo que el otro aporta es lo que busco, y al revés.
  const otroAporta = otro.cofundador_aporta ?? null;
  const yoAporto = yo.cofundador_aporta ?? null;
  const yoBusco = yo.cofundador_busca ?? [];
  const otroBusca = otro.cofundador_busca ?? [];
  const meSirve = !!otroAporta && yoBusco.includes(otroAporta);
  const lesSirvo = !!yoAporto && otroBusca.includes(yoAporto);
  if (meSirve) {
    puntos += 25;
    razones.push([25, `Aporta ${aporte(otroAporta)?.label.toLowerCase() ?? otroAporta}, que es lo que buscás`]);
  }
  if (lesSirvo) {
    puntos += 25;
    razones.push([24, `Busca ${aporte(yoAporto)?.label.toLowerCase() ?? yoAporto}, que es lo que aportás vos`]);
  }
  // Dos perfiles iguales que no se buscan entre sí pesan menos: pisan el mismo lugar.
  if (!meSirve && !lesSirvo && otroAporta && otroAporta === yoAporto) puntos -= 5;

  // 2) Dedicación (hasta 15).
  const d1 = yo.cofundador_dedicacion;
  const d2 = otro.cofundador_dedicacion;
  if (d1 && d2) {
    if (d1 === d2) {
      puntos += 15;
      razones.push([15, d1 === "full" ? "Los dos, a tiempo completo" : `Misma dedicación: ${labelDedicacion(d1)?.toLowerCase()}`]);
    } else if (d1 === "explorando" || d2 === "explorando") {
      puntos += 7;
    } else {
      puntos += 5;
    }
  }

  // 3) Zona (hasta 15): la misma ciudad pesa más que el mismo país.
  const l1 = lugar(yo.ubicacion);
  const l2 = lugar(otro.ubicacion);
  if (l1 && l2) {
    if (l1.ciudad === l2.ciudad) {
      puntos += 15;
      razones.push([14, `Misma zona: ${otro.ubicacion}`]);
    } else if (l1.pais === l2.pais) {
      puntos += 7;
      razones.push([7, `Mismo país: ${otro.ubicacion}`]);
    }
  }

  // 4) Industrias en común (hasta 10).
  const comunes = (yo.industrias ?? []).filter((i) => (otro.industrias ?? []).includes(i));
  if (comunes.length > 0) {
    puntos += comunes.length >= 2 ? 10 : 5;
    razones.push([10, `Industrias en común: ${comunes.slice(0, 2).map(labelIndustria).join(", ")}`]);
  }

  // 5) Etapa (hasta 10).
  if (yo.etapa && otro.etapa && yo.etapa === otro.etapa) {
    puntos += 10;
    razones.push([9, `Misma etapa: ${labelEtapa(yo.etapa) ?? yo.etapa}`]);
  }

  puntos = Math.max(0, Math.min(100, puntos));
  return {
    puntos,
    nivel: puntos >= 65 ? "alto" : puntos >= 40 ? "medio" : "bajo",
    razones: razones.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, t]) => t),
  };
}

export const NIVELES_ENCAJE = {
  alto: { label: "Encaje alto", clase: "bg-t-verde-suave text-t-verde" },
  medio: { label: "Encaje medio", clase: "bg-t-ocre-suave text-t-ocre" },
  bajo: { label: "Encaje bajo", clase: "bg-tinta/10 text-tinta/70" },
} as const;

export type Conexion = {
  tipo: "match" | "recibido" | "enviado";
  perfil_id: string;
  slug: string;
  nombre: string;
  rol: string;
  avatar_url: string | null;
  descripcion: string;
  mensaje: string;
  creado: string;
  whatsapp: string | null;
  email: string | null;
};

export const MENSAJE_MAX = 280;
