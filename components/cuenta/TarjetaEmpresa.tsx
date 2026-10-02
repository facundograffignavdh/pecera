"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { crearEmpresa, elegirPrincipal, unirseEmpresa } from "@/app/cuenta/empresa";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import { Aviso, BOTON_PRIMARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { conEmpresa, slugDesdeNombre, urlSitio } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  cargo as cargoDe,
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

/** Una empresa de la persona, como la arma lib/cuenta-empresa (logo ya como URL). */
export type EmpresaDeLista = MiEmpresa & { es_principal: boolean; cargo: string | null };

/**
 * "Mis empresas": todas (hasta `max`), la principal primero, y sumar otra creándola o
 * con un código. Cada una se administra en /cuenta/empresa?empresa=slug. Sin la
 * migración multi_empresa (`multi` false), una sola, como siempre.
 */
export default function TarjetaEmpresa({
  empresas,
  multi = false,
  max = 1,
}: {
  empresas: EmpresaDeLista[];
  multi?: boolean;
  max?: number;
}) {
  const [sumando, setSumando] = useState(false);
  const puedeSumar = empresas.length < (multi ? max : 1);
  return (
    <Tarjeta
      titulo="Mis empresas"
      bajada={
        empresas.length === 0
          ? "Una página con todo tu equipo, cada uno con su cargo, y todos sus pitches juntos."
          : multi
            ? `Podés ser parte de hasta ${max}. Tus pitches se ven en todas.`
            : undefined
      }
    >
      {empresas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {empresas.map((e) => (
            <FilaEmpresa key={e.id} empresa={e} varias={empresas.length > 1} multi={multi} />
          ))}
        </ul>
      )}
      {empresas.length === 0 ? (
        <SinEmpresa />
      ) : puedeSumar ? (
        sumando ? (
          <div className="flex flex-col gap-3 border-t border-tinta/10 pt-4">
            <p className="font-medium text-tinta">Sumar otra empresa</p>
            <SinEmpresa />
            <button type="button" onClick={() => setSumando(false)} className="self-start text-sm text-tinta/70 underline underline-offset-4 hover:text-tinta">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSumando(true)}
            className="boton inline-flex min-h-11 items-center self-start rounded-full border border-tinta/30 px-5 text-sm font-medium text-tinta hover:border-tinta"
          >
            + Sumar otra empresa
          </button>
        )
      ) : (
        multi && <p className="text-sm text-tinta/65">Llegaste al máximo de {max} empresas. Para sumar otra, salí de alguna.</p>
      )}
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
              modo === valor ? "bg-naranja text-tinta" : "text-tinta/75 hover:text-tinta"
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
          Te lo pasa alguien del equipo: está en su cuenta, en Administrar → Equipo.
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

/** Una empresa: un resumen. Todo lo demás se administra en /cuenta/empresa. */
function FilaEmpresa({ empresa, varias, multi }: { empresa: EmpresaDeLista; varias: boolean; multi: boolean }) {
  const logo = empresa.logo_url ?? null;
  const c = cargoDe(empresa.cargo);
  const [r, setR] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-tinta/10 bg-marfil px-4 py-4">
      <div className="flex items-center gap-3">
        <LogoEmpresa nombre={empresa.nombre} logo={logo} size={varias ? 48 : 56} />
        <div className="min-w-0 flex-1">
          <p className={`truncate font-display font-semibold leading-tight text-tinta ${varias ? "text-xl" : "text-2xl"}`}>
            {empresa.nombre}
          </p>
          <p className="text-sm text-tinta/70">
            {c ? `${c.label} · ` : ""}
            {empresa.miembros} {empresa.miembros === 1 ? "miembro" : "miembros"} ·{" "}
            {empresa.es_dueno ? "la administrás vos" : "sos parte del equipo"}
          </p>
        </div>
        {varias && empresa.es_principal && (
          <span className="shrink-0 rounded-full bg-tinta px-2.5 py-0.5 text-xs font-semibold text-marfil">Principal</span>
        )}
      </div>
      {!logo && (
        <p className="rounded-2xl bg-t-ocre-suave px-4 py-3 text-sm text-t-ocre">
          Sumale el logo: la página de la empresa se ve mucho mejor.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={conEmpresa("/cuenta/empresa", varias ? empresa.slug : null)} className={`${BOTON_PRIMARIO} boton flex-1`}>
          Administrar
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
      {varias && multi && !empresa.es_principal && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciar(async () => setR(await elegirPrincipal(empresa.id)))}
          className="self-start text-sm text-tinta/70 underline underline-offset-4 hover:text-tinta"
        >
          Hacer principal (va primero en tu perfil y en el reel)
        </button>
      )}
      {r?.mensaje && <Aviso ok={r.ok}>{r.mensaje}</Aviso>}
    </li>
  );
}
