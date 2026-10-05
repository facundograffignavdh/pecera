"use client";

import { useMemo, useState, useTransition } from "react";
import { participante, participanteEmpresa, pitchFeria, representante } from "@/app/admin/acciones";
import BotonAccion from "@/components/admin/BotonAccion";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

export type PerfilFeria = {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  visible: boolean;
  participa: boolean;
  representa: string | null;
  empresas: string | null;
  pitches: number;
  pitches_feria: number;
};

export type EmpresaFeria = {
  id: string;
  slug: string;
  nombre: string;
  visible: boolean;
  representante: string | null;
  integrantes: Array<{
    perfil_id: string;
    nombre: string;
    rol: Rol;
    visible: boolean;
    administra: boolean;
    participa: boolean;
  }>;
};

export type PitchFeria = {
  id: string;
  perfil_id: string;
  perfil: string;
  slug: string;
  descripcion: string | null;
  visible: boolean;
  con_tag: boolean;
};

export type DatosFeria = { perfiles: PerfilFeria[]; empresas: EmpresaFeria[]; pitches: PitchFeria[] };

const PESTANAS = [
  { id: "perfiles", label: "Perfiles" },
  { id: "empresas", label: "Empresas" },
  { id: "pitches", label: "Pitches" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "si", label: "Participan" },
  { id: "no", label: "No participan" },
  { id: "revisar", label: "Para revisar" },
] as const;
type Filtro = (typeof FILTROS)[number]["id"];

/** Cuántas filas se dibujan: con más, se pide afinar la búsqueda. */
const TOPE = 60;
const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const PILDORA = "rounded-full px-2 py-0.5 text-xs font-medium";
const ELEGIDO = "bg-tinta text-marfil";
const SUELTO = "border border-tinta/30 text-tinta";

const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Gestión de la feria en /admin: quién participa (perfiles y empresas) y qué pitches
 * llevan #feria21. Todo lo decide la base (cada RPC exige admin); acá solo se filtra.
 * Compite cualquier rol. "Para revisar" junta lo que no cierra: pitch con #feria21 de
 * quien no participa, participante sin pitch y empresas con dos o más integrantes anotadas (se reparten
 * los votos).
 */
export default function GestionFeria({ datos }: { datos: DatosFeria }) {
  const [pestana, setPestana] = useState<Pestana>("perfiles");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");

  const participa = useMemo(() => new Set(datos.perfiles.filter((p) => p.participa).map((p) => p.id)), [datos]);
  const q = normal(busqueda.trim());

  const perfiles = datos.perfiles.filter((p) => {
    if (q && !normal(`${p.nombre} ${p.slug} ${p.empresas ?? ""}`).includes(q)) return false;
    if (filtro === "si") return p.participa;
    if (filtro === "no") return !p.participa;
    if (filtro === "revisar") return revisarPerfil(p);
    return true;
  });
  const empresas = datos.empresas.filter((e) => {
    if (q && !normal(`${e.nombre} ${e.slug} ${e.integrantes.map((i) => i.nombre).join(" ")}`).includes(q)) return false;
    if (filtro === "si") return e.representante !== null;
    if (filtro === "no") return e.representante === null;
    if (filtro === "revisar") return revisarEmpresa(e);
    return true;
  });
  const pitches = datos.pitches.filter((x) => {
    if (q && !normal(`${x.perfil} ${x.slug} ${x.descripcion ?? ""}`).includes(q)) return false;
    if (filtro === "si") return x.con_tag;
    if (filtro === "no") return !x.con_tag;
    if (filtro === "revisar") return x.visible && x.con_tag !== participa.has(x.perfil_id);
    return true;
  });
  const visibles = pestana === "perfiles" ? perfiles.length : pestana === "empresas" ? empresas.length : pitches.length;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="gestion-feria">
      <div>
        <h2 id="gestion-feria" className="font-display text-xl font-semibold text-tinta">
          Quién participa
        </h2>
        <p className="mt-1 text-sm text-tinta/70">
          {participa.size} perfiles anotados · {datos.empresas.filter((e) => e.representante).length} empresas ·{" "}
          {datos.pitches.filter((x) => x.con_tag).length} pitches con #feria21. Una empresa participa a través de una
          sola persona (quien la administra), así sus votos no se reparten.
        </p>
      </div>

      <div className="flex gap-1.5" role="tablist" aria-label="Qué mirar">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`min-h-10 rounded-full px-3.5 text-sm font-medium ${pestana === p.id ? ELEGIDO : SUELTO}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, slug o empresa"
        aria-label="Buscar"
        className="min-h-11 rounded-xl border border-tinta/20 bg-marfil px-3 text-tinta placeholder:text-tinta/65 focus-visible:outline-2 focus-visible:outline-arcilla"
      />

      <div className="flex flex-wrap gap-1.5" aria-label="Filtro">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`min-h-9 rounded-full px-3 text-xs font-medium ${filtro === f.id ? ELEGIDO : SUELTO}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {pestana === "perfiles" && perfiles.slice(0, TOPE).map((p) => <FilaPerfil key={p.id} p={p} />)}
        {pestana === "empresas" && empresas.slice(0, TOPE).map((e) => <FilaEmpresa key={e.id} e={e} />)}
        {pestana === "pitches" && pitches.slice(0, TOPE).map((x) => <FilaPitch key={x.id} x={x} participa={participa.has(x.perfil_id)} />)}
        {visibles === 0 && <li className="text-sm text-tinta/70">Nada con ese filtro.</li>}
        {visibles > TOPE && (
          <li className="text-sm text-tinta/70">
            Se ven {TOPE} de {visibles}. Buscá por nombre para encontrar el resto.
          </li>
        )}
      </ul>
    </section>
  );
}

