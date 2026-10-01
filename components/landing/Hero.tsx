import Link from "next/link";
import "@/components/landing/titular.css";
import BotonForm from "@/components/landing/BotonForm";
import EcosistemaVivo from "@/components/landing/EcosistemaVivo";
import { EVENTO_ACTUAL, momentoEvento } from "@/lib/eventos";
import { FEED_DESDE_LANDING } from "@/lib/landing";
import CausticPool, { type CausticParams } from "@/components/ui/caustic-pool";
import { boton } from "@/lib/ui";

/**
 * El agua del fondo: "deep-ocean" bajado de exposición para que el texto Marfil
 * lea sin pelear con las vetas, y con destellos cálidos (Naranja suave) que
 * enlazan con la marca. Constante de módulo: así `params` no cambia entre
 * renders y el agua nunca se reinicia.
 */
const AGUA: Partial<CausticParams> = {
  exposure: 1.1,
  causticGain: 0.2,
  veinGain: 0.1,
  glintColor: [253, 227, 212],
  glintGain: 0.6,
  vigDark: 0.45,
}

const PARA_QUIEN = [
  { quien: "Startups", que: "Pitch, empresa, avances y ronda", punto: "bg-arcilla" },
  { quien: "Inversores", que: "Tesis, portfolio y deal flow temprano", punto: "bg-inversor" },
  { quien: "Aliados", que: "Servicios, casos y startups para acompañar", punto: "bg-aliado" },
];

/**
 * Primer pantallazo: qué es (el titular), para quién (la bajada y los tres
 * roles), por qué (contacto directo, gratis) y qué hacer (un CTA). El producto se
 * ve al lado, vivo. El h1 no se anima: es lo primero que se pinta (LCP).
 */
export default function Hero() {
  const momento = momentoEvento(EVENTO_ACTUAL);
  const feria = momento !== "terminado";
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative isolate overflow-hidden bg-tinta px-5 pb-16 pt-[calc(max(0.75rem,env(safe-area-inset-top))+5.25rem)] sm:px-8 lg:pb-24"
    >
      {/* Agua con cáusticas que se revuelve al pasar el mouse o arrastrar el dedo.
          Es decoración (aria-hidden); el contenido va encima y deja pasar el puntero. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <CausticPool preset="deep-ocean" params={AGUA} height="100%" resolution={256} />
        {/* Velo a la izquierda (donde va el texto) y fundido a Marfil abajo. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(28_27_22/0.62),rgb(28_27_22/0.18)_60%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-marfil to-transparent" />
      </div>
      <div className="pointer-events-none mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-10">
        <div className="max-w-xl text-marfil [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {feria ? (
            <Link
              href={`/eventos/${EVENTO_ACTUAL.slug}`}
              className="entrada group inline-flex min-h-9 items-center gap-2 rounded-full border border-marfil/25 bg-tinta/50 py-1 pl-2 pr-3.5 text-sm font-medium text-marfil backdrop-blur-sm transition-colors duration-[var(--duracion)] ease-pecera hover:border-marfil/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-marfil px-2 py-0.5 text-xs font-semibold text-tinta">
                <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-pecera" />
                {momento === "proximo" ? "Se viene" : "Ahora"}
              </span>
              {EVENTO_ACTUAL.nombre} · 7, 8 y 9 de octubre
              <span aria-hidden className="transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-0.5">
                &rarr;
              </span>
            </Link>
          ) : (
            <p className="entrada inline-flex items-center gap-2 rounded-full border border-marfil/25 bg-tinta/50 px-3.5 py-1 text-sm font-medium text-marfil/90 backdrop-blur-sm">
              <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-aliado" />
              Beta abierta · Latinoamérica · Gratis
            </p>
          )}

          <h1
            id="hero-titulo"
            className="mt-6 font-display text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.02em] text-balance sm:text-6xl lg:text-[4.4rem]"
          >
            <span className="sr-only">Construí, fondeá e invertí en startups.</span>
            <span aria-hidden>
              <span className="rota-palabras text-naranja">
                <span>Construí</span>
                <span>Fondeá</span>
                <span>Invertí en</span>
              </span>{" "}
              startups
            </span>
          </h1>
          <p
            className="entrada mt-6 max-w-[34rem] text-lg leading-relaxed text-marfil/90 text-pretty sm:text-xl"
            style={{ animationDelay: "120ms" }}
          >
            Startups, inversores y aliados de Latinoamérica en un solo lugar. Mostrá lo que construís con un pitch de
            90&nbsp;segundos, encontrá con quién crecer y escribile directo.
          </p>

          <div
            data-cta-zona
            className="entrada mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "220ms" }}
          >
            <BotonForm />
            <Link href={FEED_DESDE_LANDING} className={`${boton("secundario", "lg")} min-h-14 border-marfil/45! px-7 text-[17px] text-marfil! hover:border-marfil! hover:bg-marfil/10`}>
              Mirá los pitches
            </Link>
          </div>
          <p className="entrada mt-4 text-sm text-marfil/80" style={{ animationDelay: "300ms" }}>
            Gratis · Entrás con Google · Tu perfil en 2 minutos
          </p>

          <ul
            aria-label="Para quién es Pecera"
            className="entrada mt-10 grid gap-x-6 gap-y-3 border-t border-marfil/20 pt-6 sm:grid-cols-3"
            style={{ animationDelay: "380ms" }}
          >
            {PARA_QUIEN.map((p) => (
              <li key={p.quien} className="flex gap-2.5 sm:flex-col sm:gap-1">
                <span className="flex items-center gap-2 font-semibold text-marfil">
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${p.punto}`} />
                  {p.quien}
                </span>
                <span className="text-sm leading-snug text-marfil/80">{p.que}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-auto mx-auto w-full max-w-[34rem] lg:max-w-none">
          <EcosistemaVivo />
        </div>
      </div>
    </section>
  );
}
