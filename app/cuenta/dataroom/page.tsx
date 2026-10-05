import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import AgregarDocumento from "@/components/dataroom/AgregarDocumento";
import EscucharDataroom from "@/components/dataroom/EscucharDataroom";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import SelectorEmpresa from "@/components/cuenta/SelectorEmpresa";
import { BotonArchivar, FilaDato, FilaDocumento } from "@/components/dataroom/FilasDataroom";
import Marco, { SinEmpresa, SinSesion } from "@/components/dataroom/Marco";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa, rpcEn } from "@/lib/cuenta-empresa";
import { CATEGORIAS_DATAROOM, CATEGORIA_DE_DATO, type Documento, haceCuanto } from "@/lib/dataroom";
import { PLANTILLAS, plantilla, progresoPlantilla } from "@/lib/plantillas";
import { defDato } from "@/lib/transparencia";
import type { DatoEmpresa } from "@/types/pecera";
import { boton } from "@/lib/ui";

export const metadata: Metadata = { title: "Dataroom — Pecera", robots: { index: false } };

const COLUMNAS = "id, plantilla, categoria, tipo, titulo, campos, cuerpo, url, completo, visible, archivado, updated_at";
const BOTON =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

/**
 * Dataroom de la empresa: los documentos (templates, textos, links) y los datos de
 * Transparencia, ordenados por categoría. Cada cosa tiene su interruptor Privado ↔
 * Transparente. Lo edita cualquier miembro y se actualiza en vivo.
 */
