// Basado en ArrowFillButton de Hyperiux Vault (https://vault.hyperiux.com), adaptado a Pecera:
// - Medidas fijas en rem (el original escala con vw y en tablet queda gigante).
// - Se ve desde el primer pintado (el original lo escondía hasta hidratar: malo para el
//   LCP y para quien no tiene JavaScript); solo las transiciones esperan a hidratar.
// - Sirve como <a> (con href) o como <button> (sin href), para abrir un diálogo.
// - El relleno también se activa con el foco del teclado y al tocar en el celular.
// - Flecha en SVG propio: sin dependencias nuevas.
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

const DURACION_MS = 450;

const TAMANOS = {
  lg: "h-14 pl-8 text-[18px] [--icono:2.75rem] [--margen:0.375rem]",
  md: "h-12 pl-6 text-base [--icono:2.25rem] [--margen:0.375rem]",
};

type Colores = {
  /** Fondo y texto del botón en reposo. */
  bgColor?: string;
  textColor?: string;
  /** El círculo de la flecha, que al pasar se expande y cubre todo el botón. */
  fillBgColor?: string;
  fillTextColor?: string;
  arrowColor?: string;
};

type Propias = Colores & {
  btnText: ReactNode;
  tamano?: keyof typeof TAMANOS;
  className?: string;
};

type ComoEnlace = Propias & { href: string } & Omit<ComponentPropsWithoutRef<"a">, keyof Propias | "href">;
type ComoBoton = Propias & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, keyof Propias>;
export type ArrowFillButtonProps = ComoEnlace | ComoBoton;

// Al pasar, tocar o enfocar: el círculo cubre todo, el texto cambia de color y la
// flecha sale por la derecha mientras entra otra por la izquierda. Las clases van
// escritas enteras para que Tailwind las encuentre.
const RELLENO_ACTIVO =
  "group-hover:inset-0 group-focus-visible:inset-0 group-data-[presionado=true]:inset-0";
const TEXTO_ACTIVO =
  "group-hover:[clip-path:inset(0_0_0_0)] group-focus-visible:[clip-path:inset(0_0_0_0)] group-data-[presionado=true]:[clip-path:inset(0_0_0_0)]";
const FLECHA_ENTRA =
  "group-hover:-translate-x-1/2 group-hover:scale-100 group-focus-visible:-translate-x-1/2 group-focus-visible:scale-100 group-data-[presionado=true]:-translate-x-1/2 group-data-[presionado=true]:scale-100";
const FLECHA_SALE =
  "group-hover:translate-x-[70%] group-hover:scale-0 group-focus-visible:translate-x-[70%] group-focus-visible:scale-0 group-data-[presionado=true]:translate-x-[70%] group-data-[presionado=true]:scale-0";

const TRANSICION =
  "duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none";

function Flecha({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ArrowFillButton(props: ArrowFillButtonProps) {
  const {
    btnText,
    tamano = "lg",
    className = "",
    bgColor = "var(--color-naranja)",
    textColor = "var(--color-tinta)",
    fillBgColor = "var(--color-tinta)",
    fillTextColor = "var(--color-marfil)",
    arrowColor,
    ...resto
  } = props;
  const [listo, setListo] = useState(false);
  const [presionado, setPresionado] = useState(false);
  const soltar = useRef<number | null>(null);

  // Las transiciones se prenden después del primer cuadro: sin salto al hidratar.
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => setListo(true));
    return () => {
      cancelAnimationFrame(cuadro);
      if (soltar.current) clearTimeout(soltar.current);
    };
  }, []);

  // En pantallas táctiles no hay hover: el relleno se ve mientras se toca.
  const alApoyar = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") return;
    if (soltar.current) clearTimeout(soltar.current);
    setPresionado(true);
  };
  const alSoltar = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") return;
    if (soltar.current) clearTimeout(soltar.current);
    soltar.current = window.setTimeout(() => setPresionado(false), DURACION_MS);
  };

  const t = listo ? TRANSICION : "";
  const clases = `group relative inline-flex w-fit cursor-pointer items-center overflow-hidden whitespace-nowrap rounded-full border border-(--btn-bg) bg-(--btn-bg) pr-[calc(var(--icono)+var(--margen)+1.25rem)] font-bold leading-none text-(--btn-text) focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta [--inset-y:calc((100%-var(--icono))/2)] ${TAMANOS[tamano]} ${className}`;
  const estilo = {
    "--btn-bg": bgColor,
    "--btn-text": textColor,
    "--btn-fill-bg": fillBgColor,
    "--btn-fill-text": fillTextColor,
    "--btn-arrow": arrowColor ?? fillTextColor,
  } as CSSProperties;

  const contenido = (
    <>
      <span className="relative z-1">{btnText}</span>

      {/* El círculo que se expande. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-[var(--inset-y)_var(--margen)_var(--inset-y)_calc(100%-var(--margen)-var(--icono))] z-2 rounded-full bg-(--btn-fill-bg) ${t} ${
          listo ? `transition-all ${RELLENO_ACTIVO}` : ""
        }`}
      />

      {/* Copia del texto en el color del relleno, recortada al círculo. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-2 flex items-center pl-[inherit] text-(--btn-fill-text) [clip-path:inset(var(--inset-y)_var(--margen)_var(--inset-y)_calc(100%-var(--margen)-var(--icono)))] ${t} ${
          listo ? `transition-all ${TEXTO_ACTIVO}` : ""
        }`}
      >
        {btnText}
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute right-(--margen) top-1/2 z-3 inline-flex size-(--icono) -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-(--btn-fill-bg) text-(--btn-arrow)"
      >
        <Flecha
          className={`absolute left-1/2 top-1/2 size-5 -translate-y-1/2 translate-x-[-170%] scale-0 ${t} ${
            listo ? `transition-transform ${FLECHA_ENTRA}` : ""
          }`}
        />
        <Flecha
          className={`absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 ${t} ${
            listo ? `transition-transform ${FLECHA_SALE}` : ""
          }`}
        />
      </span>
    </>
  );

  const comunes = {
    className: clases,
    style: estilo,
    "data-presionado": presionado ? "true" : "false",
    onPointerDown: alApoyar,
    onPointerUp: alSoltar,
    onPointerCancel: alSoltar,
  };

  if (resto.href !== undefined) {
    const { href, ...enlace } = resto as Omit<ComoEnlace, keyof Propias>;
    return (
      <a {...enlace} href={href} {...comunes}>
        {contenido}
      </a>
    );
  }
  const boton = resto as Omit<ComoBoton, keyof Propias>;
  return (
    <button type="button" {...boton} {...comunes}>
      {contenido}
    </button>
  );
}
