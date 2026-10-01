// Newsletter de Pecera en Substack (el link lo definió el equipo).
export const SUBSTACK_PECERA = "https://substack.com/@peceravc";

export function LogoSubstack({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#FF6719" d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
    </svg>
  );
}

/** Botón para suscribirse al newsletter de Pecera en Substack (pestaña nueva). */
export default function BotonSubstack({ className = "" }: { className?: string }) {
  return (
    <a
      href={SUBSTACK_PECERA}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex min-h-12 items-center gap-3 rounded-full border border-tinta/20 bg-marfil px-5 font-semibold text-tinta transition-[border-color,background-color] duration-[var(--duracion)] ease-pecera hover:border-[#FF6719] hover:bg-[#FF6719]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${className}`}
    >
      <LogoSubstack />
      Inscribite al newsletter de Pecera en Substack
      <span aria-hidden>↗</span>
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}
