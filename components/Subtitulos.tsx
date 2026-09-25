"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Subtitulo } from "@/types/pecera";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  bloques: Subtitulo[];
  activo: boolean;
};

/**
 * Subtítulos sincronizados con el video. Mientras el reel activo reproduce, un
 * requestAnimationFrame busca el bloque del momento; el estado solo cambia
 * cuando cambia el bloque. Sin bloque vigente no dibuja nada.
 */
export default function Subtitulos({ videoRef, bloques, activo }: Props) {
  const [indice, setIndice] = useState(-1);

  // Al cambiar de reel se olvida el bloque anterior. Ajuste en render, no en efecto.
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    setIndice(-1);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!activo || !video) return;

    let cuadro = 0;
    const buscar = () => {
      const t = video.currentTime;
      setIndice(bloques.findIndex((b) => t >= b.desde && t < b.hasta));
    };
    const bucle = () => {
      buscar();
      cuadro = requestAnimationFrame(bucle);
    };
    const arrancar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(bucle);
    };
    const frenar = () => {
      cancelAnimationFrame(cuadro);
      buscar();
    };

    video.addEventListener("play", arrancar);
    video.addEventListener("pause", frenar);
    video.addEventListener("seeked", buscar);
    cuadro = requestAnimationFrame(video.paused ? buscar : bucle);

    return () => {
      cancelAnimationFrame(cuadro);
      video.removeEventListener("play", arrancar);
      video.removeEventListener("pause", frenar);
      video.removeEventListener("seeked", buscar);
    };
  }, [activo, bloques, videoRef]);

  const bloque = activo ? bloques[indice] : undefined;
  if (!bloque) return null;

  return (
    <p className="mx-auto mb-4 line-clamp-2 max-w-[32ch] text-center text-[17px] font-medium leading-[1.6] text-marfil">
      <span className="rounded bg-tinta/75 px-2 py-0.5 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
        {bloque.texto}
      </span>
    </p>
  );
}
