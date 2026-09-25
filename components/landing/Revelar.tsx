"use client";

import { useEffect } from "react";

/**
 * Entradas al hacer scroll para todo lo que tenga `data-revelar`. Los bloques
 * solo se esconden cuando este efecto marca el <html>, así que sin JavaScript
 * se ve todo. Lo que ya está en pantalla se marca visible antes, sin parpadeo.
 */
export default function Revelar() {
  useEffect(() => {
    const raiz = document.documentElement;
    const bloques = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
    const limite = window.innerHeight * 0.92;

    for (const el of bloques) {
      if (el.getBoundingClientRect().top < limite) el.dataset.visible = "";
    }
    raiz.dataset.revelar = "";

    const observer = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.visible = "";
          observer.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    for (const el of bloques) if (!("visible" in el.dataset)) observer.observe(el);

    return () => {
      observer.disconnect();
      delete raiz.dataset.revelar;
    };
  }, []);

  return null;
}
