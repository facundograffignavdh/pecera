"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fila de piezas en una sola línea: las que no entran se esconden desde el final y
 * su lugar lo toma un botón "+N" que despliega la fila entera ("menos" la vuelve a
 * plegar). Se mide con el ancho real (cambia con la pantalla y el tamaño de letra),
 * así que hace falta el navegador. Al dejar de ser el reel activo vuelve a plegarse.
 */
export default function FilaRecortada({
  piezas,
  id,
  activo,
  className = "",
  claseMas = "",
}: {
  /** En orden de importancia: se esconden las últimas. */
  piezas: ReactNode[];
  id: string;
  activo: boolean;
  className?: string;
  claseMas?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const total = piezas.length;
  const [visibles, setVisibles] = useState(total);
  const [abierta, setAbierta] = useState(false);

  // Ajuste en render, no en efecto (como en Reel y Subtitulos).
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    if (!activo) setAbierta(false);
  }

  useLayoutEffect(() => {
    const fila = ref.current;
    if (!fila) return;
    const primera = fila.querySelector<HTMLElement>(":scope > [data-pieza]");
    // Desplegada, la primera pieza recupera su ancho entero.
    if (abierta) {
      if (primera) primera.style.maxWidth = "";
      return;
    }
    let ancho = -1;

    // Muestra todo, mide y deja el DOM como va a quedar después del render:
    // así no se ve ni un cuadro con la fila desbordada.
    const medir = () => {
      const nodos = Array.from(fila.querySelectorAll<HTMLElement>(":scope > [data-pieza]"));
      const mas = fila.querySelector<HTMLElement>(":scope > [data-mas]");
      if (!mas) return;
      for (const n of nodos) n.hidden = false;
      mas.hidden = true;
      if (primera) primera.style.maxWidth = "";

      let k = nodos.findIndex((n) => linea(n, nodos) > 1);
      if (k === -1) {
        setVisibles(nodos.length);
        return;
      }
      for (const n of nodos.slice(k)) n.hidden = true;
      mas.hidden = false;
      while (k > 1 && linea(mas, [...nodos.slice(0, k), mas]) > 1) {
        k--;
        nodos[k].hidden = true;
      }
      // Si la primera sola ya llena la línea (un nombre de empresa largo), se achica
      // con "…" para que el "+N" quepa al lado.
      if (primera && linea(mas, [...nodos.slice(0, k), mas]) > 1) {
        const hueco = parseFloat(getComputedStyle(fila).columnGap) || 0;
        primera.style.maxWidth = `${fila.clientWidth - mas.offsetWidth - hueco}px`;
      }
      setVisibles(k);
    };

    const observador = new ResizeObserver(([entrada]) => {
      // Esconder piezas cambia el alto, no el ancho: solo se remide si cambió el ancho.
      const nuevo = Math.round(entrada.contentRect.width);
      if (nuevo === ancho) return;
      ancho = nuevo;
      medir();
    });
    observador.observe(fila);
    return () => observador.disconnect();
  }, [total, abierta]);

  const ocultas = total - visibles;
  return (
    <div ref={ref} id={id} className={className}>
      {piezas.map((p, i) => (
        <span key={i} data-pieza hidden={!abierta && i >= visibles} className="flex min-w-0 max-w-full">
          {p}
        </span>
      ))}
      <button
        type="button"
        data-mas
        hidden={!abierta && ocultas === 0}
        aria-expanded={abierta}
        aria-controls={id}
        aria-label={abierta ? "Ver menos etiquetas" : `Ver ${ocultas} ${ocultas === 1 ? "etiqueta" : "etiquetas"} más`}
        onClick={(e) => {
          // El video es hermano, no ancestro; igual no dejamos que el toque siga.
          e.stopPropagation();
          setAbierta((a) => !a);
        }}
        // Chico a la vista; el ::after lleva la zona táctil a 44 px.
        className={`pointer-events-auto relative shrink-0 after:absolute after:-inset-x-2 after:-inset-y-3 ${claseMas}`}
      >
        {abierta ? "menos" : `+${ocultas}`}
      </button>
    </div>
  );
}

/** En qué línea (1, 2, 3…) cae `el` entre `visibles`, en el orden del DOM. */
function linea(el: HTMLElement, visibles: HTMLElement[]): number {
  let n = 0;
  let fondo = -Infinity;
  for (const v of visibles) {
    if (v.hidden) continue;
    // Una pieza empieza línea nueva si arranca debajo del fondo de la línea actual.
    if (v.offsetTop >= fondo - 1) {
      n++;
      fondo = v.offsetTop + v.offsetHeight;
    } else {
      fondo = Math.max(fondo, v.offsetTop + v.offsetHeight);
    }
    if (v === el) return n;
  }
  return n;
}
