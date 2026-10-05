"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { crearEmpresaBasica, elegirPrincipal, unirseEmpresa } from "@/app/cuenta/empresa";
import { ChipsUnico } from "@/components/Chips";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { ScoreConGuia } from "@/components/ScoreEmpresa";
import { BotonAgregar } from "@/components/perfil/SeccionEditable";
import { Campo, MensajeError, claseInput } from "@/components/perfil/editores/campos";
import Hoja from "@/components/ui/Hoja";
import { Aviso } from "@/components/cuenta/ui";
import { conEmpresa } from "@/lib/cuenta";
import type { EmpresaMia } from "@/lib/cuenta-empresa";
import type { Resultado } from "@/lib/errores-base";
import { CARGOS, TIPOS_EMPRESA, cargo, conTono, labelTipoEmpresa } from "@/lib/etiquetas";
import type { Score } from "@/lib/score";
import { boton } from "@/lib/ui";

const OPCIONES_CARGOS = conTono(CARGOS);
const INICIAL: Resultado = { ok: false };

/**
 * Empresas del perfil propio, debajo de la tarjeta: cada una con su logo, tipo y tu
 * cargo, y "Administrar" (logo, datos, equipo, producto…). Al final, "Agregar otra
 * empresa": crearla con lo básico o sumarse con el código del equipo. Una persona
 * puede no tener ninguna.
 */
