import type { Metadata } from "next";
import EditorDocumento from "@/components/dataroom/EditorDocumento";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa } from "@/lib/cuenta-empresa";
import { esCategoriaDataroom } from "@/lib/dataroom";

export const metadata: Metadata = { title: "Nuevo documento — Pecera", robots: { index: false } };

export default async function NuevoDocumentoPage({ searchParams }: PageProps<"/cuenta/dataroom/nuevo">) {
  const { tipo: crudo, categoria: cat, empresa: pedida } = await searchParams;
  const tipo = crudo === "link" ? "link" : "escrito";
  const categoria = typeof cat === "string" && esCategoriaDataroom(cat) ? cat : "otros";
  const { user, empresas, empresa, disponible } = await cuentaConEmpresa(pedida);
  if (!user) {
    return (
      <Marco volver="/cuenta/dataroom" textoVolver="Volver al Dataroom">
        <SinSesion
          volverA={conEmpresa(`/cuenta/dataroom/nuevo?tipo=${tipo}&categoria=${categoria}`, typeof pedida === "string" ? pedida : null)}
          titulo="Nuevo documento"
        />
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
    <Marco volver={conEmpresa("/cuenta/dataroom", empresas.length > 1 ? empresa.slug : null)} textoVolver="Volver al Dataroom">
      <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
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
      </EmpresaActual>
    </Marco>
  );
}
