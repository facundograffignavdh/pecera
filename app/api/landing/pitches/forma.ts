// Forma de la respuesta pública de /api/landing/pitches. Sin imports en runtime: la prueba
// (`node scripts/pruebas/landing-pitches.ts`) la corre con Node directo.

/** Los únicos campos que salen. Agregar uno = cambiar la prueba a propósito. */
export const CAMPOS_LANDING = ["id", "poster", "descripcion", "nombre", "slug", "rol", "empresa"] as const;

export type PitchLanding = {
  id: string;
  poster: string;
  descripcion: string;
  nombre: string;
  slug: string;
  rol: string;
  empresa: string | null;
};

/** Fila como viene de Supabase (puede traer más columnas: no se copian). */
export type FilaLanding = {
  id: string;
  poster_url: string | null;
  descripcion?: string | null;
  perfil: {
    slug: string;
    nombre: string;
    rol: string;
    descripcion?: string | null;
    empresa?: { nombre?: string | null } | null;
  };
};

export const N_POR_DEFECTO = 12;
export const N_MAXIMO = 20;
export const LARGO_DESCRIPCION = 90;

/** `?n=`: entero entre 1 y 20; cualquier otra cosa, 12. */
export function leerN(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor.trim())) return N_POR_DEFECTO;
  const n = Number(valor.trim());
  if (n < 1) return N_POR_DEFECTO;
  return Math.min(n, N_MAXIMO);
}

/** Sin hashtags ni espacios de más, recortado en un límite de palabra con "…". */
export function recortar(texto: string | null | undefined, largo = LARGO_DESCRIPCION): string {
  const limpio = (texto ?? "")
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpio.length <= largo) return limpio;
  const corte = limpio.slice(0, largo - 1);
  const espacio = corte.lastIndexOf(" ");
  const base = espacio > largo * 0.6 ? corte.slice(0, espacio) : corte;
  return `${base.replace(/[\s.,;:–—-]+$/u, "")}…`;
}

/**
 * Copia campo por campo (nunca spread): aunque la consulta traiga más columnas, la
 * respuesta tiene exactamente `CAMPOS_LANDING`. `armarUrl` convierte la clave de R2 en URL.
 */
export function armarPitchesLanding(filas: FilaLanding[], armarUrl: (clave: string) => string): PitchLanding[] {
  const salida: PitchLanding[] = [];
  for (const fila of filas) {
    if (!fila.poster_url) continue;
    salida.push({
      id: String(fila.id),
      poster: armarUrl(fila.poster_url),
      descripcion: recortar(fila.descripcion || fila.perfil.descripcion),
      nombre: String(fila.perfil.nombre),
      slug: String(fila.perfil.slug),
      rol: String(fila.perfil.rol),
      empresa: fila.perfil.empresa?.nombre ? String(fila.perfil.empresa.nombre) : null,
    });
  }
  return salida;
}
