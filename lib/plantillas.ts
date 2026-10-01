import type { CategoriaDataroom, ValorCampo } from "@/lib/dataroom";

/**
 * Templates de Academy: documentos guiados que se completan por pasos, se guardan
 * solos y quedan en el Dataroom de la empresa. Viven en el código (como el glosario):
 * la base guarda solo las respuestas (`empresa_documentos.campos`).
 *
 * Un campo con `dato` también escribe ese dato de Transparencia (empresa_datos):
 * el número clave queda en un solo lugar para la página de la empresa, el One
 * Pager y la exportación. Cambiar el `id` de un template o de un campo deja
 * huérfanas las respuestas guardadas: no se hace.
 */

export type TipoCampo =
  | "texto"
  | "largo"
  | "numero"
  | "porcentaje"
  | "moneda"
  | "fecha"
  | "url"
  | "seleccion"
  | "si_no"
  | "tabla";

export type Campo = {
  id: string;
  label: string;
  tipo: TipoCampo;
  ayuda?: string;
  placeholder?: string;
  requerido?: boolean;
  /** Largo máximo de texto (por defecto 280 en texto, 1500 en largo). */
  max?: number;
  opciones?: ReadonlyArray<{ valor: string; label: string }>;
  /** Columnas de una tabla (cada fila es un objeto con estos ids). */
  columnas?: ReadonlyArray<{ id: string; label: string; placeholder?: string }>;
  /** Filas máximas de una tabla. */
  maxFilas?: number;
  /** Solo se muestra (y se pide) si otro campo tiene este valor. */
  si?: { campo: string; valor: string };
  /** Dato de Transparencia que este campo mantiene al día. */
  dato?: string;
};

export type Paso = { titulo: string; bajada?: string; campos: Campo[] };

export type Plantilla = {
  id: string;
  nombre: string;
  bajada: string;
  categoria: CategoriaDataroom;
  /** Lección de Startup Essentials que lo explica. */
  leccion: string;
  minutos: number;
  pasos: Paso[];
};

const MONEDAS = [
  { valor: "USD", label: "Dólares (USD)" },
  { valor: "ARS", label: "Pesos (ARS)" },
] as const;

const campoMoneda: Campo = {
  id: "moneda",
  label: "Moneda de los montos",
  tipo: "seleccion",
  opciones: MONEDAS,
  requerido: true,
};

