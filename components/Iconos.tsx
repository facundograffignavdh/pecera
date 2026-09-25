import type { ReactNode } from "react";

type Props = { className?: string };

/** Base común: mismo viewBox y mismo trazo grueso y redondeado en todos. */
function Icono({
  className = "",
  grosor = 2.25,
  children,
}: Props & { grosor?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

const TACHADO = "M4 4l16 16";

/** Corazón del Pique. Lleno: relleno del color actual. */
export function IconoCorazon({ lleno = false, className }: Props & { lleno?: boolean }) {
  return (
    <Icono className={className}>
      <path
        d="M12 20s-7.5-4.5-7.5-10.5A4.25 4.25 0 0 1 12 7a4.25 4.25 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z"
        fill={lleno ? "currentColor" : "none"}
      />
    </Icono>
  );
}

/** Parlante con ondas; silenciado: parlante tachado. */
export function IconoSonido({ silenciado, className }: Props & { silenciado: boolean }) {
  return (
    <Icono className={className}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {silenciado ? (
        <path d={TACHADO} />
      ) : (
        <>
          <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
          <path d="M18.5 6.5a8 8 0 0 1 0 11" />
        </>
      )}
    </Icono>
  );
}

/** Subtítulos (CC); apagado: tachado. */
export function IconoSubtitulos({ activo, className }: Props & { activo: boolean }) {
  return (
    <Icono className={className}>
      <rect x="2.75" y="5.5" width="18.5" height="13" rx="3.5" />
      <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6" />
      <path d="M17 10.2a2.2 2.2 0 1 0 0 3.6" />
      {!activo && <path d={TACHADO} />}
    </Icono>
  );
}

/** Cruz de cerrar: se dibuja chica, así que lleva un trazo más grueso. */
export function IconoCerrar({ className }: Props) {
  return (
    <Icono className={className} grosor={3}>
      <path d="M7 7l10 10M17 7 7 17" />
    </Icono>
  );
}
