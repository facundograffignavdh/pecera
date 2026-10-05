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

/** Ojo: vistas de un pitch. */
export function IconoVista({ className }: Props) {
  return (
    <Icono className={className}>
      <path d="M2.75 12S6.25 5.5 12 5.5 21.25 12 21.25 12 17.75 18.5 12 18.5 2.75 12 2.75 12z" />
      <circle cx="12" cy="12" r="2.75" />
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

/** Compartir: flecha que sale de una caja abierta. */
export function IconoCompartir({ className }: Props) {
  return (
    <Icono className={className}>
      <path d="M12 3.5v11M7.75 7.5 12 3.25l4.25 4.25" />
      <path d="M8 11H6.5a2 2 0 0 0-2 2v5.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2H16" />
    </Icono>
  );
}

/** Explorar: lupa. */
export function IconoExplorar({ className }: Props) {
  return (
    <Icono className={className}>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="M15.5 15.5 20 20" />
    </Icono>
  );
}

/** Eventos: calendario. */
export function IconoCalendario({ className }: Props) {
  return (
    <Icono className={className}>
      <rect x="3.75" y="5" width="16.5" height="15" rx="3" />
      <path d="M3.75 10h16.5M8.5 3v4M15.5 3v4" />
    </Icono>
  );
}

/** Más: subir un pitch. */
export function IconoMas({ className }: Props) {
  return (
    <Icono className={className} grosor={2.75}>
      <path d="M12 5v14M5 12h14" />
    </Icono>
  );
}

/** Cofundadores: dos personas. */
export function IconoCofundadores({ className }: Props) {
  return (
    <Icono className={className}>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3 19.5a6 6 0 0 1 12 0" />
      <path d="M15.5 5.5a3.25 3.25 0 0 1 0 6.25M17.5 14a6 6 0 0 1 3.5 5.5" />
    </Icono>
  );
}

/** Academy: libro abierto. */
export function IconoAcademy({ className }: Props) {
  return (
    <Icono className={className}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </Icono>
  );
}

/** Lápiz: editar una sección del perfil propio. */
export function IconoEditar({ className }: Props) {
  return (
    <Icono className={className}>
      <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Icono>
  );
}

/** Persona: acceso a "Entrar" / "Mi perfil". */
export function IconoPersona({ className }: Props) {
  return (
    <Icono className={className}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
    </Icono>
  );
}
