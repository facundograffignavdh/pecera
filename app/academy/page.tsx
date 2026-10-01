import type { Metadata } from "next";
import CabeceraAcademy from "@/components/academy/Cabecera";
import ListaEssentials from "@/components/academy/ListaEssentials";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { AVISO_EDUCATIVO, LECCIONES } from "@/lib/essentials";

export const metadata: Metadata = {
  title: "Academy — Pecera",
  description: "Startup Essentials: problema, mercado, modelo de negocio, métricas y fundraising, con templates para tu Dataroom.",
};

/** Academy → Startup Essentials. Estática; el progreso de la sesión llega al montar. */
export default function AcademyPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />
        <CabeceraAcademy actual="essentials" />
        <div className="mt-6">
          <ListaEssentials lecciones={LECCIONES} />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-tinta/60">{AVISO_EDUCATIVO}</p>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
