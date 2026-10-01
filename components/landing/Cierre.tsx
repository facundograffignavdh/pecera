import Link from "next/link";
import BotonForm from "@/components/landing/BotonForm";
import { Etiqueta, Peces } from "@/components/landing/Seccion";
import VideoFondo from "@/components/landing/VideoFondo";

/**
 * Cierre: la firma vuelve (los peces se encuentran al aparecer la banda) sobre el
 * acuario apagado, con el lema de la marca y el mismo CTA de toda la página.
 */
export default function Cierre() {
  return (
    <section aria-labelledby="cierre-titulo" className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div
        data-revelar
        className="relative isolate mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-tinta px-6 py-20 text-center text-marfil sm:px-12 sm:py-28"
      >
        <VideoFondo
          src="/landing/pecera-hero.mp4"
          poster="/landing/pecera-hero-poster.jpg"
          className="cierre-video absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_50%_45%,rgb(28_27_22/0.55),rgb(28_27_22/0.92))]" />
        <Peces ondas className="mx-auto w-24 sm:w-28" />
        <div className="mt-8 flex justify-center">
          <Etiqueta clara>Sumate a la Pecera</Etiqueta>
        </div>
        <h2 id="cierre-titulo" className="mx-auto mt-4 max-w-3xl font-display text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.015em] text-balance sm:text-6xl">
          Las bocas cerradas no se alimentan.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-marfil/80 text-pretty">
          Mostrá lo que construís, lo que invertís o cómo ayudás. Es gratis y tu perfil está listo en 2 minutos.
        </p>
        <div data-cta-zona className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BotonForm />
          <Link
            href="/explorar"
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-marfil/30 px-7 font-semibold text-marfil transition-colors duration-[var(--duracion)] ease-pecera hover:border-marfil/70 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-marfil"
          >
            Explorá el ecosistema
          </Link>
        </div>
      </div>
    </section>
  );
}
