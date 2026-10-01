import type { Metadata } from "next";
import Link from "next/link";
import CabeceraAcademy from "@/components/academy/Cabecera";
import ListaTemplates from "@/components/academy/ListaTemplates";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { AVISO_EDUCATIVO } from "@/lib/essentials";
import { CONCEPTOS } from "@/lib/glosario";
import { DOCUMENTOS_LEGALES } from "@/lib/legales";
import { PLANTILLAS } from "@/lib/plantillas";

export const metadata: Metadata = {
  title: "Docs · Academy — Pecera",
  description: "Templates rellenables para tu Dataroom, documentos legales explicados y el glosario del ecosistema.",
};

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";

/** Academy → Docs: templates, documentos propios, legales y conceptos. */
export default function AcademyDocsPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />
        <CabeceraAcademy actual="docs" />

        <section id="templates" aria-labelledby="templates-titulo" className="mt-8 scroll-mt-24">
          <h2 id="templates-titulo" className={SUBTITULO}>
            Templates ({PLANTILLAS.length})
          </h2>
          <p className="mt-1 text-sm text-tinta/70">
            Documentos guiados por pasos. Se guardan solos en el Dataroom de tu empresa, privados hasta que decidas.
          </p>
          <div className="mt-3">
            <ListaTemplates />
          </div>
        </section>

        <section aria-labelledby="propios-titulo" className="mt-8">
          <h2 id="propios-titulo" className={SUBTITULO}>
            Tus documentos
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/cuenta/dataroom/nuevo?tipo=escrito" className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border border-tinta/10 px-4 py-3 hover:border-tinta/40">
              <span className="font-medium text-tinta">Escribir desde cero</span>
              <span className="text-xs text-tinta/60">Texto propio, con guardado automático</span>
            </Link>
            <Link href="/cuenta/dataroom/nuevo?tipo=link" className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border border-tinta/10 px-4 py-3 hover:border-tinta/40">
              <span className="font-medium text-tinta">Vincular un documento</span>
              <span className="text-xs text-tinta/60">Deck, planilla o PDF en Drive, Notion…</span>
            </Link>
          </div>
          <Link href="/cuenta/dataroom" className="mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-tinta px-4 text-marfil">
            <span className="font-medium">Abrir mi Dataroom</span>
            <span aria-hidden>&rarr;</span>
          </Link>
        </section>

        <section aria-labelledby="referencia-titulo" className="mt-8">
          <h2 id="referencia-titulo" className={SUBTITULO}>
            Para consultar
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <Link href="/docs/legales" className="flex flex-col gap-1 rounded-3xl bg-t-azul-suave px-5 py-4 text-t-azul transition-transform duration-200 ease-pecera hover:-translate-y-0.5">
                <span className="font-display text-xl font-semibold">Documentos legales</span>
                <span className="text-sm text-t-azul/85">
                  {DOCUMENTOS_LEGALES.length} documentos explicados: pacto de socios, vesting, SAFE, estatuto SAS, NDA, ESOP…
                </span>
              </Link>
            </li>
            <li>
              <Link href="/docs/conceptos" className="flex flex-col gap-1 rounded-3xl bg-tinta px-5 py-4 text-marfil transition-transform duration-200 ease-pecera hover:-translate-y-0.5">
                <span className="font-display text-xl font-semibold">Conceptos</span>
                <span className="text-sm text-marfil/75">
                  {CONCEPTOS.length} términos con ejemplos, con buscador: churn, CAC, MOAT, SAFE, cliff…
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-tinta/60">{AVISO_EDUCATIVO}</p>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
