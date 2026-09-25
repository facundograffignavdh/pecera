"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Avatar from "@/components/Avatar";
import { IconoCorazon, IconoSonido, IconoSubtitulos } from "@/components/Iconos";
import Subtitulos from "@/components/Subtitulos";
import { ROLES, TIPOS } from "@/lib/rol";
import type { ItemFeed } from "@/types/pecera";

type Props = {
  item: ItemFeed;
  activo: boolean;
  /** Solo el activo y sus vecinos llevan `src`; el resto muestra el poster. */
  cargar: boolean;
  silenciado: boolean;
  onAlternarSonido: () => void;
  /** Preferencia del usuario; si el pitch no tiene subtítulos no se dibuja nada. */
  conSubtitulos: boolean;
  /** El botón CC aparece si algún pitch del feed tiene subtítulos. */
  mostrarCC: boolean;
  onAlternarSubtitulos: () => void;
  /** El browser rechazó reproducir con sonido: el feed entero pasa a muteado. */
  onForzarSilencio: () => void;
  /** El pop-up del pique está abierto: el video espera. */
  retenido: boolean;
  piques: number;
  piqueado: boolean;
  /** Botón del corazón. Devuelve `true` si el pique quedó dado. */
  onAlternarPique: () => boolean;
  /** Doble toque en el video: da pique, nunca lo quita. */
  onDarPique: () => void;
  /** Para que el feed sepa qué índice está en pantalla. */
  indice: number;
  registrarRef: (indice: number, el: HTMLElement | null) => void;
};

