/**
 * Startup Essentials (Academy): lo básico que todo founder tiene que dominar, en
 * lecciones cortas que terminan en una acción concreta (casi siempre, completar un
 * template que queda en el Dataroom). Material educativo: no es asesoramiento
 * legal, financiero ni contable. Los `conceptos` son slugs de lib/glosario.ts.
 */

export type Accion =
  | { tipo: "plantilla"; id: string }
  | { tipo: "pitch" }
  | { tipo: "transparencia" }
  | { tipo: "dataroom" };

export type Leccion = {
  slug: string;
  modulo: Modulo;
  titulo: string;
  bajada: string;
  queEs: string;
  porQueImporta: string;
  ejemplo: string;
  errores: string[];
  checklist: string[];
  conceptos: string[];
  accion: Accion;
};

export const MODULOS = ["El problema", "El negocio", "Los números", "La inversión"] as const;
export type Modulo = (typeof MODULOS)[number];

export const AVISO_EDUCATIVO = "Información educativa. No constituye asesoramiento legal, financiero ni contable.";

export const LECCIONES: Leccion[] = [
  {
    slug: "problema-solucion",
    modulo: "El problema",
    titulo: "Problema y solución",
    bajada: "Todo empieza por un dolor real de alguien concreto.",
    queEs:
      "Es la descripción del dolor que resolvés, de quién lo sufre y de cómo lo resuelve hoy, seguida de qué hace tu solución distinto. El problema va primero: una buena solución a un problema que nadie siente no se vende.",
    porQueImporta:
      "Es lo primero que un inversor quiere entender y lo que más se repite en un pitch. Si el problema no es claro, todo lo que viene después (mercado, modelo, ronda) pierde fuerza.",
    ejemplo:
      "“En nuestras entrevistas, la mayoría de quienes abandonaron su huerta de balcón contó que la tierra de vivero se compacta. Hoy la gente compra tierra cada temporada. Nuestro sustrato con borra de café retiene agua y no se compacta.”",
    errores: [
      "Empezar por la solución y buscarle un problema después.",
      "Describir un problema de todos (“la gente pierde tiempo”) en vez de uno de alguien concreto.",
      "No contar cómo lo resuelven hoy: siempre hay una alternativa, aunque sea no hacer nada.",
    ],
    checklist: [
      "Lo puedo explicar en dos frases sin jerga.",
      "Sé quién lo sufre y hablé con al menos 10 de esas personas.",
      "Sé qué usan hoy y por qué no les alcanza.",
    ],
    conceptos: ["validacion", "early-adopters", "pivot"],
    accion: { tipo: "plantilla", id: "problema-solucion" },
  },
  {
    slug: "cliente-ideal",
    modulo: "El problema",
    titulo: "Cliente ideal",
    bajada: "A quién le vendés primero (no “a todos”).",
    queEs:
      "El perfil del cliente que más te necesita y al que mejor podés atender hoy (ICP, por sus siglas en inglés). No es todo tu mercado: es el primer grupo con el que vas a ganar.",
    porQueImporta:
      "Ordena el producto, el precio y los canales. Con un cliente ideal claro, cada decisión se vuelve más fácil y los primeros clientes llegan antes.",
    ejemplo:
      "“Pymes agropecuarias de 200 a 2.000 cabezas en Entre Ríos, con un encargado que maneja todo por WhatsApp y hoy anota en papel.”",
    errores: [
      "Definirlo tan amplio que no ayuda a decidir nada.",
      "En B2B, confundir a quien usa el producto con quien decide y paga.",
      "No haber hablado con ninguno todavía.",
    ],
    checklist: [
      "Sé dónde encontrarlo (canales, comunidades, eventos).",
      "Sé quién decide la compra y quién paga.",
      "Tengo entrevistas que lo confirman.",
    ],
    conceptos: ["icp", "b2b-b2c", "early-adopters"],
    accion: { tipo: "plantilla", id: "cliente-ideal" },
  },
  {
    slug: "propuesta-de-valor",
    modulo: "El problema",
    titulo: "Propuesta de valor",
    bajada: "Por qué te eligen a vos y no a la alternativa.",
    queEs:
      "La promesa concreta que le hacés a tu cliente ideal: qué gana al elegirte. Se escribe desde el cliente (lo que logra), no desde el producto (lo que tiene).",
    porQueImporta:
      "Es el titular de tu web, de tu pitch y de tu página en Pecera. Una propuesta clara convierte más y hace que te recomienden con tus palabras.",
    ejemplo: "“Huertas de balcón que no se mueren, sin saber de jardinería.”",
    errores: [
      "Listar características en lugar de beneficios.",
      "Usar palabras vacías: “innovador”, “disruptivo”, “integral”.",
      "Querer decir todo en una frase.",
    ],
    checklist: [
      "Alguien de otra industria la entiende a la primera.",
      "Dice para quién es.",
      "Se diferencia de la alternativa que usan hoy.",
    ],
    conceptos: ["propuesta-de-valor", "icp"],
    accion: { tipo: "plantilla", id: "propuesta-valor" },
  },
  {
    slug: "modelo-de-negocio",
    modulo: "El negocio",
    titulo: "Modelo de negocio",
    bajada: "Cómo creás, entregás y cobrás valor.",
    queEs:
      "Cómo funciona tu empresa como negocio: a quién le vendés, por qué canales, quién paga, cuánto y cada cuánto, y qué costos tenés. El Business Model Canvas lo ordena en nueve bloques.",
    porQueImporta:
      "Dos empresas con el mismo producto pueden valer muy distinto según su modelo (suscripción, comisión, venta única). El inversor quiere ver que el negocio puede crecer con margen.",
    ejemplo: "“Suscripción mensual por establecimiento, con un plan anual con descuento. Vendemos directo a cooperativas.”",
    errores: [
      "No saber quién paga en un modelo de varias puntas (marketplace).",
      "Ignorar los costos que crecen con cada cliente.",
      "Cambiar de modelo cada mes sin medir.",
    ],
    checklist: [
      "Sé en una línea quién paga, cuánto y cada cuánto.",
      "Conozco mis costos fijos y variables.",
      "Sé qué pasa con el margen cuando crezco.",
    ],
    conceptos: ["modelo-de-negocio", "saas", "marketplace", "freemium", "take-rate"],
    accion: { tipo: "plantilla", id: "modelo-negocio" },
  },
  {
    slug: "tam-sam-som",
    modulo: "El negocio",
    titulo: "TAM, SAM y SOM",
    bajada: "Qué tan grande puede ser esto, con números que se puedan defender.",
    queEs:
      "Tres medidas del mercado: el TAM es todo el mercado posible; el SAM, la parte a la que tu producto y tus canales llegan; el SOM, lo que razonablemente podés ganar en 3 a 5 años.",
    porQueImporta:
      "Un fondo necesita que algunas inversiones devuelvan muchas veces lo invertido: eso solo pasa en mercados grandes. Pero un número inflado resta credibilidad; el razonamiento importa más que la cifra.",
    ejemplo:
      "De abajo hacia arriba, con cifras de ejemplo: si hubiera 9.000 establecimientos a los que tu canal llega y cada uno pagara USD 1.200 al año, el SAM sería de USD 10,8 M. Si en 4 años llegás al 8%, el SOM es de unos USD 860 mil al año.",
    errores: [
      "Calcular solo de arriba hacia abajo (“el 1% de un mercado de miles de millones”).",
      "No citar fuentes.",
      "Confundir el TAM mundial con el mercado al que realmente llegás.",
    ],
    checklist: [
      "Tengo un cálculo de abajo hacia arriba (clientes × precio).",
      "Cada supuesto tiene una fuente o una explicación.",
      "El SOM es coherente con mis canales y mi equipo.",
    ],
    conceptos: ["tam-sam-som", "go-to-market"],
    accion: { tipo: "plantilla", id: "tam-sam-som" },
  },
  {
    slug: "competencia",
    modulo: "El negocio",
    titulo: "Competencia y ventaja",
    bajada: "Con quién te comparan y qué te hace difícil de copiar.",
    queEs:
      "El mapa de alternativas que tiene tu cliente (competidores directos, sustitutos y “no hacer nada”) y tu ventaja defendible frente a ellas (el MOAT).",
    porQueImporta:
      "“No tenemos competencia” suele leerse como que no hay mercado o que no lo investigaste. Mostrar el mapa y tu lugar en él genera confianza.",
    ejemplo: "“Hoy usan planillas o dos SaaS de EE. UU. caros y en inglés. Nosotros funcionamos sin conexión en el campo y cobramos en pesos.”",
    errores: [
      "Decir que no hay competencia.",
      "Compararse solo en lo que uno gana.",
      "Confundir “somos los primeros” con una ventaja.",
    ],
    checklist: [
      "Listé al menos 3 alternativas, incluida la que usan hoy.",
      "Sé en qué me eligen y en qué no.",
      "Puedo explicar qué me hace difícil de copiar (o reconozco que todavía no hay).",
    ],
    conceptos: ["competencia", "moat", "efecto-de-red", "switching-costs", "ventaja-injusta"],
    accion: { tipo: "plantilla", id: "competencia" },
  },
  {
    slug: "go-to-market",
    modulo: "El negocio",
    titulo: "Go-to-market",
    bajada: "Cómo llegás a tus primeros 100 clientes.",
    queEs:
      "La estrategia para llegar a tus clientes y venderles: canales, mensaje, precio de entrada y en qué orden. Se va armando con experimentos medidos.",
    porQueImporta:
      "Muchas startups con buen producto mueren por no saber vender. Un go-to-market probado, aunque sea chico, demuestra que el crecimiento no depende de la suerte.",
    ejemplo: "“Demos en ferias rurales (12 demos, 4 ventas) y referidos con un mes gratis. Próximo paso: acuerdo con 2 cooperativas.”",
    errores: [
      "Probar todos los canales a la vez sin medir ninguno.",
      "Depender de un único cliente grande o de un único canal.",
      "No saber cuánto cuesta conseguir un cliente por cada canal.",
    ],
    checklist: [
      "Sé qué canal me trajo cada cliente.",
      "Tengo un canal que funciona y lo puedo repetir.",
      "Sé el costo de adquisición por canal.",
    ],
    conceptos: ["go-to-market", "funnel", "activacion", "cac"],
    accion: { tipo: "plantilla", id: "go-to-market" },
  },
  {
    slug: "unit-economics",
    modulo: "Los números",
    titulo: "Unit economics",
    bajada: "Lo que cuesta un cliente y lo que deja.",
    queEs:
      "Los números de un cliente: cuánto cuesta conseguirlo (CAC), cuánto deja en toda su vida (LTV), el margen bruto y en cuántos meses recuperás lo invertido en él (payback). Junto con el burn y el runway, cuentan si el negocio es sano.",
    porQueImporta:
      "Si cada cliente deja menos de lo que cuesta, crecer acelera las pérdidas. Una relación LTV/CAC de 3 o más suele usarse como referencia, aunque depende de la industria y la etapa.",
    ejemplo: "CAC de USD 85, ticket de USD 110 por mes, margen bruto del 68% y 12 meses de vida promedio: LTV ≈ USD 900, LTV/CAC ≈ 10,6.",
    errores: [
      "Calcular el CAC sin contar sueldos de ventas y marketing.",
      "Calcular el LTV con ingresos en lugar de margen.",
      "Usar promedios de pocos clientes como si fueran definitivos.",
    ],
    checklist: [
      "Sé cómo calculé cada número y de qué fecha es.",
      "Separé los costos fijos de los variables.",
      "Sé cuántos meses de caja me quedan.",
    ],
    conceptos: ["unit-economics", "cac", "ltv", "ltv-cac", "payback", "margen-bruto", "burn-rate", "runway"],
    accion: { tipo: "plantilla", id: "unit-economics" },
  },
  {
    slug: "metricas",
    modulo: "Los números",
    titulo: "Métricas y tracción",
    bajada: "Los números que muestran que esto avanza.",
    queEs:
      "Las métricas que prueban que tu producto funciona: usuarios activos, clientes que pagan, ingresos recurrentes (MRR), crecimiento mes a mes, retención y churn. Elegí una North Star que resuma el valor que entregás.",
    porQueImporta:
      "La tracción es la mejor respuesta a casi cualquier duda de un inversor. Métricas claras, con fecha y tendencia, valen más que proyecciones optimistas.",
    ejemplo: "“37 pymes pagando, MRR de USD 4.200, +18% mes a mes en los últimos 4 meses, churn de 2,5% mensual.”",
    errores: [
      "Mostrar métricas de vanidad (descargas, seguidores) en lugar de uso y pago.",
      "Mostrar números sin fecha o sin tendencia.",
      "Cambiar la forma de medir sin avisar.",
    ],
    checklist: [
      "Elegí mi North Star.",
      "Mido retención por cohortes.",
      "Puedo mostrar la tendencia de los últimos meses.",
    ],
    conceptos: ["traccion", "north-star", "mrr", "crecimiento-mom", "retencion", "churn", "cohortes"],
    accion: { tipo: "transparencia" },
  },
  {
    slug: "equipo",
    modulo: "La inversión",
    titulo: "El equipo fundador",
    bajada: "Por qué ustedes son los indicados para esto.",
    queEs:
      "Quiénes fundan, qué rol cumple cada uno, con qué dedicación y qué los hace el equipo indicado para este problema. Incluye los acuerdos entre socios (vesting, pacto).",
    porQueImporta:
      "En etapas tempranas se invierte, sobre todo, en el equipo. Roles claros y acuerdos firmados entre socios evitan los conflictos que más startups matan.",
    ejemplo: "“Ana (CEO) trabajó 6 años en una cooperativa láctea; Beto (CTO) armó el sistema de dos agtech. Ambos full time, con vesting a 4 años y 1 de cliff.”",
    errores: [
      "No tener acuerdos de socios por escrito.",
      "Repartir partes iguales sin pensar en dedicación y aporte.",
      "No reconocer qué rol falta.",
    ],
    checklist: [
      "Cada fundador tiene un rol claro.",
      "Hay pacto de socios y vesting (o están en camino).",
      "Sé qué perfil tengo que sumar después.",
    ],
    conceptos: ["fundador", "roles-c-level", "vesting", "cliff", "pacto-de-socios", "esop"],
    accion: { tipo: "plantilla", id: "equipo-fundador" },
  },
  {
    slug: "pitch",
    modulo: "La inversión",
    titulo: "El pitch",
    bajada: "Tu historia en 90 segundos.",
    queEs:
      "Una presentación corta de tu startup: quién sos, el problema, tu solución, la tracción y qué buscás. En Pecera es un video vertical de hasta 90 segundos que aparece en el feed y en tu perfil.",
    porQueImporta:
      "Es tu primera impresión. Un pitch claro hace que un inversor quiera conocer más; uno confuso cierra la puerta aunque el negocio sea bueno.",
    ejemplo: "“Soy Ana, de Raíz Verde. Las huertas de balcón se abandonan porque la tierra se compacta… Ya vendimos 1.200 bolsas. Buscamos USD 150 mil para llegar a 3 provincias.”",
    errores: [
      "Arrancar con la historia personal y llegar tarde al problema.",
      "Meter todos los números: elegí los 2 que más dicen.",
      "Terminar sin decir qué buscás.",
    ],
    checklist: [
      "Lo practiqué en voz alta y dura menos de 90 segundos.",
      "Digo qué busco al final.",
      "Lo grabé en vertical, con buena luz y sin música fuerte.",
    ],
    conceptos: ["pitch", "pitch-deck", "one-pager", "demo-day"],
    accion: { tipo: "pitch" },
  },
  {
    slug: "fundraising",
    modulo: "La inversión",
    titulo: "Fundraising",
    bajada: "Cuánto pedir, en qué condiciones y para qué.",
    queEs:
      "El proceso de levantar capital: definir cuánto necesitás para llegar al próximo hito, con qué instrumento (SAFE, nota convertible, acciones), a qué valuación o cap, y a quién pedírselo.",
    porQueImporta:
      "La plata de una ronda tiene que comprar un hito que haga más valiosa a la empresa. Pedir de menos te deja corto; de más, te diluye sin necesidad.",
    ejemplo: "“Buscamos USD 150 mil con un SAFE con cap de USD 1,8 M post-money, para 18 meses: 60% producto y 40% ventas. Hito: 150 clientes y MRR de USD 15 mil.”",
    errores: [
      "No saber cuántos meses de runway compra la ronda.",
      "No entender la dilución que implica la valuación.",
      "Hablar con inversores que no invierten en tu etapa o industria.",
    ],
    checklist: [
      "Sé qué hito compra esta plata.",
      "Entiendo el instrumento y la dilución.",
      "Tengo armado mi Dataroom antes de las reuniones.",
    ],
    conceptos: ["ronda", "safe", "nota-convertible", "valuation-cap", "pre-post-money", "dilucion", "uso-de-fondos", "cap-table"],
    accion: { tipo: "plantilla", id: "fundraising" },
  },
  {
    slug: "due-diligence",
    modulo: "La inversión",
    titulo: "Due diligence y Dataroom",
    bajada: "Tener todo ordenado antes de que te lo pidan.",
    queEs:
      "La due diligence es la revisión que hace un inversor antes de invertir: legal, financiera, de producto y de equipo. El Dataroom es donde tenés esa información ordenada para compartirla.",
    porQueImporta:
      "Un Dataroom ordenado acorta los tiempos de la ronda y transmite profesionalismo. Lo que falta o está desordenado genera dudas, aunque no haya nada raro.",
    ejemplo: "Un Dataroom básico: pitch deck, one pager, métricas con fecha, cap table, estatuto, pacto de socios, cesión de propiedad intelectual y proyecciones.",
    errores: [
      "Armarlo recién cuando un inversor lo pide.",
      "Mezclar versiones viejas y nuevas.",
      "Compartir todo con todos: elegí qué mostrar a cada uno.",
    ],
    checklist: [
      "Cada categoría del Dataroom tiene algo cargado.",
      "Los números tienen fecha.",
      "Sé qué es público y qué comparto solo en privado.",
    ],
    conceptos: ["due-diligence", "data-room", "cap-table", "cesion-de-pi", "nda", "term-sheet"],
    accion: { tipo: "dataroom" },
  },
];

const POR_SLUG = new Map(LECCIONES.map((l) => [l.slug, l]));
export const leccion = (slug: string) => POR_SLUG.get(slug);
