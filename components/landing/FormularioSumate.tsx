"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconoCerrar } from "@/components/Iconos";
import {
  DATOS_VACIOS,
  TIPOS_POR_ROL,
  enviarPostulacion,
  type DatosFormulario,
} from "@/lib/formulario";
import { ROLES, TIPOS } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

export const EVENTO_ABRIR_FORM = "pecera:abrir-form";

/** Cualquier CTA de la landing llama esto — no hace falta prop-drilling. */
export function abrirFormulario(rol?: Rol) {
  document.dispatchEvent(new CustomEvent(EVENTO_ABRIR_FORM, { detail: { rol: rol ?? null } }));
}

const SALIDA_MS = 150;
const PASOS = ["Rol", "Qué sos", "Tu proyecto", "Contacto", "Enviar"] as const;

const ROL_DESC: Record<Rol, string> = {
  emprendedor: "Tengo una startup —o una idea— y quiero mostrarla.",
  inversor: "Busco deal flow: quiero ver pitches y escribir directo.",
  aliado: "Aceleradora, incubadora, coach o mentor: ofrezco algo a los proyectos.",
};

const inputCls =
  "w-full rounded-2xl border border-tinta/15 bg-marfil px-4 py-3 text-base text-tinta placeholder:text-tinta/40 outline-none transition-colors duration-150 focus:border-arcilla";

