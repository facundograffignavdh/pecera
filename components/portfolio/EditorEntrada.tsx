"use client";

import { useEffect, useState } from "react";
import { type DatosEntrada, guardarEntrada } from "@/app/cuenta/portfolio";
import TarjetaEntrada from "@/components/portfolio/TarjetaEntrada";
import { INDUSTRIAS } from "@/lib/etiquetas";
import type { Resultado } from "@/lib/errores-base";
import {
  ESTADOS_PORTFOLIO,
  type EntradaPortfolio,
  LIMITES_PORTFOLIO as L,
  RONDAS_PORTFOLIO,
  TIPOS_PORTFOLIO,
  VISIBILIDADES,
} from "@/lib/portfolio";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/pecera";

const INPUT =
  "w-full rounded-xl border border-tinta/45 bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";
const PILDORA =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla";

type EmpresaPecera = { id: string; slug: string; nombre: string; industrias: string[] };

const VACIA: DatosEntrada = {
  id: null,
  tipo: "",
  empresa_id: null,
  nombre: "",
  web: "",
  industria: "",
  ubicacion: "",
  estado: "actual",
  ronda: "",
  lider: null,
  anio: "",
  rol: "",
  descripcion: "",
  desafio: "",
  solucion: "",
  resultados: [""],
  enlace: "",
  visibilidad: "publico",
};

export function datosDe(e: EntradaPortfolio): DatosEntrada {
  return {
    id: e.id,
    tipo: e.tipo,
    empresa_id: e.empresa_id,
    nombre: e.nombre,
    web: e.web ?? "",
    industria: e.industria ?? "",
    ubicacion: e.ubicacion ?? "",
    estado: e.estado,
    ronda: e.ronda ?? "",
    lider: e.lider,
    anio: e.anio ? String(e.anio) : "",
    rol: e.rol ?? "",
    descripcion: e.descripcion ?? "",
    desafio: e.desafio ?? "",
    solucion: e.solucion ?? "",
    resultados: e.resultados.length ? e.resultados : [""],
    enlace: e.enlace ?? "",
    visibilidad: e.visibilidad,
  };
}

/**
 * Sumar o editar una entrada del portfolio, por pasos: qué es → con quién (primero
 * se busca en Pecera, para enlazar y no duplicar) → detalles → (aliados) caso de
 * éxito opcional → quién lo ve → vista previa. Nada obligatorio de más.
 */
