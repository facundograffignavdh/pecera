"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { type FilaRanking, type Totales, leerVivo } from "@/app/admin/vivo/acciones";
import { EVENTO_ACTUAL } from "@/lib/eventos";

const CADA_MS = 15_000;
const numero = new Intl.NumberFormat("es-AR");
/** Puestos del ranking: el alto de cada fila no salta mientras se llena. */
const FILAS = 5;
/** Movimiento del ranking: solo transform, la duración de énfasis y la curva de la marca. */
const MOVIMIENTO = { transition: "transform var(--duracion-enfasis) var(--ease-pecera)" };

const fmt = (n: number | undefined) => (n === undefined ? "—" : numero.format(n));

/**
 * Pantalla del stand (/admin/vivo), para una pantalla apaisada grande que se mira de
 * lejos: los totales de la plataforma (que solo funcionó en la Feria 21, por eso se
 * presentan como de la feria) a la izquierda y el top 5 de la votación a la derecha.
 * Fondo Pecera (#F87C43) y todo el texto en Tinta sólida (6,5:1). `tema-fijo`: el modo
 * noche no invierte la Tinta. Sin letra chica: solo los números y qué son. Si una
 * lectura falla, quedan los últimos números y se avisa arriba.
 */
export default function Vivo() {
  const [totales, setTotales] = useState<Totales | null>(null);
  const [ranking, setRanking] = useState<FilaRanking[] | null>(null);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function leer() {
      const r = await leerVivo();
      if (!vivo) return;
      if (r.ok) {
        if (r.totales) setTotales(r.totales);
        if (r.ranking) setRanking(r.ranking);
        setProblema(r.totales ? null : "Falta correr la migración vivo_stand.");
      } else {
        setProblema(r.motivo === "acceso" ? "La sesión se cerró: entrá de nuevo desde /admin." : "Sin conexión: reintentando.");
      }
    }
    leer();
    const reloj = setInterval(leer, CADA_MS);
    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, []);

  const t = totales ?? undefined;
  const perfiles = t ? t.personas + t.empresas : undefined;

  return (
    <main className="tema-fijo flex min-h-dvh flex-col bg-pecera px-[max(1rem,3vw)] pb-[max(1rem,3dvh,env(safe-area-inset-bottom))] pt-[max(1rem,3dvh,env(safe-area-inset-top))] text-tinta lg:h-dvh lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-[2.4vh]">
          {/* Variante sobre naranja: los peces en blanco y la palabra en Tinta. */}
          <div className="flex items-center gap-[1.4vh]">
            <Image src="/brand/isotipo-blanco.png" alt="" width={600} height={388} preload className="h-[clamp(2.4rem,8dvh,6rem)] w-auto" />
            <Image src="/brand/wordmark-tinta.png" alt="Pecera" width={1200} height={261} preload className="h-[clamp(1.6rem,5.4dvh,4rem)] w-auto" />
          </div>
          <span aria-hidden className="font-display text-[clamp(1.5rem,5dvh,4rem)] font-semibold leading-none">×</span>
          {/* El gris del logo de la feria no se lee sobre naranja: va en su cuadro blanco. */}
          <span className="flex items-center rounded-[2.4vh] bg-white px-[2vh] py-[1.2vh]">
            <Image
              src="/feria/feria21-logo.png"
              alt={EVENTO_ACTUAL.nombre}
              width={1029}
              height={313}
              preload
              className="h-[clamp(2rem,7dvh,5.5rem)] w-auto"
            />
          </span>
        </div>
        {problema && (
          <p aria-live="polite" className="text-[clamp(1rem,2.2dvh,1.8rem)] font-semibold">
            {problema}
          </p>
        )}
      </header>

      <div className="mt-[4dvh] grid flex-1 grid-cols-1 gap-x-[4vw] gap-y-10 lg:min-h-0 lg:grid-cols-[3fr_2fr]">
        <section aria-label={`Números de ${EVENTO_ACTUAL.nombre}`} className="flex flex-col justify-center gap-[5dvh]">
          <dl className="grid grid-cols-1 gap-[3vw] sm:grid-cols-[3fr_2fr] sm:items-end">
            <Dato
              grande
              valor={fmt(t?.conexiones)}
              descripcion={`conexiones iniciadas en ${EVENTO_ACTUAL.nombre}`}
            />
            <Dato valor={fmt(t?.proyectos_con_conexion)} descripcion="proyectos recibieron al menos una conexión" />
          </dl>
          <dl className="grid grid-cols-2 gap-x-[3vw] gap-y-[4dvh] xl:grid-cols-4">
            <Dato valor={fmt(t?.vistas)} descripcion="vistas de pitches" />
            <Dato valor={fmt(t?.contactos)} descripcion="contactos a participantes" />
            <Dato valor={fmt(t?.piques)} descripcion="piques (me gusta)" />
            <Dato valor={fmt(perfiles)} descripcion="perfiles visibles: personas y empresas" />
          </dl>
        </section>

        <RankingEnVivo filas={ranking} />
      </div>
    </main>
  );
}

