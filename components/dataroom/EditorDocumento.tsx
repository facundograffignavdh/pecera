"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cambiarVisibilidad, guardarDocumento, type ResultadoGuardado } from "@/app/cuenta/dataroom";
import SwitchTransparencia from "@/components/SwitchTransparencia";
import { CATEGORIAS_DATAROOM, LIMITES_DOCUMENTO } from "@/lib/dataroom";
import { esUrlSegura } from "@/lib/transparencia";

const INPUT =
  "w-full rounded-xl border border-tinta/45 bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";
const HORA = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

type Inicial = { id: string | null; titulo: string; categoria: string; cuerpo: string; url: string; visible: boolean };

/**
 * Documento propio: un texto (se guarda solo, 1,5 s después de dejar de escribir)
 * o un link a un documento que vive en otro lado (se guarda al tocar Guardar, para
 * no validar un link a medio pegar). Los dos pueden tener un link y una categoría.
 */
export default function EditorDocumento({ tipo, inicial }: { tipo: "escrito" | "link"; inicial: Inicial }) {
  const [id, setId] = useState(inicial.id);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [categoria, setCategoria] = useState(inicial.categoria);
  const [cuerpo, setCuerpo] = useState(inicial.cuerpo);
  const [url, setUrl] = useState(inicial.url);
  const [urlTocada, setUrlTocada] = useState(false);
  const [estado, setEstado] = useState<"" | "pendiente" | "guardando" | "guardado" | "error">("");
  const [hora, setHora] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoGuardado | null>(null);
  const ultimo = useRef(JSON.stringify([inicial.titulo, inicial.categoria, inicial.cuerpo, inicial.url]));
  const guardando = useRef(false);

  const errorUrl = url && !esUrlSegura(url) ? "El link tiene que empezar con https://" : null;

  async function guardar(final: boolean) {
    const serial = JSON.stringify([titulo, categoria, cuerpo, url]);
    if (!final && (serial === ultimo.current || guardando.current || !titulo.trim() || errorUrl)) return;
    guardando.current = true;
    setEstado("guardando");
    let r: ResultadoGuardado;
    try {
      r = await guardarDocumento({ id, tipo, categoria, titulo, cuerpo, url, final });
    } catch {
      r = { ok: false, mensaje: "No pudimos guardar. Revisá tu conexión y probá de nuevo." };
    }
    guardando.current = false;
    if (r.ok) {
      ultimo.current = serial;
      if (r.id && r.id !== id) {
        setId(r.id);
        // La dirección pasa a ser la del documento, sin recargar ni perder el foco.
        window.history.replaceState(null, "", `/cuenta/dataroom/doc/${r.id}`);
      }
      setHora(HORA.format(new Date()));
      setEstado("guardado");
    } else {
      setEstado("error");
    }
    if (final || !r.ok) setResultado(r);
  }

  // Autosave solo para textos.
  useEffect(() => {
    if (tipo !== "escrito") return;
    const espera = setTimeout(() => void guardar(false), 1500);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guardar lee el estado actual
  }, [tipo, titulo, categoria, cuerpo, url]);

  useEffect(() => {
    if (estado !== "pendiente" && estado !== "error") return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado]);

  const tocar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setEstado("pendiente");
    setResultado(null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setUrlTocada(true);
        if (!errorUrl) void guardar(true);
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-titulo" className="text-sm font-medium text-tinta">
          Título
        </label>
        <input
          id="doc-titulo"
          required
          maxLength={LIMITES_DOCUMENTO.titulo}
          value={titulo}
          onChange={(e) => tocar(setTitulo)(e.target.value)}
          placeholder={tipo === "link" ? "Ej.: Pitch deck (septiembre)" : "Ej.: Historia de la empresa"}
          autoComplete="off"
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-categoria" className="text-sm font-medium text-tinta">
          Categoría del Dataroom
        </label>
        <select id="doc-categoria" value={categoria} onChange={(e) => tocar(setCategoria)(e.target.value)} className={INPUT}>
          {CATEGORIAS_DATAROOM.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-url" className="text-sm font-medium text-tinta">
          {tipo === "link" ? "Link al documento" : "Link relacionado (opcional)"}
        </label>
        <input
          id="doc-url"
          type="url"
          inputMode="url"
          spellCheck={false}
          autoComplete="off"
          maxLength={LIMITES_DOCUMENTO.url}
          value={url}
          onChange={(e) => tocar(setUrl)(e.target.value.trim())}
          onBlur={() => setUrlTocada(true)}
          placeholder="https://drive.google.com/…"
          aria-invalid={urlTocada && !!errorUrl}
          aria-describedby="doc-url-ayuda"
          className={`${INPUT} ${urlTocada && errorUrl ? "border-2 border-arcilla" : ""}`}
        />
        <p id="doc-url-ayuda" className="text-xs text-tinta/70">
          {urlTocada && errorUrl ? errorUrl : "Revisá que quien lo abra tenga permiso (en Drive: “Cualquier persona con el link”)."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-cuerpo" className="text-sm font-medium text-tinta">
          {tipo === "link" ? "Nota (opcional)" : "Contenido"}
        </label>
        <textarea
          id="doc-cuerpo"
          rows={tipo === "link" ? 3 : 14}
          maxLength={LIMITES_DOCUMENTO.cuerpo}
          value={cuerpo}
          onChange={(e) => tocar(setCuerpo)(e.target.value)}
          placeholder={tipo === "link" ? "Qué es y de cuándo." : "Escribí acá. Dejá una línea en blanco entre párrafos."}
          className={INPUT}
        />
      </div>

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-full bg-marfil/95 p-1.5 pl-4 shadow-[0_8px_24px_rgb(28_27_22/0.18)]">
        <span role="status" className="min-w-0 flex-1 truncate text-xs text-tinta/70">
          {estado === "guardando"
            ? "Guardando…"
            : estado === "error"
              ? "No se guardó"
              : estado === "pendiente"
                ? tipo === "escrito"
                  ? "Cambios sin guardar"
                  : "Tocá Guardar"
                : hora
                  ? `Guardado · ${hora}`
                  : ""}
        </span>
        <button
          type="submit"
          disabled={estado === "guardando"}
          className="min-h-12 rounded-full bg-naranja px-6 font-semibold text-tinta disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {resultado?.mensaje && (
        <p role={resultado.ok ? "status" : "alert"} className={`rounded-2xl px-4 py-3 text-sm text-tinta ${resultado.ok ? "bg-t-verde-suave" : "border-2 border-arcilla font-medium"}`}>
          {resultado.ok ? "✓ " : ""}
          {resultado.mensaje}
        </p>
      )}

      {id && (
        <div className="flex flex-col gap-3 rounded-2xl border border-tinta/10 px-4 py-4">
          <SwitchTransparencia visible={inicial.visible} etiqueta={titulo || "Documento"} onCambiar={(v) => cambiarVisibilidad(id, v)} />
          <Link href="/cuenta/dataroom" className="self-start text-sm font-medium text-tinta underline underline-offset-4">
            Volver al Dataroom
          </Link>
        </div>
      )}
    </form>
  );
}
