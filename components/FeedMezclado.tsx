"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import Feed from "@/components/Feed";
import { mezclar } from "@/lib/orden-feed";
import { useRed } from "@/lib/red";
import type { ItemFeed } from "@/types/pecera";

const sinCambios = () => () => {};

type Pestana = "para-vos" | "stakeholding";

/**
 * Dos feeds:
 * - "Para vos": todo, en orden aleatorio, como TikTok.
 * - "Stakeholding": solo la gente que seguís (Mi red), lo más nuevo primero.
 *
 * La página sigue siendo ISR: el servidor y la hidratación dibujan un fondo vacío
 * (el HTML nunca trae el orden original) y recién en el celular se arma cada feed.
 * Cambiar de pestaña remonta el feed (key), así arranca del primer reel.
 */
export default function FeedMezclado({ items }: { items: ItemFeed[] }) {
  const enCelular = useSyncExternalStore(sinCambios, () => true, () => false);
  const [pestana, setPestana] = useState<Pestana>("para-vos");
  const red = useRed();

  const mezclados = useMemo(() => (enCelular ? mezclar(items) : null), [enCelular, items]);
  const siguiendo = useMemo(() => {
    const ids = new Set(red.map((s) => s.id));
    return items
      .filter((i) => ids.has(i.perfil.id))
      .sort((a, b) => (b.pitch.created_at ?? "").localeCompare(a.pitch.created_at ?? ""));
  }, [items, red]);

  if (!mezclados) return <main aria-busy className="tema-fijo h-dvh bg-tinta" />;

  return (
    <div className="tema-fijo relative h-dvh bg-[#0e0d0b]">
      <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-20 flex justify-center">
        <div role="tablist" aria-label="Feed" className="pointer-events-auto flex gap-1 rounded-full bg-tinta/45 p-1 backdrop-blur-md ring-1 ring-marfil/15">
          {(
            [
              ["para-vos", "Para vos"],
              ["stakeholding", "Stakeholding"],
            ] as const
          ).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={pestana === valor}
              onClick={() => setPestana(valor)}
              className={`boton min-h-9 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil ${
                pestana === valor ? "bg-marfil text-tinta" : "text-marfil/85 hover:text-marfil"
              }`}
            >
              {label}
              {valor === "stakeholding" && red.length > 0 && (
                <span className={`ml-1.5 text-xs tabular-nums ${pestana === valor ? "text-tinta/60" : "text-marfil/60"}`}>
                  {red.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {pestana === "para-vos" ? (
        <Feed key="para-vos" items={mezclados} />
      ) : siguiendo.length > 0 ? (
        <Feed key="stakeholding" items={siguiendo} />
      ) : (
        <main className="flex h-dvh flex-col items-center justify-center gap-5 bg-marfil px-8 text-center">
          <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-t-arcilla-suave text-3xl">
            🤝
          </span>
          <h2 className="font-display text-3xl font-semibold leading-tight text-tinta">Tu Stakeholding está vacío</h2>
          <p className="max-w-sm leading-relaxed text-tinta/75">
            Tocá el <strong className="font-semibold">+</strong> sobre el avatar de un reel o{" "}
            <strong className="font-semibold">Seguir</strong> en un perfil. Acá vas a ver lo nuevo de la gente que te
            interesa: proyectos en los que invertiste, tu equipo, tus mentores.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setPestana("para-vos")}
              className="boton min-h-12 rounded-full bg-tinta px-6 font-medium text-marfil"
            >
              Ir a Para vos
            </button>
            <Link href="/explorar" className="boton inline-flex min-h-12 items-center rounded-full border border-tinta/30 px-6 font-medium text-tinta">
              Explorar
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
