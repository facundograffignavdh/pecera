import Link from "next/link";
import BotonForm from "@/components/landing/BotonForm";
import AguaHero from "@/components/landing/AguaHero";
import EcosistemaVivo from "@/components/landing/EcosistemaVivo";
import { EVENTO_ACTUAL, momentoEvento } from "@/lib/eventos";
import { FEED_DESDE_LANDING } from "@/lib/landing";
import { boton } from "@/lib/ui";

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
      className="grano relative isolate overflow-hidden px-5 pb-16 pt-[calc(max(0.75rem,env(safe-area-inset-top))+5.25rem)] sm:px-8 lg:pb-24"
    >
      {/* En escritorio, agua de fondo; en el celular no se carga. */}
      <AguaHero />
      {/* Luz cálida detrás del ecosistema: profundidad sin dibujar agua. */}
      <div
        aria-hidden
        className="absolute -right-[20%] top-[8%] -z-10 aspect-square w-[min(90vw,920px)] rounded-full bg-[radial-gradient(closest-side,rgb(253_227_212/0.9),rgb(253_227_212/0.35)_55%,transparent)]"
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-10">
        {/* En escritorio, panel suave sobre el agua: el contraste lo da su Marfil al 0,80
            (medido contra el píxel más oscuro del agua); el margen negativo deja el texto
            donde estaba. */}
        <div className="max-w-xl lg:-m-6 lg:max-w-[calc(36rem+3rem)] lg:rounded-[2rem] lg:bg-[rgb(245_244_236/0.8)] lg:p-6 lg:backdrop-blur-md">
          {feria ? (
            <Link
              href={`/eventos/${EVENTO_ACTUAL.slug}`}
              className="entrada group inline-flex min-h-9 items-center gap-2 rounded-full border border-tinta/15 bg-marfil/80 py-1 pl-2 pr-3.5 text-sm font-medium text-tinta transition-colors duration-[var(--duracion)] ease-pecera hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-tinta px-2 py-0.5 text-xs font-semibold text-marfil">
                <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-pecera" />
                {momento === "proximo" ? "Se viene" : "Ahora"}
              </span>
              {EVENTO_ACTUAL.nombre} · 7, 8 y 9 de octubre
              <span aria-hidden className="transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-0.5">
                &rarr;
              </span>
            </Link>
          ) : (
            <p className="entrada inline-flex items-center gap-2 rounded-full border border-tinta/15 bg-marfil/80 px-3.5 py-1 text-sm font-medium text-tinta/80">
              <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-aliado" />
              Beta abierta · Latinoamérica · Gratis
            </p>
          )}

          <h1
            id="hero-titulo"
            className="mt-6 font-display text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.02em] text-balance sm:text-6xl lg:text-[4.4rem]"
          >
            Donde el ecosistema emprendedor <em className="font-semibold text-arcilla">se encuentra</em>.
          </h1>
          <p
            className="entrada mt-6 max-w-[34rem] text-lg leading-relaxed text-tinta/80 text-pretty sm:text-xl"
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
            <Link href={FEED_DESDE_LANDING} className={`${boton("secundario", "lg")} min-h-14 px-7 text-[17px]`}>
              Mirá los pitches
            </Link>
          </div>
          <p className="entrada mt-4 text-sm text-tinta/65" style={{ animationDelay: "300ms" }}>
            Gratis · Entrás con Google · Tu perfil en 2 minutos
          </p>

          <ul
            aria-label="Para quién es Pecera"
            className="entrada mt-10 grid gap-x-6 gap-y-3 border-t border-tinta/12 pt-6 sm:grid-cols-3"
            style={{ animationDelay: "380ms" }}
          >
            {PARA_QUIEN.map((p) => (
              <li key={p.quien} className="flex gap-2.5 sm:flex-col sm:gap-1">
                <span className="flex items-center gap-2 font-semibold text-tinta">
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${p.punto}`} />
                  {p.quien}
                </span>
                <span className="text-sm leading-snug text-tinta/70">{p.que}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-[34rem] lg:max-w-none">
          <EcosistemaVivo />
        </div>
      </div>
    </section>
  );
}
