/**
 * Score crediticio de una empresa, de A a D. Categoriza, para quien invierte, cuánta
 * información de la empresa está disponible y es transparente en su Dataroom: menos
 * información = más incertidumbre = más riesgo. A es el menor riesgo; D, el mayor y el
 * punto de partida: TODAS las empresas tienen score y arrancan en D, y suben sumando
 * información transparente.
 *
 * Es una función pura de lo que la empresa hizo TRANSPARENTE (documentos y datos con el
 * switch en "Transparente"): lo que un inversor puede ver. Lo privado no cuenta, porque
 * no se puede verificar, y así el score no filtra nada de lo que la empresa no mostró.
 * Se calcula en la app (no hay tabla ni migración): por eso este archivo no importa nada
 * en runtime y se prueba con `node scripts/pruebas/score.ts`.
 *
 * Mide cuánta información hay, NO si es verdadera ni la solvencia de la empresa. No es
 * una calificación de riesgo regulada ni asesoramiento financiero (se dice en la
 * pantalla). Los pesos y umbrales son una decisión de producto: cambiarlos cambia el
 * score de todas las empresas, así que se prueban en scripts/pruebas/score.ts.
 */
import type { CategoriaDataroom } from "@/lib/dataroom";

export type Letra = "A" | "B" | "C" | "D";
export type AreaId = Exclude<CategoriaDataroom, "otros">;

export type AreaDef = {
  id: AreaId;
  label: string;
  /** Puntos que suma (de 100) si el área tiene al menos una pieza transparente. */
  peso: number;
  /** Qué subir, en una frase: lo que se muestra si el catálogo de la app no tiene métricas para el área. */
  sumar: string;
};

/** Las áreas del Dataroom que cuentan (sin "Otros"), de más a menos peso. Suman 100. */
export const AREAS: readonly AreaDef[] = [
  { id: "finanzas", label: "Finanzas", peso: 20, sumar: "unit economics, proyecciones o cap table" },
  { id: "traccion", label: "Tracción", peso: 20, sumar: "ingresos, clientes, usuarios o crecimiento" },
  { id: "legal", label: "Legal", peso: 15, sumar: "estatuto, pacto de socios, vesting o cesión de propiedad intelectual" },
  { id: "fundraising", label: "Fundraising", peso: 10, sumar: "cuánto buscan, la valuación y en qué usan los fondos" },
  { id: "fundadores", label: "Fundadores y equipo", peso: 10, sumar: "quiénes son y por qué ellos (un texto o un link)" },
  { id: "producto", label: "Producto", peso: 8, sumar: "problema, solución o propuesta de valor" },
  { id: "mercado", label: "Mercado", peso: 7, sumar: "TAM/SAM/SOM, cliente ideal o competencia" },
  { id: "modelo", label: "Modelo de negocio", peso: 5, sumar: "cómo ganan plata y cómo llegan a sus clientes" },
  { id: "empresa", label: "Empresa", peso: 5, sumar: "pitch deck, one-pager o un texto sobre la empresa" },
];

const POR_AREA = new Map(AREAS.map((a) => [a.id, a]));
export const areaScore = (id: string) => POR_AREA.get(id as AreaId);

/**
 * Cada letra: puntos mínimos y áreas que sí o sí tienen que estar. Sin esas áreas no se
 * sube de letra aunque sobren puntos: un A sin finanzas ni tracción no le sirve a nadie.
 * D no pide nada: es el piso y lo tiene toda empresa.
 */
export const UMBRALES: Record<Letra, { puntos: number; areas: readonly AreaId[] }> = {
  A: { puntos: 85, areas: ["finanzas", "traccion", "legal"] },
  B: { puntos: 60, areas: ["finanzas", "traccion"] },
  C: { puntos: 30, areas: [] },
  D: { puntos: 0, areas: [] },
};

export const ORDEN_LETRAS: readonly Letra[] = ["D", "C", "B", "A"];

/** Lo mínimo de un documento del Dataroom que mira el score (`Documento` de lib/dataroom lo cumple). */
export type DocumentoScore = {
  categoria: string;
  tipo: string;
  completo: boolean;
  url: string | null;
  cuerpo: string | null;
  visible: boolean;
  archivado: boolean;
};

/** Lo mínimo de un dato de Transparencia (`DatoEmpresa`). */
export type DatoScore = { clave: string; valor: string | null; url: string | null; visible: boolean };

/** Un texto escrito cuenta si dice algo: `completo` solo marca que no está vacío. */
export const LARGO_MINIMO_ESCRITO = 200;

export type AreaEstado = AreaDef & { cubierta: boolean; piezas: number };

export type Siguiente = {
  letra: Letra;
  /** Áreas que hay que sumar, en el orden en que conviene (primero las obligatorias). */
  agregar: AreaDef[];
  /** Puntos que faltan para esa letra (0 si solo falta una área obligatoria). */
  faltan: number;
};

export type Score = {
  /** Siempre hay letra: sin nada transparente, D. */
  letra: Letra;
  puntos: number;
  areas: AreaEstado[];
  cubiertas: number;
  /** Lo que sigue para subir una letra; null en la A. */
  siguiente: Siguiente | null;
};

const esHttps = (u: string | null) => !!u && u.length <= 500 && /^https:\/\/\S+$/i.test(u);

/** ¿El documento aporta información real? Plantilla completa, link https o un texto con cuerpo. */
function cuenta(d: DocumentoScore): boolean {
  if (d.archivado) return false;
  if (d.tipo === "plantilla") return d.completo;
  if (d.tipo === "link") return esHttps(d.url);
  if (d.tipo === "escrito") return (d.cuerpo ?? "").trim().length >= LARGO_MINIMO_ESCRITO;
  return false;
}

