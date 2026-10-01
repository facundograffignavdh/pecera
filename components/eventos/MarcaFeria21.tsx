import Image, { getImageProps } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Evento } from "@/lib/eventos";

/**
 * La Feria 21 con la identidad de Semana 21 (Universidad Siglo 21): el sello verde
 * con letras blancas en mayúsculas, el trazo amarillo y su paleta (tokens `s21-*` en
 * globals.css). Solo se usa en lo de la Feria; el resto de Pecera sigue con su marca.
 */

/** "FERIA 21" como en el banner: verde, letras blancas, mayúsculas. */
export function SelloFeria21({ chico = false, className = "" }: { chico?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-2xl bg-s21-verde font-sans font-bold uppercase leading-none tracking-tight text-white shadow-[0_10px_24px_rgb(23_168_153/0.3)] ${
        chico ? "px-2.5 py-1 text-lg" : "px-3 py-1.5 text-2xl"
      } ${className}`}
    >
      Feria 21
    </span>
  );
}

/** El trazo amarillo de pincel que subraya los títulos de Semana 21. */
export function TrazoAmarillo({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 24" fill="none" className={className}>
      <path
        d="M3 18c8-3 13-7 20-9 6-2 9 4 7 9-1 4 4 4 9 0 7-6 14-11 22-10 6 1 5 8 7 10 3 2 9-2 16-4 28-6 70-9 133-11"
        stroke="var(--color-s21-amarillo)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Título de sección de la Feria: mayúsculas y el trazo amarillo debajo. */
export function TituloFeria({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex flex-col items-start gap-1">
      <span className="font-sans text-2xl font-bold uppercase leading-none tracking-tight text-tinta sm:text-3xl">
        {children}
      </span>
      <TrazoAmarillo className="h-3 w-28" />
    </h2>
  );
}

/**
 * Portada: el banner oficial (vertical en el celular, horizontal en la compu) y una
 * franja verde con dónde, cuándo y los botones. El banner va sobre fondo claro fijo:
 * sus letras son oscuras y no tienen versión de noche.
 */
export function PortadaFeria21({ evento, votacionAbierta }: { evento: Evento; votacionAbierta: boolean }) {
  const comun = {
    alt: "FERIA 21 es el corazón emprendedor de Semana 21",
    sizes: "(min-width: 1152px) 1088px, 100vw",
  };
  const {
    props: { srcSet: compu },
  } = getImageProps({ ...comun, src: "/feria/feria21.webp", width: 2584, height: 500, loading: "eager", fetchPriority: "high" });
  const {
    props: { srcSet: celu, ...img },
  } = getImageProps({ ...comun, src: "/feria/feria21-movil.webp", width: 750, height: 769, loading: "eager", fetchPriority: "high" });

  return (
    <header className="mt-6 overflow-hidden rounded-[2rem] border border-tinta/10 shadow-[0_18px_50px_rgb(2_101_102/0.14)]">
      <h1 className="tema-fijo bg-[#fbfaf6] px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
        <picture>
          <source media="(min-width: 640px)" srcSet={compu} />
          <source srcSet={celu} />
          <img {...img} srcSet={celu} alt={comun.alt} className="mx-auto h-auto w-full max-w-sm sm:max-w-none" />
        </picture>
      </h1>
      <div className="bg-s21-verde-oscuro px-5 pb-6 pt-5 text-white sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">
          Semana 21 · Universidad Siglo 21 · {evento.tipo}
        </p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-white/90 sm:text-lg">{evento.bajada}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 sm:text-base">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Dónde</dt>
            <dd className="mt-0.5 font-semibold">{evento.lugar}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Cuándo</dt>
            <dd className="mt-0.5 font-semibold">{evento.fechas}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="#votacion"
            className="boton inline-flex min-h-12 items-center rounded-full bg-s21-amarillo px-6 text-sm font-bold uppercase tracking-wide text-[#353535] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {votacionAbierta ? "Votar ahora" : "Ver los proyectos"}
          </a>
          <Link
            href="/cuenta"
            className="boton inline-flex min-h-12 items-center rounded-full border-2 border-white/70 px-6 text-sm font-bold uppercase tracking-wide text-white hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Participar
          </Link>
        </div>
      </div>
    </header>
  );
}

const FOTOS = [
  { src: "/feria/edicion-1.webp", alt: "Pasillo de la Carpa Feria con los stands de los proyectos" },
  { src: "/feria/edicion-2.webp", alt: "Una emprendedora presenta su proyecto en el escenario" },
  { src: "/feria/edicion-3.webp", alt: "Público mirando las presentaciones" },
  { src: "/feria/edicion-4.webp", alt: "Una emprendedora atiende su stand" },
  { src: "/feria/edicion-5.webp", alt: "Un visitante prueba una demo con lentes de realidad virtual" },
];

/** Video de la edición anterior: se abre en YouTube (no se embebe: nada de terceros sin que lo elijan). */
const VIDEO_EDICION = "https://www.youtube.com/watch?v=Gl2vROa4dIA";

/**
 * "Mirá cómo fue la última edición": en el celular, una tira que se desliza; en la
 * compu, el video grande con las fotos alrededor.
 */
export function GaleriaEdicion() {
  const caja = "relative shrink-0 snap-start overflow-hidden rounded-2xl bg-tinta/10";
  return (
    <section aria-labelledby="edicion" className="mt-12">
      <TituloFeria id="edicion">Mirá cómo fue la última edición</TituloFeria>
      <ul className="no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:scroll-px-0 lg:grid lg:grid-cols-12 lg:overflow-visible lg:px-0 lg:pb-0">
        <li className={`${caja} w-[88%] sm:w-[60%] lg:col-span-8 lg:w-auto`}>
          <a
            href={VIDEO_EDICION}
            target="_blank"
            rel="noopener noreferrer"
            className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            <Image
              src="/feria/video-edicion.webp"
              alt=""
              width={650}
              height={285}
              sizes="(min-width: 1024px) 720px, 88vw"
              className="aspect-[650/285] h-auto w-full object-cover transition-transform duration-500 ease-pecera group-hover:scale-[1.02]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white">
              Ver el video en YouTube
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </span>
          </a>
        </li>
        {FOTOS.map((f, i) => (
          <li key={f.src} className={`${caja} w-[72%] sm:w-[44%] ${i === 0 ? "lg:col-span-4" : "lg:col-span-3"} lg:w-auto`}>
            <Image
              src={f.src}
              alt={f.alt}
              width={600}
              height={400}
              sizes="(min-width: 1024px) 360px, 72vw"
              className="aspect-[3/2] h-full w-full object-cover"
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-tinta/60">Fotos y video: Semana 21 · Universidad Siglo 21.</p>
    </section>
  );
}
