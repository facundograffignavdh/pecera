import { Seccion } from "@/components/landing/Seccion";

const OTRAS = [
  { nombre: "LinkedIn", resuelve: "Tu identidad profesional y tu red." },
  { nombre: "Crunchbase", resuelve: "Datos de empresas y de rondas." },
  { nombre: "Wellfound", resuelve: "Empleo y talento para startups." },
  { nombre: "Grupos de WhatsApp", resuelve: "La conversación del día." },
];

const PECERA = ["Quién construye qué", "Quién invierte en qué", "Quién ayuda a quién", "Y cómo escribirle"];

/**
 * Por qué Pecera y no otra cosa, sin pegarle a nadie: cada herramienta resuelve
 * bien una parte; Pecera está hecha para lo que pasa entre las partes de un
 * ecosistema emprendedor.
 */
export default function Diferencia() {
  return (
    <Seccion
      id="diferencia"
      numero="11"
      etiqueta="Por qué Pecera"
      titulo="No es otra red social."
      bajada="Cada herramienta resuelve bien una parte. Pecera está hecha para lo que pasa entre las partes de un ecosistema emprendedor."
      className="bg-superficie"
    >
      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <ul data-revelar className="divide-y divide-tinta/10 border-y border-tinta/10">
          {OTRAS.map((o) => (
            <li key={o.nombre} className="flex flex-col gap-0.5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <span className="font-semibold text-tinta">{o.nombre}</span>
              <span className="text-tinta/70 sm:text-right">{o.resuelve}</span>
            </li>
          ))}
        </ul>
        <div data-revelar className="relative overflow-hidden rounded-[var(--radius-bloque)] bg-tinta p-7 text-marfil sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pecera">Pecera</p>
          <p className="mt-3 font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
            El ecosistema entero, en un solo lugar.
          </p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {PECERA.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-marfil/90">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-pecera" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-marfil/15 pt-5 text-[15px] leading-relaxed text-marfil/70">
            Identidad, descubrimiento, relaciones e infraestructura para startups: pitch, empresa, portfolio, Academy y
            Dataroom, conectados.
          </p>
        </div>
      </div>
    </Seccion>
  );
}