function revisarPerfil(p: PerfilFeria) {
  if (!p.visible) return false;
  return (p.participa && p.pitches === 0) || (!p.participa && p.pitches_feria > 0);
}

function revisarEmpresa(e: EmpresaFeria) {
  return e.integrantes.filter((i) => i.participa).length >= 2;
}

function FilaPerfil({ p }: { p: PerfilFeria }) {
  const avisos: string[] = [];
  if (p.participa && p.pitches === 0) avisos.push("sin pitch publicado");
  if (!p.participa && p.pitches_feria > 0) avisos.push("tiene pitch con #feria21");
  return (
    <li className={`${CAJA} flex items-center justify-between gap-3`}>
      <span className="min-w-0">
        <span className="block truncate font-medium text-tinta">{p.nombre}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-tinta/70">
          <span className={`${PILDORA} text-marfil ${ROLES[p.rol].bg}`}>{ROLES[p.rol].label}</span>
          {!p.visible && <span className={`${PILDORA} bg-tinta/10 text-tinta`}>no visible</span>}
          {p.participa && <span className={`${PILDORA} bg-tinta text-marfil`}>participa</span>}
          {p.representa && <span>representa a {p.representa}</span>}
          {!p.representa && p.empresas && <span className="truncate">{p.empresas}</span>}
          {avisos.map((a) => (
            <span key={a} className="font-medium text-t-arcilla">
              {a}
            </span>
          ))}
        </span>
      </span>
      {p.participa ? (
        <BotonAccion
          accion={participante.bind(null, p.id, false)}
          estilo="peligro"
          confirmar={`¿Sacar a ${p.nombre} de la feria? Deja de aparecer en la votación${p.representa ? ` y ${p.representa} deja de participar` : ""}.`}
        >
          Sacar
        </BotonAccion>
      ) : (
        <BotonAccion accion={participante.bind(null, p.id, true)}>Anotar</BotonAccion>
      )}
    </li>
  );
}