function letraDe(puntos: number, cubiertas: ReadonlySet<AreaId>): Letra {
  for (const l of ["A", "B", "C"] as const) {
    const u = UMBRALES[l];
    if (puntos >= u.puntos && u.areas.every((a) => cubiertas.has(a))) return l;
  }
  return "D";
}

/** Qué sumar para llegar a `letra`: las áreas obligatorias que faltan y, si hace falta, las más pesadas. */
function planPara(letra: Letra, estado: AreaEstado[], puntos: number): Siguiente {
  const u = UMBRALES[letra];
  const faltantes = estado.filter((a) => !a.cubierta);
  const obligatorias = faltantes.filter((a) => u.areas.includes(a.id));
  const agregar: AreaDef[] = [...obligatorias];
  let total = puntos + obligatorias.reduce((s, a) => s + a.peso, 0);
  for (const a of faltantes.filter((x) => !u.areas.includes(x.id))) {
    if (total >= u.puntos && agregar.length > 0) break;
    agregar.push(a);
    total += a.peso;
  }
  return { letra, agregar: agregar.map(({ id, label, peso, sumar }) => ({ id, label, peso, sumar })), faltan: Math.max(0, u.puntos - puntos) };
}

/**
 * Calcula el score. `categoriaDeDato` dice en qué área del Dataroom cae cada dato de
 * Transparencia (`CATEGORIA_DE_DATO` de lib/dataroom). `soloVisibles` (por defecto sí)
 * es el score público; con `false` cuenta también lo privado: lo que el equipo tendría
 * si hiciera transparente todo lo que ya subió (solo se usa en el panel del dueño).
 */
export function calcularScore(
  entrada: { documentos: readonly DocumentoScore[]; datos: readonly DatoScore[] },
  categoriaDeDato: Readonly<Record<string, string>>,
  opciones: { soloVisibles?: boolean } = {}
): Score {
  const soloVisibles = opciones.soloVisibles ?? true;
  const piezas = new Map<string, number>();
  const sumar = (area: string | undefined) => {
    if (area && POR_AREA.has(area as AreaId)) piezas.set(area, (piezas.get(area) ?? 0) + 1);
  };

  for (const d of entrada.documentos) {
    if (soloVisibles && !d.visible) continue;
    if (cuenta(d)) sumar(d.categoria);
  }
  for (const d of entrada.datos) {
    if (soloVisibles && !d.visible) continue;
    if (!(d.valor ?? "").trim() && !esHttps(d.url)) continue;
    sumar(categoriaDeDato[d.clave]);
  }

  const areas: AreaEstado[] = AREAS.map((a) => ({ ...a, piezas: piezas.get(a.id) ?? 0, cubierta: (piezas.get(a.id) ?? 0) > 0 }));
  const cubiertas = new Set(areas.filter((a) => a.cubierta).map((a) => a.id));
  const puntos = areas.reduce((s, a) => s + (a.cubierta ? a.peso : 0), 0);
  const letra = letraDe(puntos, cubiertas);

  const proxima = ORDEN_LETRAS[ORDEN_LETRAS.indexOf(letra) + 1];
  return {
    letra,
    puntos,
    areas,
    cubiertas: cubiertas.size,
    siguiente: proxima ? planPara(proxima, areas, puntos) : null,
  };
}

/** Cómo se llama y se ve cada nivel. "según lo documentado": nunca se afirma el riesgo de la empresa en sí. */
export const NIVELES_SCORE: Record<Letra, { titulo: string; resumen: string; clase: string }> = {
  A: { titulo: "Riesgo bajo", resumen: "Dataroom casi completo y transparente", clase: "bg-t-verde-suave text-t-verde" },
  B: { titulo: "Riesgo moderado", resumen: "Buena parte del Dataroom es transparente", clase: "bg-t-petroleo-suave text-t-petroleo" },
  C: { titulo: "Riesgo elevado", resumen: "Poca información transparente", clase: "bg-t-ocre-suave text-t-ocre" },
  D: { titulo: "Riesgo alto", resumen: "Información mínima", clase: "bg-t-arcilla-suave text-t-arcilla" },
};

/** Lo que la app tiene para cargar en cada área: métricas y documentos de Transparencia, y templates de Academy. */
export type MetricasArea = {
  /** Cifras (MRR, Churn, Runway…): los datos de Transparencia de tipo texto. */
  metricas: string[];
  /** Documentos con link (Estatuto, Cap table, Pitch deck…): los datos de tipo link. */
  documentos: string[];
  /** Documentos guiados de Academy que se completan por pasos. */
  templates: string[];
};

/**
 * Arma, por área, qué métricas, documentos y templates de la app suben el score. Sale de
 * los catálogos reales (`DATOS` de lib/transparencia y `PLANTILLAS` de lib/plantillas),
 * así que si se agrega uno nuevo, aparece solo en "Cómo mejorarlo".
 */
export function construirMetricas(
  catalogo: {
    datos: ReadonlyArray<{ clave: string; label: string; tipo: string }>;
    plantillas: ReadonlyArray<{ categoria: string; nombre: string }>;
  },
  categoriaDeDato: Readonly<Record<string, string>>
): Record<AreaId, MetricasArea> {
  const por = Object.fromEntries(AREAS.map((a) => [a.id, { metricas: [], documentos: [], templates: [] }])) as unknown as Record<AreaId, MetricasArea>;
  for (const d of catalogo.datos) {
    const area = por[categoriaDeDato[d.clave] as AreaId];
    if (area) (d.tipo === "link" ? area.documentos : area.metricas).push(d.label);
  }
  for (const p of catalogo.plantillas) por[p.categoria as AreaId]?.templates.push(p.nombre);
  return por;
}
