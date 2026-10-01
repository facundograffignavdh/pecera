/** Límites espejo de los CHECK de newsletters y newsletter_ediciones. */
export const LIMITES_NEWSLETTER = {
  titulo: 80,
  descripcion: 280,
  tituloEdicion: 120,
  cuerpo: 6000,
} as const;

export type Edicion = {
  id: string;
  titulo: string;
  cuerpo: string;
  publicada_at: string;
};

export type Newsletter = {
  titulo: string;
  descripcion: string | null;
};

const FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function fechaEdicion(iso: string): string {
  return FECHA.format(new Date(iso));
}

/** El cuerpo es texto plano: los párrafos se separan con una línea en blanco. */
export function parrafos(cuerpo: string): string[] {
  return cuerpo
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
