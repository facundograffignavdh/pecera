import type { Metadata } from "next";
import { Suspense } from "react";
import Encabezado from "@/components/Encabezado";
import Explorar from "@/components/explorar/Explorar";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { getDirectorio } from "@/lib/explorar";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explorar startups, inversores y aliados — Pecera",
  description: "Directorio del ecosistema: startups, inversores por tesis y portfolio, y aliados por servicio y experiencia.",
};

/**
 * Directorio del ecosistema. Estático (ISR, 1 minuto): los datos vienen con la
 * página y el filtro corre en el celular, sin una consulta por tecla. La URL guarda
 * la búsqueda (?q=…&ver=…) para compartirla.
 */
export default async function ExplorarPage() {
  const fichas = await getDirectorio();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />
        <header className="mt-6 flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Explorar</h1>
          <p className="leading-relaxed text-tinta/80">
            Startups, inversores y aliados. Buscá por lo que hacen y por con quién trabajaron.
          </p>
        </header>
        <div className="mt-6">
          {/* Lee ?q= y ?ver= en el navegador: la página sigue estática. */}
          <Suspense fallback={<p className="text-sm text-tinta/60">Cargando el directorio…</p>}>
            <Explorar fichas={fichas} />
          </Suspense>
        </div>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
