import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import EditorDocumento from "@/components/dataroom/EditorDocumento";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import type { Documento } from "@/lib/dataroom";

export const metadata: Metadata = { title: "Documento — Pecera", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DocumentoPage({ params }: PageProps<"/cuenta/dataroom/doc/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user, empresa, disponible } = await cuentaConEmpresa();
  if (!user) {
    return (
      <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
        <SinSesion volverA={`/cuenta/dataroom/doc/${id}`} titulo="Documento" />
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
  const { data: doc } = await supabase
    .from("empresa_documentos")
    .select("id, plantilla, categoria, tipo, titulo, cuerpo, url, visible, archivado")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle()
    .overrideTypes<Omit<Documento, "campos" | "completo" | "updated_at"> | null, { merge: false }>();
  if (!doc) notFound();
  if (doc.tipo === "plantilla") redirect(`/cuenta/dataroom/plantilla/${doc.plantilla}`);

  return (
    <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
      <header className="mt-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Dataroom · {empresa.nombre}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{doc.titulo}</h1>
        {doc.archivado && <p className="rounded-2xl bg-t-ocre-suave px-4 py-3 text-sm text-tinta">Está archivado: recuperalo desde el Dataroom para que vuelva a contar.</p>}
      </header>
      <div className="mt-6">
        <EditorDocumento
          tipo={doc.tipo === "link" ? "link" : "escrito"}
          inicial={{ id: doc.id, titulo: doc.titulo, categoria: doc.categoria, cuerpo: doc.cuerpo ?? "", url: doc.url ?? "", visible: doc.visible }}
        />
      </div>
    </Marco>
  );
}
