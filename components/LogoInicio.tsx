"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

/** Id del `<main>` del feed: el logo lo sube al primer reel. */
export const ID_FEED = "feed";

/**
 * Píldora del logo: lleva al feed. Si ya estás en el feed, vuelve al primer reel.
 * El salto es instantáneo: uno suave pasaría por todos los reels y cargaría el video
 * de cada vecino en el camino.
 */
export default function LogoInicio({ variante }: { variante: "feed" | "perfil" | "cuenta" }) {
  const ruta = usePathname();

  function alTocar(e: MouseEvent<HTMLAnchorElement>) {
    if (ruta !== "/") return;
    const feed = document.getElementById(ID_FEED);
    if (!feed) return;
    e.preventDefault();
    feed.scrollTo({ top: 0, behavior: "instant" });
    // Sin el #hash: una recarga no tiene que volver al reel de antes.
    if (window.location.hash) history.replaceState(history.state, "", "/");
  }

  return (
    <Link
      href="/"
      aria-label="Ir al feed"
      onClick={alTocar}
      className="vidrio pointer-events-auto flex items-center rounded-full px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      {variante === "feed" ? (
        <Image src="/brand/isotipo-naranja.png" alt="" width={43} height={28} preload />
      ) : (
        <Image src="/brand/logo-combinado-tinta.png" alt="" width={112} height={24} preload />
      )}
    </Link>
  );
}