/** Un número con su descripción abajo. `grande`: el de las conexiones. */
function Dato({ valor, descripcion, grande = false }: { valor: string; descripcion: string; grande?: boolean }) {
  return (
    <div className="flex flex-col gap-[1dvh] border-t-[0.5dvh] border-tinta pt-[1.6dvh]">
      <dd
        className={`order-1 font-display font-semibold leading-[0.9] tabular-nums ${
          grande ? "text-[clamp(5rem,22dvh,18rem)]" : "text-[clamp(3rem,10dvh,8rem)]"
        }`}
        aria-live="polite"
      >
        {valor}
      </dd>
      <dt
        className={`order-2 font-medium leading-tight ${
          grande ? "text-[clamp(1.25rem,3.6dvh,3rem)]" : "text-[clamp(1rem,2.6dvh,2.2rem)]"
        }`}
      >
        {descripcion}
      </dt>
    </div>
  );
}

/**
 * Histograma horizontal del top 5. Cada fila se ubica con translateY y cada barra se
 * llena con translateX dentro de su riel (scaleX deformaría las puntas redondeadas):
 * cuando cambia el orden o los votos, se deslizan. Con reducir movimiento, la regla
 * global de globals.css deja las transiciones en 0.
 */
function RankingEnVivo({ filas }: { filas: FilaRanking[] | null }) {
  const maximo = Math.max(1, ...(filas ?? []).map((f) => f.votos));

  return (
    <section aria-labelledby="ranking-titulo" className="flex min-h-[60dvh] flex-col lg:min-h-0">
      <h2 id="ranking-titulo" className="font-display text-[clamp(1.6rem,5dvh,4rem)] font-semibold leading-tight">
        Ranking del público
      </h2>

      {filas && filas.length > 0 ? (
        <ol className="relative mt-[2dvh] flex-1" aria-label={`Top ${FILAS} por votos`}>
          {filas.map((f, i) => (
            <li
              key={f.perfil_id}
              className="absolute inset-x-0 top-0 motion-reduce:transition-none"
              style={{ height: `${100 / FILAS}%`, transform: `translateY(${i * 100}%)`, ...MOVIMIENTO }}
            >
              <Barra fila={f} maximo={maximo} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-[3dvh] text-[clamp(1rem,2.8dvh,2.4rem)]">{filas ? "Todavía no hay votos." : "—"}</p>
      )}
    </section>
  );
}

function Barra({ fila, maximo }: { fila: FilaRanking; maximo: number }) {
  // Un mínimo visible: un voto también es una barra.
  const largo = Math.max(4, (fila.votos / maximo) * 100);
  const puesto = `${fila.empate ? "=" : ""}${fila.puesto}`;
  return (
    <div className="aparecer-pop flex h-full flex-col justify-center gap-[1dvh] py-[1dvh]">
      <div className="flex min-w-0 items-center gap-[1.2vw]">
        <span
          className="w-[1.8em] shrink-0 font-display text-[clamp(1.4rem,4.4dvh,3.6rem)] font-semibold tabular-nums"
          aria-label={fila.empate ? `Puesto ${fila.puesto}, empatado` : `Puesto ${fila.puesto}`}
        >
          {puesto}
        </span>
        <Marca fila={fila} />
        <span className="min-w-0 flex-1 truncate text-[clamp(1.1rem,3.6dvh,3rem)] font-semibold leading-tight">{fila.nombre}</span>
        <span className="shrink-0 font-display text-[clamp(1.4rem,4.4dvh,3.6rem)] font-semibold tabular-nums">
          {numero.format(fila.votos)}
          <span className="sr-only"> {fila.votos === 1 ? "voto" : "votos"}</span>
        </span>
      </div>
      {/* El riel es decorativo; el dato lo da el número. */}
      <span aria-hidden className="relative h-[1.4dvh] min-h-2 overflow-hidden rounded-full bg-tinta/15">
        <span
          className="absolute inset-0 rounded-full bg-tinta motion-reduce:transition-none"
          style={{ transform: `translateX(${largo - 100}%)`, ...MOVIMIENTO }}
        />
      </span>
    </div>
  );
}

/** Logo de la empresa (cuadrado suave, entero) o foto del perfil (círculo), sobre Marfil. */
function Marca({ fila }: { fila: FilaRanking }) {
  const inicial = fila.nombre.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      className={`relative flex aspect-square h-[clamp(2.4rem,7dvh,5.5rem)] shrink-0 items-center justify-center overflow-hidden bg-marfil ${
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
        <span aria-hidden className="font-display text-[clamp(1rem,3.4dvh,2.6rem)] font-semibold leading-none text-naranja-texto">
          {inicial}
        </span>
      )}
    </span>
  );
}
