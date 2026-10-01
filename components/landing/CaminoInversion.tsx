import type { CSSProperties } from "react";
import { Seccion } from "@/components/landing/Seccion";

const PASOS = [
  { titulo: "Startup", texto: "Arma su página con equipo, producto y pitch.", color: "bg-arcilla text-marfil" },
  { titulo: "Ronda", texto: "Marca qué ronda busca y, si quiere, cuánto y para qué.", color: "bg-naranja text-tinta" },
  { titulo: "Inversor", texto: "La encuentra por su tesis y le escribe directo.", color: "bg-inversor text-marfil" },
  { titulo: "Portfolio", texto: "Si invierte, la suma a su portfolio y la empresa lo confirma.", color: "bg-tinta text-marfil" },
  { titulo: "Transparencia", texto: "Métricas, deck y documentos se abren uno por uno, cuando la startup decide.", color: "bg-aliado text-marfil" },
];

/**
 * El camino de la inversión, de punta a punta, sin un solo número: Pecera no
 * muestra montos que no existen. La línea se dibuja al aparecer (horizontal en
 * escritorio, vertical en el celular).
 */
export default function CaminoInversion() {
  return (
    <Seccion
      id="inversion"
      numero="07"
      etiqueta="Inversión"
      titulo="De la ronda al portfolio, a la vista."
      bajada="Cada paso queda registrado donde tiene que estar: la ronda en la empresa, la inversión en el portfolio del inversor y los datos, en manos de la startup."
      className="bg-superficie"
    >
      <ol data-revelar className="relative mt-14 grid gap-8 lg:grid-cols-5 lg:gap-6">
        <span aria-hidden className="recorrido-linea absolute bottom-6 left-[1.4375rem] top-6 w-px bg-tinta/20 lg:bottom-auto lg:left-6 lg:right-[calc((100%-6rem)/5-1.5rem)] lg:top-[1.4375rem] lg:h-px lg:w-auto" />
        {PASOS.map((p, i) => (
          <li
            key={p.titulo}
            className="relative flex gap-5 lg:flex-col lg:gap-4"
            style={{ transitionDelay: `${i * 90}ms` } as CSSProperties}
          >
            <span className={`relative z-10 grid size-12 shrink-0 place-items-center rounded-full font-display text-lg font-semibold ring-8 ring-superficie ${p.color}`}>
              {i + 1}
            </span>
            <div>
              <h3 className="font-display text-2xl font-semibold">{p.titulo}</h3>
              <p className="mt-1 leading-relaxed text-tinta/75">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <p data-revelar className="mt-12 max-w-2xl border-l-2 border-tinta/20 pl-4 text-[15px] leading-relaxed text-tinta/70">
        Pecera no capta fondos, no custodia activos ni interviene en la inversión: conecta. La conversación y el acuerdo
        siguen entre ustedes, sin comisiones de la plataforma.
      </p>
    </Seccion>
  );
}
