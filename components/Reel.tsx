"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { IconoCorazon } from "@/components/Iconos";
import BotonCompartirReel from "@/components/BotonCompartirReel";
import { ColumnaReel, DEGRADADO_REEL, DatosReel } from "@/components/ReelPartes";
import Subtitulos from "@/components/Subtitulos";
import { registrarActividad } from "@/lib/actividad";
import { registrarVista } from "@/lib/medicion";
import { contarParaPared } from "@/lib/pared";
import { registrarVisita } from "@/lib/visitas";
import { marcarPistaVista, usePistaPendiente } from "@/lib/pista-pique";
import type { ItemFeed } from "@/types/pecera";

/** Ventana del doble toque: el segundo toque tiene que llegar antes. */
const DOBLE_TOQUE_MS = 250;
/** Después de un corazón, cada toque dentro de esta ventana suma otro (ráfaga). */
const RAFAGA_MS = 450;
/** Una vista = el video se reprodujo al menos esto. */
const SEGUNDOS_VISTA = 3;
/** Cuánto del video hay que ver para `pitch_completado`. */
const FRACCION_COMPLETO = 0.75;

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
  /** Detrás de la pared de pitches (sin cuenta): sin video, poster con velo. */
  bloqueado?: boolean;
  /** Abre el pop-up de la pared. */
  onPared?: () => void;
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
  bloqueado = false,
  onPared,
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
  // El 75 % del video, también una vez por pasada (el video está en loop).
  const completoContado = useRef(false);

  // Al salir de pantalla se olvida la pausa manual, así el reel vuelve a
  // arrancar solo cuando el usuario regresa. Ajuste en render, no en efecto.
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    if (!activo) setPausadoAMano(false);
  }

  const href = `/p/${perfil.slug}?desde=${pitch.id}`;

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
      completoContado.current = false;
      return;
    }

    if (retenido || bloqueado) {
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
  }, [activo, silenciado, pausadoAMano, retenido, bloqueado, onForzarSilencio]);

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
    if (!activo || !video) return;
    if (!vistaContada.current && video.currentTime >= SEGUNDOS_VISTA) {
      vistaContada.current = true;
      registrarVista(pitch.id);
      registrarVisita("pitch", pitch.id);
      contarParaPared(pitch.id);
    }
    if (!completoContado.current && video.duration > 0 && video.currentTime / video.duration >= FRACCION_COMPLETO) {
      completoContado.current = true;
      registrarActividad({ nombre: "pitch_completado", pitchId: pitch.id });
    }
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
      className="ui-fija relative mx-auto h-dvh w-full snap-start snap-always overflow-hidden bg-tinta lg:max-w-[calc(100dvh*9/16)] lg:shadow-[0_0_80px_rgb(0_0_0/0.5)]"
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

      {bloqueado && (
        <div className="absolute inset-0 flex items-center justify-center bg-tinta/55 px-6 backdrop-blur-md">
          <div className="flex max-w-xs flex-col items-center gap-3 text-center text-marfil">
            <p className="font-display text-xl font-semibold leading-tight">Entrá para seguir viendo pitches</p>
            <button
              type="button"
              onClick={onPared}
              className="min-h-12 rounded-full bg-naranja px-6 font-semibold text-tinta transition-colors duration-[var(--duracion-rapida)] ease-pecera hover:bg-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
            >
              Entrar con Google
            </button>
            <Link href={href} className="text-sm underline underline-offset-2">
              O mirá el perfil de {perfil.nombre}
            </Link>
          </div>
        </div>
      )}

      {/* Gradiente para que el texto se lea sobre cualquier frame. */}
      <div className={DEGRADADO_REEL} />

      {/* El bloque deja pasar los toques al video (doble toque en toda la pantalla);
          solo links y botones los capturan. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-[max(1rem,calc(env(safe-area-inset-bottom)_+_0.5rem),calc(var(--alto-nav)_+_0.5rem))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] text-marfil">
        <div className="flex items-end gap-2">
          {/* Arriba del nombre y a la izquierda de la columna: el bloque está
              anclado abajo, así que los subtítulos crecen hacia arriba y nunca
              tapan los datos del reel ni los botones. */}
          <div className="min-w-0 flex-1">
            {conSubtitulos && pitch.subtitulos && pitch.subtitulos.length > 0 && (
              <Subtitulos videoRef={videoRef} bloques={pitch.subtitulos} activo={activo} />
            )}
          </div>

          <ColumnaReel
            piques={piques}
            piqueado={piqueado}
            latidos={latidos}
            mostrarCC={mostrarCC}
            conSubtitulos={conSubtitulos}
            silenciado={silenciado}
            onAlternarPique={alTocarCorazon}
            onAlternarSubtitulos={onAlternarSubtitulos}
            onAlternarSonido={onAlternarSonido}
            compartir={<BotonCompartirReel item={item} />}
          />
        </div>

        <DatosReel item={item} href={href} activo={activo} />
      </div>
    </section>
  );
}

type Corazon = { id: number; x: number; y: number; giro: number };

