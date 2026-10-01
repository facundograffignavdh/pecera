"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cambiarVisibilidad, guardarPlantilla, type ResultadoGuardado } from "@/app/cuenta/dataroom";
import CampoPlantilla from "@/components/dataroom/CampoPlantilla";
import SwitchTransparencia from "@/components/SwitchTransparencia";
import { crearBorrador } from "@/lib/borrador";
import { labelCategoria, type ValorCampo } from "@/lib/dataroom";
import {
  type Plantilla,
  campoVisible,
  errorCampo,
  formatoValor,
  plantilla as buscarPlantilla,
  progresoPlantilla,
} from "@/lib/plantillas";

type Estado = "sin-cambios" | "pendiente" | "guardando" | "guardado" | "error";
type Respaldo = { valores: Record<string, ValorCampo>; en: number };

const HORA = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
const ESPERA_AUTOSAVE_MS = 1500;

/**
 * Editor de un template de Academy. Paso a paso, con "Revisar" al final. Se guarda
 * solo (1,5 s después de dejar de escribir y al cambiar de paso) y, por las dudas,
 * también en el celular: si el guardado falla o se corta la conexión, nada se pierde.
 */
export default function EditorPlantilla({
  plantillaId,
  inicial,
  docId: docInicial,
  visible,
  actualizado,
}: {
  plantillaId: string;
  inicial: Record<string, ValorCampo>;
  docId: string | null;
  visible: boolean;
  /** Última vez que se guardó en la base (ms), para comparar con el respaldo local. */
  actualizado: number;
}) {
  const p = buscarPlantilla(plantillaId) as Plantilla;
  const respaldo = useMemo(() => crearBorrador<Respaldo>(`pecera:plantilla:${plantillaId}`), [plantillaId]);
  const guardadoLocal = respaldo.useGuardado();

  const [valores, setValores] = useState<Record<string, ValorCampo>>(inicial);
  const [paso, setPaso] = useState(0);
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intentoAvanzar, setIntentoAvanzar] = useState(false);
  const [estado, setEstado] = useState<Estado>("sin-cambios");
  const [guardadoA, setGuardadoA] = useState<string | null>(null);
  const [docId, setDocId] = useState(docInicial);
  const [final, setFinal] = useState<ResultadoGuardado | null>(null);
  const [respaldoResuelto, setRespaldoResuelto] = useState(false);
  const ultimoEnviado = useRef(JSON.stringify(inicial));

  const total = p.pasos.length + 1; // + Revisar
  const revisando = paso === p.pasos.length;
  const progreso = progresoPlantilla(p, valores);
  const moneda = typeof valores.moneda === "string" ? valores.moneda : "USD";

  const ofrecerRespaldo =
    !respaldoResuelto &&
    !!guardadoLocal &&
    guardadoLocal.en > actualizado &&
    JSON.stringify(guardadoLocal.valores) !== JSON.stringify(inicial);

  const guardar = useCallback(
    async (esFinal = false) => {
      const serial = JSON.stringify(valores);
      if (!esFinal && serial === ultimoEnviado.current) return;
      setEstado("guardando");
      let r: ResultadoGuardado;
      try {
        r = await guardarPlantilla(plantillaId, valores, esFinal);
      } catch {
        r = { ok: false, mensaje: "No pudimos guardar. Revisá tu conexión." };
      }
      if (r.ok) {
        ultimoEnviado.current = serial;
        if (r.id) setDocId(r.id);
        setGuardadoA(HORA.format(new Date()));
        setEstado("guardado");
        respaldo.borrar();
        if (esFinal) setFinal(r);
      } else {
        setEstado("error");
        if (esFinal) setFinal(r);
      }
    },
    [valores, plantillaId, respaldo]
  );

  // Autosave: después de una pausa al escribir. El respaldo local va enseguida.
  useEffect(() => {
    if (JSON.stringify(valores) === ultimoEnviado.current) return;
    respaldo.guardar({ valores, en: Date.now() });
    const espera = setTimeout(() => void guardar(), ESPERA_AUTOSAVE_MS);
    return () => clearTimeout(espera);
  }, [valores, guardar, respaldo]);

  // Salir con un guardado pendiente: el navegador pregunta.
  useEffect(() => {
    if (estado !== "pendiente" && estado !== "guardando" && estado !== "error") return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado]);

  function cambiar(id: string, v: ValorCampo) {
    setValores((vs) => ({ ...vs, [id]: v }));
    setEstado("pendiente");
    setFinal(null);
  }

  const visiblesPaso = revisando ? [] : p.pasos[paso].campos.filter((c) => campoVisible(c, valores));
  const errorDe = (id: string) => {
    const c = visiblesPaso.find((x) => x.id === id);
    if (!c) return null;
    const v = valores[c.id];
    const mostrar = tocados.has(c.id) || intentoAvanzar;
    if (!mostrar) return null;
    const e = errorCampo(c, v);
    if (e) return e;
    const vacio = v === undefined || (typeof v === "string" ? !v.trim() : !v.some((f) => Object.values(f).some((x) => x?.trim())));
    return intentoAvanzar && c.requerido && vacio ? "Completá este campo (o dejalo para después)." : null;
  };

  function ir(destino: number) {
    void guardar();
    setIntentoAvanzar(false);
    setPaso(destino);
    document.getElementById("editor-plantilla")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function siguiente() {
    const conError = visiblesPaso.some((c) => errorCampo(c, valores[c.id]));
    if (conError) {
      setIntentoAvanzar(true);
      return;
    }
    ir(paso + 1);
  }

  return (
    <div id="editor-plantilla" className="flex scroll-mt-24 flex-col gap-5">
      {ofrecerRespaldo && guardadoLocal && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl bg-celeste-suave px-4 py-3 text-sm text-tinta">
          <p>Hay cambios guardados en este celular que no llegaron a subirse. ¿Los recuperamos?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setValores(guardadoLocal.valores);
                setEstado("pendiente");
                setRespaldoResuelto(true);
              }}
              className="min-h-11 rounded-full bg-naranja px-4 font-semibold text-tinta hover:bg-pecera active:scale-[0.98]"
            >
              Recuperar cambios
            </button>
            <button
              type="button"
              onClick={() => {
                respaldo.borrar();
                setRespaldoResuelto(true);
              }}
              className="min-h-11 rounded-full border border-tinta/30 px-4 font-medium text-tinta"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Paso y progreso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-tinta">
            {revisando ? "Revisar" : `Paso ${paso + 1} de ${p.pasos.length}`}
            <span className="font-normal text-tinta/60"> · {labelCategoria(p.categoria)}</span>
          </span>
          <EstadoGuardado estado={estado} hora={guardadoA} onReintentar={() => void guardar()} />
        </div>
        <div
          role="progressbar"
          aria-label="Avance por pasos"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={paso + 1}
          className="flex gap-1"
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
              <span
                className="block h-full origin-left rounded-full bg-naranja transition-transform duration-500 ease-pecera"
                style={{ transform: `scaleX(${i <= paso ? 1 : 0})` } as CSSProperties}
              />
            </span>
          ))}
        </div>
        <p className="text-xs text-tinta/70">
          {Math.round(progreso.proporcion * 100)}% de lo obligatorio
          {progreso.completo && " · Completo"}
        </p>
      </div>

      {!revisando ? (
        <section aria-labelledby="paso-titulo" className="flex flex-col gap-5 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5">
          <div className="flex flex-col gap-1">
            <h2 id="paso-titulo" className="font-display text-xl font-semibold leading-tight text-tinta">
              {p.pasos[paso].titulo}
            </h2>
            {p.pasos[paso].bajada && <p className="text-sm text-tinta/70">{p.pasos[paso].bajada}</p>}
          </div>
          {visiblesPaso.map((c) => (
            <CampoPlantilla
              key={c.id}
              campo={c}
              valor={valores[c.id]}
              error={errorDe(c.id)}
              moneda={moneda}
              onCambiar={(v) => cambiar(c.id, v)}
              onSalir={() => setTocados((t) => new Set(t).add(c.id))}
            />
          ))}
        </section>
      ) : (
        <Revision p={p} valores={valores} irA={ir} faltan={progreso.faltan} />
      )}

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex gap-2 rounded-full bg-marfil/95 p-1.5 shadow-[0_8px_24px_rgb(28_27_22/0.18)]">
        <button
          type="button"
          onClick={() => ir(paso - 1)}
          disabled={paso === 0}
          className="min-h-12 flex-1 rounded-full border border-tinta/25 px-4 font-medium text-tinta transition-opacity duration-200 ease-pecera disabled:opacity-40"
        >
          Atrás
        </button>
        {revisando ? (
          <button
            type="button"
            onClick={() => void guardar(true)}
            disabled={estado === "guardando"}
            className="min-h-12 flex-[2] rounded-full bg-naranja px-4 font-semibold text-tinta disabled:opacity-70 hover:bg-pecera active:scale-[0.98]"
          >
            {estado === "guardando" ? "Guardando…" : "Guardar en el Dataroom"}
          </button>
        ) : (
          <button type="button" onClick={siguiente} className="min-h-12 flex-[2] rounded-full bg-naranja px-4 font-semibold text-tinta hover:bg-pecera active:scale-[0.98]">
            {paso === p.pasos.length - 1 ? "Revisar" : "Siguiente"}
          </button>
        )}
      </div>

      {final && (
        <div role={final.ok ? "status" : "alert"} className="aparecer-pop flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-t-verde-suave/60 px-4 py-4 text-tinta">
          <p className="font-medium">{final.ok ? `✓ ${final.mensaje}` : final.mensaje}</p>
          {final.ok && docId && (
            <>
              <SwitchTransparencia
                visible={visible}
                etiqueta={p.nombre}
                onCambiar={(v) => cambiarVisibilidad(docId, v)}
              />
              <Link href="/cuenta/dataroom" className="inline-flex min-h-11 items-center self-start rounded-full bg-naranja px-5 text-sm font-semibold text-tinta hover:bg-pecera active:scale-[0.98]">
                Ir al Dataroom
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EstadoGuardado({ estado, hora, onReintentar }: { estado: Estado; hora: string | null; onReintentar: () => void }) {
  if (estado === "error") {
    return (
      <span role="alert" className="flex items-center gap-2 text-xs font-medium text-tinta">
        <span aria-hidden className="size-1.5 rounded-full bg-arcilla" />
        No se guardó
        <button type="button" onClick={onReintentar} className="min-h-9 underline underline-offset-4">
          Reintentar
        </button>
      </span>
    );
  }
  const texto =
    estado === "guardando" ? "Guardando…" : estado === "pendiente" ? "Cambios sin guardar" : hora ? `Guardado · ${hora}` : "";
  return (
    <span role="status" className="flex items-center gap-1.5 text-xs text-tinta/70">
      {estado === "guardado" && <span aria-hidden className="aparecer-pop size-1.5 rounded-full bg-aliado" />}
      {texto}
    </span>
  );
}

function Revision({
  p,
  valores,
  irA,
  faltan,
}: {
  p: Plantilla;
  valores: Record<string, ValorCampo>;
  irA: (paso: number) => void;
  faltan: string[];
}) {
  return (
    <section aria-labelledby="revisar-titulo" className="flex flex-col gap-4">
      <h2 id="revisar-titulo" className="font-display text-xl font-semibold leading-tight text-tinta">
        Revisá antes de guardar
      </h2>
      {faltan.length > 0 && (
        <div className="rounded-2xl border-2 border-arcilla/60 px-4 py-3 text-sm text-tinta">
          <p className="font-semibold">Falta completar:</p>
          <ul className="mt-1 list-disc pl-5">
            {faltan.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2 text-tinta/70">Podés guardarlo igual como borrador y completarlo después.</p>
        </div>
      )}
      {p.pasos.map((paso, i) => {
        const respondidos = paso.campos.filter((c) => campoVisible(c, valores) && formatoValor(c, valores[c.id], valores));
        return (
          <div key={paso.titulo} className="rounded-2xl border border-tinta/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-tinta">{paso.titulo}</h3>
              <button type="button" onClick={() => irA(i)} className="min-h-10 text-sm font-medium text-tinta underline underline-offset-4">
                Editar
              </button>
            </div>
            {respondidos.length ? (
              <dl className="mt-2 flex flex-col gap-2">
                {respondidos.map((c) => (
                  <div key={c.id}>
                    <dt className="text-xs text-tinta/60">{c.label}</dt>
                    <dd className="whitespace-pre-line text-sm text-tinta">{formatoValor(c, valores[c.id], valores)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-1 text-sm text-tinta/60">Todavía sin respuestas.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
