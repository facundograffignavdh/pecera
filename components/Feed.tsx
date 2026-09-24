"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reel from "@/components/Reel";
import type { ItemFeed } from "@/types/pecera";

const LEGAL =
  "Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza oferta pública de valores o asesoramiento financiero.";

export default function Feed({ items }: { items: ItemFeed[] }) {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [silenciado, setSilenciado] = useState(true);
  const secciones = useRef(new Map<number, HTMLElement>());

  const registrarRef = useCallback((indice: number, el: HTMLElement | null) => {
    if (el) secciones.current.set(indice, el);
    else secciones.current.delete(indice);
  }, []);

  const forzarSilencio = useCallback(() => setSilenciado(true), []);

  // Al volver desde un perfil la URL trae /#<pitch.id>: saltamos a ese reel.
  // No tocamos `indiceActivo` acá — el observer lo corrige solo tras el scroll.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    for (const el of secciones.current.values()) {
      if (el.id === id) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
    }
  }, []);

  // Un solo observer para todas las secciones: la que ocupa más del 60% manda.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const indice = Number(
            (entrada.target as HTMLElement).dataset.indice
          );
          if (!Number.isNaN(indice)) setIndiceActivo(indice);
        }
      },
      { threshold: 0.6 }
    );

    for (const el of secciones.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <main className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
      <button
        type="button"
        onClick={() => setSilenciado((s) => !s)}
        aria-label={silenciado ? "Activar sonido" : "Silenciar"}
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-tinta/60 text-marfil backdrop-blur-sm transition-colors duration-200 ease-pecera"
      >
        {silenciado ? "🔇" : "🔊"}
      </button>

      {items.map((item, indice) => (
        <Reel
          key={item.pitch.id}
          item={item}
          indice={indice}
          activo={indice === indiceActivo}
          cargar={Math.abs(indice - indiceActivo) <= 1}
          silenciado={silenciado}
          onForzarSilencio={forzarSilencio}
          registrarRef={registrarRef}
        />
      ))}

      <section
        ref={(el) => registrarRef(items.length, el)}
        data-indice={items.length}
        className="flex h-dvh snap-start snap-always flex-col items-center justify-center gap-6 bg-marfil px-6 text-center"
      >
        <h2 className="font-display text-3xl font-semibold text-tinta">
          Eso es todo por hoy
        </h2>
        <p className="max-w-sm text-tinta/80">
          Volvé más tarde: durante la feria seguimos sumando pitches.
        </p>
        <p className="max-w-md text-xs leading-relaxed text-tinta/60">{LEGAL}</p>
      </section>
    </main>
  );
}