export const PLANTILLAS: Plantilla[] = [
  {
    id: "problema-solucion",
    nombre: "Problema y solución",
    bajada: "El dolor que resolvés, para quién y por qué tu solución es mejor que lo que hay.",
    categoria: "producto",
    leccion: "problema-solucion",
    minutos: 10,
    pasos: [
      {
        titulo: "El problema",
        campos: [
          { id: "problema", label: "¿Qué problema resolvés?", tipo: "largo", requerido: true, max: 600, placeholder: "Ej.: Las huertas de balcón se abandonan porque la tierra de vivero se compacta y no retiene agua…" },
          { id: "quien", label: "¿A quién le duele?", tipo: "texto", requerido: true, placeholder: "Ej.: Personas que viven en departamentos y quieren cultivar" },
          { id: "hoy", label: "¿Cómo lo resuelven hoy?", tipo: "largo", requerido: true, max: 600, ayuda: "Las alternativas actuales, aunque sean planillas o “no hacer nada”." },
        ],
      },
      {
        titulo: "La solución",
        campos: [
          { id: "solucion", label: "¿Qué hace tu solución?", tipo: "largo", requerido: true, max: 600 },
          { id: "diferencia", label: "¿Por qué es mejor que lo de hoy?", tipo: "largo", requerido: true, max: 600 },
          { id: "evidencia", label: "¿Qué evidencia tenés de que el problema existe?", tipo: "largo", max: 600, ayuda: "Entrevistas, datos, ventas, lista de espera. Mejor un dato chico real que uno grande supuesto." },
        ],
      },
    ],
  },
  {
    id: "propuesta-valor",
    nombre: "Propuesta de valor",
    bajada: "Una frase que explique qué ganás vos, cliente, al elegirnos.",
    categoria: "producto",
    leccion: "propuesta-de-valor",
    minutos: 8,
    pasos: [
      {
        titulo: "Tu propuesta",
        campos: [
          { id: "frase", label: "En una frase", tipo: "texto", requerido: true, max: 160, placeholder: "Ej.: Huertas de balcón que no se mueren, sin saber de jardinería." },
          { id: "trabajo", label: "¿Qué “trabajo” viene a hacer el cliente?", tipo: "largo", requerido: true, max: 500, ayuda: "Lo que intenta lograr cuando te contrata, no las características del producto." },
          { id: "alivios", label: "¿Qué dolores le sacás?", tipo: "largo", requerido: true, max: 500 },
          { id: "ganancias", label: "¿Qué gana además?", tipo: "largo", max: 500 },
        ],
      },
    ],
  },
  {
    id: "cliente-ideal",
    nombre: "Cliente ideal",
    bajada: "A quién le vendés primero, con nombre y apellido.",
    categoria: "mercado",
    leccion: "cliente-ideal",
    minutos: 10,
    pasos: [
      {
        titulo: "Quién es",
        campos: [
          { id: "tipo", label: "¿Le vendés a personas o a empresas?", tipo: "seleccion", requerido: true, opciones: [{ valor: "b2c", label: "Personas (B2C)" }, { valor: "b2b", label: "Empresas (B2B)" }, { valor: "b2b2c", label: "A empresas que llegan a personas (B2B2C)" }, { valor: "b2g", label: "Gobierno (B2G)" }] },
          { id: "perfil", label: "Describilo", tipo: "largo", requerido: true, max: 600, placeholder: "Ej.: Pyme agropecuaria de 200 a 2.000 cabezas, en Entre Ríos, con un encargado que usa WhatsApp todo el día." },
          { id: "decide", label: "¿Quién decide la compra y quién paga?", tipo: "texto", si: { campo: "tipo", valor: "b2b" } },
        ],
      },
      {
        titulo: "Qué necesita",
        campos: [
          { id: "dolor", label: "Su dolor principal", tipo: "largo", requerido: true, max: 500 },
          { id: "donde", label: "¿Dónde lo encontrás?", tipo: "largo", requerido: true, max: 500, ayuda: "Canales, eventos, comunidades, asociaciones." },
          { id: "entrevistas", label: "¿Con cuántos hablaste?", tipo: "numero", ayuda: "Entrevistas de descubrimiento hechas hasta hoy." },
        ],
      },
    ],
  },
  {
    id: "tam-sam-som",
    nombre: "TAM, SAM y SOM",
    bajada: "El tamaño de tu mercado, de abajo hacia arriba y con fuentes.",
    categoria: "mercado",
    leccion: "tam-sam-som",
    minutos: 20,
    pasos: [
      {
        titulo: "Cómo lo calculás",
        bajada: "Un inversor mira más el razonamiento que el número.",
        campos: [
          { id: "metodo", label: "Método", tipo: "seleccion", requerido: true, opciones: [{ valor: "bottom_up", label: "De abajo hacia arriba (clientes × precio)" }, { valor: "top_down", label: "De arriba hacia abajo (informes de mercado)" }, { valor: "ambos", label: "Los dos" }] },
          { id: "supuestos", label: "Supuestos", tipo: "largo", requerido: true, max: 800, placeholder: "Ej.: cantidad de clientes posibles × precio anual, y de dónde sale cada número…" },
          { id: "fuentes", label: "Fuentes", tipo: "largo", max: 500, ayuda: "Censos, cámaras, informes. Con link si hay." },
        ],
      },
      {
        titulo: "Los tres números",
        campos: [
          campoMoneda,
          { id: "tam", label: "TAM: mercado total", tipo: "moneda", requerido: true, dato: "tam", ayuda: "Si fueras el único proveedor del mundo (o de tu región)." },
          { id: "sam", label: "SAM: al que llegás", tipo: "moneda", requerido: true, dato: "sam", ayuda: "La parte del TAM a la que tu producto y tus canales llegan hoy." },
          { id: "som", label: "SOM: lo que podés ganar en 3 a 5 años", tipo: "moneda", requerido: true, dato: "som" },
        ],
      },
    ],
  },
  {
    id: "modelo-negocio",
    nombre: "Modelo de negocio",
    bajada: "Los nueve bloques del Business Model Canvas, en tres pasos.",
    categoria: "modelo",
    leccion: "modelo-de-negocio",
    minutos: 20,
    pasos: [
      {
        titulo: "Clientes y propuesta",
        campos: [
          { id: "segmentos", label: "Segmentos de clientes", tipo: "largo", requerido: true, max: 400 },
          { id: "propuesta", label: "Propuesta de valor", tipo: "largo", requerido: true, max: 400 },
          { id: "canales", label: "Canales", tipo: "largo", requerido: true, max: 400, ayuda: "Cómo te conocen, te compran y reciben el producto." },
          { id: "relacion", label: "Relación con los clientes", tipo: "largo", max: 400 },
        ],
      },
      {
        titulo: "Cómo se gana plata",
        campos: [
          { id: "resumen", label: "En una línea: quién paga, cuánto y cada cuánto", tipo: "texto", requerido: true, max: 200, dato: "modelo_negocio", placeholder: "Ej.: Suscripción mensual por establecimiento" },
          { id: "ingresos", label: "Fuentes de ingreso", tipo: "largo", requerido: true, max: 400 },
          { id: "costos", label: "Estructura de costos", tipo: "largo", requerido: true, max: 400 },
        ],
      },
      {
        titulo: "Cómo funciona por dentro",
        campos: [
          { id: "recursos", label: "Recursos clave", tipo: "largo", max: 400 },
          { id: "actividades", label: "Actividades clave", tipo: "largo", max: 400 },
          { id: "socios", label: "Socios clave", tipo: "largo", max: 400 },
        ],
      },
    ],
  },
  {
    id: "go-to-market",
    nombre: "Go-to-market",
    bajada: "Cómo conseguís los primeros 100 clientes y cuánto te cuesta cada uno.",
    categoria: "modelo",
    leccion: "go-to-market",
    minutos: 12,
    pasos: [
      {
        titulo: "Tu estrategia",
        campos: [
          { id: "resumen", label: "En una línea", tipo: "texto", requerido: true, max: 200, dato: "go_to_market", placeholder: "Ej.: Venta directa a cooperativas + referidos" },
          { id: "canales", label: "Canales que probaste y qué resultó", tipo: "tabla", requerido: true, maxFilas: 6, columnas: [{ id: "canal", label: "Canal", placeholder: "Ej.: Ferias rurales" }, { id: "resultado", label: "Resultado", placeholder: "Ej.: 12 demos, 4 ventas" }] },
          { id: "proximos", label: "Próximos 90 días", tipo: "largo", max: 500 },
        ],
      },
    ],
  },
  {
    id: "competencia",
    nombre: "Análisis de competencia",
    bajada: "Con quién te comparan, en qué ganás y qué te hace difícil de copiar.",
    categoria: "mercado",
    leccion: "competencia",
    minutos: 12,
    pasos: [
      {
        titulo: "Competidores",
        campos: [
          { id: "competidores", label: "Competidores y alternativas", tipo: "tabla", requerido: true, maxFilas: 8, columnas: [{ id: "nombre", label: "Competidor", placeholder: "Ej.: Planillas de Excel" }, { id: "diferencia", label: "En qué te elegirían a vos", placeholder: "Ej.: Funciona sin conexión" }] },
          { id: "resumen", label: "Resumen para un inversor", tipo: "texto", requerido: true, max: 200, dato: "competencia" },
        ],
      },
      {
        titulo: "Tu ventaja",
        campos: [{ id: "moat", label: "¿Qué hace difícil copiarte?", tipo: "texto", max: 200, dato: "moat", ayuda: "Datos propios, red, marca, costos, regulación. Si todavía no hay, decilo." }],
      },
    ],
  },
  {
    id: "unit-economics",
    nombre: "Unit economics",
    bajada: "Cuánto cuesta ganar un cliente y cuánto deja.",
    categoria: "finanzas",
    leccion: "unit-economics",
    minutos: 15,
    pasos: [
      {
        titulo: "Costo y valor de un cliente",
        bajada: "Con números reales; si todavía no los tenés, dejá el campo vacío.",
        campos: [
          campoMoneda,
          { id: "cac", label: "CAC: cuánto cuesta conseguir un cliente", tipo: "moneda", requerido: true, dato: "cac" },
          { id: "ltv", label: "LTV: cuánto deja un cliente en toda su vida", tipo: "moneda", requerido: true, dato: "ltv" },
          { id: "margen", label: "Margen bruto", tipo: "porcentaje", dato: "margen_bruto" },
          { id: "payback", label: "Payback de CAC (meses)", tipo: "numero", dato: "payback" },
        ],
      },
      {
        titulo: "Caja",
        campos: [
          { id: "burn", label: "Burn rate mensual", tipo: "moneda", dato: "burn_rate" },
          { id: "runway", label: "Runway (meses)", tipo: "numero", dato: "runway" },
          { id: "corte", label: "Fecha de los números", tipo: "fecha", requerido: true, ayuda: "Para que se sepa de cuándo son." },
          { id: "notas", label: "Cómo los calculaste", tipo: "largo", max: 600 },
        ],
      },
    ],
  },
  {
    id: "fundraising",
    nombre: "Ronda de inversión",
    bajada: "Lo que buscás, en qué condiciones, para qué y quién ya invirtió.",
    categoria: "fundraising",
    leccion: "fundraising",
    minutos: 15,
    pasos: [
      {
        titulo: "Inversión previa",
        campos: [
          { id: "previa", label: "¿Ya recibieron inversión?", tipo: "si_no", requerido: true },
          { id: "previa_monto", label: "¿Cuánto en total?", tipo: "moneda", si: { campo: "previa", valor: "si" } },
          { id: "previa_quien", label: "¿De quién?", tipo: "texto", dato: "inversores_actuales", si: { campo: "previa", valor: "si" }, placeholder: "Ej.: FFF + 1 ángel" },
          { id: "previa_fecha", label: "¿Cuándo fue la última?", tipo: "fecha", si: { campo: "previa", valor: "si" } },
        ],
      },
      {
        titulo: "La ronda de hoy",
        campos: [
          campoMoneda,
          { id: "monto", label: "¿Cuánto buscan?", tipo: "moneda", requerido: true, dato: "ronda_monto" },
          { id: "instrumento", label: "Instrumento", tipo: "seleccion", requerido: true, opciones: [{ valor: "safe", label: "SAFE" }, { valor: "convertible", label: "Nota convertible" }, { valor: "acciones", label: "Acciones" }, { valor: "a_definir", label: "A definir" }] },
          { id: "valuacion", label: "Valuación o cap", tipo: "texto", dato: "valuacion", placeholder: "Ej.: Cap USD 1,8 M post-money" },
          { id: "minimo", label: "Ticket mínimo", tipo: "moneda" },
        ],
      },
      {
        titulo: "Para qué",
        campos: [
          { id: "uso", label: "Uso de fondos", tipo: "texto", requerido: true, max: 200, dato: "uso_fondos", placeholder: "Ej.: 60% producto, 40% ventas" },
          { id: "hitos", label: "¿Qué hitos van a lograr con esta plata?", tipo: "largo", requerido: true, max: 600 },
        ],
      },
    ],
  },
  {
    id: "equipo-fundador",
    nombre: "Equipo fundador",
    bajada: "Quiénes son, qué hace cada uno y por qué son el equipo para esto.",
    categoria: "fundadores",
    leccion: "equipo",
    minutos: 10,
    pasos: [
      {
        titulo: "El equipo",
        campos: [
          { id: "fundadores", label: "Fundadores", tipo: "tabla", requerido: true, maxFilas: 6, columnas: [{ id: "nombre", label: "Nombre" }, { id: "rol", label: "Rol", placeholder: "Ej.: CEO" }, { id: "dedicacion", label: "Dedicación", placeholder: "Ej.: Full time" }], ayuda: "Solo datos que quieran mostrar. Nada de documentos personales." },
          { id: "por_que", label: "¿Por qué ustedes?", tipo: "largo", requerido: true, max: 600, ayuda: "Experiencia, acceso al mercado, lo que ya construyeron juntos." },
          { id: "faltantes", label: "¿Qué rol les falta sumar?", tipo: "texto" },
        ],
      },
    ],
  },
];

