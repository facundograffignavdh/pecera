/**
 * Glosario de /docs/conceptos: el idioma del ecosistema, para founders, inversores y
 * aliados que recién llegan. Parte del texto viene de pecera-app/lib/glosario.ts y
 * se amplió con todo lo que pide la transparencia de las empresas.
 *
 * Los `slug` son las anclas (/docs/conceptos#churn): lib/transparencia.ts los usa en
 * `concepto`. Si cambiás uno, cambialo en los dos lados.
 */

export type CategoriaConcepto =
  | "Producto"
  | "Estrategia"
  | "Métricas"
  | "Finanzas"
  | "Inversión"
  | "Legal"
  | "Equipo y ecosistema";

export type Concepto = {
  slug: string;
  termino: string;
  /** Qué quiere decir la sigla o el nombre en inglés. */
  sigla?: string;
  categoria: CategoriaConcepto;
  definicion: string;
  ejemplo: string;
  /** Otros slugs del glosario que conviene leer junto a este. */
  ver?: string[];
};

export const CATEGORIAS_CONCEPTO: CategoriaConcepto[] = [
  "Métricas",
  "Finanzas",
  "Inversión",
  "Estrategia",
  "Producto",
  "Legal",
  "Equipo y ecosistema",
];

export const CONCEPTOS: Concepto[] = [
  // ---------------------------------------------------------------------------
  // Métricas
  // ---------------------------------------------------------------------------
  {
    slug: "mrr",
    termino: "MRR",
    sigla: "Monthly Recurring Revenue",
    categoria: "Métricas",
    definicion:
      "Ingreso recurrente mensual: lo que cobrás todos los meses sin volver a vender (suscripciones, abonos). Es la métrica reina del SaaS porque es predecible.",
    ejemplo: "40 clientes que pagan USD 105 por mes = USD 4.200 de MRR.",
    ver: ["arr", "churn", "nrr"],
  },
  {
    slug: "arr",
    termino: "ARR",
    sigla: "Annual Recurring Revenue",
    categoria: "Métricas",
    definicion:
      "El MRR llevado al año (MRR × 12). Se usa para comparar empresas y para hablar de valuación en rondas más grandes.",
    ejemplo: "USD 4.200 de MRR son USD 50.400 de ARR.",
    ver: ["mrr"],
  },
  {
    slug: "churn",
    termino: "Churn",
    categoria: "Métricas",
    definicion:
      "Qué parte de los clientes (o de los ingresos) se va por período. Un churn alto convierte el crecimiento en un balde agujereado: entra agua pero no se llena.",
    ejemplo: "Empezaste el mes con 200 clientes y se fueron 5: churn mensual del 2,5%.",
    ver: ["retencion", "nrr", "ltv"],
  },
  {
    slug: "retencion",
    termino: "Retención",
    categoria: "Métricas",
    definicion:
      "Qué porcentaje de usuarios o clientes sigue activo después de N días o meses. Si la curva se aplana arriba de cero, hay negocio; si cae a cero, es una moda.",
    ejemplo: "De los que se registraron en marzo, el 82% sigue usando el producto en septiembre.",
    ver: ["churn", "cohortes"],
  },
  {
    slug: "nrr",
    termino: "Retención neta de ingresos",
    sigla: "NRR · Net Revenue Retention",
    categoria: "Métricas",
    definicion:
      "Cuánto facturás hoy a los clientes que ya tenías hace un año, contando lo que se fueron y lo que ampliaron. Arriba de 100% significa que crecés aunque no sumes clientes nuevos.",
    ejemplo: "Tus clientes de 2025 pagaban USD 10.000; hoy pagan USD 11.500: NRR del 115%.",
    ver: ["churn", "mrr"],
  },
  {
    slug: "cohortes",
    termino: "Cohortes",
    categoria: "Métricas",
    definicion:
      "Grupos de clientes que empezaron en el mismo período, seguidos en el tiempo. Sirven para ver si el producto mejora: cohortes nuevas que retienen más son buena señal.",
    ejemplo: "La cohorte de agosto retiene 10 puntos más que la de mayo: el onboarding nuevo funcionó.",
    ver: ["retencion"],
  },
  {
    slug: "dau-mau",
    termino: "DAU / MAU",
    sigla: "Daily / Monthly Active Users",
    categoria: "Métricas",
    definicion:
      "Usuarios activos por día y por mes. El cociente DAU/MAU mide qué tan seguido vuelven: 50% es uso diario de verdad, 10% es uso ocasional.",
    ejemplo: "300 DAU sobre 1.200 MAU: 25%, cada usuario entra unos 7 días por mes.",
    ver: ["retencion", "activacion"],
  },
  {
    slug: "activacion",
    termino: "Activación",
    categoria: "Métricas",
    definicion:
      "El momento en que un usuario nuevo recibe el valor del producto por primera vez (el «ajá»). Se mide como el porcentaje de registrados que llega a ese punto.",
    ejemplo: "En una app de cobranzas, activarse es mandar el primer recordatorio de pago. Lo hace el 60% de los que se registran.",
    ver: ["funnel", "dau-mau"],
  },
  {
    slug: "funnel",
    termino: "Funnel de conversión",
    categoria: "Métricas",
    definicion:
      "Los pasos que recorre alguien desde que te conoce hasta que paga, con el porcentaje que pasa de uno a otro. Muestra dónde se pierde la gente.",
    ejemplo: "1.000 visitas → 120 registros → 40 pruebas → 12 clientes: la fuga más grande está entre visita y registro.",
    ver: ["cac", "activacion"],
  },
  {
    slug: "crecimiento-mom",
    termino: "Crecimiento mes a mes",
    sigla: "MoM · Month over Month",
    categoria: "Métricas",
    definicion:
      "Cuánto crece una métrica (ingresos, usuarios) de un mes al siguiente. En etapas tempranas, 15-20% sostenido es muy bueno; importa más la constancia que un pico.",
    ejemplo: "El MRR pasó de USD 3.560 a USD 4.200: +18% mes a mes.",
    ver: ["mrr", "traccion"],
  },
  {
    slug: "nps",
    termino: "NPS",
    sigla: "Net Promoter Score",
    categoria: "Métricas",
    definicion:
      "Mide cuánto te recomiendan: se pregunta de 0 a 10 y se restan los detractores (0-6) a los promotores (9-10). Va de -100 a 100; arriba de 50 es excelente.",
    ejemplo: "70% promotores y 9% detractores: NPS de 61.",
    ver: ["retencion"],
  },
  {
    slug: "gmv",
    termino: "GMV",
    sigla: "Gross Merchandise Value",
    categoria: "Métricas",
    definicion:
      "Volumen total que se transacciona en un marketplace. No es tu ingreso: tu ingreso es la comisión que te quedás de ese volumen (take rate).",
    ejemplo: "Por tu marketplace pasan USD 120 mil por mes y cobrás 8%: ingreso de USD 9.600.",
    ver: ["take-rate", "marketplace"],
  },
  {
    slug: "take-rate",
    termino: "Take rate",
    categoria: "Métricas",
    definicion: "El porcentaje del GMV que se queda la plataforma como ingreso.",
    ejemplo: "Un take rate del 8% sobre USD 120 mil de GMV son USD 9.600 de ingreso.",
    ver: ["gmv"],
  },
  {
    slug: "cac",
    termino: "CAC",
    sigla: "Customer Acquisition Cost",
    categoria: "Métricas",
    definicion:
      "Cuánto cuesta conseguir un cliente: toda la plata de marketing y ventas del período dividida por los clientes nuevos. Incluí sueldos de ventas, no solo anuncios.",
    ejemplo: "Gastaste USD 3.400 en ventas y marketing y sumaste 40 clientes: CAC de USD 85.",
    ver: ["ltv", "ltv-cac", "payback"],
  },
  {
    slug: "ltv",
    termino: "LTV",
    sigla: "Lifetime Value",
    categoria: "Métricas",
    definicion:
      "Todo lo que un cliente deja en margen durante su vida útil. Forma simple: ingreso mensual por cliente × margen bruto ÷ churn mensual.",
    ejemplo: "USD 110 por mes × 70% de margen ÷ 2,5% de churn ≈ USD 3.080 de LTV.",
    ver: ["cac", "ltv-cac", "churn"],
  },
  {
    slug: "ltv-cac",
    termino: "LTV/CAC",
    categoria: "Métricas",
    definicion:
      "Cuántas veces recuperás lo que te cuesta un cliente. La regla del SaaS: 3 o más es sano; menos de 1 significa que cada venta te hace perder plata.",
    ejemplo: "LTV de USD 900 y CAC de USD 85: 10,6x. Hay espacio para invertir más en crecer.",
    ver: ["ltv", "cac"],
  },
  {
    slug: "payback",
    termino: "Payback de CAC",
    categoria: "Métricas",
    definicion:
      "Meses que tarda un cliente en devolver lo que costó conseguirlo. Menos de 12 meses es bueno; cuanto más corto, menos caja necesitás para crecer.",
    ejemplo: "CAC de USD 85 y cada cliente deja USD 21 de margen por mes: payback de 4 meses.",
    ver: ["cac", "margen-bruto"],
  },
  {
    slug: "arpu",
    termino: "ARPU / ticket promedio",
    sigla: "Average Revenue Per User",
    categoria: "Métricas",
    definicion: "Ingreso promedio por usuario o cliente en un período.",
    ejemplo: "USD 4.200 de MRR entre 38 clientes: ARPU de USD 110 por mes.",
    ver: ["mrr", "ltv"],
  },
  {
    slug: "margen-bruto",
    termino: "Margen bruto",
    categoria: "Métricas",
    definicion:
      "Lo que queda de cada venta después de pagar el costo directo de entregarla (servidores, insumos, comisiones de pago). El software suele tener 70-80%; el hardware, mucho menos.",
    ejemplo: "Vendés USD 100 y entregarlo cuesta USD 32: margen bruto del 68%.",
    ver: ["unit-economics"],
  },
  {
    slug: "unit-economics",
    termino: "Unit economics",
    categoria: "Métricas",
    definicion:
      "La economía de UNA unidad del negocio (un cliente, un pedido, una entrega): ¿deja plata o pierde? Si la unidad pierde, crecer solo agranda el problema.",
    ejemplo: "Cada entrega se cobra USD 4 y cuesta USD 4,60: antes de escalar, hay que arreglar la unidad.",
    ver: ["margen-bruto", "cac", "ltv"],
  },
  {
    slug: "north-star",
    termino: "North Star Metric",
    categoria: "Métricas",
    definicion:
      "La métrica que mejor captura el valor que entregás. Si crece, el negocio crece; todo el equipo rema hacia ella.",
    ejemplo: "Para Pecera: conversaciones que nacen de un pitch y llegan a una segunda reunión.",
    ver: ["traccion"],
  },

  // ---------------------------------------------------------------------------
  // Finanzas
  // ---------------------------------------------------------------------------
  {
    slug: "burn-rate",
    termino: "Burn rate",
    categoria: "Finanzas",
    definicion:
      "La caja que se consume por mes. Bruto: todo lo que gastás; neto: gastos menos ingresos. Junto con la caja en el banco define el runway.",
    ejemplo: "Gastás USD 9.000 e ingresan USD 3.000: burn neto de USD 6.000 por mes.",
    ver: ["runway", "flujo-de-caja"],
  },
  {
    slug: "runway",
    termino: "Runway",
    categoria: "Finanzas",
    definicion:
      "Cuántos meses de vida quedan al ritmo de burn actual. La regla: salí a levantar con 6 meses o más por delante; una ronda tarda de 3 a 6 meses.",
    ejemplo: "USD 84.000 en caja y USD 6.000 de burn neto: 14 meses de runway.",
    ver: ["burn-rate", "default-alive"],
  },
  {
    slug: "default-alive",
    termino: "Default alive",
    categoria: "Finanzas",
    definicion:
      "Una empresa está «viva por defecto» si, con los gastos y el crecimiento actuales, llega a ser rentable antes de quedarse sin caja. Si no, está «muerta por defecto» y depende de levantar.",
    ejemplo: "Con 14 meses de runway y 18% de crecimiento, llegás al break-even en el mes 11: default alive.",
    ver: ["runway", "break-even"],
  },
  {
    slug: "break-even",
    termino: "Punto de equilibrio",
    sigla: "Break-even",
    categoria: "Finanzas",
    definicion: "El momento en que los ingresos cubren todos los gastos: ni ganás ni perdés.",
    ejemplo: "Con gastos fijos de USD 9.000 y USD 110 de margen por cliente, necesitás 82 clientes.",
    ver: ["default-alive"],
  },
  {
    slug: "flujo-de-caja",
    termino: "Flujo de caja",
    sigla: "Cash flow",
    categoria: "Finanzas",
    definicion:
      "La plata que efectivamente entra y sale en un período. Una empresa puede facturar mucho y quedarse sin caja si cobra a 90 días y paga a 30.",
    ejemplo: "Vendiste USD 20.000 en septiembre pero cobrás en diciembre: la caja de octubre no lo ve.",
    ver: ["burn-rate"],
  },
  {
    slug: "proyecciones",
    termino: "Proyecciones financieras",
    categoria: "Finanzas",
    definicion:
      "El modelo de cómo van a evolucionar ingresos, costos y caja (típico: 3 años, mensual el primero). No se evalúa si acertás, sino si los supuestos son razonables y explícitos.",
    ejemplo: "Supuestos a la vista: 15% de crecimiento mensual, CAC de USD 85, churn de 2,5%.",
    ver: ["uso-de-fondos", "runway"],
  },
  {
    slug: "uso-de-fondos",
    termino: "Uso de fondos",
    categoria: "Finanzas",
    definicion:
      "En qué se va a gastar la plata de la ronda y qué hito se alcanza con ella. Un buen uso de fondos se lee como un plan: «con esto llegamos a X».",
    ejemplo: "USD 150 mil: 60% producto y 40% ventas para llegar a USD 15 mil de MRR en 12 meses.",
    ver: ["ronda", "proyecciones"],
  },
  {
    slug: "capex-opex",
    termino: "CAPEX / OPEX",
    categoria: "Finanzas",
    definicion:
      "CAPEX: inversiones en bienes que duran (máquinas, equipos). OPEX: gastos del día a día (sueldos, servidores, alquiler).",
    ejemplo: "Comprar sensores es CAPEX; pagar el servidor que procesa sus datos es OPEX.",
  },

  // ---------------------------------------------------------------------------
  // Inversión
  // ---------------------------------------------------------------------------
  {
    slug: "ronda",
    termino: "Rondas: pre-seed, seed, Serie A…",
    categoria: "Inversión",
    definicion:
      "Las etapas de financiamiento. Pre-seed valida el problema (USD 50-500 mil), seed valida el negocio (USD 500 mil-3 M), Serie A escala lo validado (USD 3 M+). Cada una se levanta con hitos distintos.",
    ejemplo: "Con 40 clientes pagando y 18% de crecimiento, estás para un pre-seed o un seed chico.",
    ver: ["uso-de-fondos", "valuation-cap", "lead-investor"],
  },
  {
    slug: "fff",
    termino: "FFF",
    sigla: "Friends, Family & Fools",
    categoria: "Inversión",
    definicion:
      "La primera plata de afuera: amigos, familia y conocidos que creen en vos antes de que haya números. Conviene documentarla igual (con un SAFE) para no complicar el cap table.",
    ejemplo: "USD 20 mil de la familia con un SAFE simple, antes del primer ángel.",
    ver: ["safe", "cap-table"],
  },
  {
    slug: "angel",
    termino: "Inversor ángel",
    categoria: "Inversión",
    definicion:
      "Persona que invierte su propia plata en etapas tempranas, muchas veces con experiencia en la industria. Además del cheque, aporta contactos y consejo.",
    ejemplo: "Una ex gerenta de un banco pone USD 25 mil en una fintech y abre tres reuniones con clientes.",
    ver: ["smart-money", "vc"],
  },
  {
    slug: "vc",
    termino: "Fondo de capital de riesgo",
    sigla: "VC · Venture Capital",
    categoria: "Inversión",
    definicion:
      "Fondo que invierte plata de terceros en startups con potencial de crecer mucho. Busca pocos ganadores que devuelvan todo el fondo, por eso pregunta por el tamaño del mercado.",
    ejemplo: "Un fondo de USD 30 M hace 25 inversiones esperando que 1 o 2 devuelvan 10 veces o más.",
    ver: ["cvc", "tam-sam-som", "carry"],
  },
  {
    slug: "cvc",
    termino: "Corporate venture capital",
    sigla: "CVC",
    categoria: "Inversión",
    definicion:
      "El brazo inversor de una empresa grande. Además de plata, puede darte clientes y distribución, pero también puede querer condiciones que te aten a ella.",
    ejemplo: "Una agroindustrial invierte en una agtech y la usa como proveedor en sus campos.",
    ver: ["vc"],
  },
  {
    slug: "smart-money",
    termino: "Smart money",
    categoria: "Inversión",
    definicion: "Inversión que trae algo más que plata: experiencia, red, clientes o reputación.",
    ejemplo: "Preferir USD 50 mil de alguien que abre la puerta de tu primer cliente grande a USD 60 mil de alguien que no aporta nada más.",
    ver: ["angel"],
  },
  {
    slug: "valuation-cap",
    termino: "Valuación y cap",
    categoria: "Inversión",
    definicion:
      "La valuación es cuánto vale la empresa a efectos de la ronda. En un SAFE no se fija: se pone un cap, la valuación máxima a la que va a convertir la inversión en acciones.",
    ejemplo: "SAFE de USD 100 mil con cap de USD 1,8 M post-money: el inversor tendrá al menos 5,6%.",
    ver: ["pre-post-money", "safe", "dilucion"],
  },
  {
    slug: "pre-post-money",
    termino: "Pre-money / post-money",
    categoria: "Inversión",
    definicion:
      "Pre-money: lo que vale la empresa antes de que entre la plata nueva. Post-money: pre-money más la inversión. El porcentaje del inversor se calcula sobre el post-money.",
    ejemplo: "Pre-money USD 1,35 M + USD 150 mil de inversión = post-money USD 1,5 M: el inversor tiene 10%.",
    ver: ["valuation-cap", "dilucion"],
  },
  {
    slug: "dilucion",
    termino: "Dilución",
    categoria: "Inversión",
    definicion:
      "Cuánto se achica el porcentaje de los socios cuando entran acciones nuevas. Es sana si la torta crece más de lo que se achica tu porción.",
    ejemplo: "Pasás de 100% a 90%, pero el 90% de una empresa con caja vale más que el 100% de una sin nafta.",
    ver: ["cap-table", "pre-post-money"],
  },
  {
    slug: "cap-table",
    termino: "Cap table",
    categoria: "Inversión",
    definicion:
      "La tabla de quién es dueño de qué: socios, inversores, SAFEs por convertir y pool de opciones, en porcentajes fully diluted (como si todo convirtiera hoy).",
    ejemplo: "Tres fundadores con 30% cada uno, 10% de pool de opciones y un SAFE por convertir.",
    ver: ["dilucion", "esop", "safe"],
  },
  {
    slug: "pitch-deck",
    termino: "Pitch deck",
    categoria: "Inversión",
    definicion:
      "La presentación de 8 a 12 slides: problema, solución, mercado, tracción, modelo, equipo, competencia y pedido. Tiene que entenderse sin que nadie la narre.",
    ejemplo: "Una idea por slide, la tracción antes que las features y el monto que buscás escrito.",
    ver: ["one-pager", "pitch"],
  },
  {
    slug: "one-pager",
    termino: "One-pager",
    categoria: "Inversión",
    definicion:
      "Una página con lo esencial: qué hacés, para quién, tracción, equipo, qué buscás y contacto. Es lo que un inversor le reenvía a otro.",
    ejemplo: "Las 3 métricas más fuertes, visibles en 10 segundos.",
    ver: ["pitch-deck"],
  },
  {
    slug: "data-room",
    termino: "Data room",
    categoria: "Inversión",
    definicion:
      "La carpeta ordenada con todo lo que la due diligence va a pedir: societario, finanzas, métricas, contratos, propiedad intelectual y equipo. Se arma antes de que lo pidan.",
    ejemplo: "Una carpeta de Drive con permisos por persona y una subcarpeta por tema.",
    ver: ["due-diligence"],
  },
  {
    slug: "due-diligence",
    termino: "Due diligence",
    categoria: "Inversión",
    definicion:
      "La revisión que hace el inversor antes de firmar: papeles de la sociedad, números, contratos, equipo y tecnología.",
    ejemplo: "El fondo pide los contratos con los 10 clientes más grandes y la cesión del código a la empresa.",
    ver: ["data-room", "cesion-de-pi"],
  },
  {
    slug: "safe",
    termino: "SAFE",
    sigla: "Simple Agreement for Future Equity",
    categoria: "Inversión",
    definicion:
      "Contrato estándar de etapa temprana: el inversor pone plata hoy y recibe acciones en la próxima ronda, con descuento y/o cap. Rápido y barato porque no fija valuación ahora.",
    ejemplo: "USD 100 mil con cap de USD 1,8 M y 20% de descuento; convierte en el seed.",
    ver: ["valuation-cap", "nota-convertible", "term-sheet"],
  },
  {
    slug: "nota-convertible",
    termino: "Nota convertible",
    categoria: "Inversión",
    definicion:
      "Un préstamo que, en vez de devolverse, se convierte en acciones en la próxima ronda. A diferencia del SAFE, tiene interés y fecha de vencimiento.",
    ejemplo: "USD 50 mil al 6% anual, convierte con 20% de descuento; si a los 24 meses no hubo ronda, se negocia.",
    ver: ["safe"],
  },
  {
    slug: "term-sheet",
    termino: "Term sheet",
    categoria: "Inversión",
    definicion:
      "El resumen de las condiciones de una inversión: valuación, monto, directorio, derechos y preferencias. No obliga a invertir, pero marca la cancha de los contratos finales.",
    ejemplo: "USD 500 mil a USD 4,5 M post-money, un lugar en el directorio y preferencia de liquidación 1x.",
    ver: ["preferencia-liquidacion", "due-diligence"],
  },
  {
    slug: "preferencia-liquidacion",
    termino: "Preferencia de liquidación",
    sigla: "Liquidation preference",
    categoria: "Inversión",
    definicion:
      "Si la empresa se vende o se liquida, el inversor cobra primero lo que puso (1x) antes que el resto. 1x no participativa es el estándar sano; 2x o más es una señal de alerta.",
    ejemplo: "Se vende la empresa en USD 2 M y el inversor puso USD 500 mil con 1x: cobra primero sus USD 500 mil.",
    ver: ["term-sheet"],
  },
  {
    slug: "pro-rata",
    termino: "Derecho de pro-rata",
    categoria: "Inversión",
    definicion:
      "El derecho del inversor a seguir poniendo en rondas futuras para mantener su porcentaje.",
    ejemplo: "Tenía 10% y en la Serie A puede invertir lo necesario para seguir en 10%.",
    ver: ["follow-on", "dilucion"],
  },
  {
    slug: "lead-investor",
    termino: "Lead investor",
    categoria: "Inversión",
    definicion:
      "El inversor que lidera la ronda: fija las condiciones, pone el cheque más grande y arrastra al resto. Sin lead, las rondas se estancan.",
    ejemplo: "Un fondo pone USD 300 mil de los 500 y tres ángeles completan el resto con las mismas condiciones.",
    ver: ["ronda", "term-sheet"],
  },
  {
    slug: "follow-on",
    termino: "Follow-on",
    categoria: "Inversión",
    definicion:
      "Inversión adicional de alguien que ya invirtió. Que tus inversores repitan es la mejor señal para los nuevos.",
    ejemplo: "El ángel del pre-seed vuelve a poner en el seed: vio los números de cerca y quiere más.",
    ver: ["pro-rata"],
  },
  {
    slug: "bridge",
    termino: "Ronda puente",
    sigla: "Bridge",
    categoria: "Inversión",
    definicion:
      "Plata chica para llegar al próximo hito cuando la caja no alcanza. Útil con un plan claro; peligrosa como costumbre.",
    ejemplo: "USD 100 mil para 6 meses más, hasta cerrar los contratos que desbloquean el seed.",
    ver: ["runway"],
  },
  {
    slug: "carry",
    termino: "Carry",
    sigla: "Carried interest",
    categoria: "Inversión",
    definicion:
      "La parte de las ganancias que cobra quien gestiona un fondo (típico: 20%). Solo se cobra si hay retorno.",
    ejemplo: "El fondo devuelve USD 50 M sobre USD 20 M invertidos: el gestor se lleva 20% de los USD 30 M de ganancia.",
    ver: ["vc"],
  },
  {
    slug: "exit",
    termino: "Exit",
    categoria: "Inversión",
    definicion:
      "Cómo recuperan su plata (y más) los inversores: venta de la empresa, compra por otra empresa o salida a bolsa.",
    ejemplo: "Una empresa grande compra la startup y los inversores cobran su parte.",
    ver: ["preferencia-liquidacion"],
  },
  {
    slug: "crowdfunding",
    termino: "Crowdfunding",
    categoria: "Inversión",
    definicion:
      "Financiamiento de muchas personas con montos chicos. En Argentina, el crowdfunding de inversión solo puede hacerse por plataformas registradas en la CNV. Pecera no capta fondos del público.",
    ejemplo: "200 personas ponen USD 500 cada una a través de una plataforma habilitada.",
  },

  // ---------------------------------------------------------------------------
  // Estrategia
  // ---------------------------------------------------------------------------
  {
    slug: "moat",
    termino: "MOAT",
    categoria: "Estrategia",
    definicion:
      "El foso defensivo: lo que hace difícil copiarte aunque te vean. Efectos de red, datos propios, costos de cambio, marca o distribución exclusiva.",
    ejemplo: "Datos propios de 48.000 cabezas de ganado que ningún competidor puede juntar de un día para el otro.",
    ver: ["efecto-de-red", "switching-costs", "ventaja-injusta"],
  },
  {
    slug: "efecto-de-red",
    termino: "Efecto de red",
    categoria: "Estrategia",
    definicion:
      "Cuando cada usuario nuevo hace más valioso el producto para los demás. Es uno de los fosos más fuertes, y de los más difíciles de arrancar.",
    ejemplo: "Cada inversor que entra a Pecera atrae mejores proyectos, y cada proyecto bueno atrae inversores.",
    ver: ["moat", "marketplace"],
  },
  {
    slug: "switching-costs",
    termino: "Costos de cambio",
    sigla: "Switching costs",
    categoria: "Estrategia",
    definicion: "Lo que le cuesta a un cliente irse: datos cargados, procesos armados, gente entrenada.",
    ejemplo: "Tres años de historial de cobranzas en tu sistema: migrar a otro es un dolor de cabeza.",
    ver: ["moat", "churn"],
  },
  {
    slug: "ventaja-injusta",
    termino: "Ventaja injusta",
    sigla: "Unfair advantage",
    categoria: "Estrategia",
    definicion:
      "Algo que tu equipo tiene y no se compra: acceso, conocimiento o relaciones que los demás no tienen.",
    ejemplo: "La fundadora trabajó 10 años en el sector y conoce a los 50 compradores del país.",
    ver: ["moat"],
  },
  {
    slug: "tam-sam-som",
    termino: "TAM / SAM / SOM",
    categoria: "Estrategia",
    definicion:
      "Tres círculos del mercado. TAM: todo el mercado si fueras el único. SAM: la parte a la que tu producto llega. SOM: lo que podés ganar en 3 a 5 años. Mejor calculado de abajo hacia arriba (clientes × precio).",
    ejemplo: "TAM USD 2.000 M en LatAm; SAM USD 300 M en Argentina; SOM USD 15 M.",
    ver: ["vc", "go-to-market"],
  },
  {
    slug: "modelo-de-negocio",
    termino: "Modelo de negocio",
    categoria: "Estrategia",
    definicion:
      "Quién paga, cuánto, por qué y cada cuánto. Suscripción, comisión, venta única, freemium, licencia o publicidad son los más comunes.",
    ejemplo: "Suscripción mensual por establecimiento, con un plan más caro para los que tienen más de 1.000 cabezas.",
    ver: ["saas", "marketplace", "freemium"],
  },
  {
    slug: "saas",
    termino: "SaaS",
    sigla: "Software as a Service",
    categoria: "Estrategia",
    definicion: "Software que se usa por internet y se paga con una suscripción, en vez de comprarse e instalarse.",
    ejemplo: "Un sistema de turnos que el consultorio paga USD 40 por mes.",
    ver: ["mrr", "churn"],
  },
  {
    slug: "marketplace",
    termino: "Marketplace",
    categoria: "Estrategia",
    definicion:
      "Plataforma que junta a quien ofrece con quien demanda y cobra una comisión. El desafío es arrancar los dos lados a la vez (el problema del huevo y la gallina).",
    ejemplo: "Una plataforma que conecta fletes con pymes y cobra 8% por viaje.",
    ver: ["gmv", "take-rate", "efecto-de-red"],
  },
  {
    slug: "freemium",
    termino: "Freemium",
    categoria: "Estrategia",
    definicion:
      "Una versión gratis para atraer usuarios y una paga con más funciones. Funciona si el costo de servir a los gratuitos es bajo y una parte se pasa al plan pago.",
    ejemplo: "Gratis hasta 3 usuarios; desde el cuarto, USD 8 por usuario por mes.",
    ver: ["funnel"],
  },
  {
    slug: "b2b-b2c",
    termino: "B2B / B2C / B2B2C",
    categoria: "Estrategia",
    definicion:
      "A quién le vendés: a empresas (B2B), a personas (B2C) o a personas a través de una empresa (B2B2C). Cambia todo: el ciclo de venta, el ticket y el CAC.",
    ejemplo: "Una app de beneficios que se vende a empresas (B2B) y la usan sus empleados (B2B2C).",
    ver: ["go-to-market", "cac"],
  },
  {
    slug: "go-to-market",
    termino: "Go-to-market",
    sigla: "GTM",
    categoria: "Estrategia",
    definicion:
      "El plan concreto de cómo llegás al cliente: canal, mensaje, precio y quién vende. La estrategia vive o muere acá.",
    ejemplo: "Venta directa a cooperativas de Córdoba primero; después, referidos entre productores.",
    ver: ["icp", "cac", "b2b-b2c"],
  },
  {
    slug: "competencia",
    termino: "Competencia",
    categoria: "Estrategia",
    definicion:
      "Contra quién te comparan, incluida la forma en que el cliente resuelve hoy el problema (una planilla, un empleado, nada). Decir «no tenemos competencia» es una señal de alerta.",
    ejemplo: "Hoy lo resuelven con planillas y dos SaaS de EE. UU. caros y en inglés.",
    ver: ["moat", "propuesta-de-valor"],
  },
  {
    slug: "traccion",
    termino: "Tracción",
    categoria: "Estrategia",
    definicion:
      "Evidencia medible de que el mercado quiere lo tuyo: ingresos, usuarios activos, retención, cartas de intención. Es el idioma de los inversores.",
    ejemplo: "40 pymes pagando y 18% de crecimiento mensual son tracción; un premio de incubadora, no.",
    ver: ["mrr", "crecimiento-mom", "loi"],
  },
  {
    slug: "bootstrapping",
    termino: "Bootstrapping",
    categoria: "Estrategia",
    definicion:
      "Crecer con plata propia y de los clientes, sin inversión externa. Máximo control y mínimo colchón.",
    ejemplo: "Los primeros 18 meses se financian con un servicio de consultoría que después se convierte en producto.",
    ver: ["default-alive"],
  },
  {
    slug: "mision-vision",
    termino: "Misión y visión",
    categoria: "Estrategia",
    definicion:
      "Misión: para qué existe la empresa, en una frase que ordena decisiones. Visión: cómo se ve el mundo a 5-10 años si la misión sale bien.",
    ejemplo: "Misión de Pecera: que el ecosistema emprendedor se encuentre, sin fricción ni humo.",
  },

  // ---------------------------------------------------------------------------
  // Producto
  // ---------------------------------------------------------------------------
  {
    slug: "mvp",
    termino: "MVP",
    sigla: "Minimum Viable Product",
    categoria: "Producto",
    definicion:
      "La versión más chica del producto que ya resuelve el problema y deja aprender de usuarios reales. No es una demo: es lo mínimo que alguien usaría o pagaría.",
    ejemplo: "Una planilla compartida con 5 pymes, operada a mano, antes de programar nada.",
    ver: ["prototipo", "pmf"],
  },
  {
    slug: "prototipo",
    termino: "Prototipo",
    categoria: "Producto",
    definicion:
      "Algo que se puede mostrar y probar, aunque no funcione de punta a punta. Sirve para validar la idea antes de construir el MVP.",
    ejemplo: "Pantallas en Figma que se recorren como si fueran la app.",
    ver: ["mvp", "validacion"],
  },
  {
    slug: "pmf",
    termino: "Product-market fit",
    sigla: "PMF",
    categoria: "Producto",
    definicion:
      "Cuando el mercado empieza a tironear del producto: los usuarios vuelven solos, recomiendan y se enojan si se lo sacás. Antes del PMF se busca; después, se escala.",
    ejemplo: "Más del 40% de los usuarios diría que estaría «muy decepcionado» si el producto desapareciera.",
    ver: ["retencion", "nps"],
  },
  {
    slug: "icp",
    termino: "Cliente ideal",
    sigla: "ICP · Ideal Customer Profile",
    categoria: "Producto",
    definicion:
      "El retrato exacto del cliente que más valor recibe y más rápido compra: industria, tamaño, dolor y quién decide la compra.",
    ejemplo: "No «la industria»: la pyme metalúrgica de 20 a 100 empleados con máquinas de más de 15 años.",
    ver: ["go-to-market", "propuesta-de-valor"],
  },
  {
    slug: "propuesta-de-valor",
    termino: "Propuesta de valor",
    categoria: "Producto",
    definicion:
      "La frase que responde por qué te elegirían a vos y no a lo que hacen hoy: qué dolor resolvés, para quién y qué te hace distinto.",
    ejemplo: "«Detectá góndolas vacías con las cámaras que ya tenés»: dolor, cliente y diferencia en una línea.",
    ver: ["icp", "competencia"],
  },
  {
    slug: "validacion",
    termino: "Validación",
    sigla: "Customer discovery",
    categoria: "Producto",
    definicion:
      "Hablar con clientes potenciales para confirmar que el problema existe y que pagarían por resolverlo, antes de construir. Se pregunta por lo que hicieron, no por lo que harían.",
    ejemplo: "20 entrevistas a dueños de fletes: 14 pierden más de 5 horas por semana coordinando viajes.",
    ver: ["mvp", "loi", "early-adopters"],
  },
  {
    slug: "early-adopters",
    termino: "Early adopters",
    categoria: "Producto",
    definicion:
      "Los primeros clientes: tienen el problema tan fuerte que aceptan un producto incompleto a cambio de resolverlo ya. Son tu mejor fuente de aprendizaje.",
    ejemplo: "Las 5 pymes que usaron la planilla y siguieron pagando cuando salió la app.",
    ver: ["validacion"],
  },
  {
    slug: "pivot",
    termino: "Pivot",
    categoria: "Producto",
    definicion:
      "Un cambio de rumbo que conserva lo aprendido: otro segmento, otro problema u otro modelo, con el mismo equipo y la misma base.",
    ejemplo: "La app para consumidores no pegaba; el mismo motor se vende ahora a empresas.",
    ver: ["validacion"],
  },
  {
    slug: "roadmap",
    termino: "Roadmap",
    categoria: "Producto",
    definicion:
      "La secuencia de apuestas de producto, ordenada por aprendizaje y valor. Cada etapa debería tener un experimento y una métrica.",
    ejemplo: "Validar demanda → concierge manual → producto v1 → cobrar. Cada paso con su condición para avanzar.",
    ver: ["north-star"],
  },

  // ---------------------------------------------------------------------------
  // Legal
  // ---------------------------------------------------------------------------
  {
    slug: "sas",
    termino: "SAS",
    sigla: "Sociedad por Acciones Simplificada",
    categoria: "Legal",
    definicion:
      "El tipo de sociedad ágil de la Ley 27.349: se constituye rápido, admite clases de acciones y es el estándar de las startups argentinas.",
    ejemplo: "Una SAS con estatuto preparado para emitir acciones preferidas cuando entre un inversor.",
    ver: ["pacto-de-socios", "cap-table"],
  },
  {
    slug: "pacto-de-socios",
    termino: "Pacto de socios",
    categoria: "Legal",
    definicion:
      "El acuerdo entre socios que regula qué pasa si alguien se va, cómo se venden acciones, quién decide qué y cómo se destraban empates. Se firma cuando todos se quieren, para el día que no.",
    ejemplo: "Si un socio deja la operación, la empresa puede recomprar sus acciones no devengadas a valor nominal.",
    ver: ["vesting", "drag-tag-along", "good-bad-leaver"],
  },
  {
    slug: "vesting",
    termino: "Vesting",
    categoria: "Legal",
    definicion:
      "Las acciones de socios y equipo se ganan con el tiempo (típico: 4 años). Si alguien se va antes, se lleva solo lo devengado. Protege a la empresa y a los que se quedan.",
    ejemplo: "4 años con 1 de cliff: si un socio se va a los 2 años, conserva la mitad de sus acciones.",
    ver: ["cliff", "esop", "good-bad-leaver"],
  },
  {
    slug: "cliff",
    termino: "Cliff",
    categoria: "Legal",
    definicion:
      "El período inicial del vesting (típico: 1 año) en el que no se devenga nada. Al cumplirlo se libera de golpe lo acumulado (25% en un vesting de 4 años).",
    ejemplo: "Un socio que se va en el mes 11 se va sin acciones; en el mes 13, con el 25% y un poco más.",
    ver: ["vesting"],
  },
  {
    slug: "good-bad-leaver",
    termino: "Good leaver / bad leaver",
    categoria: "Legal",
    definicion:
      "Cómo trata el pacto a quien se va: un good leaver (enfermedad, acuerdo) conserva lo devengado; un bad leaver (incumplimiento grave) puede perder parte o venderlo a precio bajo.",
    ejemplo: "Irse para competir con la empresa te convierte en bad leaver.",
    ver: ["pacto-de-socios", "vesting"],
  },
  {
    slug: "drag-tag-along",
    termino: "Drag along / tag along",
    categoria: "Legal",
    definicion:
      "Drag along: si la mayoría acepta vender la empresa, puede obligar al resto a vender en las mismas condiciones. Tag along: si alguien vende, los minoritarios pueden sumarse a esa venta.",
    ejemplo: "El 75% acepta una oferta de compra: con drag along, el 25% restante no puede bloquearla.",
    ver: ["pacto-de-socios", "exit"],
  },
  {
    slug: "esop",
    termino: "Plan de opciones",
    sigla: "ESOP · Employee Stock Option Plan",
    categoria: "Legal",
    definicion:
      "Un porcentaje reservado (típico: 10-15%) para darle opciones sobre acciones al equipo clave, con vesting. Permite sumar talento sin pagar sueldos de multinacional.",
    ejemplo: "La primera desarrolladora recibe opciones por el 0,5% con vesting de 4 años y 1 de cliff.",
    ver: ["vesting", "cap-table"],
  },
  {
    slug: "cesion-de-pi",
    termino: "Cesión de propiedad intelectual",
    categoria: "Legal",
    definicion:
      "El contrato por el que los socios, empleados y freelancers ceden a la empresa lo que crean (código, diseños, marca). Sin eso, el activo principal puede no ser de la empresa.",
    ejemplo: "El código que escribió un socio antes de la SAS se cede a la sociedad por contrato.",
    ver: ["marca", "due-diligence"],
  },
  {
    slug: "marca",
    termino: "Registro de marca",
    categoria: "Legal",
    definicion:
      "En Argentina se registra en el INPI, por clases (productos o servicios). Da derecho exclusivo al nombre en esas clases por 10 años renovables.",
    ejemplo: "Registrar el nombre en la clase 9 (software) y la 42 (servicios tecnológicos) antes de lanzar.",
    ver: ["cesion-de-pi"],
  },
  {
    slug: "nda",
    termino: "NDA",
    sigla: "Acuerdo de confidencialidad",
    categoria: "Legal",
    definicion:
      "Protege información sensible en conversaciones con proveedores, empleados o corporaciones. Los fondos casi nunca firman NDA para una primera reunión: la idea vale menos que la ejecución.",
    ejemplo: "NDA mutuo con una empresa grande antes de mostrarle cómo funciona tu algoritmo.",
    ver: ["cesion-de-pi"],
  },
  {
    slug: "loi",
    termino: "Carta de intención",
    sigla: "LOI · Letter of Intent",
    categoria: "Legal",
    definicion:
      "Un cliente potencial declara por escrito que compraría o haría un piloto si construís X. No obliga, pero es tracción que se puede mostrar.",
    ejemplo: "5 cartas de intención de tu cliente ideal valen más que 50 «me encanta la idea».",
    ver: ["validacion", "traccion"],
  },
  {
    slug: "datos-personales",
    termino: "Datos personales",
    categoria: "Legal",
    definicion:
      "En Argentina los regula la Ley 25.326: hay que informar qué datos juntás y para qué, pedir consentimiento, dejar que la persona acceda y los borre, e inscribir la base.",
    ejemplo: "Una política de privacidad clara y una casilla de consentimiento en el registro.",
  },

  // ---------------------------------------------------------------------------
  // Equipo y ecosistema
  // ---------------------------------------------------------------------------
  {
    slug: "roles-c-level",
    termino: "CEO, CTO, CFO, COO, CMO, CPO",
    categoria: "Equipo y ecosistema",
    definicion:
      "Los roles de dirección. CEO: rumbo, equipo y plata. CTO: tecnología. CFO: finanzas. COO: operaciones. CMO: marketing. CPO: producto. En etapas tempranas una persona suele cubrir varios.",
    ejemplo: "Dos socios: una CEO que vende y levanta, un CTO que construye. Las etiquetas de Pecera muestran quién es quién.",
    ver: ["fundador"],
  },
  {
    slug: "fundador",
    termino: "Fundador/a y cofundador/a",
    categoria: "Equipo y ecosistema",
    definicion:
      "Quienes arrancan la empresa y comparten el riesgo. Los inversores de etapa temprana invierten sobre todo en el equipo fundador.",
    ejemplo: "Un equipo con alguien de negocio y alguien técnico es más fácil de financiar que un fundador solo.",
    ver: ["roles-c-level", "vesting"],
  },
  {
    slug: "mentor",
    termino: "Mentor/a y coach",
    categoria: "Equipo y ecosistema",
    definicion:
      "Mentor: alguien con experiencia que te aconseja desde lo que vivió. Coach: te ayuda a encontrar tus propias respuestas y a destrabarte. En Pecera los aliados muestran sus especialidades.",
    ejemplo: "Una mentora de fundraising que ya levantó dos rondas revisa tu deck antes del Demo Day.",
    ver: ["advisor", "aceleradora"],
  },
  {
    slug: "advisor",
    termino: "Advisor",
    categoria: "Equipo y ecosistema",
    definicion:
      "Asesor formal de la empresa, muchas veces a cambio de un porcentaje chico (0,25-1%) con vesting. Suma credibilidad y red.",
    ejemplo: "Un ex director del sector se suma como advisor con 0,5% a 2 años.",
    ver: ["mentor", "esop"],
  },
  {
    slug: "aceleradora",
    termino: "Aceleradora e incubadora",
    categoria: "Equipo y ecosistema",
    definicion:
      "Incubadora: acompaña ideas y proyectos tempranos, con espacio y formación. Aceleradora: programa intensivo y con fecha para empresas que ya andan, muchas veces con inversión a cambio de un porcentaje.",
    ejemplo: "Un programa de 3 meses que invierte USD 50 mil por el 7% y termina con un Demo Day.",
    ver: ["demo-day"],
  },
  {
    slug: "pitch",
    termino: "Pitch",
    categoria: "Equipo y ecosistema",
    definicion:
      "Presentación corta del proyecto para despertar interés. En Pecera, 90 segundos de video vertical: problema, solución, tracción y qué buscás.",
    ejemplo: "Arrancar con el problema en una frase, mostrar un número fuerte y cerrar con un pedido concreto.",
    ver: ["pitch-deck", "demo-day"],
  },
  {
    slug: "demo-day",
    termino: "Demo Day",
    categoria: "Equipo y ecosistema",
    definicion:
      "El cierre de un programa o una feria: cada proyecto presenta ante inversores, jurado y público.",
    ejemplo: "El Demo Day de la Feria 21: 3 minutos por proyecto ante el jurado.",
    ver: ["pitch"],
  },
  {
    slug: "hackathon",
    termino: "Hackathon",
    categoria: "Equipo y ecosistema",
    definicion:
      "Maratón de uno a tres días en que equipos construyen un prototipo para un desafío. Sirve para validar ideas rápido y conocer socios.",
    ejemplo: "48 horas para resolver un desafío de logística; el ganador hace un piloto con la empresa que lo planteó.",
    ver: ["prototipo"],
  },
];

const POR_SLUG = new Map(CONCEPTOS.map((c) => [c.slug, c]));
export const getConcepto = (slug: string) => POR_SLUG.get(slug);
