import type { ItemFeed } from "@/types/pecera";

/**
 * Orden del feed, mezclado en el celular. Vive en una variable de módulo: una
 * recarga completa arranca un documento nuevo (orden nuevo) y navegar dentro de la
 * app (perfil → "Volver", el logo, el botón atrás) conserva el mismo, así la vuelta
 * con /#<pitch.id> cae en el mismo reel.
 */
let orden: string[] | null = null;

/** Entero al azar en [0, n), sin el sesgo del módulo. */
export function alAzar(n: number): number {
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limite);
  return buf[0] % n;
}

/** Fisher-Yates sobre una copia. */
export function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = alAzar(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Los items en el orden de esta visita. Si el ISR trajo pitches nuevos desde la
 * última vez, se intercalan al azar; los que ya no están se descartan y el resto
 * conserva su lugar. Llamarla dos veces con los mismos items da lo mismo.
 */
export function mezclar(items: ItemFeed[]): ItemFeed[] {
  const porId = new Map(items.map((item) => [item.pitch.id, item]));

  if (orden === null) {
    orden = barajar([...porId.keys()]);
  } else {
    const vigentes = orden.filter((id) => porId.has(id));
    const conocidos = new Set(vigentes);
    for (const id of porId.keys()) {
      if (!conocidos.has(id)) vigentes.splice(alAzar(vigentes.length + 1), 0, id);
    }
    orden = vigentes;
  }

  return orden.map((id) => porId.get(id)!);
}
