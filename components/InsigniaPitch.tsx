/**
 * La insignia del formato Pitch: celeste, redondeada y en mayúsculas. Es la misma
 * en el feed, el perfil, la empresa y /cuenta, así un pitch se reconoce igual en
 * todos lados. Con `activa`, un brillo la recorre una vez (el reel en pantalla).
 */
export default function InsigniaPitch({
  grande = false,
  activa = false,
  className = "",
}: {
  grande?: boolean;
  activa?: boolean;
  className?: string;
}) {
  return (
    <span
      data-activa={activa || undefined}
      className={`insignia-pitch ui-fija inline-flex shrink-0 items-center gap-1 rounded-full bg-celeste font-sans font-bold uppercase leading-none tracking-[0.12em] text-tinta ${
        grande ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[0.6875rem]"
      } ${className}`}
    >
      <svg aria-hidden viewBox="0 0 12 12" className={grande ? "size-3" : "size-2.5"}>
        <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
      </svg>
      Pitch
    </span>
  );
}
