/**
 * Documentos legales de /docs/legales: qué es cada uno, cuándo hace falta, qué
 * tiene que decir y qué señales de alerta mirar. Es material de orientación, NO
 * asesoramiento legal ni un modelo para firmar: cada documento lo revisa un abogado.
 * Parte del texto viene de pecera-app/lib/glosario.ts (DOCUMENTOS).
 */

export type CategoriaLegal = "Sociedad y socios" | "Inversión" | "Equipo" | "Protección" | "Clientes";

export type DocumentoLegal = {
  id: string;
  nombre: string;
  categoria: CategoriaLegal;
  /** Momento en que conviene tenerlo. */
  cuando: string;
  queEs: string;
  /** Lo que el documento tiene que resolver sí o sí. */
  claves: string[];
  /** Secciones mínimas, para llegar al abogado con el borrador pensado. */
  estructura: string[];
  alerta: string;
  /** Concepto relacionado en /docs/conceptos. */
  concepto?: string;
};

export const CATEGORIAS_LEGALES: CategoriaLegal[] = [
  "Sociedad y socios",
  "Inversión",
  "Equipo",
  "Protección",
  "Clientes",
];

export const DOCUMENTOS_LEGALES: DocumentoLegal[] = [
  // Sociedad y socios
  {
    id: "estatuto-sas",
    nombre: "Estatuto de la SAS",
    categoria: "Sociedad y socios",
    cuando: "Al formalizar la empresa, antes de facturar en serio o de recibir inversión.",
    queEs:
      "El documento fundacional de la sociedad (Ley 27.349): objeto, capital, clases de acciones y cómo se administra. Bien redactado, deja la puerta abierta a inversores.",
    claves: [
      "Objeto amplio: no te limites al producto de hoy.",
      "Prever clases de acciones (ordinarias y preferidas) para rondas futuras.",
      "Mayorías razonables: la unanimidad para todo traba cada decisión.",
    ],
    estructura: [
      "Denominación, domicilio y plazo",
      "Objeto social",
      "Capital, clases de acciones y derechos",
      "Órgano de administración y representación",
      "Reuniones de socios y mayorías",
      "Fiscalización, ejercicio y distribución de utilidades",
    ],
    alerta: "Estatutos plantilla con unanimidad para todo: cada ronda futura se vuelve una odisea.",
    concepto: "sas",
  },
  {
    id: "pacto-de-socios",
    nombre: "Pacto de socios",
    categoria: "Sociedad y socios",
    cuando: "Al asociarse, mientras la relación está bien. Siempre antes de la primera ronda.",
    queEs:
      "El contrato entre socios que regula roles, salidas, venta de acciones, no competencia y cómo se destraban empates.",
    claves: [
      "Vesting con cliff para todos los fundadores, sin excepciones.",
      "Qué pasa con las acciones del que se va (good leaver / bad leaver).",
      "Drag along y tag along para una venta futura.",
      "Mecanismo de desempate si la sociedad es 50/50.",
    ],
    estructura: [
      "Partes, participación de cada uno y aportes",
      "Roles, dedicación y remuneración",
      "Vesting, cliff y recompra de acciones",
      "Transferencia de acciones: preferencia, drag y tag along",
      "No competencia y confidencialidad",
      "Decisiones reservadas, desempate y resolución de conflictos",
    ],
    alerta: "Sociedades 50/50 sin desempate ni vesting: la empresa se paraliza en la primera crisis.",
    concepto: "pacto-de-socios",
  },
  {
    id: "vesting",
    nombre: "Acuerdo de vesting con cliff",
    categoria: "Sociedad y socios",
    cuando: "Al constituir la sociedad o sumar un socio. Puede ir dentro del pacto de socios.",
    queEs:
      "Define cómo los socios y el equipo clave se ganan sus acciones con el tiempo. Estándar: 4 años con cliff de 1 año y devengo mensual después.",
    claves: [
      "Fecha de inicio (puede reconocer el tiempo ya trabajado).",
      "Cliff de 12 meses y devengo mensual.",
      "Aceleración ante una venta de la empresa (single o double trigger).",
    ],
    estructura: [
      "Acciones sujetas a vesting",
      "Calendario de devengo y cliff",
      "Recompra de lo no devengado",
      "Aceleración por cambio de control",
    ],
    alerta: "Socios con 50% sin vesting: si uno se va al año, se lleva media empresa.",
    concepto: "vesting",
  },

  // Inversión
  {
    id: "safe",
    nombre: "SAFE",
    categoria: "Inversión",
    cuando: "Al levantar pre-seed o seed sin fijar valuación.",
    queEs:
      "Contrato de inversión convertible creado por Y Combinator: plata hoy, acciones en la próxima ronda con descuento y/o cap. En Argentina se adapta a la ley local (suele llamarse «acuerdo de suscripción futura»).",
    claves: [
      "Post-money: la dilución se calcula fácil y sin sorpresas.",
      "Descuento típico de 15-20% y un cap de valuación.",
      "Qué pasa si no hay ronda, si se vende la empresa o si se disuelve.",
    ],
    estructura: [
      "Monto invertido",
      "Cap de valuación y/o descuento",
      "Eventos de conversión: ronda, venta, disolución",
      "Derechos del inversor (información, pro-rata)",
      "Ley aplicable y jurisdicción",
    ],
    alerta: "Firmar SAFEs uno atrás de otro sin modelar la dilución total: al convertir, los fundadores descubren que cedieron 40%.",
    concepto: "safe",
  },
  {
    id: "nota-convertible",
    nombre: "Nota convertible",
    categoria: "Inversión",
    cuando: "Alternativa al SAFE cuando el inversor prefiere un préstamo con interés.",
    queEs: "Un préstamo que se convierte en acciones en la próxima ronda, con interés y fecha de vencimiento.",
    claves: [
      "Tasa de interés y vencimiento razonables (18-24 meses).",
      "Qué pasa al vencimiento si no hubo ronda.",
      "Descuento y cap, igual que en el SAFE.",
    ],
    estructura: ["Monto y tasa", "Vencimiento", "Conversión: descuento y cap", "Incumplimiento y vencimiento sin ronda"],
    alerta: "Vencimientos cortos que te obligan a devolver la plata justo cuando no la tenés.",
    concepto: "nota-convertible",
  },
  {
    id: "term-sheet",
    nombre: "Term sheet",
    categoria: "Inversión",
    cuando: "Cuando un inversor lidera una ronda con precio (priced round).",
    queEs:
      "Resumen de las condiciones de la inversión: valuación, monto, directorio, derechos y preferencias. No obliga a invertir, salvo en confidencialidad y exclusividad.",
    claves: [
      "Preferencia de liquidación 1x no participativa.",
      "En seed, los fundadores mantienen el control del directorio.",
      "Exclusividad acotada (30-45 días).",
    ],
    estructura: [
      "Monto, valuación y tipo de acción",
      "Preferencia de liquidación",
      "Directorio y decisiones que requieren al inversor",
      "Anti-dilución, pro-rata e información",
      "Pool de opciones",
      "Exclusividad, confidencialidad y plazos",
    ],
    alerta: "Preferencias de 2x o más, anti-dilución «full ratchet» o vetos amplios en etapa temprana.",
    concepto: "term-sheet",
  },
  {
    id: "cap-table",
    nombre: "Cap table",
    categoria: "Inversión",
    cuando: "Desde la constitución; se actualiza con cada ronda, SAFE y opción.",
    queEs:
      "La planilla de la verdad societaria: cada socio, su clase de acciones, SAFEs por convertir y pool de opciones, en porcentaje fully diluted.",
    claves: [
      "Siempre fully diluted (como si todo convirtiera hoy).",
      "Una sola versión oficial, con historial.",
      "Simulación de la próxima ronda para ver la dilución.",
    ],
    estructura: ["Socios y acciones", "Instrumentos convertibles", "Pool de opciones", "Escenarios de próxima ronda"],
    alerta: "20% en manos de un socio que se fue hace dos años (dead equity).",
    concepto: "cap-table",
  },
  {
    id: "data-room",
    nombre: "Data room",
    categoria: "Inversión",
    cuando: "Al abrir una ronda. Se arma antes de que lo pidan.",
    queEs: "La carpeta ordenada con todo lo que va a pedir la due diligence.",
    claves: [
      "Una carpeta por tema y permisos por persona.",
      "Métricas con su definición (cómo calculás churn, MRR, CAC).",
      "Contratos firmados, no borradores.",
    ],
    estructura: [
      "Societario: estatuto, pacto, actas, cap table",
      "Finanzas: estados contables, proyecciones, impuestos",
      "Métricas y tracción",
      "Contratos con clientes y proveedores",
      "Propiedad intelectual: marca, cesiones",
      "Equipo: contratos, vesting, opciones",
    ],
    alerta: "Armar el data room durante la due diligence: cada semana de demora enfría la ronda.",
    concepto: "data-room",
  },

  // Equipo
  {
    id: "esop",
    nombre: "Plan de opciones (ESOP)",
    categoria: "Equipo",
    cuando: "Antes de la primera contratación clave o cuando la ronda lo pide.",
    queEs:
      "El reglamento del pool de opciones para el equipo: cuánto se reserva (10-15%), a qué precio, con qué vesting y qué pasa al irse.",
    claves: [
      "Mismo estándar de vesting que los socios (4 años, 1 de cliff).",
      "Plazo para ejercer las opciones después de irse.",
      "Tratamiento impositivo revisado con un contador.",
    ],
    estructura: ["Tamaño del pool", "Elegibles y asignación", "Precio de ejercicio", "Vesting y salida", "Eventos de liquidez"],
    alerta: "Prometer «un porcentaje» de palabra, sin plan escrito: termina en conflictos al profesionalizar.",
    concepto: "esop",
  },
  {
    id: "contrato-fundador",
    nombre: "Contrato de servicios del fundador",
    categoria: "Equipo",
    cuando: "Cuando los socios empiezan a cobrar de la empresa.",
    queEs: "Regula la relación de trabajo de cada socio con la sociedad: dedicación, remuneración y cesión de lo que crea.",
    claves: [
      "Dedicación exclusiva o parcial, por escrito.",
      "Cesión a la empresa de todo lo que se cree.",
      "No competencia razonable en tiempo y alcance.",
    ],
    estructura: ["Funciones y dedicación", "Remuneración", "Propiedad intelectual", "Confidencialidad y no competencia", "Terminación"],
    alerta: "Socios que programan desde su cuenta personal y sin contrato: el código no es de la empresa.",
    concepto: "fundador",
  },
  {
    id: "cesion-de-pi",
    nombre: "Cesión de propiedad intelectual",
    categoria: "Equipo",
    cuando: "Con cada socio, empleado y freelancer que cree algo para la empresa. Desde el día uno.",
    queEs: "Todo lo que crean (código, diseño, contenido, marca) pasa a ser de la empresa.",
    claves: [
      "Incluye lo creado antes de constituir la sociedad.",
      "Cubre freelancers y agencias, no solo empleados.",
      "Renuncia a reclamos futuros sobre lo cedido.",
    ],
    estructura: ["Obras y desarrollos cedidos", "Alcance y territorio", "Precio o contraprestación", "Garantías de autoría"],
    alerta: "La app la hizo un freelancer sin contrato de cesión: ningún fondo firma así.",
    concepto: "cesion-de-pi",
  },

  // Protección
  {
    id: "nda",
    nombre: "Acuerdo de confidencialidad (NDA)",
    categoria: "Protección",
    cuando: "Con empleados, proveedores y pilotos con empresas grandes. Casi nunca con fondos.",
    queEs: "Protege la información sensible que compartís en conversaciones comerciales o técnicas.",
    claves: ["Mutuo si las dos partes comparten información.", "Plazo razonable (2-3 años).", "Qué no es confidencial (lo público, lo ya conocido)."],
    estructura: ["Información confidencial", "Excepciones", "Obligaciones y usos permitidos", "Plazo", "Devolución o destrucción"],
    alerta: "Pedirle un NDA a un inversor para mostrarle el deck: señal de amateurismo.",
    concepto: "nda",
  },
  {
    id: "marca",
    nombre: "Registro de marca en el INPI",
    categoria: "Protección",
    cuando: "Antes de lanzar o de invertir en la marca. Buscá antes si ya existe.",
    queEs: "Te da el uso exclusivo del nombre en las clases que registres, por 10 años renovables.",
    claves: ["Búsqueda de antecedentes antes de elegir el nombre.", "Las clases correctas (ej. 9 y 42 para software).", "A nombre de la empresa, no del fundador."],
    estructura: ["Búsqueda de antecedentes", "Elección de clases", "Solicitud", "Publicación y oposiciones", "Concesión y renovación"],
    alerta: "Construir la marca sin registrarla y recibir una carta documento de alguien que la registró antes.",
    concepto: "marca",
  },

  // Clientes
  {
    id: "terminos-privacidad",
    nombre: "Términos y condiciones y política de privacidad",
    categoria: "Clientes",
    cuando: "Antes de que el primer usuario se registre.",
    queEs:
      "Los términos regulan el uso del producto; la política de privacidad explica qué datos juntás, para qué y cómo se ejercen los derechos (Ley 25.326).",
    claves: [
      "Consentimiento expreso y separado para los datos.",
      "Derecho de acceso, rectificación y supresión.",
      "Proveedores y transferencias fuera del país.",
      "Inscripción de la base de datos.",
    ],
    estructura: ["Quiénes somos y contacto", "Qué datos y para qué", "Con quién se comparten", "Derechos y cómo ejercerlos", "Cambios y vigencia"],
    alerta: "Copiar los términos de otra empresa: prometen cosas que tu producto no hace.",
    concepto: "datos-personales",
  },
  {
    id: "loi",
    nombre: "Carta de intención (LOI)",
    categoria: "Clientes",
    cuando: "Para validar demanda B2B antes de tener el producto completo.",
    queEs: "Un cliente potencial declara que compraría o haría un piloto si construís X. No obliga, pero es tracción mostrable.",
    claves: ["Con monto y plazo estimado vale el doble.", "De tu cliente ideal, no de amigos.", "Pensada para convertirse en un piloto pago."],
    estructura: ["Partes", "Problema y solución esperada", "Condiciones del piloto", "Monto y plazo estimados", "Carácter no vinculante"],
    alerta: "Cartas de empresas fuera de tu cliente ideal: los inversores las detectan enseguida.",
    concepto: "loi",
  },
  {
    id: "contrato-servicios",
    nombre: "Contrato de servicios o piloto",
    categoria: "Clientes",
    cuando: "Con cada cliente B2B, incluso en un piloto.",
    queEs: "Fija qué entregás, cuánto se paga, niveles de servicio y quién es dueño de los datos.",
    claves: ["Alcance y entregables claros.", "Precio, forma de pago y actualización.", "Datos del cliente y confidencialidad.", "Limitación de responsabilidad."],
    estructura: ["Objeto y alcance", "Precio y pago", "Niveles de servicio", "Datos y confidencialidad", "Responsabilidad", "Plazo y terminación"],
    alerta: "Pilotos gratis e indefinidos, sin fecha para empezar a cobrar.",
    concepto: "loi",
  },
];

/** Qué tener según la etapa. Los ids apuntan a DOCUMENTOS_LEGALES. */
export const KIT_POR_ETAPA: Array<{ etapa: string; docs: string[] }> = [
  { etapa: "Idea y prototipo", docs: ["pacto-de-socios", "vesting", "cesion-de-pi", "nda"] },
  { etapa: "MVP y primeros clientes", docs: ["estatuto-sas", "terminos-privacidad", "loi", "contrato-servicios", "marca"] },
  { etapa: "Levantando la primera ronda", docs: ["safe", "cap-table", "data-room", "contrato-fundador"] },
  { etapa: "Escalando", docs: ["term-sheet", "esop", "nota-convertible"] },
];
