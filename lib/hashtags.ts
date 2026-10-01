/**
 * Hashtags de los pitches: "#Feria21" en la descripción del video suma el pitch a la
 * sección /t/feria21. Se normalizan sin tildes y en minúsculas, así "#FeriaVeintiuno"
 * y "#feriaveintiuno" son la misma sección.
 */

const PATRON = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{2,40})/gu;

export function normalizarTag(tag: string): string {
  return tag
    .replace(/^#/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

/** Hashtags de un texto, normalizados y sin repetir. */
export function hashtagsDe(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const tags = new Set<string>();
  for (const m of texto.matchAll(PATRON)) {
    const tag = normalizarTag(m[2]);
    if (tag.length >= 2) tags.add(tag);
  }
  return [...tags];
}

export type Fragmento = { tipo: "texto"; valor: string } | { tipo: "tag"; valor: string; tag: string };

/** Parte un texto en texto suelto y hashtags, para dibujar los tags como links. */
export function fragmentar(texto: string): Fragmento[] {
  const partes: Fragmento[] = [];
  let desde = 0;
  for (const m of texto.matchAll(PATRON)) {
    const inicio = (m.index ?? 0) + m[1].length;
    if (inicio > desde) partes.push({ tipo: "texto", valor: texto.slice(desde, inicio) });
    const tag = normalizarTag(m[2]);
    partes.push({ tipo: "tag", valor: `#${m[2]}`, tag });
    desde = inicio + m[2].length + 1;
  }
  if (desde < texto.length) partes.push({ tipo: "texto", valor: texto.slice(desde) });
  return partes;
}

/** El hashtag de la feria: el equipo lo pide en el Form de pitches. */
export const TAG_FERIA = "feria21";
