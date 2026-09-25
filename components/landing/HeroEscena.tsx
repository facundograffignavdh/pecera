"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import EscenaEstatica from "@/components/landing/EscenaEstatica";

// three.js entra en un chunk aparte y solo en el cliente.
const EscenaPecera = dynamic(() => import("@/components/landing/EscenaPecera"), { ssr: false });

/** Si el 3D falla (sin contexto WebGL, no carga el SVG), queda la escena quieta. */
class SinRomper extends Component<{ children: ReactNode }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() {
    return { roto: true };
  }
  render() {
    return this.state.roto ? null : this.props.children;
  }
}

function soportaWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Primero se ve la escena quieta (HTML puro, no espera a nada). Cuando el
 * navegador queda libre se carga el 3D y aparece encima con un fundido. Sin
 * WebGL o con "reducir movimiento", el 3D no se carga nunca.
 */
export default function HeroEscena({ className = "" }: { className?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [con3d, setCon3d] = useState(false);
  const [lista, setLista] = useState(false);
  const [enPantalla, setEnPantalla] = useState(true);
  const [pestanaVisible, setPestanaVisible] = useState(true);

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    const alCambiar = () => {
      if (reducir.matches) setCon3d(false);
    };
    reducir.addEventListener("change", alCambiar);
    if (reducir.matches || !soportaWebGL()) {
      return () => reducir.removeEventListener("change", alCambiar);
    }

    // Después del contenido: el 3D nunca compite con la primera pintada.
    const cargar = () => setCon3d(true);
    const ocioso = "requestIdleCallback" in window;
    const id = ocioso
      ? window.requestIdleCallback(cargar, { timeout: 2500 })
      : window.setTimeout(cargar, 600);
    return () => {
      reducir.removeEventListener("change", alCambiar);
      if (ocioso) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting));
    observer.observe(el);
    const alCambiarPestana = () => setPestanaVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", alCambiarPestana);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", alCambiarPestana);
    };
  }, []);

  const alEstarLista = useCallback(() => setLista(true), []);
  const mostrar3d = con3d && lista;

  return (
    <div ref={caja} className={`relative ${className}`} aria-hidden>
      <EscenaEstatica
        className={`absolute inset-0 transition-opacity duration-700 ease-pecera ${
          mostrar3d ? "opacity-0" : "opacity-100"
        }`}
      />
      {con3d && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-pecera ${
            mostrar3d ? "opacity-100" : "opacity-0"
          }`}
        >
          <SinRomper>
            <EscenaPecera activa={enPantalla && pestanaVisible} onLista={alEstarLista} />
          </SinRomper>
        </div>
      )}
    </div>
  );
}
