"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { IconoEditar } from "@/components/Iconos";

export type EstadoHoja = {
  abierta: boolean;
  cerrar: () => void;
  /** Cambia en cada apertura: con `key`, el form arranca de lo guardado. */
  vez: number;
};

/**
 * Abre una hoja si la URL trae `#editar-<clave>` (los links de CompletarPerfil), al
 * llegar o al tocar el link estando ya en la página.
 */
export function useAbrirConAncla(clave: string, abrir: () => void) {
  const abrirRef = useRef(abrir);
  useEffect(() => {
    abrirRef.current = abrir;
  });
  useEffect(() => {
    const mirar = () => {
      if (window.location.hash !== `#editar-${clave}`) return;
      // Que volver a tocar el mismo link la abra de nuevo.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      abrirRef.current();
    };
    const t = setTimeout(mirar, 0);
    window.addEventListener("hashchange", mirar);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", mirar);
    };
  }, [clave]);
}

/** Botón punteado "+ Agregar …" de una sección vacía del perfil propio. */
export function BotonAgregar({ children, onClick, bajada }: { children: ReactNode; onClick: () => void; bajada?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="boton flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-3xl border-2 border-dashed border-tinta/25 px-5 py-4 text-center text-tinta hover:border-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      <span className="font-semibold">
        <span aria-hidden>+ </span>
        {children}
      </span>
      {bajada && <span className="text-sm text-tinta/70">{bajada}</span>}
    </button>
  );
}

/** Lápiz discreto de una sección con datos. */
export function BotonLapiz({ etiqueta, onClick, className = "" }: { etiqueta: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      aria-haspopup="dialog"
      className={`boton flex size-10 items-center justify-center rounded-full border border-tinta/15 bg-marfil/95 text-tinta shadow-[0_2px_8px_rgb(28_27_22/0.10)] hover:border-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${className}`}
    >
      <IconoEditar className="size-4" />
    </button>
  );
}

/**
 * Una sección del perfil propio: vacía, el botón "+ Agregar …"; con datos, el
 * bloque tal como lo ve un visitante y un lápiz arriba a la derecha. Los dos abren
 * su hoja (`editor`). `#editar-<clave>` en la URL la abre sola (CompletarPerfil).
 */
export default function SeccionEditable({
  clave,
  titulo,
  vacia,
  agregar,
  bajadaVacia,
  editor,
  children,
}: {
  clave: string;
  titulo: string;
  vacia: boolean;
  agregar: string;
  bajadaVacia?: string;
  editor: (estado: EstadoHoja) => ReactNode;
  children?: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const [vez, setVez] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function abrir() {
    setVez((v) => v + 1);
    setAbierta(true);
  }

  useAbrirConAncla(clave, () => {
    ref.current?.scrollIntoView({ block: "center" });
    abrir();
  });

  return (
    <div ref={ref} id={`seccion-${clave}`} className="scroll-mt-24">
      {vacia ? (
        <BotonAgregar onClick={abrir} bajada={bajadaVacia}>
          {agregar}
        </BotonAgregar>
      ) : (
        <div className="relative">
          {children}
          <BotonLapiz etiqueta={`Editar ${titulo.toLowerCase()}`} onClick={abrir} className="absolute right-2 top-2" />
        </div>
      )}
      {editor({ abierta, cerrar: () => setAbierta(false), vez })}
    </div>
  );
}
