import Link from "next/link";
import BotonSuscribir from "@/components/newsletter/BotonSuscribir";
import type { DatosNewsletter } from "@/lib/datos";
import { fechaEdicion } from "@/lib/newsletter";

/** La newsletter en el perfil: qué es, la última edición y el botón para suscribirse. */
export default function NewsletterPerfil({ slug, datos }: { slug: string; datos: DatosNewsletter }) {
  const { newsletter, ediciones, suscriptores } = datos;
  const ultima = ediciones[0];
  return (
    <div data-revelar className="mt-3 flex flex-col gap-4 rounded-3xl border border-tinta/10 bg-tinta/[0.03] p-4">
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-semibold leading-tight text-tinta">{newsletter.titulo}</p>
        {newsletter.descripcion && <p className="text-sm leading-relaxed text-tinta/80">{newsletter.descripcion}</p>}
      </div>
      {ultima ? (
        <Link
          href={`/p/${slug}/newsletter#${ultima.id}`}
          className="flex flex-col gap-0.5 rounded-2xl bg-marfil px-4 py-3 transition-colors duration-200 ease-pecera hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        >
          <span className="text-xs text-tinta/60">Última edición · {fechaEdicion(ultima.publicada_at)}</span>
          <span className="font-medium text-tinta">{ultima.titulo}</span>
        </Link>
      ) : (
        <p className="text-sm text-tinta/70">Todavía no hay ediciones publicadas.</p>
      )}
      <BotonSuscribir slug={slug} total={suscriptores} />
      {ediciones.length > 0 && (
        <Link href={`/p/${slug}/newsletter`} className="self-start text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
          {ediciones.length === 1 ? "Leer la edición" : `Leer las ${ediciones.length} ediciones`}
        </Link>
      )}
    </div>
  );
}
