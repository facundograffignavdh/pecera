"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconoCorazon, IconoVista } from "@/components/Iconos";
import InsigniaPitch from "@/components/InsigniaPitch";
import { formatoCompacto } from "@/lib/formato";
import { supabase } from "@/lib/supabase";
import type { Metricas, MetricasPitch, Pitch } from "@/types/pecera";

const SIN_METRICAS: MetricasPitch = { vistas: 0, piques: 0 };

/**
 * El Pitch del perfil (el más nuevo, destacado) y los anteriores, con vistas y piques. Los conteos llegan con el ISR (hasta
 * 60 s de antigüedad) y se piden frescos al montar, así una vista o un pique
 * propio de recién ya figura. Si el pedido falla, quedan los del ISR.
 */
export default function GrillaPitches({
  slug,
  nombre,
  pitches,
  metricas: iniciales,
}: {
  slug: string;
  nombre: string;
  pitches: Pitch[];
  metricas: Metricas;
}) {
  const [metricas, setMetricas] = useState(iniciales);

  useEffect(() => {
    let cancelado = false;
    supabase.rpc("metricas_perfil", { p_slug: slug }).then(({ data, error }) => {
      if (cancelado || error) return;
      const filas = (data ?? []) as Array<{ pitch_id: string } & MetricasPitch>;
      setMetricas(
        Object.fromEntries(filas.map((f) => [f.pitch_id, { vistas: f.vistas, piques: f.piques }]))
      );
    });
    return () => {
      cancelado = true;
    };
  }, [slug]);

  // `orden` es la llegada: el más nuevo es el Pitch del perfil (subir otro lo
  // reemplaza) y los demás quedan como anteriores.
  const [principal, ...anteriores] = [...pitches].sort((a, b) => b.orden - a.orden);
  if (!principal) return null;
  const actual = metricas[principal.id] ?? SIN_METRICAS;

  return (
    <div className="mt-3 flex flex-col gap-6">
      <article className="flex gap-4 rounded-3xl border border-celeste bg-celeste-suave/60 p-3">
        <Link
          href={`/#${principal.id}`}
          className="group relative block w-28 shrink-0 overflow-hidden rounded-2xl bg-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          aria-label={`Ver el pitch de ${nombre} en el feed`}
        >
          <Poster pitch={principal} />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-tinta/20 opacity-90 transition-opacity duration-200 ease-pecera group-hover:opacity-100"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-marfil/90 text-tinta">
              <svg viewBox="0 0 12 12" className="ml-0.5 size-3.5">
                <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
              </svg>
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          <InsigniaPitch className="self-start" />
          {principal.descripcion ? (
            <p className="line-clamp-4 text-sm leading-snug text-tinta/90">{principal.descripcion}</p>
          ) : (
            <p className="text-sm leading-snug text-tinta/70">90 segundos para conocer el proyecto.</p>
          )}
          <Numeros {...actual} />
          <Link
            href={`/#${principal.id}`}
            className="mt-auto inline-flex min-h-10 items-center self-start rounded-full bg-tinta px-4 text-sm font-medium text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            Ver el pitch
          </Link>
        </div>
      </article>

      {anteriores.length > 0 && (
        <section aria-labelledby="pitches-anteriores">
          <h3 id="pitches-anteriores" className="text-xs font-semibold uppercase tracking-wide text-tinta/60">
            {anteriores.length === 1 ? "Pitch anterior" : "Pitches anteriores"}
          </h3>
          <ul className="mt-3 grid grid-cols-3 gap-2.5">
            {anteriores.map((pitch) => (
              <li key={pitch.id}>
                <Link
                  href={`/#${pitch.id}`}
                  className="block overflow-hidden rounded-xl bg-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                  aria-label={`Ver un pitch anterior de ${nombre} en el feed`}
                >
                  <Poster pitch={pitch} />
                </Link>
                <Numeros {...(metricas[pitch.id] ?? SIN_METRICAS)} chico />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Poster({ pitch }: { pitch: Pitch }) {
  return pitch.poster_url ? (
    <Image
      src={pitch.poster_url}
      alt=""
      width={360}
      height={640}
      className="aspect-[9/16] w-full object-cover"
    />
  ) : (
    <span aria-hidden className="flex aspect-[9/16] w-full items-center justify-center text-2xl text-marfil">
      &#9654;
    </span>
  );
}

function Numeros({ vistas, piques, chico = false }: MetricasPitch & { chico?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 font-medium tabular-nums text-tinta/70 ${
        chico ? "mt-1.5 text-xs" : "text-sm"
      }`}
    >
      <span className="sr-only">
        {vistas} {vistas === 1 ? "vista" : "vistas"}, {piques} {piques === 1 ? "pique" : "piques"}
      </span>
      <span aria-hidden className="flex items-center gap-1">
        <IconoVista className={chico ? "size-3.5" : "size-4"} />
        {formatoCompacto(vistas)}
      </span>
      <span aria-hidden className="flex items-center gap-1">
        <IconoCorazon className={chico ? "size-3.5" : "size-4"} />
        {formatoCompacto(piques)}
      </span>
    </p>
  );
}
