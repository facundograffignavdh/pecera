import Image from "next/image";
import Link from "next/link";
import BotonCopiar from "@/components/BotonCopiar";
import { urlPerfil } from "@/lib/cuenta";

/**
 * Tu tarjeta NFC: a qué dirección lleva, para copiarla o grabarla, y cómo probarla.
 * La dirección no cambia nunca (el slug es fijo), así la tarjeta impresa no se rompe.
 */
export default function TarjetaNFC({ slug, completo }: { slug: string; completo: number | null }) {
  const url = urlPerfil(slug);
  return (
    <section
      aria-labelledby="tarjeta-nfc"
      className="tema-fijo overflow-hidden rounded-[2rem] border border-tinta/10 bg-[#f5f4ec] text-tinta shadow-[0_18px_50px_rgb(28_27_22/0.10)]"
    >
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
        <div className="flex flex-col gap-3 px-6 pb-2 pt-6 sm:pb-6">
          <p className="self-start rounded-full bg-[#f87c43] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Tu tarjeta NFC
          </p>
          <h2 id="tarjeta-nfc" className="font-display text-3xl font-semibold leading-tight lg:text-2xl">
            Acercás el celu y abre tu perfil
          </h2>
          <p className="text-sm leading-relaxed text-tinta/75">
            La tarjeta lleva a esta dirección. No cambia nunca: aunque edites todo, la tarjeta sigue andando.
          </p>
          <p className="break-all rounded-2xl bg-tinta/[0.06] px-3.5 py-2.5 font-mono text-sm">{url}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar
              texto={url}
              etiqueta="Copiar dirección"
              className="boton inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-sm font-semibold text-marfil"
            />
            <Link
              href={`/p/${slug}`}
              className="boton inline-flex min-h-11 items-center rounded-full border border-tinta/30 px-4 text-sm font-semibold text-tinta hover:border-tinta"
            >
              Ver cómo la ven
            </Link>
          </div>
          {completo !== null && completo < 80 && (
            <p className="text-sm text-t-arcilla">
              Tu perfil está al <strong className="font-semibold">{completo}%</strong>: completalo antes de repartir la
              tarjeta.
            </p>
          )}
        </div>
        <Image
          src="/nfc/tarjeta-mano.webp"
          alt="Una mano sosteniendo la tarjeta NFC naranja de Pecera"
          width={900}
          height={900}
          // El fondo blanco de la foto se funde con el marfil.
          className="mx-auto -mb-4 w-56 mix-blend-multiply sm:mb-0 sm:w-64 lg:-mb-4 lg:w-44"
        />
      </div>
    </section>
  );
}
