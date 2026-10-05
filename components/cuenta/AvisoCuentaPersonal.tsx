import { IconoPersona } from "@/components/Iconos";

/**
 * "Tu cuenta es personal", antes de crearla (pantalla de entrar y alta): como en
 * LinkedIn, primero el perfil de la persona y después el emprendimiento, como una
 * empresa de la que forma parte con su rol. Así nadie crea la cuenta a nombre del
 * proyecto.
 */
export default function AvisoCuentaPersonal() {
  return (
    <section aria-labelledby="aviso-personal-titulo" className="flex flex-col gap-4 rounded-3xl border border-tinta/12 bg-tinta/[0.03] px-4 py-4">
      <div className="flex flex-col gap-1">
        <h2 id="aviso-personal-titulo" className="font-display text-lg font-semibold leading-tight text-tinta">
          Tu cuenta es tuya, no de tu emprendimiento
        </h2>
        <p className="text-sm leading-relaxed text-tinta/80">Pecera funciona como LinkedIn: primero vos, después tu proyecto.</p>
      </div>

      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <li className="flex flex-1 items-start gap-3 rounded-2xl bg-marfil px-3 py-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-arcilla text-marfil">
            <IconoPersona className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta/65">1 · Ahora</span>
            <span className="font-semibold leading-snug text-tinta">Tu perfil personal</span>
            <span className="text-sm leading-snug text-tinta/75">Con tu nombre, tu foto y tu rol.</span>
          </span>
        </li>
        <li aria-hidden className="flex items-center justify-center text-tinta/50 sm:px-1">
          <span className="sm:hidden">↓</span>
          <span className="hidden sm:inline">→</span>
        </li>
        <li className="flex flex-1 items-start gap-3 rounded-2xl bg-marfil px-3 py-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-tinta/30 font-display text-lg font-semibold text-tinta/70">
            E
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta/65">2 · Después</span>
            <span className="font-semibold leading-snug text-tinta">Tu emprendimiento, como empresa</span>
            <span className="text-sm leading-snug text-tinta/75">
              Lo creás desde tu perfil (con su logo) y figurás con tu rol: CEO, cofundador/a… Tu equipo se suma igual.
            </span>
          </span>
        </li>
      </ol>
    </section>
  );
}
