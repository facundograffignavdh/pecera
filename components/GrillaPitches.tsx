"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconoCorazon, IconoVista } from "@/components/Iconos";
import { formatoCompacto } from "@/lib/formato";
import { supabase } from "@/lib/supabase";
import type { Metricas, MetricasPitch, Pitch } from "@/types/pecera";

const SIN_METRICAS: MetricasPitch = { vistas: 0, piques: 0 };

/**
 * Pitches del perfil con sus vistas y piques. Los conteos llegan con el ISR (hasta
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

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3">
      {pitches.map((pitch) => {
        const { vistas, piques } = metricas[pitch.id] ?? SIN_METRICAS;
        return (
          <li key={pitch.id}>
            <Link
              href={`/#${pitch.id}`}
              className="block overflow-hidden rounded-xl bg-tinta"
              aria-label={`Ver el pitch de ${nombre} en el feed`}
            >
              {pitch.poster_url ? (
                <Image
                  src={pitch.poster_url}
                  alt=""
                  width={360}
                  height={640}
                  className="aspect-[9/16] w-full object-cover"
                />
              ) : (
                <span className="flex aspect-[9/16] w-full items-center justify-center text-2xl text-marfil">
                  &#9654;
                </span>
              )}
            </Link>
            <p className="mt-2 flex items-center gap-3 text-sm font-medium tabular-nums text-tinta/70">
              <span className="sr-only">
                {vistas} {vistas === 1 ? "vista" : "vistas"}, {piques} {piques === 1 ? "pique" : "piques"}
              </span>
              <span aria-hidden className="flex items-center gap-1">
                <IconoVista className="size-4" />
                {formatoCompacto(vistas)}
              </span>
              <span aria-hidden className="flex items-center gap-1">
                <IconoCorazon className="size-4" />
                {formatoCompacto(piques)}
              </span>
            </p>
            {pitch.descripcion && (
              <p className="mt-1 line-clamp-3 text-sm leading-snug text-tinta/80">
                {pitch.descripcion}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