const POR_ID = new Map(PLANTILLAS.map((p) => [p.id, p]));
export const plantilla = (id: string | null | undefined) => (id ? POR_ID.get(id) : undefined);

// ---------------------------------------------------------------------------
// Validación y progreso (cliente y servidor)
// ---------------------------------------------------------------------------

export const MAX_TEXTO = 280;
export const MAX_LARGO = 1500;
const MAX_CELDA = 200;

const vacio = (v: ValorCampo | undefined) =>
  v === undefined || (typeof v === "string" ? v.trim() === "" : v.every((f) => Object.values(f).every((x) => !x.trim())));

/** El campo se muestra según lo respondido (progressive disclosure). */
export function campoVisible(c: Campo, valores: Record<string, ValorCampo>): boolean {
  return !c.si || valores[c.si.campo] === c.si.valor;
}

/** Número con coma o punto decimal ("1.234,5" o "1234.5"). null si no es número. */
export function aNumero(v: string): number | null {
  const limpio = v.trim().replace(/[\s$]/g, "");
  if (!limpio) return null;
  let normal: string;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    // Miles con punto, como se escribe acá: 1.234.567,5
    normal = limpio.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(limpio)) {
    // Miles con coma: 1,234,567.5
    normal = limpio.replace(/,/g, "");
  } else {
    normal = limpio.replace(",", ".");
  }
  const n = Number(normal);
  return normal !== "" && Number.isFinite(n) ? n : null;
}

