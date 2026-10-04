import type { ReactNode } from "react";
import { entrar } from "@/app/cuenta/acciones";
import AvisoEntrar from "@/components/AvisoEntrar";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";

/** Marco de las páginas de trabajo de /cuenta (Dataroom, editores, exportar). */
export default function Marco({
  volver,
  textoVolver,
  ancho = "max-w-md md:max-w-2xl lg:max-w-3xl",
  children,
}: {
  volver: string;
  textoVolver: string;
  ancho?: string;
  children: ReactNode;
}) {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className={`mx-auto w-full ${ancho} px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]`}>
        <div className="no-imprimir">
          <EnlaceVolver href={volver} texto={textoVolver} />
        </div>
        {children}
        <PieLegal tono="claro" className="no-imprimir mt-10 pb-8" />
      </div>
    </main>
  );
}

/** Sin sesión: entrar con Google y volver a esta misma página. */
export function SinSesion({ volverA, titulo }: { volverA: string; titulo: string }) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">{titulo}</h1>
      <p className="leading-relaxed text-tinta/80">Entrá con tu cuenta de Google para seguir.</p>
      <form action={entrar} className="flex flex-col items-start gap-3">
        <input type="hidden" name="next" value={volverA} />
        <button type="submit" className="inline-flex min-h-12 items-center rounded-full bg-naranja px-6 font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]">
          Entrar con Google
        </button>
        <AvisoEntrar />
      </form>
    </section>
  );
}

/** Sin empresa (o sin la migración): qué falta y adónde ir. */
export function SinEmpresa({ disponible }: { disponible: boolean }) {
  return (
    <section className="mt-8 flex flex-col gap-3 rounded-3xl border border-dashed border-tinta/25 px-5 py-6">
      <h1 className="font-display text-2xl font-semibold leading-tight text-tinta">
        {disponible ? "El Dataroom es de tu empresa" : "El Dataroom se está activando"}
      </h1>
      <p className="text-sm leading-relaxed text-tinta/80">
        {disponible
          ? "Creá tu empresa o sumate a la de tu equipo con su código en Mi perfil. Después vas a poder completar templates y armar tu Dataroom."
          : "Estamos actualizando Pecera. Probá de nuevo en un rato."}
      </p>
      {disponible && (
        <a href="/cuenta#tarjeta-mis-empresas" className="inline-flex min-h-11 items-center self-start rounded-full bg-naranja px-5 text-sm font-semibold text-tinta hover:bg-pecera active:scale-[0.98]">
          Ir a Mi perfil
        </a>
      )}
    </section>
  );
}