export default function Reel({
  item,
  activo,
  cargar,
  silenciado,
  onAlternarSonido,
  conSubtitulos,
  mostrarCC,
  onAlternarSubtitulos,
  onForzarSilencio,
  retenido,
  piques,
  piqueado,
  onAlternarPique,
  onDarPique,
  indice,
  registrarRef,
}: Props) {
  const { pitch, perfil } = item;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausadoAMano, setPausadoAMano] = useState(false);
  // Cada latido nuevo remonta el ícono para que la animación vuelva a correr.
  const [latidos, setLatidos] = useState(0);
  // Corazones del doble toque, donde tocó el dedo; cada uno se va al terminar.
  const [corazones, setCorazones] = useState<Corazon[]>([]);
  const ultimoCorazon = useRef(0);
  const primerToque = useRef<number | null>(null);

  // Al salir de pantalla se olvida la pausa manual, así el reel vuelve a
  // arrancar solo cuando el usuario regresa. Ajuste en render, no en efecto.
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    if (!activo) setPausadoAMano(false);
  }

  const href = `/p/${perfil.slug}?desde=${pitch.id}`;
  const rol = ROLES[perfil.rol];

  // El atributo `muted` del DOM no siempre sigue al prop de React, así que lo
  // sincronizamos a mano antes de cualquier play().
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = silenciado;
  }, [silenciado]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activo) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    if (retenido) {
      video.pause();
      return;
    }
    if (pausadoAMano) return;

    let cancelado = false;
    video.muted = silenciado;

    video.play().catch(() => {
      // iOS bloquea el autoplay con audio fuera de un gesto del usuario.
      // Reintentamos muteados y avisamos al feed para que el ícono coincida.
      if (cancelado || video.muted) return;
      video.muted = true;
      onForzarSilencio();
      video.play().catch(() => {});
    });

    return () => {
      cancelado = true;
    };
  }, [activo, silenciado, pausadoAMano, retenido, onForzarSilencio]);

  // Sacar el `src` no suelta el buffer: hace falta load() para que el browser
  // libere el video y vuelva a mostrar el poster.
  useEffect(() => {
    if (!cargar) videoRef.current?.load();
  }, [cargar]);

  useEffect(
    () => () => {
      if (primerToque.current !== null) clearTimeout(primerToque.current);
    },
    []
  );

  // Un toque pausa, pero espera 250 ms por si es un doble toque (pique).
  function alTocarVideo(e: MouseEvent<HTMLVideoElement>) {
    if (primerToque.current !== null) {
      clearTimeout(primerToque.current);
      primerToque.current = null;
      const caja = e.currentTarget.getBoundingClientRect();
      const id = ++ultimoCorazon.current;
      // Giro entre -15° y 15° que cambia en cada corazón, sin Math.random.
      const corazon = {
        id,
        x: e.clientX - caja.left,
        y: e.clientY - caja.top,
        giro: ((id * 17) % 31) - 15,
      };
      setCorazones((cs) => [...cs, corazon]);
      setLatidos((n) => n + 1);
      onDarPique();
      return;
    }
    primerToque.current = window.setTimeout(() => {
      primerToque.current = null;
      alternarReproduccion();
    }, 250);
  }

  function alTocarCorazon() {
    if (onAlternarPique()) setLatidos((n) => n + 1);
  }

  function alternarReproduccion() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setPausadoAMano(false);
      video.play().catch(() => {});
    } else {
      video.pause();
      setPausadoAMano(true);
    }
  }

  return (
    <section
      ref={(el) => registrarRef(indice, el)}
      id={pitch.id}
      data-indice={indice}
      className="relative h-dvh w-full snap-start snap-always overflow-hidden bg-tinta"
    >
      <video
        ref={videoRef}
        src={cargar ? pitch.video_url : undefined}
        poster={pitch.poster_url ?? undefined}
        muted
        playsInline
        loop
        preload={activo ? "auto" : "metadata"}
        onClick={alTocarVideo}
        className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation object-cover"
      />

      {pausadoAMano && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tinta/60 text-2xl text-marfil">
            ▶
          </span>
        </span>
      )}

      {corazones.map((c) => (
        <span
          key={c.id}
          aria-hidden
          onAnimationEnd={() => setCorazones((cs) => cs.filter((o) => o.id !== c.id))}
          style={{ left: c.x, top: c.y, "--giro": `${c.giro}deg` } as CSSProperties}
          className="corazon-toque pointer-events-none absolute h-24 w-24 text-pecera"
        >
          <IconoCorazon lleno className="icono-sombra h-full w-full" />
        </span>
      ))}

      {/* Gradiente para que el texto se lea sobre cualquier frame. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 pb-[max(2rem,calc(env(safe-area-inset-bottom)_+_0.75rem))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] text-marfil">
        <div className="flex items-end gap-2">
          {/* Arriba del nombre y a la izquierda de la columna: el bloque está
              anclado abajo, así que los subtítulos crecen hacia arriba y nunca
              tapan los datos del reel ni los botones. */}
          <div className="min-w-0 flex-1">
            {conSubtitulos && pitch.subtitulos && pitch.subtitulos.length > 0 && (
              <Subtitulos videoRef={videoRef} bloques={pitch.subtitulos} activo={activo} />
            )}
          </div>

          {/* Columna de acciones, como la de TikTok: termina justo arriba del nombre. */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-2">
            <button
              type="button"
              onClick={alTocarCorazon}
              aria-pressed={piqueado}
              aria-label={`${piqueado ? "Quitar pique" : "Dar pique"} (${piques} ${piques === 1 ? "pique" : "piques"})`}
              className="flex w-12 flex-col items-center"
            >
              <span className="flex h-12 w-12 items-center justify-center">
                <IconoCorazon
                  key={latidos}
                  lleno={piqueado}
                  className={`icono-sombra h-8 w-8 transition-colors duration-200 ease-pecera ${
                    piqueado ? "text-pecera" : "text-marfil"
                  } ${latidos > 0 ? "latido" : ""}`}
                />
              </span>
              <span aria-hidden className="texto-sombra -mt-1 text-xs font-semibold tabular-nums">
                {formatoPiques(piques)}
              </span>
            </button>

            {mostrarCC && (
              <button
                type="button"
                onClick={onAlternarSubtitulos}
                aria-label="Subtítulos"
                aria-pressed={conSubtitulos}
                className="flex h-12 w-12 items-center justify-center"
              >
                <IconoSubtitulos activo={conSubtitulos} className="icono-sombra h-7 w-7" />
              </button>
            )}

            <button
              type="button"
              onClick={onAlternarSonido}
              aria-label="Sonido"
              aria-pressed={!silenciado}
              className="flex h-12 w-12 items-center justify-center"
            >
              <IconoSonido silenciado={silenciado} className="icono-sombra h-7 w-7" />
            </button>
          </div>
        </div>

        {/* Margen derecho del ancho de la columna: un texto largo nunca queda debajo. */}
        <div className="mt-3 pr-14">
          <div className="flex items-center gap-3">
            <Link href={href} aria-label={`Ver el perfil de ${perfil.nombre}`}>
              <Avatar perfil={perfil} size={48} />
            </Link>
            <div className="min-w-0">
              <Link
                href={href}
                className="font-display text-xl font-semibold leading-tight"
              >
                {perfil.nombre}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${rol.bg}`}
                >
                  {rol.label}
                </span>
                <span className="text-marfil/70">{TIPOS[perfil.tipo]}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 max-w-prose text-sm leading-relaxed text-marfil/90">
            {perfil.descripcion}
          </p>

          <Link
            href={href}
            className="mt-4 inline-flex rounded-full bg-arcilla px-5 py-2.5 font-medium text-marfil transition-colors duration-200 ease-pecera hover:bg-pecera"
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </section>
  );
}

type Corazon = { id: number; x: number; y: number; giro: number };

/** 0 muestra el nombre del gesto; desde 1000, "1,2 mil". */
function formatoPiques(n: number): string {
  if (n === 0) return "Pique";
  if (n < 1000) return String(n);
  return `${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil`;
}
