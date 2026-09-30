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
  "Votá tu proyecto favorito",
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
        "Cada proyecto tiene 3 minutos frente al jurado. Cerramos con el proyecto más votado por el público.",
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
    "Entrá con tu cuenta de Google (es para que haya un voto por persona).",
    "Mirá los proyectos participantes y tocá «Votar» en tu favorito.",
    "Podés cambiar tu voto mientras la votación esté abierta.",
  ],
  reglas: [
    "Un voto por cuenta de Google.",
    "No se puede votar al propio proyecto ni a la propia empresa.",
    `La votación abre el ${VOTACION.abre} y cierra el ${VOTACION.cierra}.`,
    `Los resultados ${VOTACION.resultados}.`,
  ],
};

export const EVENTOS: Evento[] = [EVENTO_ACTUAL];

export const getEventoDefinido = (slug: string) => EVENTOS.find((e) => e.slug === slug) ?? null;
