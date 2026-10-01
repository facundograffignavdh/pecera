import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import PanelEmpresa, { type Miembro } from "@/components/cuenta/PanelEmpresa";
import TarjetaEmpresa, { type MiEmpresa } from "@/components/cuenta/TarjetaEmpresa";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { faltaMigracion } from "@/lib/datos";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { DatoEmpresa } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi empresa — Pecera",
  robots: { index: false },
};

/** Cuenta de la empresa: logo, datos, equipo, métricas y documentos. */
export default async function EmpresaCuentaPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta");

  // mi_empresa_v2 trae el logo (feria_pro); sin esa migración, la de siempre.
  let consulta = await supabase.rpc("mi_empresa_v2");
  if (faltaMigracion(consulta.error)) consulta = await supabase.rpc("mi_empresa");
  if (consulta.error) console.error(`Supabase (mi_empresa): ${consulta.error.message}`);
  const fila = ((consulta.data ?? []) as MiEmpresa[])[0] ?? null;
  const empresa = fila && { ...fila, logo_url: fila.logo_url ? urlMedia(fila.logo_url) : null };

  let miembros: Miembro[] = [];
  let datos: DatoEmpresa[] = [];
  if (empresa) {
    const [m, d] = await Promise.all([supabase.rpc("miembros_mi_empresa"), supabase.rpc("mis_datos_empresa")]);
    if (m.error && !faltaMigracion(m.error)) console.error(`Supabase (miembros_mi_empresa): ${m.error.message}`);
    if (d.error && !faltaMigracion(d.error)) console.error(`Supabase (mis_datos_empresa): ${d.error.message}`);
    miembros = ((m.data ?? []) as Miembro[]).map((x) => ({ ...x, avatar_url: x.avatar_url && urlMedia(x.avatar_url) }));
    datos = (d.data ?? []) as DatoEmpresa[];
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl">
        <Link href="/cuenta" className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Mi perfil
        </Link>

        {empresa ? (
          <>
            <header className="aparecer mt-6 flex items-center gap-4">
              <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={64} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta/55">Mi empresa</p>
                <h1 className="truncate font-display text-3xl font-semibold leading-tight text-tinta">{empresa.nombre}</h1>
              </div>
            </header>
            <div className="mt-6">
              <PanelEmpresa empresa={empresa} miembros={miembros} datos={datos} />
            </div>
          </>
        ) : (
          <div className="mt-6">
            <TarjetaEmpresa empresa={null} />
          </div>
        )}

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}
