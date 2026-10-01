/**
 * Newsletter: Pecera guarda solo el link (Substack u otra plataforma). Límites
 * espejo de los CHECK de `perfil_newsletter`.
 */
export const LIMITES_NEWSLETTER = { url: 300, titulo: 80 } as const;

export type NewsletterLink = { url: string; titulo: string | null };

/** "raizverde.substack.com" para mostrar; el link completo va en el href. */
export function hostNewsletter(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const esSubstack = (url: string) => /(^|\.)substack\.com$/i.test(hostNewsletter(url));