export default async function DataroomPage({ searchParams }: PageProps<"/cuenta/dataroom">) {
  const { empresa: pedida } = await searchParams;
  const { supabase, user, empresas, empresa, disponible } = await cuentaConEmpresa(pedida);
  if (!user) {
    return (
      <Marco volver="/cuenta" textoVolver="Volver a Mi perfil">
        <SinSesion volverA="/cuenta/dataroom" titulo="Dataroom" />
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

  const [docsRes, datosRes] = await Promise.all([
    supabase
      .from("empresa_documentos")
      .select(COLUMNAS)
      .eq("empresa_id", empresa.id)
      .order("updated_at", { ascending: false })
      .overrideTypes<Documento[], { merge: false }>(),
    rpcEn(supabase, "mis_datos_en", "mis_datos_empresa", empresa.id, {}),
  ]);
  if (docsRes.error) throw new Error(`Supabase (dataroom): ${docsRes.error.message}`);
  // Con varias empresas, los links llevan esta (cada pestaña queda en la suya).
  const ruta = (href: string) => conEmpresa(href, empresas.length > 1 ? empresa.slug : null);
  const docs = docsRes.data ?? [];
  const datos = (datosRes.data as DatoEmpresa[] | null) ?? [];
  const activos = docs.filter((d) => !d.archivado);
  const archivados = docs.filter((d) => d.archivado);

  const porCategoria = CATEGORIAS_DATAROOM.map((cat) => {
    const documentos = activos.filter((d) => d.categoria === cat.valor);
    const deDatos = datos.filter((d) => CATEGORIA_DE_DATO[d.clave] === cat.valor);
    const usadas = new Set(documentos.map((d) => d.plantilla));
    const sugeridas = PLANTILLAS.filter((p) => p.categoria === cat.valor && !usadas.has(p.id));
    const completos = documentos.filter((d) => d.completo).length + deDatos.length;
    const estado: EstadoCategoria = completos > 0 ? "con-info" : documentos.length > 0 ? "en-progreso" : "vacia";
    return { cat, documentos, deDatos, sugeridas, estado };
  });
  const conInfo = porCategoria.filter((c) => c.estado === "con-info").length;
  const transparentes = activos.filter((d) => d.visible).length + datos.filter((d) => d.visible).length;
  const vacio = activos.length === 0 && datos.length === 0;

  return (
    <Marco volver={ruta("/cuenta/empresa?pestana=metricas")} textoVolver="Volver a la empresa" ancho="max-w-md md:max-w-3xl lg:max-w-5xl">
      <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
        <EscucharDataroom empresaId={empresa.id} />
        <div className="mt-6">
          <SelectorEmpresa empresas={empresas} actual={empresa.id} ruta="/cuenta/dataroom" />
        </div>
        <header className="mt-6 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Transparencia · {empresa.nombre}</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Dataroom</h1>
          <p className="leading-relaxed text-tinta/80">
            La información de tu startup, ordenada para un inversor. Todo nace privado: vos decidís qué es
            transparente.
          </p>
        </header>

        <section aria-labelledby="progreso-titulo" className="mt-6 flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="progreso-titulo" className="font-display text-lg font-semibold text-tinta">
              {conInfo} de {CATEGORIAS_DATAROOM.length} categorías con información
            </h2>
            <span className="text-sm font-semibold tabular-nums text-tinta">
              {Math.round((conInfo / CATEGORIAS_DATAROOM.length) * 100)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Dataroom completo"
            aria-valuemin={0}
            aria-valuemax={CATEGORIAS_DATAROOM.length}
            aria-valuenow={conInfo}
            className="h-2 overflow-hidden rounded-full bg-tinta/10"
          >
            <div className="barra-progreso h-full rounded-full bg-t-verde" style={{ "--p": conInfo / CATEGORIAS_DATAROOM.length } as CSSProperties} />
          </div>
          <p className="text-sm text-tinta/70">
            {activos.length} {activos.length === 1 ? "documento" : "documentos"} · {datos.length}{" "}
            {datos.length === 1 ? "dato" : "datos"} · {transparentes} {transparentes === 1 ? "transparente" : "transparentes"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={ruta("/cuenta/dataroom/exportar")} className={boton("primario", "md")}>
              Exportar Dataroom
            </Link>
            <AgregarDocumento className={`${BOTON} border border-tinta/30 text-tinta hover:border-tinta`} />
            {empresa.visible && (
              <Link href={`/e/${empresa.slug}/dataroom`} className={`${BOTON} border border-tinta/30 text-tinta hover:border-tinta`}>
                Ver lo transparente
              </Link>
            )}
          </div>
        </section>

        {vacio && (
          <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-dashed border-tinta/25 px-5 py-6 text-center">
            <h2 className="font-display text-xl font-semibold text-tinta">Tu Dataroom todavía está vacío</h2>
            <p className="text-sm leading-relaxed text-tinta/75">
              Empezá con los documentos esenciales de tu startup: cada template de Academy te guía paso a paso.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/academy" className={boton("primario", "md")}>
                Explorar Startup Essentials
              </Link>
              <AgregarDocumento className={`${BOTON} border border-tinta/30 text-tinta hover:border-tinta`} />
            </div>
          </section>
        )}

        <ul className="mt-6 flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {porCategoria.map(({ cat, documentos, deDatos, sugeridas, estado }) => (
            <li key={cat.valor}>
              <details id={cat.valor} className="group scroll-mt-24 rounded-3xl border border-tinta/10 bg-tinta/[0.03]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <MarcaEstado estado={estado} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-tinta">{cat.label}</span>
                    <span className="block text-xs text-tinta/60">
                      {estado === "vacia"
                        ? "Todavía vacía"
                        : `${documentos.length + deDatos.length} ${documentos.length + deDatos.length === 1 ? "elemento" : "elementos"}${
                            estado === "en-progreso" ? " · en progreso" : ""
                          }`}
                    </span>
                  </span>
                  <span aria-hidden className="text-xl text-tinta transition-transform duration-300 ease-pecera group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-tinta/10 px-3 py-4">
                  <p className="px-1 text-sm text-tinta/70">{cat.bajada}</p>
                  {documentos.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {documentos.map((d) => {
                        const p = plantilla(d.plantilla);
                        return (
                          <FilaDocumento
                            key={d.id}
                            doc={d}
                            proporcion={p ? progresoPlantilla(p, d.campos).proporcion : null}
                            hace={haceCuanto(d.updated_at)}
                          />
                        );
                      })}
                    </ul>
                  )}
                  {deDatos.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-tinta/60">De Transparencia</h3>
                      <ul className="flex flex-col gap-2">
                        {deDatos.map((d) => (
                          <FilaDato key={d.clave} clave={d.clave} label={defDato(d.clave)?.label ?? d.clave} valor={d.valor} url={d.url} visible={d.visible} />
                        ))}
                      </ul>
                      <Link href={conEmpresa("/cuenta/empresa", empresa.slug)} className="px-1 text-xs font-medium text-tinta underline underline-offset-4">
                        Editar los datos en la cuenta de la empresa
                      </Link>
                    </div>
                  )}
                  {sugeridas.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-tinta/60">Sugeridos</h3>
                      <ul className="flex flex-col gap-2">
                        {sugeridas.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={ruta(`/cuenta/dataroom/plantilla/${p.id}`)}
                              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-dashed border-tinta/25 px-4 py-2.5 transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-tinta">{p.nombre}</span>
                                <span className="block text-xs text-tinta/60">Template · {p.minutos} min</span>
                              </span>
                              <span aria-hidden className="text-tinta/60">&rarr;</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <AgregarDocumento categoria={cat.valor} className={`${BOTON} self-start border border-tinta/30 text-tinta hover:border-tinta`} />
                </div>
              </details>
            </li>
          ))}
        </ul>

        {archivados.length > 0 && (
          <details className="group mt-6 rounded-3xl border border-tinta/10">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
              Archivados ({archivados.length})
              <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">+</span>
            </summary>
            <ul className="flex flex-col gap-2 border-t border-tinta/10 p-3">
              {archivados.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-marfil px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm text-tinta/80">{d.titulo}</span>
                  <BotonArchivar id={d.id} archivar={false} />
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="mt-6 text-xs leading-relaxed text-tinta/60">
          Transparente quiere decir que se ve en la página pública de tu empresa, para cualquiera que la abra. Para
          compartir algo privado con un inversor puntual, exportalo y mandáselo vos.
        </p>
      </EmpresaActual>
    </Marco>
  );
}

type EstadoCategoria = "con-info" | "en-progreso" | "vacia";

function MarcaEstado({ estado }: { estado: EstadoCategoria }) {
  if (estado === "con-info") {
    return (
      <span aria-label="Con información" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-aliado text-marfil">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (estado === "en-progreso") {
    return <span aria-label="En progreso" className="size-6 shrink-0 rounded-full border-2 border-t-ocre bg-[conic-gradient(var(--color-t-ocre)_50%,transparent_0)]" />;
  }
  return <span aria-label="Vacía" className="size-6 shrink-0 rounded-full border-2 border-tinta/25" />;
}