function FilaEmpresa({ e }: { e: EmpresaFeria }) {
  const elegibles = e.integrantes.filter((i) => i.visible);
  const anotadas = e.integrantes.filter((i) => i.participa).length;
  return (
    <li className={`${CAJA} flex flex-col gap-2`}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-medium text-tinta">{e.nombre}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-tinta/70">
            {e.representante && <span className={`${PILDORA} bg-tinta text-marfil`}>participa</span>}
            {!e.visible && <span className={`${PILDORA} bg-tinta/10 text-tinta`}>no visible</span>}
            <span>
              {e.integrantes.length} {e.integrantes.length === 1 ? "integrante" : "integrantes"}
            </span>
            {anotadas >= 2 && (
              <span className="font-medium text-t-arcilla">{anotadas} anotadas por su cuenta: se reparten los votos</span>
            )}
          </span>
        </span>
        {e.representante ? (
          <BotonAccion
            accion={participanteEmpresa.bind(null, e.id, false)}
            estilo="peligro"
            confirmar={`¿Sacar a ${e.nombre} de la feria? Quien la representa deja de aparecer en la votación.`}
          >
            Sacar
          </BotonAccion>
        ) : elegibles.length > 0 ? (
          <BotonAccion accion={participanteEmpresa.bind(null, e.id, true)}>Sumar</BotonAccion>
        ) : (
          <span className="text-right text-xs text-tinta/70">Sin integrante visible</span>
        )}
      </div>
      {e.representante && <ElegirRepresentante empresa={e} elegibles={elegibles} />}
    </li>
  );
}

function ElegirRepresentante({ empresa, elegibles }: { empresa: EmpresaFeria; elegibles: EmpresaFeria["integrantes"] }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const id = `representa-${empresa.id}`;
  return (
    <div className="flex flex-col gap-1 border-t border-tinta/10 pt-2">
      <label htmlFor={id} className="text-xs text-tinta/70">
        La representa (recibe los votos)
      </label>
      <select
        id={id}
        value={empresa.representante ?? ""}
        disabled={pendiente}
        onChange={(ev) => {
          const nueva = ev.target.value;
          const nombre = elegibles.find((i) => i.perfil_id === nueva)?.nombre ?? "esa persona";
          if (!window.confirm(`¿Pasar la representación a ${nombre}? Sus votos pasan con ella.`)) return;
          setError(null);
          iniciar(async () => {
            const r = await representante(empresa.id, nueva);
            if (!r.ok) setError(r.mensaje ?? "No se pudo.");
          });
        }}
        className="min-h-10 rounded-xl border border-tinta/20 bg-marfil px-2 text-sm text-tinta disabled:opacity-60"
      >
        {elegibles.map((i) => (
          <option key={i.perfil_id} value={i.perfil_id}>
            {i.nombre}
            {i.administra ? " (administra)" : ""}
          </option>
        ))}
        {!elegibles.some((i) => i.perfil_id === empresa.representante) && (
          <option value={empresa.representante ?? ""}>Otra persona (ya no es elegible)</option>
        )}
      </select>
      {error && (
        <span role="alert" className="text-xs font-medium text-t-arcilla">
          {error}
        </span>
      )}
    </div>
  );
}

function FilaPitch({ x, participa }: { x: PitchFeria; participa: boolean }) {
  const aviso = x.visible && x.con_tag !== participa ? (x.con_tag ? "su perfil no participa" : "su perfil participa") : null;
  return (
    <li className={`${CAJA} flex items-center justify-between gap-3`}>
      <span className="min-w-0">
        <span className="block truncate font-medium text-tinta">{x.perfil}</span>
        <span className="mt-0.5 line-clamp-2 text-sm text-tinta/70">{x.descripcion ?? "Sin descripción propia"}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          {x.con_tag && <span className={`${PILDORA} bg-tinta text-marfil`}>#feria21</span>}
          {!x.visible && <span className={`${PILDORA} bg-tinta/10 text-tinta`}>no visible</span>}
          {aviso && <span className="font-medium text-t-arcilla">{aviso}</span>}
        </span>
      </span>
      {x.con_tag ? (
        <BotonAccion accion={pitchFeria.bind(null, x.id, false)} estilo="peligro" confirmar="¿Quitar #feria21 de este pitch?">
          Quitar
        </BotonAccion>
      ) : (
        <BotonAccion accion={pitchFeria.bind(null, x.id, true)}>Sumar</BotonAccion>
      )}
    </li>
  );
}
