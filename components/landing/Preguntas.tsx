import { Seccion } from "@/components/landing/Seccion";

export const PREGUNTAS = [
  {
    pregunta: "¿Qué es Pecera?",
    respuesta:
      "La plataforma donde el ecosistema emprendedor de Latinoamérica se encuentra: startups que muestran su pitch y su avance, inversores con su tesis y su portfolio, y aliados con sus servicios. Quien se interesa escribe directo.",
  },
  { pregunta: "¿Cuánto cuesta?", respuesta: "Nada. Crear tu perfil, subir tu pitch y usar la Academy es gratis." },
  {
    pregunta: "¿Pecera invierte, toma equity o maneja plata?",
    respuesta:
      "No. Pecera es una capa de descubrimiento y conexión: no capta fondos, no custodia activos, no toma equity ni cobra comisión por inversión. La negociación sigue entre las partes.",
  },
  {
    pregunta: "¿Puedo sumarme si solo tengo una idea?",
    respuesta: "Sí. Contá la idea, para quién es y qué necesitás. Vale más un pitch claro que un deck perfecto.",
  },
  {
    pregunta: "¿Mis métricas y documentos son públicos?",
    respuesta:
      "No. Lo que cargás en Transparencia y en el Dataroom es privado. Cada dato y cada documento se comparte por separado, solo si vos lo marcás.",
  },
  {
    pregunta: "¿Cómo subo mi pitch?",
    respuesta:
      "Desde tu perfil, con «Subir pitch»: un video vertical de hasta 90 segundos. En 10 a 15 minutos está publicado en el feed, con subtítulos automáticos.",
  },
  {
    pregunta: "¿Puedo sumar a mi equipo?",
    respuesta:
      "Sí. Creá la empresa desde tu perfil y pasale el código a tu equipo: cada uno entra con su cuenta, elige su cargo y todos sus pitches aparecen juntos en la página de la empresa.",
  },
  {
    pregunta: "¿Qué es un pique?",
    respuesta: "El “me picó” de Pecera: la forma de marcar que un pitch te interesó. Un pique es interés, no compromiso.",
  },
];

/** Preguntas frecuentes. El mismo texto alimenta el JSON-LD de la página. */
export default function Preguntas() {
  return (
    <Seccion id="preguntas" etiqueta="Preguntas frecuentes" titulo="Antes de que preguntes.">
      <div className="preguntas mt-10 max-w-3xl divide-y divide-tinta/10 border-y border-tinta/10">
        {PREGUNTAS.map((p) => (
          <details key={p.pregunta} data-revelar className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla [&::-webkit-details-marker]:hidden">
              {p.pregunta}
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full border border-tinta/20 text-xl leading-none transition-transform duration-300 ease-pecera group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-6 pr-12 leading-relaxed text-tinta/75">{p.respuesta}</p>
          </details>
        ))}
      </div>
    </Seccion>
  );
}
