"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { archivarDocumento, cambiarVisibilidad, cambiarVisibilidadDato } from "@/app/cuenta/dataroom";
import BotonCopiar from "@/components/BotonCopiar";
import SwitchTransparencia from "@/components/SwitchTransparencia";
import { useConEmpresa, useEmpresaId } from "@/components/cuenta/EmpresaActual";
import type { Documento } from "@/lib/dataroom";
import type { Resultado } from "@/lib/errores-base";

const ACCION =
  "inline-flex min-h-10 items-center rounded-full border border-tinta/25 px-3.5 text-xs font-semibold text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60";
const TIPO = { plantilla: "Template", escrito: "Texto", link: "Link" } as const;

/** Un documento del Dataroom: estado, cuándo se tocó, visibilidad y acciones. */
export function FilaDocumento({
  doc,
  proporcion,
  hace,
}: {
  doc: Documento;
  /** Solo templates: cuánto de lo obligatorio está completo. */
  proporcion: number | null;
  hace: string;
}) {
  const ruta = useConEmpresa();
  const href = ruta(doc.tipo === "plantilla" ? `/cuenta/dataroom/plantilla/${doc.plantilla}` : `/cuenta/dataroom/doc/${doc.id}`);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-tinta/10 bg-marfil px-4 py-3.5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-tinta/[0.07] px-2 py-0.5 text-[0.6875rem] font-semibold text-tinta">{TIPO[doc.tipo]}</span>
          {doc.completo ? (
            <span className="rounded-full bg-t-verde-suave px-2 py-0.5 text-[0.6875rem] font-semibold text-t-verde">Completo</span>
          ) : (
            <span className="rounded-full bg-t-ocre-suave px-2 py-0.5 text-[0.6875rem] font-semibold text-t-ocre">
              Borrador{proporcion !== null && ` · ${Math.round(proporcion * 100)}%`}
            </span>
          )}
        </div>
        <Link href={href} className="font-medium text-tinta underline-offset-4 hover:underline">
          {doc.titulo}
        </Link>
        {proporcion !== null && !doc.completo && (
          <span aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-tinta/10">
            <span className="barra-progreso block h-full rounded-full bg-t-ocre" style={{ "--p": proporcion } as React.CSSProperties} />
          </span>
        )}
        <p className="text-xs text-tinta/60">Actualizado {hace}</p>
      </div>
      <SwitchTransparencia visible={doc.visible} etiqueta={doc.titulo} onCambiar={(v) => cambiarVisibilidad(doc.id, v)} compacto />
      <div className="flex flex-wrap gap-1.5">
        <Link href={href} className={ACCION}>
          {doc.tipo === "plantilla" ? (doc.completo ? "Editar" : "Seguir completando") : "Editar"}
        </Link>
        {doc.url && (
          <>
            <a href={doc.url} target="_blank" rel="noopener noreferrer nofollow" className={ACCION}>
              Abrir link ↗
            </a>
            <BotonCopiar texto={doc.url} etiqueta="Copiar link" className={ACCION} />
          </>
        )}
        <BotonArchivar id={doc.id} archivar />
      </div>
    </li>
  );
}

/** Un dato de Transparencia dentro del Dataroom. Se edita en Mi perfil → Transparencia. */
export function FilaDato({
  clave,
  label,
  valor,
  url,
  visible,
}: {
  clave: string;
  label: string;
  valor: string | null;
  url: string | null;
  visible: boolean;
}) {
  const empresaId = useEmpresaId();
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-tinta/10 bg-marfil px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs text-tinta/60">{label}</span>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-medium text-tinta underline underline-offset-4">
            {valor || "Ver documento"} ↗
          </a>
        ) : (
          <span className="font-display text-lg font-semibold text-tinta">{valor}</span>
        )}
      </div>
      <SwitchTransparencia visible={visible} etiqueta={label} onCambiar={(v) => cambiarVisibilidadDato(empresaId, clave, v)} compacto />
    </li>
  );
}

export function BotonArchivar({ id, archivar }: { id: string; archivar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (archivar && !window.confirm("¿Archivar este documento? Sale del Dataroom y de lo público. Lo podés recuperar después.")) return;
          setR(null);
          iniciar(async () => setR(await archivarDocumento(id, archivar)));
        }}
        className={ACCION}
      >
        {pendiente ? "…" : archivar ? "Archivar" : "Recuperar"}
      </button>
      {r && !r.ok && (
        <span role="alert" className="text-xs font-medium text-tinta">
          {r.mensaje}
        </span>
      )}
    </span>
  );
}
