/**
 * Transparencia de cada empresa: métricas y documentos que el equipo carga en
 * /cuenta. Privados por defecto; cada uno se comparte por separado y aparece en la
 * página pública (/e/slug). Espejo de `empresa_datos_clave_valida` en
 * supabase/migrations/20261001120000_feria_lista.sql.
 */

export type CategoriaDato = "Tracción" | "Unit economics" | "Estrategia" | "Ronda" | "Documentos";

export type DefDato = {
  clave: string;
  label: string;
  categoria: CategoriaDato;
  /** "texto": un valor corto (ej. "USD 4.200"). "link": un https:// a un documento. */
  tipo: "texto" | "link";
  ayuda: string;
  ejemplo: string;
  /** Término del glosario de /docs/conceptos, si hay. */
  concepto?: string;
};

export const CATEGORIAS_DATO: CategoriaDato[] = [
  "Tracción",
  "Unit economics",
  "Estrategia",
  "Ronda",
  "Documentos",
];

export const DATOS: DefDato[] = [
  // Tracción
  { clave: "mrr", label: "MRR", categoria: "Tracción", tipo: "texto", ayuda: "Ingreso recurrente mensual.", ejemplo: "USD 4.200", concepto: "mrr" },
  { clave: "arr", label: "ARR", categoria: "Tracción", tipo: "texto", ayuda: "Ingreso recurrente anual (MRR × 12).", ejemplo: "USD 50.400", concepto: "arr" },
  { clave: "clientes", label: "Clientes", categoria: "Tracción", tipo: "texto", ayuda: "Clientes que pagan hoy.", ejemplo: "37 pymes" },
  { clave: "usuarios_activos", label: "Usuarios activos", categoria: "Tracción", tipo: "texto", ayuda: "Usuarios que usan el producto por mes.", ejemplo: "1.200 MAU", concepto: "dau-mau" },
  { clave: "crecimiento_mensual", label: "Crecimiento mensual", categoria: "Tracción", tipo: "texto", ayuda: "Cuánto crecen los ingresos o usuarios mes a mes.", ejemplo: "+18% m/m", concepto: "crecimiento-mom" },
  { clave: "retencion", label: "Retención", categoria: "Tracción", tipo: "texto", ayuda: "Qué parte de los clientes sigue a los 3 o 12 meses.", ejemplo: "82% a 6 meses", concepto: "retencion" },
  { clave: "churn", label: "Churn", categoria: "Tracción", tipo: "texto", ayuda: "Qué parte de los clientes se va por mes.", ejemplo: "2,5% mensual", concepto: "churn" },
  { clave: "nps", label: "NPS", categoria: "Tracción", tipo: "texto", ayuda: "Cuánto te recomiendan (de -100 a 100).", ejemplo: "61", concepto: "nps" },
  { clave: "gmv", label: "GMV", categoria: "Tracción", tipo: "texto", ayuda: "Volumen total transaccionado (marketplaces).", ejemplo: "USD 120 mil/mes", concepto: "gmv" },
  // Unit economics
  { clave: "cac", label: "CAC", categoria: "Unit economics", tipo: "texto", ayuda: "Cuánto cuesta conseguir un cliente.", ejemplo: "USD 85", concepto: "cac" },
  { clave: "ltv", label: "LTV", categoria: "Unit economics", tipo: "texto", ayuda: "Cuánto deja un cliente en toda su vida.", ejemplo: "USD 900", concepto: "ltv" },
  { clave: "ltv_cac", label: "LTV/CAC", categoria: "Unit economics", tipo: "texto", ayuda: "Cuántas veces recuperás lo que cuesta un cliente.", ejemplo: "10,6x", concepto: "ltv-cac" },
  { clave: "payback", label: "Payback de CAC", categoria: "Unit economics", tipo: "texto", ayuda: "Meses para recuperar el costo de un cliente.", ejemplo: "4 meses", concepto: "payback" },
  { clave: "margen_bruto", label: "Margen bruto", categoria: "Unit economics", tipo: "texto", ayuda: "Lo que queda de cada venta después del costo directo.", ejemplo: "68%", concepto: "margen-bruto" },
  { clave: "ticket_promedio", label: "Ticket promedio", categoria: "Unit economics", tipo: "texto", ayuda: "Lo que paga en promedio cada cliente.", ejemplo: "USD 110/mes", concepto: "arpu" },
  { clave: "burn_rate", label: "Burn rate", categoria: "Unit economics", tipo: "texto", ayuda: "Cuánta caja se consume por mes.", ejemplo: "USD 6.000/mes", concepto: "burn-rate" },
  { clave: "runway", label: "Runway", categoria: "Unit economics", tipo: "texto", ayuda: "Meses de vida con la caja actual.", ejemplo: "14 meses", concepto: "runway" },
  // Estrategia
  { clave: "moat", label: "MOAT", categoria: "Estrategia", tipo: "texto", ayuda: "Qué hace difícil copiarte.", ejemplo: "Datos propios de 48.000 cabezas de ganado", concepto: "moat" },
  { clave: "tam", label: "TAM", categoria: "Estrategia", tipo: "texto", ayuda: "Mercado total si fueras el único.", ejemplo: "USD 2.000 M en LatAm", concepto: "tam-sam-som" },
  { clave: "sam", label: "SAM", categoria: "Estrategia", tipo: "texto", ayuda: "La parte del mercado a la que llegás.", ejemplo: "USD 300 M en Argentina", concepto: "tam-sam-som" },
  { clave: "som", label: "SOM", categoria: "Estrategia", tipo: "texto", ayuda: "Lo que podés ganar en 3 a 5 años.", ejemplo: "USD 15 M", concepto: "tam-sam-som" },
  { clave: "modelo_negocio", label: "Modelo de negocio", categoria: "Estrategia", tipo: "texto", ayuda: "Quién paga, cuánto y cada cuánto.", ejemplo: "Suscripción mensual por establecimiento", concepto: "modelo-de-negocio" },
  { clave: "go_to_market", label: "Go-to-market", categoria: "Estrategia", tipo: "texto", ayuda: "Cómo llegás a tus clientes.", ejemplo: "Venta directa a cooperativas + referidos", concepto: "go-to-market" },
  { clave: "competencia", label: "Competencia", categoria: "Estrategia", tipo: "texto", ayuda: "Con quién te comparan y por qué te eligen.", ejemplo: "Planillas y 2 SaaS de EE. UU. caros", concepto: "competencia" },
  // Ronda
  { clave: "ronda_monto", label: "Monto que buscás", categoria: "Ronda", tipo: "texto", ayuda: "Cuánto querés levantar en esta ronda.", ejemplo: "USD 150 mil", concepto: "ronda" },
  { clave: "valuacion", label: "Valuación / cap", categoria: "Ronda", tipo: "texto", ayuda: "Valuación o tope del SAFE.", ejemplo: "Cap USD 1,8 M post-money", concepto: "valuation-cap" },
  { clave: "uso_fondos", label: "Uso de fondos", categoria: "Ronda", tipo: "texto", ayuda: "En qué se va a usar la plata.", ejemplo: "60% producto, 40% ventas", concepto: "uso-de-fondos" },
  { clave: "inversores_actuales", label: "Inversores actuales", categoria: "Ronda", tipo: "texto", ayuda: "Quién ya puso plata, si se puede decir.", ejemplo: "FFF + 1 ángel", concepto: "fff" },
  // Documentos
  { clave: "pitch_deck", label: "Pitch deck", categoria: "Documentos", tipo: "link", ayuda: "8 a 10 slides, en PDF o link.", ejemplo: "https://drive.google.com/…", concepto: "pitch-deck" },
  { clave: "one_pager", label: "One-pager", categoria: "Documentos", tipo: "link", ayuda: "Resumen en una hoja.", ejemplo: "https://…", concepto: "one-pager" },
  { clave: "video_demo", label: "Video demo", categoria: "Documentos", tipo: "link", ayuda: "El producto funcionando.", ejemplo: "https://youtu.be/…" },
  { clave: "cap_table", label: "Cap table", categoria: "Documentos", tipo: "link", ayuda: "Quién tiene qué porcentaje.", ejemplo: "https://…", concepto: "cap-table" },
  { clave: "proyecciones", label: "Proyecciones financieras", categoria: "Documentos", tipo: "link", ayuda: "Modelo a 3 años.", ejemplo: "https://…", concepto: "proyecciones" },
  { clave: "data_room", label: "Data room", categoria: "Documentos", tipo: "link", ayuda: "Carpeta con todo para la due diligence.", ejemplo: "https://…", concepto: "data-room" },
  { clave: "estatuto", label: "Estatuto", categoria: "Documentos", tipo: "link", ayuda: "El de la SAS o sociedad.", ejemplo: "https://…", concepto: "sas" },
  { clave: "pacto_socios", label: "Pacto de socios", categoria: "Documentos", tipo: "link", ayuda: "Acuerdo entre fundadores e inversores.", ejemplo: "https://…", concepto: "pacto-de-socios" },
  { clave: "vesting", label: "Vesting de fundadores", categoria: "Documentos", tipo: "link", ayuda: "Cómo se ganan las acciones con el tiempo.", ejemplo: "https://…", concepto: "vesting" },
  { clave: "safe", label: "SAFE", categoria: "Documentos", tipo: "link", ayuda: "Modelo o SAFE firmado.", ejemplo: "https://…", concepto: "safe" },
  { clave: "term_sheet", label: "Term sheet", categoria: "Documentos", tipo: "link", ayuda: "Condiciones de la ronda.", ejemplo: "https://…", concepto: "term-sheet" },
  { clave: "nda", label: "NDA", categoria: "Documentos", tipo: "link", ayuda: "Acuerdo de confidencialidad.", ejemplo: "https://…", concepto: "nda" },
  { clave: "cesion_ip", label: "Cesión de propiedad intelectual", categoria: "Documentos", tipo: "link", ayuda: "El código y la marca son de la empresa.", ejemplo: "https://…", concepto: "cesion-de-pi" },
  { clave: "plan_esop", label: "Plan de opciones (ESOP)", categoria: "Documentos", tipo: "link", ayuda: "Acciones reservadas para el equipo.", ejemplo: "https://…", concepto: "esop" },
];

export const CLAVES_DATO = new Set(DATOS.map((d) => d.clave));

const POR_CLAVE = new Map(DATOS.map((d) => [d.clave, d]));
export const defDato = (clave: string) => POR_CLAVE.get(clave);

/** Solo https: los documentos se abren en otra pestaña y no queremos http ni javascript:. */
export function esUrlSegura(url: string): boolean {
  if (url.length > 300 || /\s/.test(url)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