/** Error de un valor según su tipo, o null. No mira si es obligatorio. */
export function errorCampo(c: Campo, v: ValorCampo | undefined): string | null {
  if (vacio(v)) return null;
  if (c.tipo === "tabla") {
    if (!Array.isArray(v)) return "Revisá la tabla.";
    if (v.length > (c.maxFilas ?? 10)) return `Hasta ${c.maxFilas ?? 10} filas.`;
    if (v.some((f) => Object.values(f).some((x) => x.length > MAX_CELDA))) return `Cada celda va hasta ${MAX_CELDA} caracteres.`;
    return null;
  }
  if (typeof v !== "string") return "Revisá este dato.";
  switch (c.tipo) {
    case "numero":
    case "moneda": {
      const n = aNumero(v);
      if (n === null) return "Tiene que ser un número.";
      if (n < 0) return "No puede ser negativo.";
      return null;
    }
    case "porcentaje": {
      const n = aNumero(v);
      if (n === null) return "Tiene que ser un número.";
      if (n < -100 || n > 1000) return "Revisá el porcentaje.";
      return null;
    }
    case "fecha":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? null : "Revisá la fecha.";
    case "url":
      try {
        return new URL(v).protocol === "https:" && v.length <= 500 ? null : "El link tiene que empezar con https://";
      } catch {
        return "El link tiene que empezar con https://";
      }
    case "seleccion":
      return c.opciones?.some((o) => o.valor === v) ? null : "Elegí una opción de la lista.";
    case "si_no":
      return v === "si" || v === "no" ? null : "Elegí sí o no.";
    case "largo":
      return v.length > (c.max ?? MAX_LARGO) ? `Hasta ${c.max ?? MAX_LARGO} caracteres.` : null;
    default:
      return v.length > (c.max ?? MAX_TEXTO) ? `Hasta ${c.max ?? MAX_TEXTO} caracteres.` : null;
  }
}

