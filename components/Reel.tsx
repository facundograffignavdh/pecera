"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { ROLES, TIPOS } from "@/lib/rol";
import type { ItemFeed } from "@/types/pecera";

type Props = {
  item: ItemFeed;
  activo: boolean;
  silenciado: boolean;
  /** El browser rechazó reproducir con sonido: el feed entero pasa a muteado. */
  onForzarSilencio: () => void;
  /** Para que el feed sepa qué índice está en pantalla. */
  indice: number;
  registrarRef: (indice: number, el: HTMLElement | null) => void;
};

export default function Reel({
  item,
  activo,
  silenciado,
  onForzarSilencio,
  indice,
  registrarRef,
}: Props) {
  const { pitch, perfil } = item;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausadoAMano, setPausadoAMano] = useState(false);

  // Al salir de pantalla se olvida la pausa manual, así el reel vuelve a
  // arrancar solo cuando el usuario regresa. Ajuste en render, no en efecto.
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    if (!activo) setPausadoAMano(false);
  }

  const href = `/p/${perfil.slug}`;
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
  }, [activo, silenciado, pausadoAMano, onForzarSilencio]);

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
      data-indice={indice}
      className="relative h-dvh w-full snap-start snap-always overflow-hidden bg-tinta"
    >
      <video
        ref={videoRef}
        src={pitch.video_url}
        poster={pitch.poster_url ?? undefined}
        muted
        playsInline
        loop
        preload={activo ? "auto" : "metadata"}
        onClick={alternarReproduccion}
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
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

      {/* Gradiente para que el texto se lea sobre cualquier frame. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 pb-8 text-marfil">
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
    </section>
  );
}
