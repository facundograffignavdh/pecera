import type { CSSProperties, ReactNode } from "react";

/**
 * Piezas de la landing: la sección con su número editorial ("01 — El problema"),
 * el título que entra palabra por palabra y los íconos chicos. Todo server.
 */

/** Título que entra palabra por palabra al revelarse su bloque. */
export function Palabras({ texto }: { texto: string }) {
  const palabras = texto.split(" ");
  return (
    <>
      {palabras.map((p, i) => (
        <span key={i}>
          <span className="palabra" style={{ "--i": i } as CSSProperties}>
            {p}
          </span>
          {i < palabras.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

/** "01 — El problema": número en Fraunces y rótulo en versalitas. */
export function Etiqueta({
  numero,
  children,
  clara = false,
}: {
  numero?: string;
  children: ReactNode;
  clara?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] ${
        clara ? "text-marfil/70" : "text-tinta/65"
      }`}
    >
      {numero && (
        <span className={`font-display text-sm normal-case tracking-normal ${clara ? "text-pecera" : "text-naranja-texto"}`}>
          {numero}
        </span>
      )}
      <span aria-hidden className={`h-px w-8 ${clara ? "bg-marfil/30" : "bg-tinta/25"}`} />
      {children}
    </p>
  );
}

export function Seccion({
  id,
  numero,
  etiqueta,
  titulo,
  bajada,
  children,
  className = "",
  oscura = false,
}: {
  id: string;
  numero?: string;
  etiqueta: string;
  titulo: string;
  bajada?: ReactNode;
  children: ReactNode;
  className?: string;
  oscura?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 ${oscura ? "bg-tinta text-marfil" : ""} ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div data-revelar className="max-w-3xl">
          <Etiqueta numero={numero} clara={oscura}>
            {etiqueta}
          </Etiqueta>
          <h2
            id={`${id}-titulo`}
            className="mt-4 font-display text-[2.05rem] font-semibold leading-[1.06] tracking-[-0.01em] text-balance sm:text-[3.2rem]"
          >
            <Palabras texto={titulo} />
          </h2>
          {bajada && (
            <p className={`mt-5 max-w-2xl text-lg leading-relaxed text-pretty ${oscura ? "text-marfil/80" : "text-tinta/75"}`}>
              {bajada}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Flecha({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Tilde({ className = "", tamano = "size-[18px]" }: { className?: string; tamano?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`${tamano} shrink-0 ${className}`}>
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Los dos peces del isotipo que se encuentran (la firma). Decorativo. */
export function Peces({ className = "", ondas = false }: { className?: string; ondas?: boolean }) {
  return (
    <span aria-hidden className={`relative block ${className}`}>
      {ondas && (
        <span className="ondas absolute inset-0">
          <span />
          <span />
          <span />
        </span>
      )}
      <span className="peces block">
        <span className="pez-izq" />
        <span className="pez-der" />
      </span>
    </span>
  );
}
