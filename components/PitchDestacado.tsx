import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import InsigniaPitch from "@/components/InsigniaPitch";
import type { Pitch } from "@/types/pecera";

/**
 * El Pitch destacado: poster 9:16, insignia, descripción y "Ver el pitch". Es la
 * misma pieza en el perfil y en la empresa; `children` suma lo propio de cada lugar
 * (vistas y piques en el perfil, el autor en la empresa).
 */
export default function PitchDestacado({
  pitch,
  nombre,
  children,
}: {
  pitch: Pitch;
  /** De quién es, para el texto accesible del link. */
  nombre: string;
  children?: ReactNode;
}) {
  return (
    <article className="flex gap-4 rounded-3xl border border-celeste bg-celeste-suave/60 p-3">
      <Link
        href={`/#${pitch.id}`}
        className="group relative block w-28 shrink-0 overflow-hidden rounded-2xl bg-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        aria-label={`Ver el pitch de ${nombre} en el feed`}
      >
        <PosterPitch pitch={pitch} />
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-tinta/20 opacity-90 transition-opacity duration-200 ease-pecera group-hover:opacity-100"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-marfil/90 text-tinta transition-transform duration-200 ease-pecera group-hover:scale-110">
            <svg viewBox="0 0 12 12" className="ml-0.5 size-3.5">
              <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
            </svg>
          </span>
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <InsigniaPitch className="self-start" />
        {pitch.descripcion ? (
          <p className="line-clamp-4 text-sm leading-snug text-tinta/90">{pitch.descripcion}</p>
        ) : (
          <p className="text-sm leading-snug text-tinta/70">90 segundos para conocer el proyecto.</p>
        )}
        {children}
        <Link
          href={`/#${pitch.id}`}
          className="mt-auto inline-flex min-h-10 items-center self-start rounded-full bg-naranja px-4 text-sm font-semibold text-tinta transition-[background-color,transform] duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
        >
          Ver el pitch
        </Link>
      </div>
    </article>
  );
}

export function PosterPitch({ pitch }: { pitch: Pitch }) {
  return pitch.poster_url ? (
    <Image src={pitch.poster_url} alt="" width={360} height={640} className="aspect-[9/16] w-full object-cover" />
  ) : (
    <span aria-hidden className="flex aspect-[9/16] w-full items-center justify-center text-2xl text-marfil">
      &#9654;
    </span>
  );
}
