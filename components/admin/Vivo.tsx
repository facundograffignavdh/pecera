"use client";

import { useEffect, useState } from "react";
import { type DatosVivo, leerVivo } from "@/app/admin/vivo/acciones";
import { industria } from "@/lib/etiquetas";

const CADA_MS = 15_000;
const numero = new Intl.NumberFormat("es-AR");

function hace(minutos: number) {
  if (minutos < 60) return `hace ${minutos} min`;
  const h = Math.floor(minutos / 60);
  return `hace ${h} h`;
}

function frase(industriaDestino: string | null) {
  return industriaDestino
    ? `Alguien inició una conexión con un proyecto de ${industria(industriaDestino).label}`
    : "Alguien inició una conexión con un proyecto";
}

/**
 * Pantalla del stand (/admin/vivo). Calma: Marfil, Tinta y una sola línea naranja.
 * Si una lectura falla, quedan los últimos números y se avisa chiquito.
 */
export default function Vivo() {
  const [datos, setDatos] = useState<DatosVivo | null>(null);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function leer() {
      const r = await leerVivo();
      if (!vivo) return;
      if (r.ok) {
        setDatos(r.datos);
        setProblema(null);
      } else {
        setProblema(
          r.motivo === "migracion"
            ? "Falta correr la migración de medición."
            : r.motivo === "acceso"
              ? "La sesión se cerró: entrá de nuevo desde /admin."
              : "Sin conexión: reintentando."
        );
      }
    }
    leer();
    const reloj = setInterval(leer, CADA_MS);
    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, []);

  const pct =
    datos && datos.proyectos_con_ci !== null && datos.proyectos > 0
      ? Math.round((datos.proyectos_con_ci / datos.proyectos) * 100)
      : null;

  return (
    <main className="flex h-dvh flex-col bg-marfil px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-tinta lg:px-16">
      <header className="flex items-baseline justify-between gap-4">
        <p className="font-display text-xl font-semibold">Pecera · Feria 21</p>
        <p className="text-sm text-tinta/70" aria-live="polite">
          {problema ?? "Se actualiza cada 15 segundos"}
        </p>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-10 text-center lg:gap-14">
        <div className="flex flex-col items-center gap-3">
          <p className="font-display text-[clamp(6rem,24vw,16rem)] font-semibold leading-none tabular-nums" aria-live="polite">
            {datos ? numero.format(datos.ci_hoy) : "—"}
          </p>
          <span aria-hidden className="h-1 w-16 rounded-full bg-naranja" />
          <p className="text-xl lg:text-2xl">conexiones iniciadas hoy</p>
        </div>

        <dl className="grid w-full max-w-3xl grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <dt className="order-2 text-tinta/70">de los proyectos ya recibió al menos una</dt>
            <dd className="order-1 font-display text-5xl font-semibold tabular-nums lg:text-6xl">
              {pct === null ? "—" : `${pct} %`}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="order-2 text-tinta/70">pitches vistos hoy</dt>
            <dd className="order-1 font-display text-5xl font-semibold tabular-nums lg:text-6xl">
              {datos ? numero.format(datos.pitches_vistos_hoy) : "—"}
            </dd>
          </div>
        </dl>

        <ul className="flex w-full max-w-3xl flex-col gap-2 text-left" aria-label="Últimas conexiones">
          {(datos?.ticker ?? []).slice(0, 4).map((t, i) => (
            <li
              key={`${datos?.actualizado}-${i}`}
              className="aparecer flex items-baseline justify-between gap-4 border-t border-tinta/10 pt-2 text-lg"
            >
              <span>{frase(t.industria)}</span>
              <span className="shrink-0 text-sm text-tinta/70">{hace(t.minutos)}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-col gap-1 text-center text-xs text-tinta/70">
        <p>Una conexión iniciada es un toque en un canal de contacto: una intención, no una reunión. Solo números agregados.</p>
        <p>
          Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza
          oferta pública de valores o asesoramiento financiero.
        </p>
      </footer>
    </main>
  );
}
