import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import EditorDocumento from "@/components/dataroom/EditorDocumento";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import type { Documento } from "@/lib/dataroom";

export const metadata: Metadata = { title: "Documento — Pecera", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DocumentoPage({ params }: PageProps<"/cuenta/dataroom/doc/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user, empresas, empresa: principal, disponible } = await cuentaConEmpresa();
  if (!user) {
    return (
      <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
        <SinSesion volverA={`/cuenta/dataroom/doc/${id}`} titulo="Documento" />
      </Marco>
    );
  }
  if (!principal || !disponible) {
    return (
      <Marco volver="/cuenta" textoVolver="Volver a Mi perfil">
        <SinEmpresa disponible={disponible} />
      </Marco>
    );
  }
  // El documento dice de qué empresa es; tiene que ser una de las de la sesión.
  const { data: doc } = await supabase
    .from("empresa_documentos")
    .select("id, empresa_id, plantilla, categoria, tipo, titulo, cuerpo, url, visible, archivado")
    .eq("id", id)
    .in(
      "empresa_id",
      empresas.map((e) => e.id)
    )
    .maybeSingle()
    .overrideTypes<(Omit<Documento, "campos" | "completo" | "updated_at"> & { empresa_id: string }) | null, { merge: false }>();
  const empresa = doc && empresas.find((e) => e.id === doc.empresa_id);
  if (!doc || !empresa) notFound();
  const conEsta = (href: string) => conEmpresa(href, empresas.length > 1 ? empresa.slug : null);
  if (doc.tipo === "plantilla") redirect(conEsta(`/cuenta/dataroom/plantilla/${doc.plantilla}`));

  return (
    <Marco volver={conEsta("/cuenta/dataroom")} textoVolver="Volver al Dataroom">
      <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
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
      </EmpresaActual>
    </Marco>
  );
}
