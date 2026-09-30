"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  crearEmpresa,
  editarEmpresa,
  renovarCodigo,
  salirEmpresa,
  unirseEmpresa,
} from "@/app/cuenta/empresa";
import BotonCopiar from "@/components/BotonCopiar";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { slugDesdeNombre, urlSitio } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  TONO,
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
  codigo: string | null;
  es_dueno: boolean;
  visible: boolean;
  miembros: number;
};

const OPCIONES_INDUSTRIAS = INDUSTRIAS.map(({ valor, label }) => ({ valor, label }));
const OPCIONES_CARGOS = CARGOS.map(({ valor, label, tono }) => ({ valor, label, tono: TONO[tono] }));
const INICIAL: Resultado = { ok: false };

/** "A1B2C3D4" → "A1B2-C3D4": se dicta y se copia más fácil. */
const formatoCodigo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

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

function CamposEmpresa({
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

function ConEmpresa({ empresa }: { empresa: MiEmpresa }) {
  const [codigo, setCodigo] = useState(empresa.codigo);
  const [mensaje, setMensaje] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [estadoEditar, accionEditar, guardando] = useActionState(editarEmpresa, INICIAL);

  const invitacion = codigo
    ? `Sumate a ${empresa.nombre} en Pecera: entrá a ${urlSitio("/cuenta")}, en "Tu empresa" tocá "Tengo un código" y poné ${formatoCodigo(codigo)}`
    : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="font-display text-2xl font-semibold leading-tight text-tinta">{empresa.nombre}</p>
        <p className="text-sm text-tinta/70">
          {empresa.miembros} {empresa.miembros === 1 ? "miembro" : "miembros"} ·{" "}
          {empresa.es_dueno ? "la creaste vos" : "sos parte del equipo"}
        </p>
        {empresa.visible ? (
          <Link
            href={`/e/${empresa.slug}`}
            className="mt-1 self-start font-medium text-tinta underline underline-offset-4 hover:text-arcilla"
          >
            Ver la página de la empresa
          </Link>
        ) : (
          <p className="mt-1 text-sm text-tinta/70">
            La página se ve cuando al menos un perfil del equipo está publicado.
          </p>
        )}
      </div>

      {codigo && (
        <div className="flex flex-col gap-3 rounded-2xl bg-tinta px-4 py-4 text-marfil">
          <p className="text-sm text-marfil/80">Código para invitar a tu equipo</p>
          <p className="font-mono text-3xl font-semibold tracking-[0.2em]">{formatoCodigo(codigo)}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar
              texto={formatoCodigo(codigo)}
              etiqueta="Copiar código"
              className="inline-flex min-h-11 items-center rounded-full bg-marfil px-4 text-sm font-medium text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(invitacion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-marfil/40 px-4 text-sm font-medium text-marfil hover:border-marfil"
            >
              Mandar por WhatsApp
            </a>
          </div>
          {empresa.es_dueno && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await renovarCodigo();
                  if (r.ok && r.codigo) setCodigo(r.codigo);
                  setMensaje(r);
                })
              }
              className="self-start text-sm text-marfil/80 underline underline-offset-4 hover:text-marfil"
            >
              Generar un código nuevo (el actual deja de servir)
            </button>
          )}
        </div>
      )}

      {mensaje?.mensaje && <Aviso ok={mensaje.ok}>{mensaje.mensaje}</Aviso>}

      {empresa.es_dueno && (
        <details className="group rounded-2xl border border-tinta/15 px-4 py-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium text-tinta [&::-webkit-details-marker]:hidden">
            Editar los datos de la empresa
            <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">
              +
            </span>
          </summary>
          <form action={accionEditar} className="mt-3 flex flex-col gap-4">
            <input type="hidden" name="slug_actual" value={empresa.slug} />
            <CamposEmpresa inicial={empresa} conSlug={false} />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
              Web
              <input name="web" defaultValue={empresa.web ?? ""} placeholder="tuempresa.com.ar" className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
              LinkedIn de la empresa
              <input
                name="linkedin"
                defaultValue={empresa.linkedin ?? ""}
                placeholder="linkedin.com/company/…"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
              Instagram
              <input name="instagram" defaultValue={empresa.instagram ?? ""} placeholder="@tuempresa" className={INPUT} />
            </label>
            {estadoEditar.mensaje && <Aviso ok={estadoEditar.ok}>{estadoEditar.mensaje}</Aviso>}
            <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
              {guardando ? "Guardando…" : "Guardar la empresa"}
            </button>
          </form>
        </details>
      )}

      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          const texto = empresa.es_dueno
            ? "¿Salir de la empresa? Si queda alguien del equipo, pasa a ser quien la administra."
            : "¿Salir de la empresa?";
          if (!window.confirm(texto)) return;
          iniciar(async () => setMensaje(await salirEmpresa()));
        }}
        className={`${BOTON_SECUNDARIO} self-start`}
      >
        Salir de la empresa
      </button>
    </div>
  );
}
