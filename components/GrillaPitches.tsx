"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconoCorazon, IconoVista } from "@/components/Iconos";
import PitchDestacado, { PosterPitch as Poster } from "@/components/PitchDestacado";
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
      <PitchDestacado pitch={principal} nombre={nombre}>
        <Numeros {...actual} />
      </PitchDestacado>

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
