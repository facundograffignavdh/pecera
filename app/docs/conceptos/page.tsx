import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import BuscadorConceptos from "@/components/docs/BuscadorConceptos";
import { CONCEPTOS } from "@/lib/glosario";

export const metadata: Metadata = {
  title: "Conceptos — Docs de Pecera",
  description: `${CONCEPTOS.length} conceptos del ecosistema emprendedor explicados simple: métricas, finanzas, inversión, estrategia, producto y legales.`,
};

export default function ConceptosPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Docs
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-tinta">Conceptos</h1>
        <p className="mt-2 leading-relaxed text-tinta/80">
          El idioma del ecosistema, sin humo: qué es cada cosa y un ejemplo con números. Compartí
          cualquier definición con su link.
        </p>
        <div className="mt-6">
          <BuscadorConceptos />
        </div>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
