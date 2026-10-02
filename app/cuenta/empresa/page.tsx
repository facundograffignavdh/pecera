import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import EnVivo from "@/components/EnVivo";
import PieLegal from "@/components/PieLegal";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import PanelEmpresa, { type Miembro } from "@/components/cuenta/PanelEmpresa";
import SelectorEmpresa from "@/components/cuenta/SelectorEmpresa";
import TarjetaEmpresa from "@/components/cuenta/TarjetaEmpresa";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa, rpcEn } from "@/lib/cuenta-empresa";
import { faltaMigracion } from "@/lib/datos";
import { urlMedia } from "@/lib/media";
import type { DatoEmpresa } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi empresa — Pecera",
  robots: { index: false },
};

/**
 * Cuenta de una empresa: logo, datos, equipo, métricas y documentos. Con varias
 * empresas, la de `?empresa=` (o la principal) y el selector para cambiar.
 */
export default async function EmpresaCuentaPage({ searchParams }: PageProps<"/cuenta/empresa">) {
  const { empresa: pedida } = await searchParams;
  const { supabase, user, empresas, empresa, multi } = await cuentaConEmpresa(pedida);
  if (!user) redirect("/cuenta");

  let miembros: Miembro[] = [];
  let datos: DatoEmpresa[] = [];
  if (empresa) {
    const [m, d] = await Promise.all([
      rpcEn(supabase, "miembros_de_empresa", "miembros_mi_empresa", empresa.id, {}),
      rpcEn(supabase, "mis_datos_en", "mis_datos_empresa", empresa.id, {}),
    ]);
    if (m.error && !faltaMigracion(m.error)) console.error(`Supabase (miembros_de_empresa): ${m.error.message}`);
    if (d.error && !faltaMigracion(d.error)) console.error(`Supabase (mis_datos_en): ${d.error.message}`);
    miembros = ((m.data ?? []) as Miembro[]).map((x) => ({ ...x, avatar_url: x.avatar_url && urlMedia(x.avatar_url) }));
    datos = (d.data ?? []) as DatoEmpresa[];
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-4xl">
        <Link href="/cuenta" className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Mi perfil
        </Link>

        {empresa ? (
          <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
            <div className="mt-6">
              <SelectorEmpresa empresas={empresas} actual={empresa.id} ruta="/cuenta/empresa" />
            </div>
            <header className="aparecer mt-6 flex items-center gap-4">
              <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={64} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">
                  {empresas.length > 1 ? (empresa.es_principal ? "Tu empresa principal" : "Una de tus empresas") : "Mi empresa"}
                </p>
                <h1 className="truncate font-display text-3xl font-semibold leading-tight text-tinta">{empresa.nombre}</h1>
              </div>
            </header>
            {multi ? (
              <EnVivo canal={`equipo-${empresa.id}`} filtro={`empresa_id=eq.${empresa.id}`} tabla="empresa_miembros" />
            ) : (
              <EnVivo canal={`empresa-${empresa.id}`} filtro={`empresa_id=eq.${empresa.id}`} />
            )}
            <div className="mt-6">
              {/* key: al cambiar de empresa, los formularios arrancan de cero. */}
              <PanelEmpresa key={empresa.id} empresa={empresa} miembros={miembros} datos={datos} multi={multi} />
            </div>
            <p className="mt-6 text-sm text-tinta/65">
              <Link href={conEmpresa("/cuenta#tarjeta-mis-empresas", empresa.slug)} className="underline underline-offset-4 hover:text-tinta">
                Producto, Build in Public y Dataroom
              </Link>{" "}
              están en Mi perfil, con esta misma empresa elegida.
            </p>
          </EmpresaActual>
        ) : (
          <div className="mt-6">
            <TarjetaEmpresa empresas={[]} />
          </div>
        )}

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
