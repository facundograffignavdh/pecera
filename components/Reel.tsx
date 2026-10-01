"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Avatar from "@/components/Avatar";
import { EtiquetasReel } from "@/components/Etiquetas";
import { IconoCorazon, IconoSonido, IconoSubtitulos } from "@/components/Iconos";
import InsigniaPitch from "@/components/InsigniaPitch";
import Subtitulos from "@/components/Subtitulos";
import { formatoCompacto } from "@/lib/formato";
import { registrarVista } from "@/lib/medicion";
import { marcarPistaVista, usePistaPendiente } from "@/lib/pista-pique";
import { ROLES, TIPOS } from "@/lib/rol";
import type { ItemFeed } from "@/types/pecera";

/** Ventana del doble toque: el segundo toque tiene que llegar antes. */
const DOBLE_TOQUE_MS = 250;
/** Después de un corazón, cada toque dentro de esta ventana suma otro (ráfaga). */
const RAFAGA_MS = 450;
/** Una vista = el video se reprodujo al menos esto. */
const SEGUNDOS_VISTA = 3;

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
  // Momento del último corazón: los toques seguidos arman una ráfaga sin pausar.
  const ultimoCorazonMs = useRef(-Infinity);
  const pistaPendiente = usePistaPendiente();
  // La vista se cuenta una vez por pasada por el reel.
  const vistaContada = useRef(false);

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
      vistaContada.current = false;
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

  /**
   * Un toque pausa, pero espera 250 ms por si es un doble toque (pique). Después de
   * un corazón, cada toque rápido suma otro (ráfaga, como en TikTok) y nunca pausa.
   * El pique se da una sola vez por ráfaga; lo demás es festejo.
   */
  function alTocarVideo(e: MouseEvent<HTMLVideoElement>) {
    // Hora del toque según el navegador (misma escala que performance.now()).
    const ahora = e.timeStamp;
    const enRafaga = ahora - ultimoCorazonMs.current < RAFAGA_MS;

    if (primerToque.current === null && !enRafaga) {
      primerToque.current = window.setTimeout(() => {
        primerToque.current = null;
        alternarReproduccion();
      }, DOBLE_TOQUE_MS);
      return;
    }

    if (primerToque.current !== null) {
      clearTimeout(primerToque.current);
      primerToque.current = null;
    }
    ultimoCorazonMs.current = ahora;

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
    // Vibración corta donde existe (Android); iOS la ignora.
    navigator.vibrate?.(enRafaga ? 8 : 15);
    if (!enRafaga) {
      marcarPistaVista();
      onDarPique();
    }
  }

  // Sin controles no se puede adelantar: llegar a los 3 s es haberlos reproducido.
  function alAvanzar() {
    const video = videoRef.current;
    if (!activo || vistaContada.current || !video || video.currentTime < SEGUNDOS_VISTA) return;
    vistaContada.current = true;
    registrarVista(pitch.id);
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
      // ui-fija: el doble toque y el toque largo no seleccionan el texto del reel.
      className="ui-fija relative h-dvh w-full snap-start snap-always overflow-hidden bg-tinta"
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
        onTimeUpdate={alAvanzar}
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

      {activo && pistaPendiente && !piqueado && (
        <span
          aria-hidden
          onAnimationEnd={marcarPistaVista}
          className="pista-pique vidrio pointer-events-none absolute left-1/2 top-[38%] flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-tinta"
        >
          <IconoCorazon lleno className="size-4 text-arcilla" />
          Tocá dos veces para dar pique
        </span>
      )}

      {/* Gradiente para que el texto se lea sobre cualquier frame. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />

      {/* El bloque deja pasar los toques al video (doble toque en toda la pantalla);
          solo links y botones los capturan. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-[max(2rem,calc(env(safe-area-inset-bottom)_+_0.75rem))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] text-marfil">
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
          <div className="pointer-events-auto flex w-12 shrink-0 flex-col items-center gap-2">
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
            <Link
              href={href}
              aria-label={`Ver el perfil de ${perfil.nombre}`}
              className="pointer-events-auto"
            >
              <Avatar perfil={perfil} size={48} />
            </Link>
            <div className="min-w-0">
              <Link
                href={href}
                className="pointer-events-auto font-display text-xl font-semibold leading-tight"
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

          <EtiquetasReel perfil={perfil} />

          {item.construyendo && <Construyendo hito={item.construyendo} activo={activo} />}

          {/* La insignia va pegada a la descripción: se reconoce el formato al pasar. */}
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-marfil/90">
            <InsigniaPitch grande activa={activo} className="mr-2 align-[0.1em]" />
            {pitch.descripcion || perfil.descripcion}
          </p>

          <Link
            href={href}
            className="pointer-events-auto mt-4 inline-flex rounded-full bg-naranja px-5 py-2.5 font-semibold text-tinta transition-[background-color,transform] duration-200 ease-pecera hover:bg-pecera active:scale-[0.98]"
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </section>
  );
}

type Corazon = { id: number; x: number; y: number; giro: number };

/**
 * Build in Public en el reel: el hito en curso de su empresa, con la barra del
 * progreso que cargó el equipo. Ámbar, para no confundirse con la insignia del Pitch.
 */
function Construyendo({ hito, activo }: { hito: NonNullable<ItemFeed["construyendo"]>; activo: boolean }) {
  return (
    <p className="mt-2.5 flex min-w-0 items-center gap-2 text-xs text-marfil">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tinta/60 px-2 py-1 font-semibold uppercase tracking-wide">
        <span aria-hidden className={`size-1.5 rounded-full bg-obra ${activo ? "punto-vivo" : ""}`} />
        Construyendo
      </span>
      <span className="truncate font-medium">{hito.titulo}</span>
      {hito.progreso !== null && (
        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
          <span aria-hidden className="h-1 w-10 overflow-hidden rounded-full bg-marfil/25">
            {activo && (
              <span
                className="barra-progreso block h-full rounded-full bg-obra"
                style={{ "--p": hito.progreso / 100 } as CSSProperties}
              />
            )}
          </span>
          {hito.progreso}%
        </span>
      )}
    </p>
  );
}

/** 0 muestra el nombre del gesto; desde 1000, "1,2 mil". */
function formatoPiques(n: number): string {
  return n === 0 ? "Pique" : formatoCompacto(n);
}
