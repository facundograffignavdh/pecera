import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorPlantilla from "@/components/dataroom/EditorPlantilla";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import type { Documento } from "@/lib/dataroom";
import { AVISO_EDUCATIVO, leccion } from "@/lib/essentials";
import { plantilla } from "@/lib/plantillas";

export const metadata: Metadata = { title: "Template — Pecera", robots: { index: false } };

export default async function PlantillaPage({ params, searchParams }: PageProps<"/cuenta/dataroom/plantilla/[id]">) {
  const { id } = await params;
  const { empresa: pedida } = await searchParams;
  const p = plantilla(id);
  if (!p) notFound();
  const { supabase, user, empresas, empresa, disponible } = await cuentaConEmpresa(pedida);
  const aprender = leccion(p.leccion);

  if (!user) {
    return (
      <Marco volver={`/academy/essentials/${p.leccion}`} textoVolver="Volver a Academy">
        <SinSesion volverA={conEmpresa(`/cuenta/dataroom/plantilla/${p.id}`, typeof pedida === "string" ? pedida : null)} titulo={p.nombre} />
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

  const { data: doc, error } = await supabase
    .from("empresa_documentos")
    .select("id, campos, visible, updated_at")
    .eq("empresa_id", empresa.id)
    .eq("plantilla", p.id)
    .eq("archivado", false)
    .maybeSingle()
    .overrideTypes<Pick<Documento, "id" | "campos" | "visible" | "updated_at"> | null, { merge: false }>();
  if (error) throw new Error(`Supabase (plantilla): ${error.message}`);

  return (
    <Marco volver={conEmpresa("/cuenta/dataroom", empresas.length > 1 ? empresa.slug : null)} textoVolver="Volver al Dataroom">
      <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
        <header className="mt-6 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Template · {empresa.nombre}</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">{p.nombre}</h1>
          <p className="leading-relaxed text-tinta/80">{p.bajada}</p>
          <p className="text-sm text-tinta/60">
            Unos {p.minutos} minutos · Se guarda solo
            {aprender && (
              <>
                {" · "}
                <Link href={`/academy/essentials/${aprender.slug}`} className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
                  Aprender: {aprender.titulo}
                </Link>
              </>
            )}
          </p>
          <p className="text-xs text-tinta/55">{AVISO_EDUCATIVO}</p>
        </header>
        <div className="mt-6">
          <EditorPlantilla
            plantillaId={p.id}
            inicial={doc?.campos ?? {}}
            docId={doc?.id ?? null}
            visible={doc?.visible ?? false}
            actualizado={doc ? Date.parse(doc.updated_at) : 0}
          />
        </div>
      </EmpresaActual>
    </Marco>
  );
}
