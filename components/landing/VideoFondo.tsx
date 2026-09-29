"use client";

import { useEffect, useRef } from "react";

/**
 * Video decorativo de fondo. `muted` se fuerza por JS porque React no lo
 * escribe en el HTML del servidor y iOS no reproduce solo sin él. Se pausa
 * fuera de pantalla y con "reducir movimiento" (queda el poster).
 */
export default function VideoFondo({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    let enPantalla = true;

    const aplicar = () => {
      if (reducir.matches || !enPantalla) video.pause();
      else video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([e]) => {
      enPantalla = e.isIntersecting;
      aplicar();
    });
    observer.observe(video);
    reducir.addEventListener("change", aplicar);
    aplicar();

    return () => {
      observer.disconnect();
      reducir.removeEventListener("change", aplicar);
    };
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
