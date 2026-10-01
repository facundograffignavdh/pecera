import type { Metadata } from "next";
import EditorDocumento from "@/components/dataroom/EditorDocumento";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import { esCategoriaDataroom } from "@/lib/dataroom";

export const metadata: Metadata = { title: "Nuevo documento — Pecera", robots: { index: false } };

export default async function NuevoDocumentoPage({ searchParams }: PageProps<"/cuenta/dataroom/nuevo">) {
  const { tipo: crudo, categoria: cat } = await searchParams;
  const tipo = crudo === "link" ? "link" : "escrito";
  const categoria = typeof cat === "string" && esCategoriaDataroom(cat) ? cat : "otros";
  const { user, empresa, disponible } = await cuentaConEmpresa();
  if (!user) {
    return (
      <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
        <SinSesion volverA={`/cuenta/dataroom/nuevo?tipo=${tipo}&categoria=${categoria}`} titulo="Nuevo documento" />
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
  return (
    <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
      <header className="mt-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Dataroom · {empresa.nombre}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
          {tipo === "link" ? "Vincular un documento" : "Escribir un documento"}
        </h1>
        <p className="text-sm text-tinta/70">Nace privado: solo tu equipo lo ve hasta que lo hagas transparente.</p>
      </header>
      <div className="mt-6">
        <EditorDocumento tipo={tipo} inicial={{ id: null, titulo: "", categoria, cuerpo: "", url: "", visible: false }} />
      </div>
    </Marco>
  );
}
