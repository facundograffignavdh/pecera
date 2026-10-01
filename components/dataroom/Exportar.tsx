"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import DocumentoLectura from "@/components/dataroom/DocumentoLectura";
import LogoEntidad from "@/components/LogoEntidad";
import { CATEGORIAS_DATAROOM, CATEGORIA_DE_DATO, type Documento } from "@/lib/dataroom";
import { defDato } from "@/lib/transparencia";
import type { DatoEmpresa } from "@/types/pecera";

type Item =
  | { tipo: "doc"; clave: string; titulo: string; privado: boolean; borrador: boolean; doc: Documento }
  | { tipo: "dato"; clave: string; titulo: string; privado: boolean; borrador: false; dato: DatoEmpresa };

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Exportar el Dataroom: elegís qué va (por categoría y por documento) y sale una
 * hoja para guardar como PDF. Reglas: solo lo que está cargado (nada vacío ni de
 * ejemplo), lo privado y los borradores no van salvo que los marques a propósito.
 */
export default function Exportar({
  empresa,
  logo,
  documentos,
  datos,
}: {
  empresa: string;
  logo: string | null;
  documentos: Documento[];
  datos: DatoEmpresa[];
}) {
  const items = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    for (const c of CATEGORIAS_DATAROOM) mapa.set(c.valor, []);
    for (const d of datos) {
      const cat = CATEGORIA_DE_DATO[d.clave];
      if (!cat || (!d.valor && !d.url)) continue;
      mapa.get(cat)!.push({ tipo: "dato", clave: `dato:${d.clave}`, titulo: defDato(d.clave)?.label ?? d.clave, privado: !d.visible, borrador: false, dato: d });
    }
    for (const d of documentos) {
      const tieneAlgo = Object.keys(d.campos).length > 0 || !!d.cuerpo || !!d.url;
      if (!tieneAlgo) continue;
      mapa.get(d.categoria)!.push({ tipo: "doc", clave: `doc:${d.id}`, titulo: d.titulo, privado: !d.visible, borrador: !d.completo, doc: d });
    }
    return mapa;
  }, [documentos, datos]);

  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set([...items.values()].flat().filter((i) => !i.privado && !i.borrador).map((i) => i.clave))
  );
  const [para, setPara] = useState("");
  const [vista, setVista] = useState(false);
  const [hoy] = useState(() => FECHA.format(new Date()));

  function alternar(i: Item) {
    const nuevo = new Set(elegidos);
    if (nuevo.has(i.clave)) {
      nuevo.delete(i.clave);
    } else {
      if (i.privado && !window.confirm(`“${i.titulo}” es privado. ¿Incluirlo igual? Va a estar en el PDF que compartas; en Pecera sigue privado.`)) return;
      nuevo.add(i.clave);
    }
    setElegidos(nuevo);
  }

  function alternarCategoria(lista: Item[], todos: boolean) {
    const nuevo = new Set(elegidos);
    for (const i of lista) {
      if (todos) nuevo.delete(i.clave);
      else if (!i.privado && !i.borrador) nuevo.add(i.clave);
    }
    setElegidos(nuevo);
  }

  const seleccion = CATEGORIAS_DATAROOM.map((c) => ({ c, lista: (items.get(c.valor) ?? []).filter((i) => elegidos.has(i.clave)) })).filter((x) => x.lista.length);
  const privadosElegidos = [...items.values()].flat().filter((i) => i.privado && elegidos.has(i.clave)).length;
  const total = [...items.values()].flat().length;

  if (total === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-tinta/25 px-4 py-4 text-sm text-tinta/80">
        Todavía no hay información cargada para exportar. Completá algún template o cargá datos en Transparencia.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="no-imprimir flex flex-col gap-5">
        <p className="rounded-2xl bg-celeste-suave px-4 py-3 text-sm text-tinta">
          Solo se exporta lo que está cargado. Lo privado y los borradores quedan afuera salvo que los marques.
        </p>
        <ul className="flex flex-col gap-3">
          {CATEGORIAS_DATAROOM.map((c) => {
            const lista = items.get(c.valor) ?? [];
            const marcados = lista.filter((i) => elegidos.has(i.clave)).length;
            if (lista.length === 0) {
              return (
                <li key={c.valor} className="flex min-h-12 items-center justify-between rounded-2xl border border-tinta/10 px-4 text-sm text-tinta/50">
                  {c.label}
                  <span className="text-xs">Sin información</span>
                </li>
              );
            }
            return (
              <li key={c.valor} className="rounded-2xl border border-tinta/15 bg-marfil">
                <div className="flex min-h-12 items-center justify-between gap-3 px-4">
                  <span className="font-medium text-tinta">{c.label}</span>
                  <button type="button" onClick={() => alternarCategoria(lista, marcados > 0)} className="min-h-10 text-xs font-semibold text-tinta underline underline-offset-4">
                    {marcados > 0 ? "Quitar todo" : "Incluir todo"}
                  </button>
                </div>
                <ul className="flex flex-col border-t border-tinta/10">
                  {lista.map((i) => (
                    <li key={i.clave}>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-sm text-tinta">
                        <input type="checkbox" checked={elegidos.has(i.clave)} onChange={() => alternar(i)} className="size-5 shrink-0 accent-tinta" />
                        <span className="min-w-0 flex-1">{i.titulo}</span>
                        {i.privado && <span className="rounded-full bg-tinta/[0.07] px-2 py-0.5 text-[0.6875rem] font-semibold">Privado</span>}
                        {i.borrador && <span className="rounded-full bg-t-ocre-suave px-2 py-0.5 text-[0.6875rem] font-semibold text-t-ocre">Borrador</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="para" className="text-sm font-medium text-tinta">
            Para (opcional)
          </label>
          <input id="para" value={para} onChange={(e) => setPara(e.target.value)} maxLength={80} placeholder="Ej.: Fondo Pampa" autoComplete="off" className="w-full rounded-xl border border-tinta/45 bg-marfil px-3.5 py-2.5 text-base text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla" />
          <p className="text-xs text-tinta/60">Aparece en la portada. No se guarda.</p>
        </div>
        {privadosElegidos > 0 && (
          <p role="status" className="rounded-2xl border-2 border-arcilla/60 px-4 py-3 text-sm text-tinta">
            Incluiste {privadosElegidos} {privadosElegidos === 1 ? "elemento privado" : "elementos privados"}. Compartí el PDF solo con quien corresponda.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={seleccion.length === 0}
            onClick={() => {
              setVista(true);
              requestAnimationFrame(() => document.getElementById("hoja-dataroom")?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
            className="inline-flex min-h-12 items-center rounded-full bg-naranja px-6 font-semibold text-tinta disabled:opacity-50 hover:bg-pecera active:scale-[0.98]"
          >
            Ver cómo queda
          </button>
          {vista && (
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-12 items-center rounded-full border border-tinta/30 px-6 font-medium text-tinta hover:border-tinta">
              Descargar PDF
            </button>
          )}
        </div>
        {seleccion.length === 0 && <p className="text-sm text-tinta/70">Elegí al menos una cosa para exportar.</p>}
      </div>

      {vista && seleccion.length > 0 && (
        <article id="hoja-dataroom" className="hoja aparecer-pop flex scroll-mt-24 flex-col gap-8 rounded-3xl border border-tinta/10 bg-marfil px-5 py-8 sm:px-8">
          <header className="flex min-h-[40vh] flex-col justify-between gap-8 border-b border-tinta/15 pb-8 print:min-h-[60vh]">
            <Image src="/brand/wordmark-tinta.png" alt="Pecera" width={110} height={24} />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-tinta/55">Dataroom</p>
              {logo && <LogoEntidad nombre={empresa} logoUrl={logo} tamano="xl" />}
              <h1 className="font-display text-4xl font-semibold leading-tight text-tinta">{empresa}</h1>
              {para && <p className="text-lg text-tinta/80">Preparado para {para}</p>}
              <p className="text-sm text-tinta/60">Generado el {hoy}</p>
            </div>
            <ol className="flex flex-col gap-1 text-sm text-tinta/80">
              {seleccion.map(({ c, lista }, n) => (
                <li key={c.valor}>
                  {n + 1}. {c.label} <span className="text-tinta/50">({lista.length})</span>
                </li>
              ))}
            </ol>
          </header>
          {seleccion.map(({ c, lista }, n) => (
            <section key={c.valor} className="flex flex-col gap-5">
              <h2 className="font-display text-2xl font-semibold text-tinta">
                {n + 1}. {c.label}
              </h2>
              {lista.some((i) => i.tipo === "dato") && (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {lista.flatMap((i) =>
                    i.tipo === "dato"
                      ? [
                          <div key={i.clave} className="sin-corte flex flex-col rounded-xl border border-tinta/10 px-3 py-2.5">
                            <dt className="order-2 text-xs text-tinta/65">{i.titulo}</dt>
                            <dd className="order-1 break-words font-display text-lg font-semibold leading-tight text-tinta">
                              {i.dato.url ? <a href={i.dato.url}>{i.dato.valor || i.dato.url}</a> : i.dato.valor}
                            </dd>
                          </div>,
                        ]
                      : []
                  )}
                </dl>
              )}
              {lista.flatMap((i) =>
                i.tipo === "doc"
                  ? [
                      <div key={i.clave} className="flex flex-col gap-1">
                        {i.borrador && <p className="text-xs font-semibold text-t-ocre">Borrador: incompleto</p>}
                        <DocumentoLectura doc={i.doc} />
                      </div>,
                    ]
                  : []
              )}
            </section>
          ))}
          <footer className="border-t border-tinta/15 pt-4 text-xs leading-relaxed text-tinta/60">
            <p>Información cargada por el equipo de {empresa}; Pecera no la verifica.</p>
            <p>
              Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza
              oferta pública de valores o asesoramiento financiero.
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}
