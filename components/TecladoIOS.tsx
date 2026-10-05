"use client";

import { useEffect } from "react";

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * iOS Safari corre la ventana para mostrar el input sobre el teclado aunque el body
 * tenga overflow hidden, y al cerrarlo a veces no la devuelve: la página queda subida
 * con un hueco abajo y no se puede corregir con el dedo. Acá nada scrollea el
 * documento (cada página scrollea en su <main>), así que volver a 0 es seguro. No se
 * toca mientras haya un campo con foco, para no pelear con Safari.
 */
export default function TecladoIOS() {
  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const revisar = () => {
      clearTimeout(reloj);
      reloj = setTimeout(() => {
        if (document.activeElement?.matches(EDITABLE)) return;
        if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      }, 100);
    };
    const vista = window.visualViewport;
    document.addEventListener("focusout", revisar);
    vista?.addEventListener("resize", revisar);
    return () => {
      clearTimeout(reloj);
      document.removeEventListener("focusout", revisar);
      vista?.removeEventListener("resize", revisar);
    };
  }, []);

  return null;
}
