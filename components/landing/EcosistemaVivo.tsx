import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { IconoCorazon } from "@/components/Iconos";
import { Peces } from "@/components/landing/Seccion";

/**
 * El hero muestra el producto, no un dibujo: cuatro piezas reales de Pecera (un
 * pitch, una empresa construyendo en público, una inversora con su tesis y un
 * aliado con sus servicios) unidas por corrientes. Al cargar, los dos peces del
 * isotipo se encuentran en el centro, las corrientes se trazan desde ahí y
 * aparecen las tarjetas; después solo queda un movimiento ambiente. Con el mouse,
 * las capas se mueven a distintas profundidades y una tarjeta enciende sus
 * relaciones. Todo es CSS salvo la profundidad (Movimiento.tsx).
 *
 * Los datos son de ejemplo y así se rotula: nunca parecen tracción real.
 */

type Nodo = { id: string; x: number; y: number; w: string; z: number; d: number; children: ReactNode };

function Tarjeta({ id, x, y, w, z, d, children }: Nodo) {
  return (
    <div
      data-nodo={id}
      className="eco-nodo"
      style={{ "--x": `${x}%`, "--y": `${y}%`, "--w": w, "--z": z } as CSSProperties}
    >
      <div
        className="eco-tarjeta rounded-[1.1em] border border-tinta/10 bg-marfil p-[0.85em] shadow-[0_1px_2px_rgb(28_27_22/0.06),0_12px_32px_rgb(28_27_22/0.1)]"
        style={{ "--d": `${d}ms` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-[0.6em] py-[0.2em] text-[0.82em] font-medium leading-tight ${className}`}>
      {children}
    </span>
  );
}

function Rotulo({ children }: { children: ReactNode }) {
  return <p className="text-[0.72em] font-semibold uppercase tracking-[0.12em] text-tinta/65">{children}</p>;
}

// Centros de las tarjetas (en % del lienzo): las corrientes van de centro a
// centro y las tarjetas, opacas, las tapan. Así el dibujo no depende del tamaño.
const C = { pitch: [25, 22], inversor: [75, 25], empresa: [26, 77], aliado: [75, 79] } as const;

const CORRIENTES: { de: string; d: string; demora: number; punteada?: boolean }[] = [
  { de: "pitch", d: `M50 50 Q 34 40 ${C.pitch.join(" ")}`, demora: 1500 },
  { de: "inversor", d: `M50 50 Q 66 42 ${C.inversor.join(" ")}`, demora: 1600 },
  { de: "empresa", d: `M50 50 Q 36 62 ${C.empresa.join(" ")}`, demora: 1700 },
  { de: "aliado", d: `M50 50 Q 64 64 ${C.aliado.join(" ")}`, demora: 1800 },
  // El inversor mira el pitch; invierte en la empresa; el aliado la acompaña.
  { de: "pitch inversor", d: `M${C.pitch.join(" ")} Q 50 6 ${C.inversor.join(" ")}`, demora: 2300, punteada: true },
  { de: "inversor empresa", d: `M${C.inversor.join(" ")} Q 88 52 ${C.empresa.join(" ")}`, demora: 2700, punteada: true },
  { de: "aliado empresa", d: `M${C.aliado.join(" ")} Q 50 96 ${C.empresa.join(" ")}`, demora: 3000, punteada: true },
];

export default function EcosistemaVivo() {
  return (
    <figure className="eco-marco w-full">
      <div
        role="img"
        aria-label="Ejemplo de cómo se conecta el ecosistema en Pecera: el pitch de una startup, su empresa construyendo en público, una inversora con su tesis y una incubadora con sus servicios, unidos alrededor del logo."
        data-profundidad
        className="eco select-none"
      >
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          {CORRIENTES.map((c) => (
            <path
              key={c.d}
              d={c.d}
              pathLength={1}
              data-de={c.de}
              data-punteada={c.punteada || undefined}
              className="corriente"
              style={{ "--d": `${c.demora}ms` } as CSSProperties}
            />
          ))}
          {CORRIENTES.slice(0, 4).map((c, i) => (
            <path
              key={`pulso-${c.de}`}
              d={c.d}
              pathLength={1}
              className="pulso"
              style={{ "--d": `${2800 + i * 1150}ms` } as CSSProperties}
            />
          ))}
        </svg>

        {/* Centro: los peces se encuentran. */}
        <div className="eco-nodo" style={{ "--x": "50%", "--y": "50%", "--w": "21%", "--z": 4 } as CSSProperties}>
          <Peces ondas className="mx-auto w-full drop-shadow-[0_6px_14px_rgb(248_124_67/0.25)]" />
        </div>

        <Tarjeta id="pitch" x={C.pitch[0]} y={C.pitch[1]} w="40%" z={14} d={1900}>
          <div className="flex gap-[0.7em]">
            <div className="relative aspect-[9/16] w-[34%] shrink-0 overflow-hidden rounded-[0.6em] bg-tinta">
              <Image src="/posters/pitch_1.jpg" alt="" fill sizes="80px" className="object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-tinta/70 to-transparent" />
              <svg aria-hidden viewBox="0 0 12 12" className="absolute left-1/2 top-1/2 size-[1.3em] -translate-x-1/2 -translate-y-1/2 text-marfil">
                <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-[0.4em]">
              <span className="inline-flex items-center gap-[0.3em] rounded-full bg-celeste px-[0.6em] py-[0.25em] text-[0.7em] font-bold uppercase tracking-[0.12em] text-tinta">
                <svg aria-hidden viewBox="0 0 12 12" className="size-[0.9em]">
                  <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
                </svg>
                Pitch · 1:30
              </span>
              <p className="font-display text-[1.15em] font-semibold leading-tight text-tinta">Raíz Verde</p>
              <p className="text-[0.82em] leading-snug text-tinta/70">Sustrato para huertas urbanas</p>
              <span className="mt-auto inline-flex items-center gap-[0.3em] text-[0.8em] font-semibold text-tinta">
                <IconoCorazon lleno className="size-[1.2em] text-pecera" />
                Te picó
              </span>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta id="inversor" x={C.inversor[0]} y={C.inversor[1]} w="42%" z={20} d={2100}>
          <div className="flex items-center gap-[0.6em]">
            <span className="grid size-[2.3em] shrink-0 place-items-center rounded-full bg-inversor font-display text-[0.95em] font-semibold text-marfil">
              CR
            </span>
            <div className="min-w-0">
              <p className="font-display text-[1.05em] font-semibold leading-tight text-tinta">Inversora ángel</p>
              <p className="text-[0.78em] text-tinta/65">Ticket USD 10–50 mil</p>
            </div>
          </div>
          <Rotulo>
            <span className="mt-[0.8em] block">Tesis</span>
          </Rotulo>
          <div className="mt-[0.35em] flex flex-wrap gap-[0.3em]">
            <Chip className="bg-t-azul-suave text-t-azul">Pre-seed</Chip>
            <Chip className="bg-t-azul-suave text-t-azul">Seed</Chip>
            <Chip className="bg-t-verde-suave text-t-verde">Agtech</Chip>
            <Chip className="bg-t-violeta-suave text-t-violeta">Fintech</Chip>
          </div>
        </Tarjeta>

        <Tarjeta id="empresa" x={C.empresa[0]} y={C.empresa[1]} w="44%" z={10} d={2300}>
          <div className="flex items-center justify-between gap-[0.5em]">
            <span className="inline-flex items-center gap-[0.35em] rounded-full bg-obra px-[0.6em] py-[0.2em] text-[0.72em] font-bold uppercase tracking-[0.1em] text-tinta">
              <span className="punto-vivo size-[0.5em] rounded-full bg-tinta" />
              Construyendo
            </span>
            <span className="inline-flex items-center gap-[0.25em] whitespace-nowrap text-[0.8em] font-semibold text-tinta">
              <svg aria-hidden viewBox="0 0 32 40" className="h-[1.3em] w-[1.05em]">
                <path className="llama" d="M16 2c1.2 6.4 9.5 10.6 9.5 20.2C25.5 30.4 21.2 37 16 37S6.5 30.4 6.5 22.6c0-5 2.4-8.4 5.1-10.8.3 3.4 1.6 5.6 3.6 6.6C14.6 12.2 15.2 6.4 16 2Z" fill="#d95a22" />
              </svg>
              6 semanas
            </span>
          </div>
          <p className="mt-[0.55em] font-display text-[1.1em] font-semibold leading-tight text-tinta">Beta pública</p>
          <div className="mt-[0.5em] flex items-center gap-[0.5em]">
            <div className="h-[0.42em] flex-1 overflow-hidden rounded-full bg-tinta/10">
              <div
                className="barra-progreso h-full rounded-full bg-obra"
                style={{ "--p": 0.75, "--retraso": "2600ms" } as CSSProperties}
              />
            </div>
            <span className="text-[0.8em] font-semibold tabular-nums text-tinta">75%</span>
          </div>
          <p className="mt-[0.55em] border-t border-tinta/10 pt-[0.5em] text-[0.8em] leading-snug text-tinta/75">
            <span className="font-semibold text-tinta">Avance:</span> cerramos con dos viveros de Paraná.
          </p>
        </Tarjeta>

        <Tarjeta id="aliado" x={C.aliado[0]} y={C.aliado[1]} w="40%" z={16} d={2500}>
          <div className="flex items-center gap-[0.6em]">
            <span className="grid size-[2.3em] shrink-0 place-items-center rounded-full bg-aliado font-display text-[0.95em] font-semibold text-marfil">
              NL
            </span>
            <div className="min-w-0">
              <p className="font-display text-[1.05em] font-semibold leading-tight text-tinta">Nodo Litoral</p>
              <p className="text-[0.78em] text-tinta/65">Incubadora · Aliado</p>
            </div>
          </div>
          <Rotulo>
            <span className="mt-[0.8em] block">Servicios</span>
          </Rotulo>
          <div className="mt-[0.35em] flex flex-wrap gap-[0.3em]">
            <Chip className="bg-t-verde-suave text-t-verde">Mentoría</Chip>
            <Chip className="bg-t-petroleo-suave text-t-petroleo">Go-to-market</Chip>
          </div>
        </Tarjeta>

        {/* Lo que pasa entre las partes: aparece después, como en la app. */}
        <div className="eco-nodo" style={{ "--x": "52%", "--y": "7%", "--w": "auto", "--z": 24 } as CSSProperties}>
          <span
            className="eco-aviso vidrio inline-flex items-center gap-[0.4em] whitespace-nowrap rounded-full px-[0.8em] py-[0.4em] text-[0.82em] font-semibold text-tinta shadow-[0_8px_22px_rgb(28_27_22/0.14)]"
            style={{ "--d": "3300ms" } as CSSProperties}
          >
            <IconoCorazon lleno className="size-[1.15em] text-pecera" />
            Nuevo pique
          </span>
        </div>
        <div className="eco-nodo" style={{ "--x": "80%", "--y": "52%", "--w": "auto", "--z": 26 } as CSSProperties}>
          <span
            className="eco-aviso vidrio inline-flex items-center gap-[0.4em] whitespace-nowrap rounded-full px-[0.8em] py-[0.4em] text-[0.82em] font-semibold text-tinta shadow-[0_8px_22px_rgb(28_27_22/0.14)]"
            style={{ "--d": "3900ms" } as CSSProperties}
          >
            <span className="grid size-[1.2em] place-items-center rounded-full bg-aliado text-[0.8em] text-marfil">✓</span>
            Inversión confirmada
          </span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-tinta/65">Perfiles de ejemplo</figcaption>
    </figure>
  );
}
