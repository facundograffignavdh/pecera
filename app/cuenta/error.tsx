"use client";

import { useEffect } from "react";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";

/** Si /cuenta se rompe, un mensaje y la salida: nunca una pantalla trabada. */
export default function ErrorCuenta({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <EnlaceVolver href="/" />
        <section role="alert" className="mt-8 flex flex-col gap-4">
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
            Algo salió mal
          </h1>
          <p className="leading-relaxed text-tinta/80">
            No pudimos cargar tu perfil. Si estabas guardando cambios, recargá: si se
            guardaron, los vas a ver.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-naranja px-6 font-semibold text-tinta transition-[background-color,transform] duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
          >
            Probar de nuevo
          </button>
        </section>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