export function camposDe(p: Plantilla): Campo[] {
  return p.pasos.flatMap((paso) => paso.campos);
}

/**
 * Progreso de un template: obligatorios visibles completos sobre el total de
 * obligatorios visibles. `completo` cuando no falta ninguno y no hay errores.
 */
export function progresoPlantilla(p: Plantilla, valores: Record<string, ValorCampo>) {
  const visibles = camposDe(p).filter((c) => campoVisible(c, valores));
  const requeridos = visibles.filter((c) => c.requerido);
  const hechos = requeridos.filter((c) => !vacio(valores[c.id]) && !errorCampo(c, valores[c.id]));
  const errores = visibles.filter((c) => errorCampo(c, valores[c.id])).length;
  const proporcion = requeridos.length ? hechos.length / requeridos.length : 1;
  return {
    proporcion,
    faltan: requeridos.filter((c) => !hechos.includes(c)).map((c) => c.label),
    completo: errores === 0 && hechos.length === requeridos.length,
  };
}

/**
 * Deja solo lo que el template conoce, con el tipo correcto y sin campos ocultos
 * por condición (servidor: lo que llega del navegador no se guarda tal cual).
 */
export function limpiarValores(p: Plantilla, crudos: Record<string, unknown>): Record<string, ValorCampo> {
  const salida: Record<string, ValorCampo> = {};
  for (const c of camposDe(p)) {
    const v = crudos[c.id];
    if (c.tipo === "tabla") {
      if (!Array.isArray(v)) continue;
      const ids = (c.columnas ?? []).map((col) => col.id);
      const filas = v
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .map((f) => Object.fromEntries(ids.map((id) => [id, typeof f[id] === "string" ? (f[id] as string).slice(0, MAX_CELDA) : ""])))
        .filter((f) => Object.values(f).some((x) => x.trim()))
        .slice(0, c.maxFilas ?? 10);
      if (filas.length) salida[c.id] = filas;
    } else if (typeof v === "string" && v.trim()) {
      salida[c.id] = v.trim().slice(0, c.tipo === "largo" ? (c.max ?? MAX_LARGO) : (c.max ?? MAX_TEXTO));
    }
  }
  for (const c of camposDe(p)) if (!campoVisible(c, salida)) delete salida[c.id];
  return salida;
}

const MILES = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** Un valor como se lee (y como va al dato de Transparencia). */
export function formatoValor(c: Campo, v: ValorCampo | undefined, valores: Record<string, ValorCampo>): string {
  if (vacio(v) || v === undefined) return "";
  if (Array.isArray(v)) return v.map((f) => Object.values(f).filter(Boolean).join(" · ")).join("; ");
  switch (c.tipo) {
    case "moneda": {
      const n = aNumero(v);
      const moneda = typeof valores.moneda === "string" ? valores.moneda : "USD";
      return n === null ? v : `${moneda} ${MILES.format(n)}`;
    }
    case "porcentaje": {
      const n = aNumero(v);
      return n === null ? v : `${MILES.format(n)}%`;
    }
    case "numero": {
      const n = aNumero(v);
      return n === null ? v : MILES.format(n);
    }
    case "seleccion":
      return c.opciones?.find((o) => o.valor === v)?.label ?? v;
    case "si_no":
      return v === "si" ? "Sí" : "No";
    case "fecha":
      return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${v}T00:00:00Z`));
    default:
      return v;
  }
}
