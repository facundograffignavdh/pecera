/**
 * Programa del evento. Vive en el código (no en la base) para que la página se vea
 * aunque la migración no haya corrido: la base solo guarda participantes, votos y
 * si la votación está abierta.
 *
 * Fechas: el Demo Day del 5/10 sale del Taller de Pitch de Impulso Tech 2H 2026
 * (Drive). Los días 1 a 3 son una PROPUESTA de programa: el equipo confirma fechas y
 * horarios y los edita acá (ver docs/GUIA-FERIA.md).
 */

export type Jornada = {
  id: string;
  dia: string;
  fecha: string;
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
  comoVotar: string[];
  reglas: string[];
};

export const EVENTO_ACTUAL: Evento = {
  slug: "feria-21",
  nombre: "Feria 21",
  tipo: "Feria emprendedora",
  bajada:
    "Los proyectos de Impulso 21 y la comunidad emprendedora de la Universidad Siglo 21, en un solo lugar. Tres días de pitches, mentorías y conexiones, y un Demo Day para cerrar.",
  lugar: "Universidad Siglo 21 · Córdoba",
  fechas: "Octubre 2026 · Demo Day el 5 de octubre",
  agenda: [
    {
      id: "dia-1",
      dia: "Día 1",
      fecha: "Fecha a confirmar",
      titulo: "Abrimos la pecera",
      resumen: "Llegan los proyectos, se arman los stands y cada equipo sube su pitch a Pecera.",
      momentos: [
        "Acreditación y armado de stands",
        "Set de grabación: pitch de 90 segundos, en vertical",
        "Cada proyecto crea su perfil y su página de empresa",
      ],
    },
    {
      id: "dia-2",
      dia: "Día 2",
      fecha: "Fecha a confirmar",
      titulo: "Mentorías y conexiones",
      resumen: "Mesas con mentores por especialidad y ronda de encuentros con inversores y aliados.",
      momentos: [
        "Mesas de mentoría: ventas, producto, legal y fundraising",
        "Speed networking con inversores y aliados",
        "Clínica de pitch deck y de métricas",
      ],
    },
    {
      id: "dia-3",
      dia: "Día 3",
      fecha: "Fecha a confirmar",
      titulo: "El público vota",
      resumen: "Se abre la votación en Pecera: recorré los stands, mirá los pitches y votá tu favorito.",
      momentos: [
        "Apertura de la votación del público",
        "Demos en vivo en cada stand",
        "Cierre de la votación",
      ],
    },
    {
      id: "demo-day",
      dia: "Demo Day",
      fecha: "5 de octubre",
      titulo: "Pitches ante el jurado",
      resumen:
        "Cada proyecto tiene 3 minutos frente al jurado. Cerramos con el proyecto más votado por el público.",
      momentos: [
        "Pitch de 3 minutos por proyecto",
        "Devolución del jurado",
        "Anuncio del más votado en Pecera y cierre",
      ],
      destacada: true,
    },
  ],
  comoVotar: [
    "Entrá con tu cuenta de Google (es para que haya un voto por persona).",
    "Mirá los proyectos participantes y tocá «Votar» en tu favorito.",
    "Podés cambiar tu voto mientras la votación esté abierta.",
  ],
  reglas: [
    "Un voto por cuenta de Google.",
    "No se puede votar al propio proyecto ni a la propia empresa.",
    "Los resultados se muestran al cierre, en el Demo Day.",
  ],
};

export const EVENTOS: Evento[] = [EVENTO_ACTUAL];

export const getEventoDefinido = (slug: string) => EVENTOS.find((e) => e.slug === slug) ?? null;
