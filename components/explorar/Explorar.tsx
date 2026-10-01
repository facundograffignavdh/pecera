"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import LogoEntidad from "@/components/LogoEntidad";
import { ESPECIALIDADES, ETAPAS, INDUSTRIAS, RONDAS_INTERES, labelEtapa, labelIndustria, labelRonda } from "@/lib/etiquetas";
import type { FichaDirectorio } from "@/lib/explorar";
import { GEOGRAFIAS, labelGeografia } from "@/lib/portfolio";
import { ROLES, TIPOS } from "@/lib/rol";

type Vista = "todo" | "startups" | "inversores" | "aliados";

const VISTAS: Array<{ id: Vista; label: string }> = [
  { id: "todo", label: "Todo" },
  { id: "startups", label: "Startups" },
  { id: "inversores", label: "Inversores" },
  { id: "aliados", label: "Aliados" },
];

const POR_PAGINA = 30;
const SELECT =
  "min-h-11 rounded-full border border-tinta/20 bg-marfil px-3.5 text-sm text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Lo que se busca de cada ficha: nombre, rol, industrias (propias y del portfolio), servicios, tesis. */
function texto(f: FichaDirectorio): string {
  return normalizar(
    [
      f.nombre,
      f.descripcion,
      f.clase === "empresa" ? "startup empresa" : "",
      f.rol ? ROLES[f.rol].label : "",
      f.rol === "inversor" ? "inversores inversion invierte" : "",
      f.rol === "aliado" ? "aliados aliado servicios" : "",
      f.tipo ? TIPOS[f.tipo] : "",
      ...f.industrias.map(labelIndustria),
      ...f.industriasPortfolio.map(labelIndustria),
      ...f.empresasPortfolio,
      ...f.servicios,
      ...f.categoriasServicio.map((c) => ESPECIALIDADES.find((e) => e.valor === c)?.label ?? c),
      ...f.especialidades.map((c) => ESPECIALIDADES.find((e) => e.valor === c)?.label ?? c),
      ...f.geografias.map(labelGeografia),
      f.empresa?.nombre ?? "",
    ].join(" ")
  );
}

/**
 * Directorio del ecosistema: búsqueda libre ("fintech inversor", "legal") y filtros
 * que cambian según lo que se mira. Los filtros de inversores y aliados usan su
 * portfolio real (en qué invirtieron, con quién trabajaron), no solo lo declarado.
 */
