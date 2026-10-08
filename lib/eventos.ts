/**
 * Programa del evento. Vive en el código (no en la base) para que la página se vea
 * aunque la migración no haya corrido: la base solo guarda participantes, votos y
 * si la votación está abierta.
 *
 * Programa confirmado de la Feria 21 (horario de Argentina, UTC-3). La votación se
 * abre y se cierra a mano desde /admin; `votacion` es el cronograma que sigue el
 * equipo y que se muestra en la página y en el panel.
 */

export type Jornada = {
  id: string;
  dia: string;
  fecha: string;
  /** Para `<time dateTime>`: ISO con el offset de Argentina (-03:00). */
  inicio: string;
  horario: string;
  lugar: string;
  titulo: string;
  resumen: string;
  momentos: string[];
  /** El Demo Day se destaca en la página. */
  destacada?: boolean;
};

export type Evento = {
  slug: string;
  nombre: string;
  tipo: string;
  bajada: string;
  lugar: string;
  fechas: string;
  agenda: Jornada[];
  /**
   * Cronograma de la votación del público, en frases que se completan ("abre el …",
   * "los resultados …"). Lo aplica el equipo a mano desde /admin.
   */
  votacion: { abre: string; cierra: string; resultados: string };
  comoVotar: string[];
  reglas: string[];
};

const VOTACION = {
  abre: "miércoles 7 a las 9:00 h",
  cierra: "viernes 9 a las 14:00 h, cuando empieza el Demo Day",
  resultados: "se anuncian en el Demo Day",
};

const RECORRER = [
  "Stands de los proyectos en la Carpa Feria",
  "Mirá sus pitches en Pecera y escribiles desde su perfil",
  "Votá a tu favorito",
];

export const EVENTO_ACTUAL: Evento = {
  slug: "feria-21",
  nombre: "Feria 21",
  tipo: "Feria emprendedora",
  bajada:
    "Los proyectos de Impulso 21 y la comunidad emprendedora de la Universidad Siglo 21, en un solo lugar. Tres días de feria y un Demo Day para cerrar.",
  lugar: "Universidad Siglo 21 · Córdoba",
  fechas: "7, 8 y 9 de octubre de 2026 · Demo Day el viernes 9 a las 14 h",
  agenda: [
    {
      id: "miercoles",
      dia: "Miércoles 7",
      fecha: "7 de octubre",
      inicio: "2026-10-07T09:00:00-03:00",
      horario: "9:00 a 17:00 h",
      lugar: "Carpa Feria",
      titulo: "Feria",
      resumen: "Abren la feria y la votación del público.",
      momentos: RECORRER,
    },
    {
      id: "jueves",
      dia: "Jueves 8",
      fecha: "8 de octubre",
      inicio: "2026-10-08T09:00:00-03:00",
      horario: "9:00 a 17:00 h",
      lugar: "Carpa Feria",
      titulo: "Feria",
      resumen: "Segundo día de feria. La votación sigue abierta.",
      momentos: RECORRER,
    },
    {
      id: "viernes",
      dia: "Viernes 9",
      fecha: "9 de octubre, a la mañana",
      inicio: "2026-10-09T09:00:00-03:00",
      horario: "Desde las 9:00 h hasta el Demo Day",
      lugar: "Carpa Feria",
      titulo: "Último tramo de feria",
      resumen: "La feria sigue hasta el Demo Day. Es la última oportunidad para votar.",
      momentos: RECORRER,
    },
    {
      id: "demo-day",
      dia: "Demo Day",
      fecha: "Viernes 9 de octubre",
      inicio: "2026-10-09T14:00:00-03:00",
      horario: "14:00 h",
      lugar: "Auditorio, Urquía",
      titulo: "Pitches ante el jurado",
      resumen:
        "Cada proyecto tiene 3 minutos frente al jurado. Cerramos con el ranking del público.",
      momentos: [
        "Cierre de la votación al empezar el Demo Day",
        "Pitch de 3 minutos por proyecto",
        "Anuncio del más votado en Pecera",
      ],
      destacada: true,
    },
  ],
  votacion: VOTACION,
  comoVotar: [
    "Elegí el día de la feria o buscá a tu favorito por nombre o emprendimiento.",
    "Tocá «Votar». No hace falta cuenta: es un voto por celular.",
    "Podés cambiar tu voto mientras la votación esté abierta.",
  ],
  reglas: [
    "Un voto por celular. Si entrás con tu cuenta de Google y votás, vale el voto de la cuenta.",
    "No te podés votar a vos ni a tu propia empresa.",
    `La votación abre el ${VOTACION.abre} y cierra el ${VOTACION.cierra}.`,
    `Los resultados ${VOTACION.resultados}.`,
  ],
};

export const EVENTOS: Evento[] = [EVENTO_ACTUAL];

export const getEventoDefinido = (slug: string) => EVENTOS.find((e) => e.slug === slug) ?? null;

// ---------------------------------------------------------------------------
// Categorías de Eventos. La Feria es una de ellas: /eventos es la sección madre y
// cada evento vive en /eventos/[slug] (la página de la Feria 21 no cambia).
// ---------------------------------------------------------------------------
export type CategoriaEvento = {
  id: "feria" | "networking" | "pitch" | "workshops" | "demo-days" | "otros";
  nombre: string;
  bajada: string;
  /** Slugs de EVENTOS que entran en la categoría. */
  eventos: string[];
};

export const CATEGORIAS_EVENTO: CategoriaEvento[] = [
  {
    id: "feria",
    nombre: "Ferias",
    bajada: "Stands, pitches en vivo y votación del público.",
    eventos: [EVENTO_ACTUAL.slug],
  },
  { id: "networking", nombre: "Networking", bajada: "Encuentros para conocer founders, inversores y aliados.", eventos: [] },
  { id: "pitch", nombre: "Pitch Events", bajada: "Rondas de pitch con devolución de inversores.", eventos: [] },
  { id: "workshops", nombre: "Workshops", bajada: "Talleres prácticos: métricas, legales, fundraising.", eventos: [] },
  { id: "demo-days", nombre: "Demo Days", bajada: "Cierres de programas con pitches ante el jurado.", eventos: [] },
  { id: "otros", nombre: "Otros eventos", bajada: "Hackathons, charlas y todo lo que se sume.", eventos: [] },
];
/**
 * Dónde está el evento en el tiempo (hora de Argentina): antes de la primera
 * jornada, durante (hasta el final del día de la última) o terminado. La landing
 * lo anuncia solo mientras sirve.
 */
export function momentoEvento(evento: Evento, ahora = Date.now()): "proximo" | "en_curso" | "terminado" {
  const primera = evento.agenda[0];
  const ultima = evento.agenda.at(-1);
  if (!primera || !ultima) return "terminado";
  const fin = new Date(`${ultima.inicio.slice(0, 10)}T23:59:59-03:00`).getTime();
  if (ahora > fin) return "terminado";
  return ahora < new Date(primera.inicio).getTime() ? "proximo" : "en_curso";
}

export const eventoVigente = (evento: Evento) => momentoEvento(evento) !== "terminado";
