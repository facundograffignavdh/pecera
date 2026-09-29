import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { CONCEPTOS } from "@/lib/glosario";
import { DOCUMENTOS_LEGALES } from "@/lib/legales";
import { DATOS } from "@/lib/transparencia";

export const metadata: Metadata = {
  title: "Docs — Pecera",
  description: "Conceptos del ecosistema, documentos legales y cómo mostrar la transparencia de tu empresa.",
};

const SECCIONES = [
  {
    href: "/docs/conceptos",
    titulo: "Conceptos",
    bajada: `${CONCEPTOS.length} términos explicados con ejemplos: churn, CAC, MOAT, SAFE, cliff…`,
    clase: "bg-tinta text-marfil",
    detalle: "text-marfil/75",
  },
  {
    href: "/docs/legales",
    titulo: "Documentos legales",
    bajada: `${DOCUMENTOS_LEGALES.length} documentos: pacto de socios, vesting, SAFE, estatuto SAS, NDA, ESOP…`,
    clase: "bg-t-azul-suave text-t-azul",
    detalle: "text-t-azul/80",
  },
  {
    href: "/cuenta",
    titulo: "Transparencia de tu empresa",
    bajada: `Cargá ${DATOS.length} métricas y documentos. Todo es privado hasta que decidas compartirlo en la página de la empresa.`,
    clase: "bg-t-verde-suave text-t-verde",
    detalle: "text-t-verde/80",
  },
] as const;

export default function DocsPage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-tinta">Docs</h1>
        <p className="mt-2 leading-relaxed text-tinta/80">
          Lo que necesitás para hablar el idioma del ecosistema y tener los papeles en orden.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {SECCIONES.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={`flex flex-col gap-1.5 rounded-3xl px-5 py-5 transition-transform duration-200 ease-pecera hover:-translate-y-0.5 ${s.clase}`}
              >
                <span className="font-display text-2xl font-semibold leading-tight">{s.titulo}</span>
                <span className={`text-sm leading-relaxed ${s.detalle}`}>{s.bajada}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                  Entrar <span aria-hidden>&rarr;</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
