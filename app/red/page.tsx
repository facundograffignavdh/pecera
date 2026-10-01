import type { Metadata } from "next";
import Encabezado from "@/components/Encabezado";
import ListaRed from "@/components/ListaRed";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";

export const metadata: Metadata = {
  title: "Mi red — Pecera",
  robots: { index: false },
};

/** Los perfiles que seguís. Vive en el celular: no hace falta cuenta. */
export default function RedPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-tinta">Mi red</h1>
        <p className="mt-2 max-w-xl leading-relaxed text-tinta/75">
          Los perfiles que seguís o guardaste. Sus pitches nuevos aparecen en la pestaña Stakeholding del feed. Se
          guarda en este celular.
        </p>
        <ListaRed />
        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
