import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { EVENTOS } from "@/lib/eventos";

export const metadata: Metadata = {
  title: "Eventos — Pecera",
  description: "Ferias, hackathons y demo days donde está Pecera.",
};

/** Lista de eventos. Por ahora uno solo: la Feria 21. */
export default function EventosPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-tinta">Eventos</h1>
        <p className="mt-2 text-tinta/80">Ferias, hackathons y demo days donde está Pecera.</p>
        <ul className="mt-6 flex flex-col gap-3">
          {EVENTOS.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/eventos/${e.slug}`}
                className="block rounded-3xl bg-tinta px-5 py-5 text-marfil transition-transform duration-200 ease-pecera hover:-translate-y-0.5"
              >
                <span className="inline-flex rounded-full bg-arcilla px-2.5 py-0.5 text-xs font-medium">
                  Ahora
                </span>
                <span className="mt-3 block font-display text-3xl font-semibold leading-none">{e.nombre}</span>
                <span className="mt-2 block text-sm text-marfil/80">{e.fechas}</span>
                <span className="mt-1 block text-sm text-marfil/60">{e.lugar}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Programa y votación <span aria-hidden>&rarr;</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-tinta/60">
          ¿Organizás una feria o una hackathon y querés usar Pecera? Escribinos.
        </p>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
