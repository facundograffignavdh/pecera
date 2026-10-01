import Link from "next/link";
import { fechaEdicion } from "@/lib/newsletter";

export type Novedad = {
  id: string;
  slug: string;
  nombre: string;
  newsletter: string;
  titulo: string;
  publicada_at: string;
};

/**
 * Las últimas ediciones de las newsletters a las que la cuenta está suscripta. Es
 * cómo "llegan" las ediciones: Pecera no manda emails.
 */
export default function Novedades({ novedades }: { novedades: Novedad[] }) {
  if (novedades.length === 0) return null;
  return (
    <section aria-labelledby="novedades-titulo" className="flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5">
      <h2 id="novedades-titulo" className="font-display text-xl font-semibold leading-tight text-tinta">
        De tus suscripciones
      </h2>
      <ul className="flex flex-col gap-2">
        {novedades.slice(0, 6).map((n) => (
          <li key={n.id}>
            <Link
              href={`/p/${n.slug}/newsletter#${n.id}`}
              className="flex flex-col gap-0.5 rounded-2xl bg-marfil px-4 py-3 transition-colors duration-200 ease-pecera hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              <span className="text-xs text-tinta/60">
                {n.newsletter} · {n.nombre} · {fechaEdicion(n.publicada_at)}
              </span>
              <span className="font-medium text-tinta">{n.titulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
