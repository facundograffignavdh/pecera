import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import BuscadorExplorar, { type PerfilExplorar } from "@/components/explorar/BuscadorExplorar";
import { getFeed, getTags } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { TAG_FERIA } from "@/lib/hashtags";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explorar — Pecera",
  description: "Buscá proyectos, inversores y aliados por nombre, industria o hashtag.",
};

/** Buscador de hashtags y perfiles con pitch, con la sección de la feria arriba. */
export default async function ExplorarPage() {
  const [feed, tags] = await Promise.all([getFeed(), getTags()]);

  const porPerfil = new Map<string, PerfilExplorar>();
  for (const { perfil } of feed) {
    const previo = porPerfil.get(perfil.id);
    if (previo) {
      previo.pitches++;
      continue;
    }
    porPerfil.set(perfil.id, {
      id: perfil.id,
      slug: perfil.slug,
      nombre: perfil.nombre,
      rol: perfil.rol,
      avatar_url: perfil.avatar_url,
      descripcion: perfil.descripcion,
      industrias: perfil.industrias ?? [],
      especialidades: perfil.especialidades ?? [],
      pitches: 1,
    });
  }
  const perfiles = [...porPerfil.values()].sort((a, b) => b.pitches - a.pitches || a.nombre.localeCompare(b.nombre));
  const feria = tags.find((t) => t.tag === TAG_FERIA);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-3xl lg:max-w-6xl lg:px-8">
        <BuscadorExplorar tags={tags} perfiles={perfiles} />

        <Link
          href={`/t/${TAG_FERIA}`}
          className="boton group mt-8 flex items-center justify-between gap-4 rounded-[2rem] bg-tinta px-6 py-6 text-marfil"
        >
          <span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-marfil/65">{EVENTO_ACTUAL.nombre}</span>
            <span className="mt-1 block font-display text-3xl font-semibold leading-none">#{TAG_FERIA}</span>
            <span className="mt-2 block text-sm text-marfil/75">
              {feria ? `${feria.total} pitches de la feria` : "Todos los pitches de la feria, en un lugar"}
            </span>
          </span>
          <span aria-hidden className="text-2xl transition-transform duration-300 ease-pecera group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
