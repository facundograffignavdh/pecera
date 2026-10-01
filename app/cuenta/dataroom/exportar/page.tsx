import type { Metadata } from "next";
import Exportar from "@/components/dataroom/Exportar";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import type { Documento } from "@/lib/dataroom";
import { urlMedia } from "@/lib/media";
import type { DatoEmpresa } from "@/types/pecera";

export const metadata: Metadata = { title: "Exportar Dataroom — Pecera", robots: { index: false } };

export default async function ExportarPage() {
  const { supabase, user, empresa, disponible } = await cuentaConEmpresa();
  if (!user) {
    return (
      <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
        <SinSesion volverA="/cuenta/dataroom/exportar" titulo="Exportar Dataroom" />
      </Marco>
    );
  }
  if (!empresa || !disponible) {
    return (
      <Marco volver="/cuenta" textoVolver="Volver a Mi perfil">
        <SinEmpresa disponible={disponible} />
      </Marco>
    );
  }
  const [docs, datos] = await Promise.all([
    supabase
      .from("empresa_documentos")
      .select("id, plantilla, categoria, tipo, titulo, campos, cuerpo, url, completo, visible, archivado, updated_at")
      .eq("empresa_id", empresa.id)
      .eq("archivado", false)
      .order("updated_at", { ascending: false })
      .overrideTypes<Documento[], { merge: false }>(),
    supabase.rpc("mis_datos_empresa"),
  ]);
  const { data: filaLogo } = await supabase.from("empresa_logos").select("clave").eq("empresa_id", empresa.id).maybeSingle();
  const logo = filaLogo?.clave ? urlMedia(filaLogo.clave as string) : null;
  if (docs.error) throw new Error(`Supabase (exportar): ${docs.error.message}`);

  return (
    <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom" ancho="max-w-2xl lg:max-w-3xl">
      <header className="no-imprimir mt-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Dataroom · {empresa.nombre}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Exportar para un inversor</h1>
        <p className="leading-relaxed text-tinta/80">Elegí qué compartir con cada inversor. Sale un PDF listo para mandar.</p>
      </header>
      <Exportar empresa={empresa.nombre} logo={logo} documentos={docs.data ?? []} datos={(datos.data as DatoEmpresa[] | null) ?? []} />
    </Marco>
  );
}
