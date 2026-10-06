import type { Metadata } from "next";
import { Suspense } from "react";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import PestanasCofundadores from "@/components/cofundadores/PestanasCofundadores";
import { getCofundadores, getIdsParticipantes, getNetworking } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cofundadores y networking — Pecera",
  description:
    "Encontrá socio/a para tu proyecto y hacé networking en la Feria 21: qué buscás, qué ofrecés y con quién encajás.",
};

/**
 * Cofundadores y Networking. Estática (ISR, 1 minuto): las listas vienen con la página y lo
 * personal (tu perfil, tus conexiones, si participás de la feria) se pide en el navegador.
 */
export default async function CofundadoresPage() {
  const [cofundadores, networking, idsFeria] = await Promise.all([
    getCofundadores(),
    getNetworking(),
    getIdsParticipantes(EVENTO_ACTUAL.slug),
  ]);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />
        {/* Lee ?ver=, ?alcance= y ?editar= en el navegador: la página sigue estática. */}
        <Suspense fallback={<p className="mt-6 text-sm text-tinta/70">Cargando…</p>}>
          <PestanasCofundadores cofundadores={cofundadores} networking={networking} idsFeria={idsFeria} />
        </Suspense>
        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
