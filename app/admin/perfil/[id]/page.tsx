import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import EditarPerfil from "@/components/admin/EditarPerfil";
import type { DetallePerfil } from "@/lib/alta-rapida";
import { urlPerfil } from "@/lib/cuenta";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export const metadata: Metadata = {
  title: "Editar perfil — Pecera",
  robots: { index: false, follow: false },
};

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Editor del equipo para un perfil (alta_rapida). La base decide quién es admin. */
export default async function EditarPerfilPage({ params }: PageProps<"/admin/perfil/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contenido: React.ReactNode;
  let titulo = "Editar perfil";
  if (!user) {
    contenido = (
      <p className={`mt-6 ${CAJA} text-tinta`}>
        Entrá desde el <Link href="/admin" className="font-semibold underline underline-offset-4">panel del equipo</Link>.
      </p>
    );
  } else {
    const { data, error } = await supabase.rpc("admin_perfil_detalle", { p_perfil: id, p_evento: EVENTO_ACTUAL.slug });
    if (faltaMigracion(error)) {
      contenido = (
        <p className={`mt-6 ${CAJA} text-sm text-tinta`}>
          Falta correr la migración <code>20261019120000_alta_rapida.sql</code> en Supabase.
        </p>
      );
    } else if (error?.message === "no autorizado") {
      contenido = <p className={`mt-6 ${CAJA} text-tinta`}>Esta pantalla es solo para el equipo de Pecera.</p>;
    } else {
      if (error) throw new Error(`Supabase (admin_perfil_detalle): ${error.message}`);
      if (!data) notFound();
      const detalle = data as DetallePerfil;
      titulo = detalle.nombre;
      contenido = <EditarPerfil detalle={detalle} url={urlPerfil(detalle.slug)} eventoNombre={EVENTO_ACTUAL.nombre} />;
    }
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl">
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/admin?v=perfiles" className="text-tinta underline underline-offset-4">
            ← Perfiles
          </Link>
          <Link href="/admin/alta" className="text-tinta underline underline-offset-4">
            Alta rápida
          </Link>
        </div>
        <h1 className="mt-2 break-words font-display text-3xl font-semibold leading-tight text-tinta">{titulo}</h1>
        {contenido}
      </div>
    </main>
  );
}
