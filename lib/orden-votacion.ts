import { alAzar, barajar } from "@/lib/orden-feed";

/**
 * Orden de los participantes en la votación mientras los resultados no son visibles:
 * al azar por visitante, así nadie queda siempre primero. Vive en una variable de
 * módulo, como el del feed: una recarga arranca un orden nuevo y navegar dentro de la
 * app (ir a un pitch y volver con atrás) conserva el mismo. Votar o cambiar el voto
 * refresca las props (revalidatePath) pero no reordena: los ids que ya estaban
 * conservan su lugar y los recién anotados entran en un lugar al azar.
 */
const ordenes = new Map<string, string[]>();

export function ordenVotacion<T extends { perfil_id: string }>(evento: string, lista: T[]): T[] {
  const porId = new Map(lista.map((p) => [p.perfil_id, p]));
  const previo = ordenes.get(evento);

  let orden: string[];
  if (!previo) {
    orden = barajar([...porId.keys()]);
  } else {
    orden = previo.filter((id) => porId.has(id));
    const conocidos = new Set(orden);
    const nuevos = barajar([...porId.keys()].filter((id) => !conocidos.has(id)));
    for (const id of nuevos) orden.splice(alAzar(orden.length + 1), 0, id);
  }
  ordenes.set(evento, orden);
  return orden.map((id) => porId.get(id)!);
}
