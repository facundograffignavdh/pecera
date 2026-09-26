"use client";

import { useEffect, useState } from "react";

const FRASES = [
  ["Construí tu ", "startup"],
  ["Fondeá tu ", "startup"],
  ["Invertí en ", "startups"],
  ["Mentoreá ", "startups"],
  ["Acelerá ", "startups"],
] as const;

/** Titular del hero que va rotando. Es decorativo: el h1 lleva el texto completo. */
export default function Rotador() {
  const [indice, setIndice] = useState(0);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cambio = 0;
    const id = window.setInterval(() => {
      setSaliendo(true);
      cambio = window.setTimeout(() => {
        setIndice((i) => (i + 1) % FRASES.length);
        setSaliendo(false);
      }, 300);
    }, 3200);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(cambio);
    };
  }, []);

  const [antes, destacado] = FRASES[indice];
  return (
    <span aria-hidden className="rotador block" data-saliendo={saliendo || undefined}>
      {antes}
      <em className="font-semibold italic text-arcilla">{destacado}</em>
    </span>
  );
}
