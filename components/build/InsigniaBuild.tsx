/**
 * Insignia de Build in Public: ámbar "obra", para distinguir el progreso de una
 * startup del Pitch (celeste). Misma forma y tamaño que InsigniaPitch.
 */
export default function InsigniaBuild({ grande = false, className = "" }: { grande?: boolean; className?: string }) {
  return (
    <span
      className={`ui-fija inline-flex shrink-0 items-center gap-1 rounded-full bg-obra font-sans font-bold uppercase leading-none tracking-[0.1em] text-tinta ${
        grande ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[0.6875rem]"
      } ${className}`}
    >
      <svg aria-hidden viewBox="0 0 12 12" className={grande ? "size-3" : "size-2.5"}>
        <rect x="1" y="7" width="3" height="4" rx="0.6" fill="currentColor" />
        <rect x="4.5" y="4" width="3" height="7" rx="0.6" fill="currentColor" />
        <rect x="8" y="1" width="3" height="10" rx="0.6" fill="currentColor" />
      </svg>
      Build in Public
    </span>
  );
}
