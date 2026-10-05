"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fila de piezas que ocupa como mucho dos líneas: las que no entran se esconden
 * desde el final y su lugar lo toma un "+N". Se mide con el ancho real (cambia
 * con la pantalla y el tamaño de letra), así que hace falta el navegador.
 */
export default function FilaDosLineas({
  piezas,
  className = "",
  claseMas = "",
}: {
  /** Cada pieza con su `key`, en orden de importancia: se esconden las últimas. */
  piezas: ReactNode[];
  className?: string;
  claseMas?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visibles, setVisibles] = useState(piezas.length);
  const total = piezas.length;

  useLayoutEffect(() => {
    const fila = ref.current;
    if (!fila) return;
    let ancho = -1;

    // Muestra todo, mide y deja el DOM como va a quedar después del render:
    // así no se ve ni un cuadro con tres líneas.
    const medir = () => {
      const nodos = Array.from(fila.querySelectorAll<HTMLElement>(":scope > [data-pieza]"));
      const mas = fila.querySelector<HTMLElement>(":scope > [data-mas]");
      if (!mas) return;
      for (const n of nodos) n.hidden = false;
      mas.hidden = true;

      let k = nodos.findIndex((n) => linea(n, nodos) > 2);
      if (k === -1) {
        setVisibles(nodos.length);
        return;
      }
      for (const n of nodos.slice(k)) n.hidden = true;
      mas.hidden = false;
      while (k > 0 && linea(mas, [...nodos.slice(0, k), mas]) > 2) {
        k--;
        nodos[k].hidden = true;
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
  }, [total]);

  const ocultas = total - visibles;
  return (
    <div ref={ref} className={className}>
      {piezas.map((p, i) => (
        <span key={i} data-pieza hidden={i >= visibles} className="flex min-w-0 max-w-full">
          {p}
        </span>
      ))}
      <span data-mas hidden={ocultas === 0} className={claseMas}>
        <span aria-hidden>+{ocultas}</span>
        <span className="sr-only">y {ocultas} etiquetas más</span>
      </span>
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