export default function EditorEntrada({
  rol,
  inicial,
  empresaInicial,
  onListo,
  onCancelar,
}: {
  rol: Rol;
  inicial?: DatosEntrada;
  empresaInicial?: { slug: string; nombre: string } | null;
  onListo: (mensaje: string) => void;
  onCancelar: () => void;
}) {
  const [d, setD] = useState<DatosEntrada>(inicial ?? VACIA);
  const [empresa, setEmpresa] = useState<{ slug: string; nombre: string } | null>(empresaInicial ?? null);
  const [manual, setManual] = useState(!!inicial && !inicial.empresa_id);
  const [paso, setPaso] = useState(inicial ? 2 : 0);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const pasos = ["Qué", "Con quién", "Detalles", ...(rol === "aliado" ? ["Caso"] : []), "Quién lo ve", "Revisar"];
  const nombrePaso = pasos[paso];
  const poner = <K extends keyof DatosEntrada>(k: K, v: DatosEntrada[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setError(null);
  };
  const tipos = TIPOS_PORTFOLIO.filter((t) => (t.para as readonly string[]).includes(rol));
  const esInversion = d.tipo === "inversion";

  function puedeSeguir(): string | null {
    if (nombrePaso === "Qué" && !d.tipo) return "Elegí qué tipo de relación es.";
    if (nombrePaso === "Con quién" && !d.empresa_id && !d.nombre.trim()) return "Elegí una empresa de Pecera o cargala a mano.";
    return null;
  }

  function seguir() {
    const e = puedeSeguir();
    if (e) {
      setError(e);
      return;
    }
    setPaso((p) => Math.min(p + 1, pasos.length - 1));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    let r: Resultado;
    try {
      r = await guardarEntrada({ ...d, resultados: d.resultados.filter((x) => x.trim()) });
    } catch {
      r = { ok: false, mensaje: "No pudimos guardar. Revisá tu conexión y probá de nuevo." };
    }
    setGuardando(false);
    if (r.ok) onListo(r.mensaje ?? "Guardado.");
    else setError(r.mensaje ?? "No pudimos guardar.");
  }

  const vistaPrevia: EntradaPortfolio = {
    id: d.id ?? "nueva",
    tipo: (d.tipo || "otro") as EntradaPortfolio["tipo"],
    empresa_id: d.empresa_id,
    empresa,
    nombre: empresa?.nombre ?? (d.nombre || "Sin nombre"),
    web: d.web || null,
    industria: d.industria || null,
    ubicacion: d.ubicacion || null,
    estado: d.estado as EntradaPortfolio["estado"],
    ronda: esInversion ? d.ronda || null : null,
    lider: esInversion ? d.lider : null,
    anio: d.anio ? Number(d.anio) : null,
    rol: d.rol || null,
    descripcion: d.descripcion || null,
    desafio: d.desafio || null,
    solucion: d.solucion || null,
    resultados: d.resultados.filter((x) => x.trim()),
    enlace: d.enlace || null,
    visibilidad: d.visibilidad as EntradaPortfolio["visibilidad"],
    confirmacion: d.empresa_id ? (d.visibilidad === "privado" ? "declarada" : "pendiente") : "declarada",
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-tinta/15 bg-marfil p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-tinta">
          Paso {paso + 1} de {pasos.length} · <span className="font-normal text-tinta/70">{nombrePaso}</span>
        </p>
        <div aria-hidden className="flex gap-1">
          {pasos.map((p, i) => (
            <span key={p} className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-pecera ${i <= paso ? "bg-naranja" : "bg-tinta/10"}`} />
          ))}
        </div>
      </div>

      {nombrePaso === "Qué" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-display text-lg font-semibold text-tinta">¿Qué estás sumando?</legend>
          <div className="flex flex-wrap gap-2">
            {tipos.map((t) => (
              <label key={t.valor} className={`${PILDORA} ${d.tipo === t.valor ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta hover:border-tinta/50"}`}>
                <input
                  type="radio"
                  name="tipo-entrada"
                  value={t.valor}
                  checked={d.tipo === t.valor}
                  onChange={() => {
                    poner("tipo", t.valor);
                    if (t.valor !== "inversion") setD((x) => ({ ...x, tipo: t.valor, ronda: "", lider: null, estado: x.estado === "exit" || x.estado === "adquirida" || x.estado === "cerrada" ? "pasado" : x.estado }));
                  }}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
          {rol === "inversor" && (
            <p className="text-xs text-tinta/65">“Inversión” es solo si pusiste capital. Si acompañaste sin invertir, elegí asesoría, mentoría o directorio.</p>
          )}
        </fieldset>
      )}

      {nombrePaso === "Con quién" && (
        <ConQuien
          d={d}
          empresa={empresa}
          manual={manual}
          onElegir={(e) => {
            setEmpresa({ slug: e.slug, nombre: e.nombre });
            setManual(false);
            setD((x) => ({ ...x, empresa_id: e.id, nombre: e.nombre, industria: x.industria || e.industrias[0] || "" }));
            setError(null);
          }}
          onManual={(nombre) => {
            setEmpresa(null);
            setManual(true);
            setD((x) => ({ ...x, empresa_id: null, nombre }));
          }}
          poner={poner}
        />
      )}

      {nombrePaso === "Detalles" && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-tinta">Estado</legend>
            <div className="flex flex-wrap gap-2">
              {ESTADOS_PORTFOLIO.filter((e) => esInversion || e.valor === "actual" || e.valor === "pasado").map((e) => (
                <label key={e.valor} className={`${PILDORA} ${d.estado === e.valor ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"}`}>
                  <input type="radio" name="estado-entrada" value={e.valor} checked={d.estado === e.valor} onChange={() => poner("estado", e.valor)} className="sr-only" />
                  {e.label}
                </label>
              ))}
            </div>
          </fieldset>
          {esInversion && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ent-ronda" className="text-sm font-medium text-tinta">Ronda (opcional)</label>
                <select id="ent-ronda" value={d.ronda} onChange={(e) => poner("ronda", e.target.value)} className={INPUT}>
                  <option value="">Sin especificar</option>
                  {RONDAS_PORTFOLIO.map((r) => (
                    <option key={r.valor} value={r.valor}>{r.label}</option>
                  ))}
                </select>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-tinta">¿Lideraste la ronda? (opcional)</legend>
                <div className="flex flex-wrap gap-2">
                  {([[true, "Sí, lideré"], [false, "Co-inversor"], [null, "Prefiero no decir"]] as const).map(([v, label]) => (
                    <label key={label} className={`${PILDORA} ${d.lider === v ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"}`}>
                      <input type="radio" name="lider" checked={d.lider === v} onChange={() => poner("lider", v)} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-tinta/65">No pedimos montos, porcentajes ni condiciones: lo confidencial queda afuera.</p>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-anio" className="text-sm font-medium text-tinta">Año en que empezó (opcional)</label>
            <input id="ent-anio" inputMode="numeric" maxLength={4} value={d.anio} onChange={(e) => poner("anio", e.target.value.replace(/\D/g, ""))} placeholder="Ej.: 2024" className={INPUT} />
          </div>
          {!esInversion && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ent-rol" className="text-sm font-medium text-tinta">
                {d.tipo === "cliente" ? "¿Qué servicios les diste?" : "¿Cuál fue tu rol?"} (opcional)
              </label>
              <input id="ent-rol" maxLength={L.rol} value={d.rol} onChange={(e) => poner("rol", e.target.value)} placeholder={d.tipo === "cliente" ? "Ej.: Constitución de la SAS y pacto de socios" : "Ej.: Mentora de go-to-market"} autoComplete="off" className={INPUT} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-desc" className="text-sm font-medium text-tinta">En pocas líneas (opcional)</label>
            <textarea id="ent-desc" rows={3} maxLength={L.descripcion} value={d.descripcion} onChange={(e) => poner("descripcion", e.target.value)} placeholder="Qué hacen y qué aportaste, sin datos confidenciales." className={INPUT} />
          </div>
        </div>
      )}

      {nombrePaso === "Caso" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-tinta/75">Opcional: convertilo en un caso de éxito. Contá el desafío, qué hicieron y qué cambió. Los resultados no son obligatorios; si los ponés, que sean reales.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-desafio" className="text-sm font-medium text-tinta">Desafío</label>
            <textarea id="ent-desafio" rows={3} maxLength={L.desafio} value={d.desafio} onChange={(e) => poner("desafio", e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-solucion" className="text-sm font-medium text-tinta">Qué hicieron</label>
            <textarea id="ent-solucion" rows={3} maxLength={L.solucion} value={d.solucion} onChange={(e) => poner("solucion", e.target.value)} className={INPUT} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-tinta">Resultados (hasta {L.resultados})</legend>
            {d.resultados.map((r, i) => (
              <input
                key={i}
                aria-label={`Resultado ${i + 1}`}
                maxLength={L.resultado}
                value={r}
                onChange={(e) => poner("resultados", d.resultados.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={i === 0 ? "Ej.: Constituyeron la SAS en 3 semanas" : ""}
                autoComplete="off"
                className={INPUT}
              />
            ))}
            {d.resultados.length < L.resultados && (
              <button type="button" onClick={() => poner("resultados", [...d.resultados, ""])} className="inline-flex min-h-11 items-center self-start rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta">
                + Sumar resultado
              </button>
            )}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-enlace" className="text-sm font-medium text-tinta">Link al caso (opcional)</label>
            <input id="ent-enlace" type="url" inputMode="url" spellCheck={false} maxLength={L.enlace} value={d.enlace} onChange={(e) => poner("enlace", e.target.value.trim())} placeholder="https://…" className={INPUT} />
          </div>
        </div>
      )}

      {nombrePaso === "Quién lo ve" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-display text-lg font-semibold text-tinta">¿Quién lo ve?</legend>
          {VISIBILIDADES.map((v) => (
            <label key={v.valor} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-arcilla ${d.visibilidad === v.valor ? "border-tinta" : "border-tinta/15"}`}>
              <input type="radio" name="visibilidad" value={v.valor} checked={d.visibilidad === v.valor} onChange={() => poner("visibilidad", v.valor)} className="mt-1 size-4 accent-tinta" />
              <span>
                <span className="block font-medium text-tinta">{v.label}</span>
                <span className="block text-sm text-tinta/70">{v.ayuda}</span>
              </span>
            </label>
          ))}
          {d.empresa_id && d.visibilidad !== "privado" && (
            <p className="text-xs text-tinta/70">Como la enlazaste a una empresa de Pecera, su equipo la va a ver en Mi perfil para confirmarla.</p>
          )}
        </fieldset>
      )}

      {nombrePaso === "Revisar" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta/75">Así se va a ver:</p>
          <TarjetaEntrada e={vistaPrevia} mostrarVisibilidad />
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-tinta">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {paso > 0 ? (
          <button type="button" onClick={() => setPaso((p) => p - 1)} className="min-h-12 rounded-full border border-tinta/25 px-5 font-medium text-tinta">
            Atrás
          </button>
        ) : (
          <button type="button" onClick={onCancelar} className="min-h-12 rounded-full border border-tinta/25 px-5 font-medium text-tinta">
            Cancelar
          </button>
        )}
        {nombrePaso === "Revisar" ? (
          <button type="button" onClick={guardar} disabled={guardando} className="min-h-12 flex-1 rounded-full bg-naranja px-5 font-semibold text-tinta disabled:opacity-70 hover:bg-pecera active:scale-[0.98]">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        ) : (
          <button type="button" onClick={seguir} className="min-h-12 flex-1 rounded-full bg-naranja px-5 font-semibold text-tinta hover:bg-pecera active:scale-[0.98]">
            Siguiente
          </button>
        )}
      </div>
      {paso > 0 && nombrePaso !== "Revisar" && (
        <button type="button" onClick={onCancelar} className="self-start text-xs font-medium text-tinta/70 underline underline-offset-4">
          Cancelar
        </button>
      )}
    </div>
  );
}

/**
 * "¿Con quién?": primero busca en las empresas de Pecera (para enlazar y no crear
 * duplicados); si no está, se carga a mano.
 */
function ConQuien({
  d,
  empresa,
  manual,
  onElegir,
  onManual,
  poner,
}: {
  d: DatosEntrada;
  empresa: { slug: string; nombre: string } | null;
  manual: boolean;
  onElegir: (e: EmpresaPecera) => void;
  onManual: (nombre: string) => void;
  poner: <K extends keyof DatosEntrada>(k: K, v: DatosEntrada[K]) => void;
}) {
  const [q, setQ] = useState(empresa?.nombre ?? d.nombre);
  const [resultados, setResultados] = useState<EmpresaPecera[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 2 || empresa?.nombre === termino) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      const { data, error } = await supabase
        .from("empresas")
        .select("id, slug, nombre, industrias")
        .ilike("nombre", `%${termino.replace(/[%_,()]/g, " ")}%`)
        .limit(5);
      if (cancelado) return;
      setBuscando(false);
      setResultados(error ? [] : ((data ?? []) as EmpresaPecera[]));
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [q, empresa?.nombre]);

  if (empresa) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-display text-lg font-semibold text-tinta">¿Con quién?</p>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-t-verde-suave px-4 py-3">
          <span>
            <span className="block text-xs font-semibold text-t-verde">Empresa de Pecera</span>
            <span className="block font-medium text-tinta">{empresa.nombre}</span>
          </span>
          <button type="button" onClick={() => onManual("")} className="min-h-10 text-sm font-medium text-tinta underline underline-offset-4">
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="ent-buscar" className="font-display text-lg font-semibold text-tinta">
        ¿Con quién?
      </label>
      <input
        id="ent-buscar"
        type="search"
        value={manual ? d.nombre : q}
        onChange={(e) => (manual ? poner("nombre", e.target.value) : setQ(e.target.value))}
        placeholder="Nombre de la empresa u organización"
        autoComplete="off"
        maxLength={L.nombre}
        className={INPUT}
      />
      {!manual && (
        <div aria-live="polite" className="flex flex-col gap-2">
          {buscando && <p className="text-sm text-tinta/60">Buscando en Pecera…</p>}
          {!buscando && resultados && resultados.length > 0 && (
            <>
              <p className="text-sm text-tinta/75">La encontramos en Pecera. ¿Usamos su perfil?</p>
              <ul className="flex flex-col gap-1.5">
                {resultados.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onElegir(e)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-tinta/15 px-4 text-left hover:border-tinta focus-visible:outline-2 focus-visible:outline-arcilla">
                      <span className="font-medium text-tinta">{e.nombre}</span>
                      <span className="text-xs text-tinta/60">Usar este perfil</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!buscando && resultados && resultados.length === 0 && q.trim().length >= 2 && (
            <p className="text-sm text-tinta/75">No está en Pecera todavía.</p>
          )}
          {q.trim().length >= 2 && (
            <button type="button" onClick={() => onManual(q.trim())} className="inline-flex min-h-11 items-center self-start rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta hover:border-tinta">
              Cargar “{q.trim().slice(0, 40)}” a mano
            </button>
          )}
        </div>
      )}
      {manual && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-web" className="text-sm font-medium text-tinta">Web (opcional)</label>
            <input id="ent-web" inputMode="url" spellCheck={false} maxLength={L.web} value={d.web} onChange={(e) => poner("web", e.target.value.trim())} placeholder="empresa.com" className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-industria" className="text-sm font-medium text-tinta">Industria (opcional)</label>
            <select id="ent-industria" value={d.industria} onChange={(e) => poner("industria", e.target.value)} className={INPUT}>
              <option value="">Sin especificar</option>
              {INDUSTRIAS.map((i) => (
                <option key={i.valor} value={i.valor}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-ubicacion" className="text-sm font-medium text-tinta">Ubicación (opcional)</label>
            <input id="ent-ubicacion" maxLength={L.ubicacion} value={d.ubicacion} onChange={(e) => poner("ubicacion", e.target.value)} placeholder="Ej.: Córdoba, Argentina" autoComplete="off" className={INPUT} />
          </div>
          <button type="button" onClick={() => { setQ(d.nombre); onManual(""); setResultados(null); }} className="self-start text-xs font-medium text-tinta/70 underline underline-offset-4">
            Volver a buscar en Pecera
          </button>
        </div>
      )}
    </div>
  );
}