export default function Explorar({ fichas }: { fichas: FichaDirectorio[] }) {
  const params = useSearchParams();
  const [q, setQ] = useState(() => (params.get("q") ?? "").slice(0, 80));
  const [vista, setVista] = useState<Vista>(() => {
    const ver = params.get("ver");
    return VISTAS.some((v) => v.id === ver) ? (ver as Vista) : "todo";
  });
  const [industria, setIndustria] = useState("");
  const [etapa, setEtapa] = useState("");
  const [ronda, setRonda] = useState("");
  const [geografia, setGeografia] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [conPortfolio, setConPortfolio] = useState(false);
  const [pagina, setPagina] = useState(1);
  const qDiferida = useDeferredValue(q);

  const indice = useMemo(() => fichas.map((f) => ({ f, t: texto(f) })), [fichas]);

  const resultados = useMemo(() => {
    const palabras = normalizar(qDiferida.trim()).split(/\s+/).filter(Boolean);
    return indice
      .filter(({ f, t }) => {
        if (vista === "startups" && !(f.clase === "empresa" || f.rol === "emprendedor")) return false;
        if (vista === "inversores" && f.rol !== "inversor") return false;
        if (vista === "aliados" && f.rol !== "aliado") return false;
        if (industria && !f.industrias.includes(industria) && !f.industriasPortfolio.includes(industria)) return false;
        if (vista === "startups" && etapa && f.etapa !== etapa) return false;
        if (vista === "startups" && ronda && f.ronda !== ronda) return false;
        if (vista === "inversores" && ronda && !f.rondas_interes.includes(ronda)) return false;
        if (vista === "inversores" && geografia && !f.geografias.includes(geografia)) return false;
        if (vista === "inversores" && conPortfolio && f.inversiones === 0) return false;
        if (vista === "inversores" && conPortfolio && industria && !f.industriasPortfolio.includes(industria)) return false;
        if (vista === "aliados" && especialidad && !f.especialidades.includes(especialidad) && !f.categoriasServicio.includes(especialidad)) return false;
        if (vista === "aliados" && conPortfolio && f.apoyos + f.inversiones === 0) return false;
        return palabras.every((p) => t.includes(p));
      })
      .map(({ f }) => f);
  }, [indice, qDiferida, vista, industria, etapa, ronda, geografia, especialidad, conPortfolio]);

  function cambiarVista(v: Vista) {
    setVista(v);
    setEtapa("");
    setRonda("");
    setGeografia("");
    setEspecialidad("");
    setConPortfolio(false);
    setPagina(1);
    // La URL refleja la búsqueda: se puede compartir.
    const params = new URLSearchParams(window.location.search);
    if (v === "todo") params.delete("ver");
    else params.set("ver", v);
    window.history.replaceState(null, "", `?${params}`);
  }

  const visibles = resultados.slice(0, pagina * POR_PAGINA);
  const hayFiltros = !!(industria || etapa || ronda || geografia || especialidad || conPortfolio || q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="buscar" className="sr-only">
          Buscar en Pecera
        </label>
        <input
          id="buscar"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPagina(1);
            const params = new URLSearchParams(window.location.search);
            if (e.target.value) params.set("q", e.target.value);
            else params.delete("q");
            window.history.replaceState(null, "", `?${params}`);
          }}
          placeholder="Ej.: fintech inversor, legal, agtech…"
          autoComplete="off"
          className="w-full rounded-full border border-tinta/30 bg-marfil px-5 py-3 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
        />
      </div>

      <div role="tablist" aria-label="Qué mirar" className="flex gap-1 rounded-full bg-tinta/[0.06] p-1 lg:max-w-2xl">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            onClick={() => cambiarVista(v.id)}
            className={`min-h-10 flex-1 rounded-full px-2 text-sm font-medium transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              vista === v.id ? "bg-naranja text-tinta" : "text-tinta hover:bg-tinta/5"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        <select aria-label="Industria" value={industria} onChange={(e) => { setIndustria(e.target.value); setPagina(1); }} className={SELECT}>
          <option value="">Toda industria</option>
          {INDUSTRIAS.map((i) => (
            <option key={i.valor} value={i.valor}>{i.label}</option>
          ))}
        </select>
        {vista === "startups" && (
          <>
            <select aria-label="Etapa" value={etapa} onChange={(e) => setEtapa(e.target.value)} className={SELECT}>
              <option value="">Toda etapa</option>
              {ETAPAS.map((e) => (
                <option key={e.valor} value={e.valor}>{e.label}</option>
              ))}
            </select>
            <select aria-label="Ronda que busca" value={ronda} onChange={(e) => setRonda(e.target.value)} className={SELECT}>
              <option value="">Busque o no ronda</option>
              {RONDAS_INTERES.map((r) => (
                <option key={r.valor} value={r.valor}>Busca {r.label}</option>
              ))}
            </select>
          </>
        )}
        {vista === "inversores" && (
          <>
            <select aria-label="Ronda en la que invierte" value={ronda} onChange={(e) => setRonda(e.target.value)} className={SELECT}>
              <option value="">Toda ronda</option>
              {RONDAS_INTERES.map((r) => (
                <option key={r.valor} value={r.valor}>Invierte en {r.label}</option>
              ))}
            </select>
            <select aria-label="Geografía" value={geografia} onChange={(e) => setGeografia(e.target.value)} className={SELECT}>
              <option value="">Toda geografía</option>
              {GEOGRAFIAS.map((g) => (
                <option key={g.valor} value={g.valor}>{g.label}</option>
              ))}
            </select>
          </>
        )}
        {vista === "aliados" && (
          <select aria-label="Especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={SELECT}>
            <option value="">Toda especialidad</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e.valor} value={e.valor}>{e.label}</option>
            ))}
          </select>
        )}
        {(vista === "inversores" || vista === "aliados") && (
          <label className={`${SELECT} flex shrink-0 cursor-pointer items-center gap-2 ${conPortfolio ? "border-tinta bg-tinta text-marfil" : ""}`}>
            <input type="checkbox" checked={conPortfolio} onChange={(e) => setConPortfolio(e.target.checked)} className="sr-only" />
            {vista === "inversores" ? (industria ? "Invirtió en esta industria" : "Con inversiones cargadas") : "Con portfolio"}
          </label>
        )}
      </div>

      <p role="status" className="text-sm text-tinta/70">
        {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
        {hayFiltros && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => {
                setQ("");
                setIndustria("");
                setEtapa("");
                setRonda("");
                setGeografia("");
                setEspecialidad("");
                setConPortfolio(false);
                window.history.replaceState(null, "", vista === "todo" ? "?" : `?ver=${vista}`);
              }}
              className="font-medium text-tinta underline underline-offset-4"
            >
              Limpiar
            </button>
          </>
        )}
      </p>

      {resultados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-tinta/25 px-4 py-5 text-center text-sm text-tinta/75">
          No encontramos nada con esos filtros. Probá con menos palabras o sacá un filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3 xl:grid-cols-3">
          {visibles.map((f) => (
            <li key={`${f.clase}-${f.slug}`} className="lg:h-full">
              <Ficha f={f} />
            </li>
          ))}
        </ul>
      )}
      {visibles.length < resultados.length && (
        <button type="button" onClick={() => setPagina((p) => p + 1)} className="min-h-12 rounded-full border border-tinta/30 px-5 font-medium text-tinta hover:border-tinta lg:self-center lg:px-8">
          Ver más ({resultados.length - visibles.length})
        </button>
      )}
    </div>
  );
}

function Ficha({ f }: { f: FichaDirectorio }) {
  const href = f.clase === "empresa" ? `/e/${f.slug}` : `/p/${f.slug}`;
  const linea: string[] = [];
  if (f.clase === "empresa") {
    if (labelEtapa(f.etapa)) linea.push(labelEtapa(f.etapa)!);
    if (f.ronda && f.ronda !== "no_busca") linea.push(`Busca ${labelRonda(f.ronda)}`);
  } else if (f.rol === "inversor") {
    if (f.inversiones > 0) linea.push(`${f.inversiones} ${f.inversiones === 1 ? "inversión" : "inversiones"} cargadas`);
    if (f.industriasPortfolio.length) linea.push(`Portfolio: ${f.industriasPortfolio.slice(0, 3).map(labelIndustria).join(", ")}`);
    if (f.rondas_interes.length) linea.push(f.rondas_interes.map((r) => labelRonda(r)).join(" · "));
  } else if (f.rol === "aliado") {
    if (f.servicios.length) linea.push(f.servicios.slice(0, 2).join(" · "));
    if (f.apoyos + f.inversiones > 0) linea.push(`Trabajó con ${f.apoyos + f.inversiones}`);
  } else if (f.empresa) {
    linea.push(f.empresa.nombre);
  }
  return (
    <Link
      href={href}
      className="flex h-full items-start gap-3 rounded-2xl border border-tinta/10 bg-marfil px-3.5 py-3 transition-colors duration-200 ease-pecera hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      {f.clase === "empresa" ? (
        <LogoEntidad nombre={f.nombre} logoUrl={f.avatar_url} tamano="md" />
      ) : (
        <Avatar perfil={{ nombre: f.nombre, rol: f.rol ?? "emprendedor", avatar_url: f.avatar_url }} size={44} />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-tinta">{f.nombre}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
              f.clase === "empresa" ? "bg-tinta text-marfil" : `${ROLES[f.rol!].bg} text-marfil`
            }`}
          >
            {f.clase === "empresa" ? "Empresa" : ROLES[f.rol!].label}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-tinta/75">{f.descripcion}</span>
        {linea.length > 0 && <span className="mt-1 block truncate text-xs text-tinta/60">{linea.join(" · ")}</span>}
        {f.industrias.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {f.industrias.slice(0, 3).map((i) => (
              <span key={i} className="rounded-full border border-tinta/15 px-2 py-0.5 text-[0.6875rem] text-tinta">
                {labelIndustria(i)}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
