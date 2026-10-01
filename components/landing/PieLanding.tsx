import Link from "next/link";
import PieLegal from "@/components/PieLegal";
import BotonSubstack from "@/components/landing/BotonSubstack";
import { EVENTO_ACTUAL } from "@/lib/eventos";

const COLUMNAS = [
  {
    titulo: "Pecera",
    links: [
      { href: "/", label: "Feed de pitches" },
      { href: "/explorar", label: "Explorar" },
      { href: `/eventos/${EVENTO_ACTUAL.slug}`, label: EVENTO_ACTUAL.nombre },
      { href: "/academy", label: "Academy" },
    ],
  },
  {
    titulo: "Explorar",
    links: [
      { href: "/explorar?ver=startups", label: "Startups" },
      { href: "/explorar?ver=inversores", label: "Inversores" },
      { href: "/explorar?ver=aliados", label: "Aliados" },
      { href: "/academy/docs", label: "Glosario y documentos" },
    ],
  },
  {
    titulo: "Tu cuenta",
    links: [
      { href: "/cuenta", label: "Entrar" },
      { href: "/subir", label: "Subir mi pitch" },
    ],
  },
];

/** Pie de la landing: solo links que existen, y el pie legal obligatorio. Es zona de CTA: ahí el CTA fijo se esconde para no tapar los links. */
export default function PieLanding() {
  return (
    <footer data-cta-zona className="px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-16 sm:px-8">
      <div className="mx-auto mb-12 flex w-full max-w-6xl flex-col items-start gap-4 rounded-[var(--radius-bloque)] bg-superficie p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="font-display text-2xl font-semibold">Lo que pasa en la Pecera, en tu mail.</p>
          <p className="mt-1 text-tinta/70">Novedades del ecosistema y de la plataforma.</p>
        </div>
        <BotonSubstack />
      </div>
      <nav aria-label="Pie de página" className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 border-b border-tinta/10 pb-12 sm:grid-cols-3">
        {COLUMNAS.map((c) => (
          <div key={c.titulo}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">{c.titulo}</p>
            <ul className="mt-3 flex flex-col">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-10 items-center text-[15px] text-tinta/80 transition-colors duration-[var(--duracion)] ease-pecera hover:text-naranja-texto">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <PieLegal tono="claro" className="mt-10" />
      <p className="mt-4 text-center text-xs text-tinta/65">Pecera · Nacida en Córdoba, para toda Latinoamérica</p>
    </footer>
  );
}
