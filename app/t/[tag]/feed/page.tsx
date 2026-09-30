import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import Feed from "@/components/Feed";
import { getPitchesDeTag } from "@/lib/datos";
import { normalizarTag } from "@/lib/hashtags";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/t/[tag]/feed">): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${normalizarTag(decodeURIComponent(tag))} en video — Pecera` };
}

/** Los pitches de un hashtag como feed vertical, del más nuevo al más viejo. */
export default async function TagFeedPage({ params }: PageProps<"/t/[tag]/feed">) {
  const { tag } = await params;
  const limpio = normalizarTag(decodeURIComponent(tag));
  const items = (await getPitchesDeTag(limpio)).sort((a, b) =>
    (b.pitch.created_at ?? "").localeCompare(a.pitch.created_at ?? "")
  );

  return (
    <div className="tema-fijo relative h-dvh bg-[#0e0d0b]">
      <Encabezado variante="feed" />
      <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-20 flex justify-center">
        <Link
          href={`/t/${limpio}`}
          className="boton pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-tinta/45 px-4 text-sm font-semibold text-marfil ring-1 ring-marfil/15 backdrop-blur-md"
        >
          #{limpio}
          <span className="text-xs text-marfil/65">· ver todos</span>
        </Link>
      </div>
      {items.length > 0 ? (
        <Feed items={items} />
      ) : (
        <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-marfil px-8 text-center">
          <p className="font-display text-3xl font-semibold text-tinta">Todavía no hay pitches con #{limpio}</p>
          <Link href="/" className="boton inline-flex min-h-12 items-center rounded-full bg-tinta px-6 font-medium text-marfil">
            Ir al feed
          </Link>
        </main>
      )}
    </div>
  );
}
