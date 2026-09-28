"use client";

import { useRef, useState } from "react";

/**
 * Demo con audio: a diferencia de VideoFondo (loop mudo de fondo), este
 * arranca pausado y en manos del visitante — con sonido, porque tiene
 * locución. Un toque en el poster lo pone en marcha con controles nativos.
 */
export default function VideoDemo({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  function reproducir() {
    const video = ref.current;
    if (!video) return;
    setReproduciendo(true);
    video.play().catch(() => setReproduciendo(false));
  }

  return (
    <div className={`group relative overflow-hidden rounded-3xl bg-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_20px_48px_rgb(28_27_22/0.18)] ${className}`}>
      <video
        ref={ref}
        className="aspect-video w-full"
        controls={reproduciendo}
        playsInline
        preload="metadata"
        poster={poster}
        onPause={() => setReproduciendo(false)}
        onEnded={() => setReproduciendo(false)}
      >
        <source src={src} type="video/mp4" />
      </video>

      {!reproduciendo && (
        <button
          type="button"
          onClick={reproducir}
          aria-label="Reproducir el video demo de Pecera"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="vidrio flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_24px_rgb(28_27_22/0.25)] transition-transform duration-200 ease-pecera group-hover:scale-105">
            <svg viewBox="0 0 24 24" aria-hidden className="ml-1 h-6 w-6 text-tinta">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
