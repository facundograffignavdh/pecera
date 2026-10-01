import type { CSSProperties } from "react";
import { Palabras, Etiqueta, Tilde } from "@/components/landing/Seccion";

// Cada herramienta suelta y lo que la reemplaza en Pecera. El desplazamiento
// (en % del ancho de la escena) y el giro dibujan el desorden inicial.
const PIEZAS = [
  { antes: "LinkedIn", despues: "Perfil", dx: -6, dy: 5, r: -7 },
  { antes: "Video en Drive", despues: "Pitch de 90 s", dx: 9, dy: -7, r: 6 },
  { antes: "Grupo de WhatsApp", despues: "Contacto directo", dx: 11, dy: 9, r: 8 },
  { antes: "Deck en PDF", despues: "Dataroom", dx: -12, dy: 15, r: -5 },
  { antes: "Planilla de inversores", despues: "Explorar", dx: -3, dy: -11, r: 4 },
  { antes: "Posteos sueltos", despues: "Build in Public", dx: 7, dy: 12, r: -9 },
  { antes: "Mails con métricas", despues: "Transparencia", dx: 13, dy: -5, r: -3 },
  { antes: "Contactos de un evento", despues: "Piques", dx: -9, dy: -13, r: 7 },
];

/**
 * 01 El problema → 02 La solución, en una sola escena: las herramientas sueltas
 * entran desordenadas y, cuando la escena está a la vista, se ordenan dentro de
 * un perfil de Pecera y cambian de nombre. Sin JavaScript se ve el estado final.
 */
export default function Desparramado() {
  return (
    <section id="problema" aria-labelledby="problema-titulo" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div data-revelar className="max-w-xl">
          <Etiqueta numero="01">El problema</Etiqueta>
          <h2
            id="problema-titulo"
            className="mt-4 font-display text-[2.05rem] font-semibold leading-[1.06] tracking-[-0.01em] text-balance sm:text-[3.2rem]"
          >
            <Palabras texto="Hoy, encontrarse cuesta demasiado." />
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-tinta/75 text-pretty">
            Un fundador reparte su proyecto entre LinkedIn, WhatsApp, un deck en PDF y planillas que nadie actualiza. Un
            inversor lo busca en grupos, eventos y recomendaciones. La información existe: está desparramada.
          </p>
          <p className="sr-only">
            Lo que hoy está suelto, en Pecera tiene su lugar:{" "}
            {PIEZAS.map((p) => `${p.antes}, ${p.despues}`).join("; ")}.
          </p>
          <div className="mt-10 border-l-2 border-naranja pl-5">
            <Etiqueta numero="02">La solución</Etiqueta>
            <p className="mt-3 font-display text-2xl font-semibold leading-snug text-tinta sm:text-[1.75rem]">
              Pecera lo ordena: un lugar para cada cosa, y todo conectado.
            </p>
          </div>
        </div>

        <div data-escena className="@container relative mx-auto w-full max-w-[34rem]" aria-hidden>
          <div className="desorden-marco absolute -inset-3 rounded-[var(--radius-bloque)] border border-tinta/10 bg-superficie shadow-[0_1px_2px_rgb(28_27_22/0.05),0_18px_44px_rgb(28_27_22/0.08)] sm:-inset-6" />
          <div className="relative">
            <div className="desorden-marco mb-5 flex items-center justify-between gap-3 border-b border-tinta/10 pb-4">
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-arcilla font-display text-sm font-semibold text-marfil">
                  RV
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold leading-tight">Raíz Verde</span>
                  <span className="block text-xs text-tinta/65">Todo en un perfil de Pecera</span>
                </span>
              </span>
              <span className="rounded-full bg-naranja-suave px-2.5 py-1 text-xs font-semibold text-naranja-texto">Ejemplo</span>
            </div>
            <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {PIEZAS.map((p, i) => (
                <li
                  key={p.antes}
                  className="desorden-chip rounded-2xl border border-dashed border-tinta/30 px-3 py-3 text-sm font-medium sm:px-4 sm:text-[15px]"
                  style={{ "--dx": p.dx, "--dy": p.dy, "--r": `${p.r}deg`, "--i": i } as CSSProperties}
                >
                  <span className="antes text-tinta/65">{p.antes}</span>
                  <span className="despues flex items-center gap-2 text-tinta">
                    <Tilde className="text-aliado" />
                    {p.despues}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
