import type { ReactNode } from "react";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";

export const CONTACTO_PRIVACIDAD = "facundo.graffigna.vdh@gmail.com";

export const CLASE_ENLACE =
  "font-medium text-tinta underline underline-offset-4 transition-colors duration-200 ease-pecera hover:text-arcilla";

type Indice = { id: string; titulo: string }[];

/**
 * Armado común de /privacidad y /terminos: estático, sin cookies (el Encabezado
 * solo lee la sesión en el cliente). Las secciones van como `Seccion`, con el
 * mismo id que en el índice.
 */
export default function PaginaLegal({
  titulo,
  actualizado,
  actualizadoIso,
  intro,
  indice,
  children,
}: {
  titulo: string;
  /** Fecha legible, p. ej. "28 de septiembre de 2026". */
  actualizado: string;
  actualizadoIso: string;
  intro: ReactNode;
  indice: Indice;
  children: ReactNode;
}) {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />

        <header className="mt-6 flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
            {titulo}
          </h1>
          <p className="text-sm text-tinta/70">
            Última actualización: <time dateTime={actualizadoIso}>{actualizado}</time>
          </p>
        </header>

        <div className="mt-5 flex flex-col gap-3 leading-relaxed text-tinta/90">{intro}</div>

        <nav aria-label="En esta página" className="mt-6 rounded-2xl bg-tinta/5 px-4 py-3">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-tinta">
            {indice.map(({ id, titulo: t }) => (
              <li key={id}>
                <a href={`#${id}`} className="underline-offset-4 hover:text-arcilla hover:underline">
                  {t}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-2 flex flex-col">{children}</div>

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

export function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mt-8 scroll-mt-24">
      <h2 id={`${id}-titulo`} className="font-display text-xl font-semibold leading-snug text-tinta">
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed text-tinta/90 [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
