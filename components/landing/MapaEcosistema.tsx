"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { EVENTO_ACTUAL } from "@/lib/eventos";

type Modulo = { nombre: string; texto: string; href?: string };
type Grupo = { id: string; nombre: string; bajada: string; modulos: Modulo[] };

// Los cinco grupos en pentágono alrededor del centro (en % de un lienzo cuadrado).
const POSICIONES = [
  [50, 14],
  [84, 39],
  [71, 79],
  [29, 79],
  [16, 39],
] as const;

function grupos(lecciones: number, templates: number): Grupo[] {
  return [
    {
      id: "descubrir",
      nombre: "Descubrir",
      bajada: "Encontrá proyectos, inversores y aliados sin depender de a quién conocés.",
      modulos: [
        { nombre: "Feed de pitches", texto: "Pitches verticales de 90 segundos, uno atrás del otro.", href: "/" },
        { nombre: "Explorar", texto: "Directorio con búsqueda y filtros por rol, industria, etapa y portfolio.", href: "/explorar" },
        { nombre: "Perfiles y empresas", texto: "Cada persona y cada empresa con su página y su link para compartir." },
      ],
    },
    {
      id: "construir",
      nombre: "Construir",
      bajada: "Tu identidad en el ecosistema, y la de tu empresa, en un mismo lugar.",
      modulos: [
        { nombre: "Perfil", texto: "Quién sos, qué hacés y tus canales de contacto." },
        { nombre: "Empresa y equipo", texto: "Sumá a tu equipo con un código: cada uno con su cargo." },
        { nombre: "Producto y One Pager", texto: "Tu producto o servicio con imágenes, y una hoja lista para mandar." },
        { nombre: "Build in Public", texto: "Hitos, avances y una racha por cada semana que contás algo." },
      ],
    },
    {
      id: "conectar",
      nombre: "Conectar",
      bajada: "Del interés a la conversación, sin intermediarios.",
      modulos: [
        { nombre: "Piques", texto: "El “me picó” de Pecera: interés, no compromiso." },
        { nombre: "Contacto directo", texto: "WhatsApp, email, LinkedIn o web, desde cada perfil." },
        { nombre: `${EVENTO_ACTUAL.nombre} y eventos`, texto: "Programa, participantes y votación del público.", href: `/eventos/${EVENTO_ACTUAL.slug}` },
        { nombre: "Newsletter", texto: "Tu Substack en tu perfil, para que te sigan." },
      ],
    },
    {
      id: "fondear",
      nombre: "Fondear",
      bajada: "La ronda, a la vista de quien tiene que verla, cuando vos decidís.",
      modulos: [
        { nombre: "Ronda", texto: "Qué ronda buscás y, si querés, cuánto y para qué." },
        { nombre: "Transparencia", texto: "Métricas y documentos clave, privados hasta que los compartís." },
        { nombre: "Dataroom", texto: "Documentos por categoría y un PDF para inversores." },
        { nombre: "Portfolio y tesis", texto: "Qué buscan los inversores y en qué ya invirtieron." },
      ],
    },
    {
      id: "aprender",
      nombre: "Aprender",
      bajada: "Lo que te van a preguntar, antes de que te lo pregunten.",
      modulos: [
        { nombre: "Startup Essentials", texto: `${lecciones} lecciones: problema, negocio, números e inversión.`, href: "/academy" },
        { nombre: "Templates", texto: `${templates} templates guiados que se guardan solos.` },
        { nombre: "Glosario y documentos", texto: "Qué es cada término y qué documento te van a pedir.", href: "/academy/docs" },
      ],
    },
  ];
}

/**
 * Mapa del ecosistema: Pecera al centro y cinco grupos de módulos alrededor
 * (Descubrir, Construir, Conectar, Fondear, Aprender). Elegir un grupo enciende
 * su rama y muestra sus módulos, con link a los que ya se pueden abrir. Es un
 * tablist: flechas para moverse, el panel cambia al toque.
 */
export default function MapaEcosistema({ lecciones, templates }: { lecciones: number; templates: number }) {
  const lista = grupos(lecciones, templates);
  const [activo, setActivo] = useState(0);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const grupo = lista[activo];

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + lista.length) % lista.length;
    botones.current[siguiente]?.focus();
    setActivo(siguiente);
  }

  return (
    <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div data-revelar className="relative mx-auto aspect-square w-full max-w-[30rem]">
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle cx="50" cy="50" r="36" fill="none" stroke="rgb(28 27 22 / 0.12)" strokeWidth="0.35" strokeDasharray="1 1.4" />
          {POSICIONES.map(([x, y], i) => (
            <path key={i} d={`M50 50 L${x} ${y}`} className="rama" data-activa={i === activo || undefined} vectorEffect="non-scaling-stroke" />
          ))}
          {POSICIONES.map(([x, y], i) => (
            <path
              key={`p${i}`}
              d={`M50 50 L${x} ${y}`}
              pathLength={1}
              className="pulso"
              style={{ "--d": `${600 + i * 900}ms` } as CSSProperties}
            />
          ))}
        </svg>
        <div className="absolute left-1/2 top-1/2 grid size-[26%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-tinta/10 bg-marfil shadow-[0_10px_30px_rgb(28_27_22/0.1)]">
          <Image src="/brand/isotipo-naranja.png" alt="" width={600} height={388} className="w-[62%]" />
        </div>

        <div role="tablist" aria-label="Grupos de módulos de Pecera" aria-orientation="horizontal">
          {lista.map((g, i) => (
            <button
              key={g.id}
              ref={(el) => {
                botones.current[i] = el;
              }}
              id={`${base}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={i === activo}
              aria-controls={`${base}-panel`}
              tabIndex={i === activo ? 0 : -1}
              onClick={() => setActivo(i)}
              onKeyDown={(e) => alTeclear(e, i)}
              style={{ left: `${POSICIONES[i][0]}%`, top: `${POSICIONES[i][1]}%` }}
              className={`absolute flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,scale] duration-[var(--duracion)] ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla sm:px-4 sm:text-[15px] ${
                i === activo
                  ? "scale-105 border-naranja bg-naranja text-tinta shadow-[0_8px_20px_rgb(244_124_60/0.3)]"
                  : "border-tinta/15 bg-marfil text-tinta hover:border-tinta/40"
              }`}
            >
              {g.nombre}
              <span className={`text-xs font-medium tabular-nums ${i === activo ? "text-tinta/70" : "text-tinta/65"}`}>
                {g.modulos.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        key={grupo.id}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${activo}`}
        className="entrada"
      >
        <h3 className="font-display text-3xl font-semibold sm:text-4xl">{grupo.nombre}</h3>
        <p className="mt-2 text-lg leading-relaxed text-tinta/75 text-pretty">{grupo.bajada}</p>
        <ul className="mt-6 divide-y divide-tinta/10 border-y border-tinta/10">
          {grupo.modulos.map((m) => (
            <li key={m.nombre} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-semibold text-tinta">{m.nombre}</p>
                <p className="mt-0.5 text-[15px] leading-snug text-tinta/70">{m.texto}</p>
              </div>
              {m.href && (
                <Link
                  href={m.href}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold text-naranja-texto underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                >
                  Abrir <span aria-hidden>&rarr;</span>
                  <span className="sr-only">{m.nombre}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
