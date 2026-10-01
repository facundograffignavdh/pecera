import { type NewsletterLink, esSubstack, hostNewsletter } from "@/lib/newsletter";

/**
 * La newsletter del perfil: un link a donde la publica (Substack u otra). Pecera no
 * la aloja: suscribirse y leer pasa allá, en otra pestaña.
 */
export default function NewsletterPerfil({ newsletter }: { newsletter: NewsletterLink }) {
  const substack = esSubstack(newsletter.url);
  return (
    <a
      href={newsletter.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-4 rounded-3xl border border-tinta/10 bg-tinta/[0.03] p-4 transition-colors duration-200 ease-pecera hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-tinta text-marfil">
        <svg viewBox="0 0 20 20" className="size-5">
          <rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="m3.5 5 6.5 5 6.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold leading-tight text-tinta">
          {newsletter.titulo ?? "Su newsletter"}
        </span>
        <span className="block truncate text-sm text-tinta/65">{hostNewsletter(newsletter.url)}</span>
        <span className="mt-1 block text-sm font-medium text-tinta">
          {substack ? "Leer y suscribirme en Substack" : "Leer y suscribirme"} <span aria-hidden>↗</span>
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </span>
      </span>
    </a>
  );
}
