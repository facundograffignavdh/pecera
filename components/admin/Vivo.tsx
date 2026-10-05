"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type Alcance, type DatosVivo, type FilaRanking, type Ranking, leerVivo } from "@/app/admin/vivo/acciones";
import { industria } from "@/lib/etiquetas";
import { EVENTO_ACTUAL } from "@/lib/eventos";

const CADA_MS = 15_000;
const numero = new Intl.NumberFormat("es-AR");
/** Mínimo de filas del ranking: el alto de cada una no salta mientras se llena. */
const FILAS_MIN = 10;
/** Movimiento del ranking: solo transform, la duración de énfasis y la curva de la marca. */
const MOVIMIENTO = { transition: "transform var(--duracion-enfasis) var(--ease-pecera)" };

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
 * Pantalla del stand (/admin/vivo), para una pantalla apaisada grande que se mira de
 * lejos: métricas a la izquierda, ranking de la votación a la derecha. Fondo Pecera
 * (#F87C43) y todo el texto en Tinta sólida (6,5:1; el blanco da 2,6:1 y Tinta al 70 %
 * no llega a 4,5:1). `tema-fijo`: el modo noche no invierte la Tinta. Si una lectura
 * falla, quedan los últimos números y se avisa chiquito.
 */
export default function Vivo({ alcance }: { alcance: Alcance }) {
  const [datos, setDatos] = useState<DatosVivo | null>(null);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [conAlcance, setConAlcance] = useState(true);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function leer() {
      const r = await leerVivo(alcance);
      if (!vivo) return;
      if (r.ok) {
        setDatos(r.datos);
        if (r.ranking) setRanking(r.ranking);
        setConAlcance(r.conAlcance);
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
  }, [alcance]);

  const pct =
    datos && datos.proyectos_con_ci !== null && datos.proyectos > 0
      ? Math.round((datos.proyectos_con_ci / datos.proyectos) * 100)
      : null;
  const deQuien = conAlcance && alcance === "evento" ? `de los proyectos de ${EVENTO_ACTUAL.nombre}` : "de los proyectos";

  return (
    <main className="tema-fijo flex min-h-dvh flex-col bg-pecera px-[max(1rem,3vw)] pb-[max(1rem,2dvh,env(safe-area-inset-bottom))] pt-[max(1rem,2.5dvh,env(safe-area-inset-top))] text-tinta lg:h-dvh lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-[1.4vh]">
          {/* Variante sobre naranja: los peces en blanco y la palabra en Tinta. */}
          <Image src="/brand/isotipo-blanco.png" alt="" width={600} height={388} preload className="h-[clamp(2rem,6dvh,4.5rem)] w-auto" />
          <Image src="/brand/wordmark-tinta.png" alt="Pecera" width={1200} height={261} preload className="h-[clamp(1.4rem,4dvh,3rem)] w-auto" />
          <p className="ml-[1vh] font-display text-[clamp(1.1rem,3dvh,2.4rem)] font-semibold">{EVENTO_ACTUAL.nombre} · en vivo</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[clamp(0.875rem,1.8dvh,1.4rem)]">
          {conAlcance && <ElegirAlcance alcance={alcance} />}
          <p aria-live="polite">{problema ?? "Se actualiza cada 15 segundos"}</p>
        </div>
      </header>

      <div className="mt-[3dvh] grid flex-1 grid-cols-1 gap-x-[4vw] gap-y-10 lg:min-h-0 lg:grid-cols-[5fr_7fr]">
        <section aria-label="Conexiones" className="flex flex-col justify-center gap-[4dvh]">
          <div className="flex flex-col gap-[1.2dvh]">
            <p className="font-display text-[clamp(5rem,20dvh,17rem)] font-semibold leading-[0.9] tabular-nums" aria-live="polite">
              {datos ? numero.format(datos.ci_hoy) : "—"}
            </p>
            <span aria-hidden className="h-[0.6dvh] min-h-1 w-[9dvh] rounded-full bg-tinta" />
            <p className="text-[clamp(1.25rem,3.4dvh,2.8rem)] font-medium leading-tight">conexiones iniciadas hoy</p>
          </div>

          <dl className="grid grid-cols-2 gap-[3vw]">
            <div className="flex flex-col gap-[0.6dvh]">
              <dt className="order-2 text-[clamp(1rem,2.4dvh,2rem)] leading-snug">{deQuien} ya recibió al menos una</dt>
              <dd className="order-1 font-display text-[clamp(3rem,9dvh,7.5rem)] font-semibold leading-none tabular-nums">
                {pct === null ? "—" : `${pct} %`}
              </dd>
            </div>
            <div className="flex flex-col gap-[0.6dvh]">
              <dt className="order-2 text-[clamp(1rem,2.4dvh,2rem)] leading-snug">pitches vistos hoy</dt>
              <dd className="order-1 font-display text-[clamp(3rem,9dvh,7.5rem)] font-semibold leading-none tabular-nums">
                {datos ? numero.format(datos.pitches_vistos_hoy) : "—"}
              </dd>
            </div>
          </dl>

          <ul className="flex flex-col gap-[1dvh]" aria-label="Últimas conexiones">
            {(datos?.ticker ?? []).slice(0, 3).map((t, i) => (
              <li
                key={`${datos?.actualizado}-${i}`}
                className="aparecer flex items-baseline justify-between gap-4 border-t-2 border-tinta/20 pt-[0.8dvh] text-[clamp(1rem,2.2dvh,1.8rem)] leading-snug"
              >
                <span>{frase(t.industria)}</span>
                <span className="shrink-0">{hace(t.minutos)}</span>
              </li>
            ))}
          </ul>
        </section>

        <RankingEnVivo ranking={ranking} />
      </div>

      <footer className="mt-[2dvh] flex flex-col gap-1 text-[clamp(0.75rem,1.4dvh,1.1rem)] leading-snug lg:flex-row lg:justify-between lg:gap-8">
        <p>Una conexión iniciada es un toque en un canal de contacto: una intención, no una reunión. Solo números agregados.</p>
        <p className="lg:max-w-[55%] lg:text-right">
          Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza
          oferta pública de valores o asesoramiento financiero.
        </p>
      </footer>
    </main>
  );
}