export default function FormularioSumate() {
  const ref = useRef<HTMLDialogElement>(null);
  const [saliendo, setSaliendo] = useState(false);
  const timer = useRef<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<DatosFormulario>(DATOS_VACIOS);
  const [consiente, setConsiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    function onAbrir(e: Event) {
      const rol = (e as CustomEvent<{ rol: Rol | null }>).detail?.rol ?? null;
      setD({ ...DATOS_VACIOS, rol });
      setConsiente(false);
      setError(null);
      setEnviado(false);
      setPaso(rol ? 1 : 0);
      setAbierto(true);
    }
    document.addEventListener(EVENTO_ABRIR_FORM, onAbrir);
    return () => document.removeEventListener(EVENTO_ABRIR_FORM, onAbrir);
  }, []);

  useEffect(() => {
    const dialogo = ref.current;
    if (abierto && dialogo && !dialogo.open) dialogo.showModal();
  }, [abierto]);

  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  function cerrar() {
    if (timer.current !== null || enviando) return;
    setSaliendo(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      ref.current?.close();
    }, SALIDA_MS);
  }

  const patch = (p: Partial<DatosFormulario>) => setD((prev) => ({ ...prev, ...p }));

  const tiposDisponibles = useMemo(() => (d.rol ? TIPOS_POR_ROL[d.rol] : []), [d.rol]);

  const pasoValido = useMemo(() => {
    switch (PASOS[paso]) {
      case "Rol":
        return d.rol !== null;
      case "Qué sos":
        return d.tipo !== null;
      case "Tu proyecto":
        return d.nombre.trim().length >= 2 && d.descripcion.trim().length >= 8;
      default:
        return true;
    }
  }, [paso, d]);

  const tieneContacto = Boolean(d.whatsapp || d.email || d.linkedin || d.instagram || d.web);

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await enviarPostulacion(d);
      setEnviado(true);
    } catch {
      setError("No pudimos guardar tu postulación. Revisá tu conexión y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) return null;

  const nombrePaso = PASOS[paso];

  return (
    <dialog
      ref={ref}
      aria-labelledby="form-sumate-titulo"
      data-saliendo={saliendo || undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
      onClose={() => {
        setSaliendo(false);
        setAbierto(false);
      }}
      className="popup-pique m-0 h-dvh max-h-none w-full max-w-none items-center justify-center bg-transparent p-4 open:flex"
    >
      <div className="popup-tarjeta vidrio relative w-full max-w-md rounded-3xl px-6 pb-6 pt-6 text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_16px_40px_rgb(28_27_22/0.22)]">
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="group absolute right-3 top-3 flex h-11 w-11 items-center justify-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-tinta/15 bg-marfil/70 transition-colors duration-200 ease-pecera group-hover:bg-marfil">
            <IconoCerrar className="h-[18px] w-[18px]" />
          </span>
        </button>

        {enviado ? (
          <div className="pt-2 text-center">
            <svg viewBox="0 0 48 48" aria-hidden className="mx-auto h-11 w-11 text-aliado">
              <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth={2.5} />
              <path
                d="M15 24.5 21 31l12-13"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 id="form-sumate-titulo" className="mt-3 font-display text-2xl font-semibold">
              ¡Listo, ya la tenemos!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-tinta/75">
              Guardamos tu postulación. Te escribimos para coordinar cómo mandarnos tu pitch en video —
              con eso ya quedás listo para aparecer en el feed.
            </p>
            <button
              type="button"
              onClick={cerrar}
              className="mt-5 w-full rounded-full bg-tinta px-6 py-3 font-semibold text-marfil"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="pr-10 text-sm font-semibold uppercase tracking-[0.1em] text-tinta/60">
              Paso {paso + 1} de {PASOS.length} · {nombrePaso}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-tinta/10">
              <div
                className="h-full rounded-full bg-arcilla transition-[width] duration-400 ease-pecera"
                style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
              />
            </div>

            <div className="mt-5">
              {nombrePaso === "Rol" && (
                <>
                  <h2 id="form-sumate-titulo" className="font-display text-2xl font-semibold">
                    ¿Cómo entrás a la pecera?
                  </h2>
                  <div className="mt-4 grid gap-2.5">
                    {(Object.keys(ROLES) as Rol[]).map((rol) => (
                      <button
                        key={rol}
                        type="button"
                        onClick={() => patch({ rol, tipo: null })}
                        aria-pressed={d.rol === rol}
                        className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors duration-150 ${
                          d.rol === rol ? "border-arcilla bg-arcilla/5" : "border-tinta/10 hover:border-tinta/25"
                        }`}
                      >
                        <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ROLES[rol].bg}`} />
                        <span>
                          <span className="block font-display text-lg font-semibold">{ROLES[rol].label}</span>
                          <span className="mt-0.5 block text-sm text-tinta/70">{ROL_DESC[rol]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {nombrePaso === "Qué sos" && d.rol && (() => {
                const rolElegido = d.rol;
                return (
                  <>
                    <h2 id="form-sumate-titulo" className="font-display text-2xl font-semibold">
                      ¿Qué sos?
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tiposDisponibles.map((tipo) => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => patch({ tipo })}
                          aria-pressed={d.tipo === tipo}
                          className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                            d.tipo === tipo
                              ? `border-transparent text-marfil ${ROLES[rolElegido].bg}`
                              : "border-tinta/15 text-tinta/75 hover:border-tinta/30"
                          }`}
                        >
                          {TIPOS[tipo]}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}

              {nombrePaso === "Tu proyecto" && (
                <>
                  <h2 id="form-sumate-titulo" className="font-display text-2xl font-semibold">
                    Contanos qué es
                  </h2>
                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-semibold">Nombre del proyecto o persona</span>
                      <input
                        className={inputCls}
                        value={d.nombre}
                        onChange={(e) => patch({ nombre: e.target.value })}
                        placeholder="Raíz Verde"
                        autoFocus
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-semibold">Descripción en una línea</span>
                      <textarea
                        className={`${inputCls} resize-none`}
                        rows={2}
                        maxLength={150}
                        value={d.descripcion}
                        onChange={(e) => patch({ descripcion: e.target.value })}
                        placeholder="Convertimos la borra de café en sustrato para huertas."
                      />
                      <span className="text-right text-xs text-tinta/50">{150 - d.descripcion.length}</span>
                    </label>
                  </div>
                </>
              )}

              {nombrePaso === "Contacto" && (
                <>
                  <h2 id="form-sumate-titulo" className="font-display text-2xl font-semibold">
                    ¿Cómo te escriben?
                  </h2>
                  <p className="mt-1 text-sm text-tinta/70">Todos opcionales, pero sumá al menos uno.</p>
                  <div className="mt-4 grid gap-3">
                    <input
                      className={inputCls}
                      value={d.whatsapp}
                      onChange={(e) => patch({ whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="WhatsApp: 3516123456"
                      inputMode="numeric"
                    />
                    <input
                      className={inputCls}
                      type="email"
                      value={d.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      placeholder="Email de contacto"
                    />
                    <input
                      className={inputCls}
                      value={d.linkedin}
                      onChange={(e) => patch({ linkedin: e.target.value })}
                      placeholder="LinkedIn"
                    />
                    <input
                      className={inputCls}
                      value={d.instagram}
                      onChange={(e) => patch({ instagram: e.target.value })}
                      placeholder="Instagram"
                    />
                    <input
                      className={inputCls}
                      value={d.web}
                      onChange={(e) => patch({ web: e.target.value })}
                      placeholder="Web"
                    />
                  </div>
                  {!tieneContacto && (
                    <p className="mt-2 text-xs font-medium text-arcilla">
                      Sin ningún canal, no te podemos escribir para coordinar tu video.
                    </p>
                  )}
                </>
              )}

              {nombrePaso === "Enviar" && (
                <>
                  <h2 id="form-sumate-titulo" className="font-display text-2xl font-semibold">
                    Último paso
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-tinta/75">
                    Todavía no subiste tu pitch: eso lo coordinamos después, por{" "}
                    {d.whatsapp ? "WhatsApp" : "el canal que nos dejaste"}. Guardamos lo que completaste y con
                    eso ya arrancamos.
                  </p>
                  <label className="mt-4 flex items-start gap-3 text-sm text-tinta/80">
                    <input
                      type="checkbox"
                      checked={consiente}
                      onChange={(e) => setConsiente(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-arcilla"
                    />
                    Acepto que Pecera guarde estos datos para contactarme y publicar mi pitch cuando lo mande.
                  </label>
                  {error && <p className="mt-3 text-sm font-medium text-[#b3261e]">{error}</p>}
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={!consiente || enviando}
                    className="brillo mt-5 flex min-h-14 w-full items-center justify-center rounded-full bg-arcilla px-6 text-lg font-bold text-marfil transition-shadow duration-200 ease-pecera hover:shadow-[0_12px_28px_rgb(217_90_34/0.4)] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {enviando ? "Enviando…" : "Enviar postulación"}
                  </button>
                </>
              )}
            </div>

            {nombrePaso !== "Enviar" && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPaso((p) => Math.max(0, p - 1))}
                  disabled={paso === 0}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-tinta/70 transition-colors duration-150 hover:text-tinta disabled:pointer-events-none disabled:opacity-0"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setPaso((p) => Math.min(PASOS.length - 1, p + 1))}
                  disabled={!pasoValido}
                  className="flex-1 rounded-full bg-tinta px-6 py-3 text-center font-semibold text-marfil transition-opacity duration-150 disabled:opacity-30"
                >
                  Continuar
                </button>
              </div>
            )}
            {nombrePaso === "Enviar" && (
              <button
                type="button"
                onClick={() => setPaso((p) => Math.max(0, p - 1))}
                disabled={enviando}
                className="mt-3 w-full rounded-full px-4 py-2 text-center text-sm font-semibold text-tinta/70 transition-colors duration-150 hover:text-tinta disabled:pointer-events-none disabled:opacity-40"
              >
                Atrás
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
