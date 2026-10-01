"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video decorativo (no se descarga hasta que hace falta). Debajo va el póster como imagen
 * normal, con una versión liviana para el celular; el video aparece encima con un fundido
 * cuando empieza a reproducirse. Así:
 *  - sin JS, con "reducir movimiento" o con "ahorro de datos", se queda el póster y nunca
 *    se baja el video;
 *  - el video solo corre mientras se ve (se pausa al salir de pantalla);
 *  - `muted` se fuerza por JS porque React no lo escribe en el HTML del servidor y iOS no
 *    reproduce solo sin él.
 * `className` va en las dos capas: el color y el encuadre se aplican parejo a ambas.
 */
export default function VideoFondo({
  src,
  poster,
  posterMovil,
  className = "",
}: {
  src: string;
  poster: string;
  posterMovil?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let enPantalla = false;

    const aplicar = () => {
      if (reducir.matches || conexion?.saveData || !enPantalla) video.pause();
      else video.play().then(() => setReproduciendo(true), () => {});
    };
    const observer = new IntersectionObserver(
      ([e]) => {
        enPantalla = e.isIntersecting;
        aplicar();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);
    reducir.addEventListener("change", aplicar);

    return () => {
      observer.disconnect();
      reducir.removeEventListener("change", aplicar);
    };
  }, []);

  return (
    <>
      <picture>
        {posterMovil && <source media="(max-width: 640px)" srcSet={posterMovil} type="image/webp" />}
        <img src={poster} alt="" decoding="async" loading="lazy" className={className} />
      </picture>
      <video
        ref={ref}
        className={`${className} transition-opacity duration-700 ease-pecera ${reproduciendo ? "opacity-100" : "opacity-0"}`}
        muted
        loop
        playsInline
        preload="none"
        onPlaying={() => setReproduciendo(true)}
        aria-hidden
        tabIndex={-1}
      >
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}