/** "Feria 21 / Toda la plataforma": qué cuenta como proyecto para el %. */
function ElegirAlcance({ alcance }: { alcance: Alcance }) {
  const opciones = [
    { id: "evento", label: EVENTO_ACTUAL.nombre, href: "/admin/vivo" },
    { id: "plataforma", label: "Toda la plataforma", href: "/admin/vivo?alcance=plataforma" },
  ] as const;
  return (
    <nav aria-label="Qué proyectos cuentan" className="flex rounded-full border-2 border-tinta p-0.5">
      {opciones.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          replace
          aria-current={alcance === o.id ? "page" : undefined}
          className={`rounded-full px-3 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta ${
            alcance === o.id ? "bg-tinta text-pecera" : "text-tinta"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Histograma horizontal del top 10. Cada fila se ubica con translateY y cada barra se
 * llena con translateX dentro de su riel (scaleX deformaría las puntas redondeadas):
 * cuando cambia el orden o los votos, se deslizan. Con reducir movimiento, la regla
 * global de globals.css deja las transiciones en 0.
 */
function RankingEnVivo({ ranking }: { ranking: Ranking | null }) {
  const filas = ranking?.filas ?? [];
  const lugares = Math.max(FILAS_MIN, filas.length);
  const maximo = Math.max(1, ...filas.map((f) => f.votos));
  const hayEmpate = filas.some((f) => f.empate);

  return (
    <section aria-labelledby="ranking-titulo" className="flex min-h-[70dvh] flex-col lg:min-h-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="ranking-titulo" className="font-display text-[clamp(1.5rem,4dvh,3.2rem)] font-semibold leading-tight">
          Votación del público
        </h2>
        {ranking && (
          <p className="text-[clamp(1rem,2.4dvh,2rem)] tabular-nums">
            Top 10 · {numero.format(ranking.total)} {ranking.total === 1 ? "voto" : "votos"} ·{" "}
            {ranking.votacion_abierta ? "votación abierta" : "votación cerrada"}
          </p>
        )}
      </div>

      {!ranking ? (
        <p className="mt-[3dvh] text-[clamp(1rem,2.6dvh,2.2rem)]">El ranking aparece cuando corra la migración de la feria.</p>
      ) : filas.length === 0 ? (
        <p className="mt-[3dvh] text-[clamp(1rem,2.6dvh,2.2rem)]">{ranking.votacion_abierta ? "Todavía no hay votos: el ranking se arma con el primero." : "Todavía no hay votos."}</p>
      ) : (
        <ol className="relative mt-[2dvh] flex-1" aria-label="Top 10 por votos">
          {filas.map((f, i) => (
            <li
              key={f.perfil_id}
              className="absolute inset-x-0 top-0 motion-reduce:transition-none"
              style={{ height: `${100 / lugares}%`, transform: `translateY(${i * 100}%)`, ...MOVIMIENTO }}
            >
              <Barra fila={f} maximo={maximo} />
            </li>
          ))}
        </ol>
      )}

      {ranking && (ranking.fuera > 0 || hayEmpate) && (
        <p className="mt-[1dvh] text-[clamp(0.9rem,2dvh,1.6rem)]">
          {hayEmpate && "= puesto compartido: mismos votos."}
          {hayEmpate && ranking.fuera > 0 && " "}
          {ranking.fuera > 0 && `Y ${ranking.fuera} ${ranking.fuera === 1 ? "proyecto más" : "proyectos más"} con votos.`}
        </p>
      )}
    </section>
  );
}

function Barra({ fila, maximo }: { fila: FilaRanking; maximo: number }) {
  // Un mínimo visible: un voto también es una barra.
  const largo = Math.max(4, (fila.votos / maximo) * 100);
  const puesto = `${fila.empate ? "=" : ""}${fila.puesto}`;
  return (
    <div className="aparecer-pop flex h-full items-center gap-[1.2vw] py-[0.5dvh]">
      <span
        className="w-[2.6em] shrink-0 text-right font-display text-[clamp(1.1rem,3.4dvh,2.8rem)] font-semibold tabular-nums"
        aria-label={fila.empate ? `Puesto ${fila.puesto}, empatado` : `Puesto ${fila.puesto}`}
      >
        {puesto}
      </span>
      <Marca fila={fila} />
      <span className="line-clamp-2 w-[32%] shrink-0 text-[clamp(1rem,3dvh,2.5rem)] font-semibold leading-tight">{fila.nombre}</span>
      {/* El riel es decorativo; el dato lo da el número de la derecha. */}
      <span aria-hidden className="relative h-[52%] min-h-3 flex-1 overflow-hidden rounded-full bg-tinta/15">
        <span
          className="absolute inset-0 rounded-full bg-tinta motion-reduce:transition-none"
          style={{ transform: `translateX(${largo - 100}%)`, ...MOVIMIENTO }}
        />
      </span>
      <span className="w-[2.6em] shrink-0 text-right font-display text-[clamp(1.1rem,3.4dvh,2.8rem)] font-semibold tabular-nums">
        {numero.format(fila.votos)}
        <span className="sr-only"> {fila.votos === 1 ? "voto" : "votos"}</span>
      </span>
    </div>
  );
}

/** Logo de la empresa (cuadrado suave, entero) o foto del perfil (círculo), sobre Marfil. */
function Marca({ fila }: { fila: FilaRanking }) {
  const inicial = fila.nombre.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      className={`relative flex aspect-square h-[78%] shrink-0 items-center justify-center overflow-hidden bg-marfil ${
        fila.es_empresa ? "rounded-[24%]" : "rounded-full"
      }`}
    >
      {fila.imagen ? (
        <Image
          src={fila.imagen}
          alt=""
          fill
          sizes="12vh"
          className={fila.es_empresa ? "object-contain p-[12%]" : "object-cover"}
        />
      ) : (
        <span aria-hidden className="font-display text-[clamp(1rem,3dvh,2.4rem)] font-semibold leading-none text-naranja-texto">
          {inicial}
        </span>
      )}
    </span>
  );
}