export default function EmpresasDueno({
  empresas,
  max,
  scores = {},
}: {
  empresas: EmpresaMia[];
  max: number;
  /** Score crediticio de cada empresa, por id (lo transparente). La "i" explica cómo mejorarlo. */
  scores?: Record<string, Score>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [vez, setVez] = useState(0);
  const [lista, setLista] = useState<{ mensaje: string; slug: string | null } | null>(null);
  const lleno = empresas.length >= max;
  const [cambiando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function abrir() {
    setVez((v) => v + 1);
    setAbierta(true);
  }

  return (
    <section aria-labelledby="mis-empresas" id="seccion-empresas" className="flex scroll-mt-24 flex-col gap-2">
      <h2 id="mis-empresas" className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/65">
        {empresas.length === 1 ? "Empresa" : "Empresas"}
      </h2>
      {lista && (
        <Aviso ok>
          {lista.mensaje}{" "}
          <Link href={conEmpresa("/cuenta/empresa", lista.slug)} className="font-medium underline underline-offset-4">
            Ir a Administrar
          </Link>
        </Aviso>
      )}
      {empresas.map((e) => {
        const tipo = labelTipoEmpresa(e.tipo);
        const c = cargo(e.cargo)?.label;
        return (
          <div key={e.id} className="relative flex min-h-16 flex-wrap items-center gap-3 rounded-2xl border border-tinta/12 bg-marfil px-3 py-2.5">
            <Link href={`/e/${e.slug}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla">
              <LogoEmpresa nombre={e.nombre} logo={e.logo_url ?? null} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold uppercase tracking-[0.12em] text-tinta/65">
                  {[tipo ?? "Empresa", c].filter(Boolean).join(" · ")}
                </span>
                <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{e.nombre}</span>
              </span>
            </Link>
            <Link href={conEmpresa("/cuenta/empresa", e.slug)} className={`${boton("secundario", "sm")} shrink-0 px-4`}>
              Administrar
            </Link>
            {scores[e.id] && (
              <div className="flex basis-full items-center gap-2 pl-14 text-sm text-tinta/70">
                <ScoreConGuia
                  score={scores[e.id]}
                  propio={{ potencial: scores[e.id], hrefDataroom: conEmpresa("/cuenta/dataroom", e.slug) }}
                />
                <span>Tocá la i para ver cómo mejorarlo</span>
              </div>
            )}
            {empresas.length > 1 && !e.es_principal && (
              <button
                type="button"
                disabled={cambiando}
                onClick={() => iniciar(async () => setResultado(await elegirPrincipal(e.id)))}
                className="basis-full pl-14 text-left text-sm text-tinta/70 underline underline-offset-4 hover:text-tinta"
              >
                Hacer principal (va primero en tu perfil y en el reel)
              </button>
            )}
          </div>
        );
      })}
      {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
      {!lleno ? (
        <BotonAgregar onClick={abrir} bajada={empresas.length === 0 ? "Es opcional. Si tenés una, sumala con tu rol." : undefined}>
          {empresas.length === 0 ? "Agregar empresa o proyecto" : "Agregar otra empresa"}
        </BotonAgregar>
      ) : (
        <p className="text-sm text-tinta/70">Ya estás en {max} empresas, el máximo.</p>
      )}

      <HojaAgregar
        key={vez}
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        onListo={(mensaje, slug) => {
          setAbierta(false);
          setLista({ mensaje, slug });
        }}
      />
    </section>
  );
}

function HojaAgregar({
  abierta,
  onCerrar,
  onListo,
}: {
  abierta: boolean;
  onCerrar: () => void;
  onListo: (mensaje: string, slug: string | null) => void;
}) {
  const [modo, setModo] = useState<"crear" | "codigo">("crear");
  const [sucio, setSucio] = useState(false);
  const [tipo, setTipo] = useState("");
  const [cargoElegido, setCargo] = useState("");
  const [estado, accion, guardando] = useActionState(async (previo: Resultado, datos: FormData) => {
    try {
      const r = await (modo === "crear" ? crearEmpresaBasica : unirseEmpresa)(previo, datos);
      if (r.ok) onListo(r.mensaje ?? "¡Listo!", r.slug ?? null);
      return r;
    } catch {
      return { ok: false, mensaje: "Sin conexión. Probá de nuevo." };
    }
  }, INICIAL);

  const pestaña = (m: typeof modo, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => setModo(m)}
      className={`boton min-h-10 flex-1 rounded-full text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
        modo === m ? "bg-marfil text-tinta shadow-[0_2px_8px_rgb(28_27_22/0.12)]" : "text-tinta/70 hover:text-tinta"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Agregar una empresa"
      bajada="Tu perfil sigue siendo personal: la empresa se suma con tu rol en ella."
      sucio={sucio}
      pie={
        <div className="flex flex-col gap-2">
          {!estado.ok && estado.mensaje && <MensajeError>{estado.mensaje}</MensajeError>}
          <button type="submit" form="form-agregar-empresa" disabled={guardando} className={`${boton("oscuro", "lg")} w-full`}>
            {guardando ? "Guardando…" : modo === "crear" ? "Crear empresa" : "Sumarme"}
          </button>
        </div>
      }
    >
      <div role="tablist" aria-label="Cómo sumarla" className="mb-5 flex gap-1 rounded-full bg-tinta/[0.06] p-1">
        {pestaña("crear", "Crear una nueva")}
        {pestaña("codigo", "Tengo un código")}
      </div>
      <form id="form-agregar-empresa" action={accion} noValidate onChange={() => setSucio(true)} className="flex flex-col gap-5">
        {modo === "crear" ? (
          <>
            <Campo id="empresa-nombre" label="Nombre de la empresa o proyecto">
              <input id="empresa-nombre" name="nombre" type="text" required maxLength={80} placeholder="Raíz Verde" className={claseInput()} />
            </Campo>
            <ChipsUnico
              id="empresa-tipo"
              nombre="tipo"
              legend="¿Qué es?"
              opciones={TIPOS_EMPRESA}
              valor={tipo}
              onCambiar={(v) => {
                setTipo(v);
                setSucio(true);
              }}
              permitirNinguno
              ayuda="Opcional."
            />
            <p className="text-sm text-tinta/70">El logo, la descripción y el resto los cargás después, en Administrar.</p>
          </>
        ) : (
          <Campo id="empresa-codigo" label="Código de la empresa" ayuda="Te lo pasa quien la administra: 8 letras y números.">
            <input
              id="empresa-codigo"
              name="codigo"
              type="text"
              required
              maxLength={9}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="A1B2-C3D4"
              className={`${claseInput()} uppercase tracking-widest`}
            />
          </Campo>
        )}
        <ChipsUnico
          id="empresa-cargo"
          nombre="cargo"
          legend="Tu rol en ella"
          opciones={OPCIONES_CARGOS}
          valor={cargoElegido}
          onCambiar={(v) => {
            setCargo(v);
            setSucio(true);
          }}
          permitirNinguno
          ayuda="Opcional."
        />
      </form>
    </Hoja>
  );
}
