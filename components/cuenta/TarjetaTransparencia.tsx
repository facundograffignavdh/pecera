"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { guardarDato } from "@/app/cuenta/empresa";
import { Aviso, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { getConcepto } from "@/lib/glosario";
import { CATEGORIAS_DATO, DATOS, type DefDato } from "@/lib/transparencia";
import type { DatoEmpresa } from "@/types/pecera";

const INICIAL: Resultado = { ok: false };

/**
 * Métricas y documentos de la empresa. Todo nace privado: cada dato se comparte por
 * separado y recién ahí aparece en /e/slug. Lo edita cualquiera del equipo.
 */
export default function TarjetaTransparencia({
  datos,
  slugEmpresa,
}: {
  datos: DatoEmpresa[];
  slugEmpresa: string;
}) {
  const porClave = new Map(datos.map((d) => [d.clave, d]));
  const compartidos = datos.filter((d) => d.visible).length;

  return (
    <Tarjeta
      titulo="Transparencia"
      etiqueta="Privado hasta que lo compartas"
      bajada={
        <>
          Cargá métricas y documentos. Solo tu equipo los ve; lo que marques como
          compartido aparece en la página de la empresa. ¿Dudas con algún término? Está
          en{" "}
          <Link href="/docs/conceptos" className="font-medium text-tinta underline underline-offset-4">
            Conceptos
          </Link>
          .
        </>
      }
    >
      <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
        {datos.length === 0
          ? "Todavía no cargaste nada. Empezá por lo que un inversor pregunta primero: MRR, clientes y el pitch deck."
          : `${datos.length} ${datos.length === 1 ? "dato cargado" : "datos cargados"} · ${compartidos} ${
              compartidos === 1 ? "compartido" : "compartidos"
            }.`}
      </p>

      <div className="flex flex-col gap-3">
        {CATEGORIAS_DATO.map((categoria) => {
          const defs = DATOS.filter((d) => d.categoria === categoria);
          const cargados = defs.filter((d) => porClave.has(d.clave)).length;
          return (
            <details key={categoria} className="group rounded-2xl border border-tinta/15 bg-marfil">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-medium text-tinta [&::-webkit-details-marker]:hidden">
                <span>{categoria}</span>
                <span className="flex items-center gap-3 text-sm font-normal text-tinta/70">
                  <span className="tabular-nums">
                    {cargados}/{defs.length}
                  </span>
                  <span
                    aria-hidden
                    className="text-xl text-tinta transition-transform duration-300 ease-pecera group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <ul className="flex flex-col divide-y divide-tinta/10 border-t border-tinta/10">
                {defs.map((def) => (
                  <li key={def.clave} className="px-4 py-4">
                    <FilaDato def={def} dato={porClave.get(def.clave)} slugEmpresa={slugEmpresa} />
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </Tarjeta>
  );
}

/**
 * El concepto del glosario, adentro de la cuenta de empresa: definición y ejemplo
 * sin salir de la página. El link lleva al glosario completo.
 */
function Concepto({ slug }: { slug?: string }) {
  const concepto = slug ? getConcepto(slug) : undefined;
  if (!concepto) return null;
  return (
    <details className="group rounded-xl bg-tinta/[0.04] text-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 text-tinta/75 hover:text-tinta [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-full border border-tinta/40 font-display text-[11px] font-bold italic"
        >
          i
        </span>
        ¿Qué es {concepto.termino}?
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3 leading-relaxed">
        <p className="text-tinta/85">{concepto.definicion}</p>
        <p className="rounded-lg bg-t-ocre-suave px-3 py-2 text-t-ocre">
          <span className="font-semibold">Ejemplo: </span>
          {concepto.ejemplo}
        </p>
        <Link
          href={`/docs/conceptos#${concepto.slug}`}
          className="self-start text-xs font-medium text-tinta underline decoration-tinta/30 underline-offset-4"
        >
          Ver en el glosario
        </Link>
      </div>
    </details>
  );
}

function FilaDato({
  def,
  dato,
  slugEmpresa,
}: {
  def: DefDato;
  dato: DatoEmpresa | undefined;
  slugEmpresa: string;
}) {
  const [estado, accion, guardando] = useActionState(
    (_previo: Resultado, formData: FormData) => guardarDato(formData),
    INICIAL
  );
  const [visible, setVisible] = useState(dato?.visible ?? false);
  const id = `dato-${def.clave}`;
  const campo = def.tipo === "link" ? "url" : "valor";
  const inicial = (def.tipo === "link" ? dato?.url : dato?.valor) ?? "";

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="clave" value={def.clave} />
      <input type="hidden" name="slug_empresa" value={slugEmpresa} />
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {def.label}
      </label>
      <p className="-mt-1 text-sm text-tinta/70">{def.ayuda}</p>
      <Concepto slug={def.concepto} />
      <input
        id={id}
        name={campo}
        type={def.tipo === "link" ? "url" : "text"}
        inputMode={def.tipo === "link" ? "url" : "text"}
        maxLength={def.tipo === "link" ? 300 : 280}
        defaultValue={inicial}
        placeholder={def.ejemplo}
        className={INPUT}
      />
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-tinta">
          <input
            type="checkbox"
            name="visible"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-6 w-10 shrink-0 rounded-full bg-tinta/20 transition-colors duration-200 ease-pecera peer-checked:bg-t-verde peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-arcilla after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-marfil after:transition-transform after:duration-200 after:ease-pecera peer-checked:after:translate-x-4"
          />
          {visible ? "Compartido en la página" : "Privado"}
        </label>
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-sm font-medium text-marfil transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-70"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
    </form>
  );
}
