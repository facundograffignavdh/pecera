"use client";

import { useEffect } from "react";

/**
 * Si la URL apunta a un `<details>` (/docs/legales#safe), lo abre y lo trae a la
 * vista. Sin esto, el link compartido cae en un acordeón cerrado.
 */
export default function AbrirDestino() {
  useEffect(() => {
    function abrir() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    }
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);
  return null;
}
