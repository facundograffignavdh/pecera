import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import ListaCofundadores from "@/components/explorar/ListaCofundadores";
import { getCofundadores } from "@/lib/datos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cofundadores — Pecera",
  description: "Encontrá socio/a para tu proyecto: técnicos, negocio, producto, diseño y ciencia.",
};

export default async function CofundadoresPage() {
  const perfiles = await getCofundadores();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />
        <header className="aparecer mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-arcilla">Cofounder match</p>
            <h1 className="mt-1 font-display text-4xl font-semibold leading-tight text-tinta sm:text-5xl">
              Encontrá a tu socio/a
            </h1>
            <p className="mt-3 leading-relaxed text-tinta/75">
              Como el Co-Founder Matching de YC, pero para el ecosistema de acá. Cada uno cuenta qué aporta y qué perfil le
              falta. Filtrá, mirá su pitch y escribile.
            </p>
          </div>
          <Link
            href="/cuenta"
            className="boton inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-tinta px-6 font-medium text-marfil"
          >
            Quiero aparecer acá
          </Link>
        </header>

        <div className="mt-8">
          {perfiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-tinta/20 px-6 py-12 text-center">
              <p className="font-display text-2xl font-semibold text-tinta">Todavía nadie se sumó al match</p>
              <p className="max-w-sm text-sm text-tinta/70">
                Sé el primero: en tu perfil, paso 3, prendé «Busco cofundador/a» y contá qué aportás y qué buscás.
              </p>
            </div>
          ) : (
            <ListaCofundadores perfiles={perfiles} />
          )}
        </div>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
