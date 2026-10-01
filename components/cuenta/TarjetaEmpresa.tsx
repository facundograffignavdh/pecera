"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { crearEmpresa, unirseEmpresa } from "@/app/cuenta/empresa";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import { Aviso, BOTON_PRIMARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { slugDesdeNombre, urlSitio } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  conTono,
} from "@/lib/etiquetas";

export type MiEmpresa = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  web: string | null;
  linkedin: string | null;
  instagram: string | null;
  industrias: string[];
  etapa: string | null;
  ronda: string | null;
  /** URL ya armada (mi_empresa_v2); null sin logo o sin la migración feria_pro. */
  logo_url?: string | null;
  ubicacion?: string | null;
  codigo: string | null;
  es_dueno: boolean;
  visible: boolean;
  miembros: number;
};

const OPCIONES_INDUSTRIAS = conTono(INDUSTRIAS);
const OPCIONES_CARGOS = conTono(CARGOS);
const INICIAL: Resultado = { ok: false };

/** "A1B2C3D4" → "A1B2-C3D4": se dicta y se copia más fácil. */
export const formatoCodigo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

/** Dirección pública de la empresa. */
const urlEmpresa = (slug: string) => urlSitio(`/e/${slug}`);

export default function TarjetaEmpresa({ empresa }: { empresa: MiEmpresa | null }) {
  return (
    <Tarjeta
      titulo="Tu empresa"
      bajada="Una página con todo tu equipo, cada uno con su cargo, y todos sus pitches juntos."
    >
      {empresa ? <ConEmpresa empresa={empresa} /> : <SinEmpresa />}
    </Tarjeta>
  );
}

function SinEmpresa() {
  const [modo, setModo] = useState<"crear" | "unirme">("crear");
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Empresa" className="grid grid-cols-2 gap-1 rounded-full bg-tinta/5 p-1">
        {(
          [
            ["crear", "Crear empresa"],
            ["unirme", "Tengo un código"],
          ] as const
        ).map(([valor, label]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => setModo(valor)}
            className={`min-h-11 rounded-full text-sm font-medium transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              modo === valor ? "bg-tinta text-marfil" : "text-tinta/75 hover:text-tinta"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {modo === "crear" ? <FormCrear /> : <FormUnirme />}
    </div>
  );
}

export function CamposEmpresa({
  inicial,
  conSlug,
}: {
  inicial?: MiEmpresa;
  conSlug: boolean;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [industrias, setIndustrias] = useState<string[]>(inicial?.industrias ?? []);
  const [etapa, setEtapa] = useState(inicial?.etapa ?? "");
  const [ronda, setRonda] = useState(inicial?.ronda ?? "");
  const slugVisible = slugTocado ? slug : slugDesdeNombre(nombre);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Nombre de la empresa
        <input
          name="nombre"
          required
          maxLength={80}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
        />
      </label>
      {conSlug && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          Dirección de la página
          <input
            name="slug"
            maxLength={60}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={slugVisible}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
            className={INPUT}
          />
          <span className="break-all text-sm font-normal text-tinta/70">
            {urlEmpresa(slugVisible || "tu-empresa")} · no se cambia después.
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Qué hace la empresa
        <textarea
          name="descripcion"
          required
          rows={3}
          maxLength={280}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={`${INPUT} resize-none`}
        />
        <span className="text-right text-xs font-normal text-tinta/60">{descripcion.length}/280</span>
      </label>
      <SelectorEtapa
        id="empresa-etapa"
        nombre="etapa"
        legend="Etapa"
        etapas={ETAPAS}
        valor={etapa}
        onCambiar={setEtapa}
      />
      <ChipsMultiple
        id="empresa-industrias"
        nombre="industrias"
        legend="Industria"
        opciones={OPCIONES_INDUSTRIAS}
        valores={industrias}
        onCambiar={setIndustrias}
        max={MAX_INDUSTRIAS_PROYECTO}
      />
      <ChipsUnico
        id="empresa-ronda"
        nombre="ronda"
        legend="Ronda que buscan"
        opciones={RONDAS}
        valor={ronda}
        onCambiar={setRonda}
        permitirNinguno
      />
    </>
  );
}

function CargoPropio() {
  const [cargo, setCargo] = useState("");
  return (
    <ChipsUnico
      id="empresa-cargo"
      nombre="cargo"
      legend="Tu cargo"
      opciones={OPCIONES_CARGOS}
      valor={cargo}
      onCambiar={setCargo}
      permitirNinguno
    />
  );
}

function FormCrear() {
  const [estado, accion, enviando] = useActionState(crearEmpresa, INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <CamposEmpresa conSlug />
      <CargoPropio />
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
      <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
        {enviando ? "Creando…" : "Crear empresa"}
      </button>
    </form>
  );
}

function FormUnirme() {
  const [estado, accion, enviando] = useActionState(unirseEmpresa, INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Código de tu empresa
        <input
          name="codigo"
          required
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={9}
          placeholder="A1B2-C3D4"
          className={`${INPUT} font-mono tracking-widest uppercase`}
        />
        <span className="text-sm font-normal text-tinta/70">
          Te lo pasa quien creó la empresa: está en su cuenta, en esta misma tarjeta.
        </span>
      </label>
      <CargoPropio />
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
      <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
        {enviando ? "Entrando…" : "Unirme a la empresa"}
      </button>
    </form>
  );
}

/** Con empresa: un resumen. Todo lo demás se administra en /cuenta/empresa. */
function ConEmpresa({ empresa }: { empresa: MiEmpresa }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={56} />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold leading-tight text-tinta">{empresa.nombre}</p>
          <p className="text-sm text-tinta/70">
            {empresa.miembros} {empresa.miembros === 1 ? "miembro" : "miembros"} ·{" "}
            {empresa.es_dueno ? "la creaste vos" : "sos parte del equipo"}
          </p>
        </div>
      </div>
      {!empresa.logo_url && (
        <p className="rounded-2xl bg-t-ocre-suave px-4 py-3 text-sm text-t-ocre">
          Sumale el logo: la página de la empresa se ve mucho mejor.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href="/cuenta/empresa" className={`${BOTON_PRIMARIO} boton flex-1`}>
          Administrar empresa
        </Link>
        {empresa.visible && (
          <Link
            href={`/e/${empresa.slug}`}
            className="boton inline-flex min-h-12 items-center justify-center rounded-full border border-tinta/30 px-5 font-medium text-tinta"
          >
            Ver página
          </Link>
        )}
      </div>
      <p className="text-sm text-tinta/65">Logo, datos, equipo, métricas y documentos.</p>
    </div>
  );
}
