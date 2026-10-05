import { entrar } from "@/app/cuenta/acciones";
import AvisoEntrar from "@/components/AvisoEntrar";
import { Etiqueta } from "@/components/landing/Seccion";

// Después de entrar con Google, directo al template de Fundraising (la ronda, el
// instrumento y la valuación o cap). Sin empresa, esa página explica cómo crearla.
const DESTINO = "/cuenta/dataroom/plantilla/fundraising";

export function LogoGoogle({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/**
 * "Valuá tu startup": banda oscura bien arriba que lleva a entrar con Google y,
 * de ahí, al template guiado de Fundraising. Pecera no calcula la valuación: el
 * template ayuda a definir el monto, el instrumento y la valuación o cap, con las
 * lecciones y el glosario al lado. La maqueta es un ejemplo y lo dice.
 */
export default function ValuaStartup() {
  return (
    <section aria-labelledby="valua-titulo" className="px-3 sm:px-5">
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] bg-tinta px-6 py-12 text-marfil sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(244_124_60/0.35),transparent)]" />
        <div className="relative">
          <Etiqueta clara>Fundraising · Gratis</Etiqueta>
          <h2 id="valua-titulo" className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-6xl">
            Valuá tu <em className="text-pecera">startup</em>.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-marfil/80 text-pretty">
            Definí cuánto buscás, con qué instrumento y a qué valuación o cap, paso a paso y con cada concepto
            explicado. Queda en tu Dataroom, privado hasta que decidas mostrarlo.
          </p>
          <form action={entrar} className="mt-8">
            <input type="hidden" name="next" value={DESTINO} />
            <button
              type="submit"
              className="inline-flex min-h-14 items-center gap-3 rounded-full bg-marfil px-7 text-[17px] font-bold text-tinta shadow-[0_10px_30px_rgb(0_0_0/0.3)] transition-[scale,background-color] duration-[var(--duracion)] ease-pecera hover:bg-white/95 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-pecera active:scale-[0.98]"
            >
              <LogoGoogle />
              Empezar con Google
            </button>
            <div className="mt-3 max-w-md">
              <AvisoEntrar tono="oscuro" />
            </div>
          </form>
          <p className="mt-3 text-sm text-marfil/65">Entrás con tu cuenta de Google. Sin contraseñas nuevas.</p>
        </div>

        <figure aria-hidden className="relative rounded-[var(--radius-bloque)] bg-marfil p-5 text-tinta shadow-[0_24px_60px_rgb(0_0_0/0.35)] sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Fundraising · La ronda de hoy</p>
            <span className="rounded-full bg-naranja-suave px-2.5 py-0.5 text-xs font-semibold text-naranja-texto">Ejemplo</span>
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= 2 ? "bg-naranja" : "bg-tinta/15"}`} />
            ))}
          </div>
          <dl className="mt-5 grid gap-3">
            {[
              ["¿Cuánto buscan?", "USD 150.000"],
              ["Instrumento", "SAFE"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-tinta/15 px-4 py-2.5">
                <dt className="text-xs text-tinta/65">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
            <div className="rounded-xl border-2 border-naranja px-4 py-2.5">
              <dt className="text-xs font-semibold text-naranja-texto">Valuación o cap</dt>
              <dd className="font-display text-2xl font-semibold">Cap USD 1,8 M post-money</dd>
            </div>
          </dl>
          <p className="mt-4 flex justify-between text-xs text-tinta/65">
            Paso 2 de 3 <span className="font-semibold text-aliado">✓ Guardado</span>
          </p>
        </figure>
      </div>
    </section>
  );
}
