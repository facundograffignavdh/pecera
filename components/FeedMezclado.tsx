"use client";

import { useMemo, useSyncExternalStore } from "react";
import Feed from "@/components/Feed";
import { mezclar } from "@/lib/orden-feed";
import type { ItemFeed } from "@/types/pecera";

const sinCambios = () => () => {};

/**
 * El feed en orden aleatorio, como TikTok. La página sigue siendo ISR: el servidor
 * y la hidratación dibujan un fondo vacío (el HTML nunca trae el orden original) y
 * recién en el celular se mezcla y se monta el feed. Como `Feed` monta ya con el
 * orden final, el salto al reel del #hash y el observer andan como siempre.
 */
export default function FeedMezclado({ items }: { items: ItemFeed[] }) {
  const enCelular = useSyncExternalStore(
    sinCambios,
    () => true,
    () => false
  );
  const mezclados = useMemo(() => (enCelular ? mezclar(items) : null), [enCelular, items]);

  if (!mezclados) return <main aria-busy className="tema-fijo h-dvh bg-tinta" />;
  return <Feed items={mezclados} />;
}
