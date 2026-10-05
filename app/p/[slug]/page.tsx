import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Encabezado from "@/components/Encabezado";
import { empresasDe } from "@/components/Etiquetas";
import PieLegal from "@/components/PieLegal";
import VolverAlFeed, { EnlaceVolver } from "@/components/VolverAlFeed";
import MedirPerfil from "@/components/perfil/MedirPerfil";
import BotonEditarFicha from "@/components/perfil/BotonEditarFicha";
import VistaPerfil from "@/components/perfil/VistaPerfil";
import {
  getBuildEmpresa,
  getLogos,
  getMetricasPerfil,
  getNewsletter,
  getPerfil,
  getPortfolio,
  getSeguidores,
  getSlugs,
} from "@/lib/datos";

export const revalidate = 60;

// Un perfil aprobado después del build se genera en la primera visita.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getPerfil(slug);
  if (!datos) return { title: "Perfil no encontrado — Pecera" };

  const { perfil, pitches } = datos;
  const title = `${perfil.nombre} — Pecera`;
  const imagen = pitches.find((p) => p.poster_url)?.poster_url ?? perfil.avatar_url;

  return {
    title,
    description: perfil.descripcion,
    openGraph: {
      title,
      description: perfil.descripcion,
      type: "profile",
      images: imagen ? [imagen] : undefined,
    },
  };
}

export default async function PerfilPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const [datos, metricas, seguidores] = await Promise.all([
    getPerfil(slug),
    getMetricasPerfil(slug),
    getSeguidores(slug),
  ]);
  if (!datos) notFound();

  const { perfil: leido, pitches, portafolio, racha } = datos;
  // Portfolio (inversiones y clientes), Build in Public y newsletter: extras del ecosistema.
  const conPortfolio = leido.rol === "inversor" || leido.rol === "aliado";
  // Todas sus empresas visibles, la principal primero. Build in Public: el de la primera.
  const suyas = empresasDe(leido);
  const idsEmpresas = suyas.map((e) => e.id ?? "");
  const [build, newsletter, portfolio] = await Promise.all([
    suyas[0]?.id ? getBuildEmpresa(suyas[0].id) : null,
    getNewsletter(leido.id),
    conPortfolio ? getPortfolio(leido.id) : null,
  ]);
  const logos = await getLogos([...idsEmpresas, ...(portfolio?.entradas.map((e) => e.empresa_id ?? "") ?? [])]);
  // El logo de cada empresa: el de empresa_logos y, si no hay, el de feria_pro.
  const empresas = suyas.map((e) => ({ ...e, logo_url: (e.id && logos.get(e.id)) || e.logo_url }));
  const perfil = { ...leido, empresas };

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="perfil" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-6xl lg:px-8">
        <Suspense fallback={<EnlaceVolver href="/" />}>
          <VolverAlFeed />
        </Suspense>
        <MedirPerfil perfilId={perfil.id} />

        <VistaPerfil
          datos={{ perfil, pitches, portafolio, racha, metricas, seguidores, build, newsletter, portfolio, logos }}
          slots={{ editar: <BotonEditarFicha slug={perfil.slug} /> }}
        />

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
