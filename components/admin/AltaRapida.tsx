"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { buscarParecidos, crearAlta } from "@/app/admin/alta/acciones";
import BotonCopiar from "@/components/BotonCopiar";
import { MensajeError, claseInput, describir } from "@/components/perfil/editores/campos";
import {
  CONSENTIMIENTO_ALTA,
  EMPRESA_DESCRIPCION_MAX,
  EMPRESA_NOMBRE_MAX,
  type CampoAlta,
  type EmpresaParecida,
  type EntradaAlta,
  type ErroresAlta,
  type Parecido,
  validarAlta,
} from "@/lib/alta-rapida";
import { DESCRIPCION_MAX, NOMBRE_MAX, OPCIONES_ROL, urlPerfil } from "@/lib/cuenta";
import { TIPOS_EMPRESA, type TipoEmpresa } from "@/lib/etiquetas";
import { DIAS_FERIA, STAND_MAX, codigoTarjeta, conCodigoTarjeta } from "@/lib/tarjeta";
import { boton } from "@/lib/ui";
import type { Rol } from "@/types/pecera";

/** Lo que queda igual entre un alta y la siguiente ("Crear otro"). */
type Fijas = { feria: boolean; rol: Rol; empresaTipo: TipoEmpresa; publicado: boolean; dia: number | null };

const VACIO = { nombre: "", descripcion: "", empresa: "", empresaDescripcion: "", email: "", stand: "" };

type Creado = {
  id: string;
  slug: string;
  nombre: string;
  empresa: string | null;
  publicado: boolean;
  tarjeta: string | null;
};

const INPUT = "min-h-12 text-lg";
const ETIQUETA = "text-base font-medium text-tinta";

/**
 * Alta rápida en el stand: el equipo deja el perfil de la persona (y su empresa) creado en
 * segundos, sin que ella entre todavía con Google. Pensada para el celular y de pie: foco en el
 * primer campo, Enter pasa al siguiente, textos grandes. Si algo falla, lo escrito no se pierde.
 */
export default function AltaRapida({ contacto, eventoNombre }: { contacto: string; eventoNombre: string }) {
  const [campos, setCampos] = useState(VACIO);
  const [fijas, setFijas] = useState<Fijas>({
    feria: true,
    rol: "emprendedor",
    empresaTipo: "startup",
    publicado: true,
    dia: null,
  });
  const [consentimiento, setConsentimiento] = useState(false);
  const [parecidos, setParecidos] = useState<Parecido[]>([]);
  const [esOtra, setEsOtra] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaParecida[]>([]);
  const [empresaNueva, setEmpresaNueva] = useState(false);
  const [sumarA, setSumarA] = useState<EmpresaParecida | null>(null);
  const [errores, setErrores] = useState<ErroresAlta>({});
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<Creado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function poner(campo: keyof typeof VACIO, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    if (campo in errores) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (campo === "nombre") {
      setParecidos([]);
      setEsOtra(false);
    }
    if (campo === "empresa") {
      setEmpresas([]);
      setEmpresaNueva(false);
    }
  }

  // Enter pasa al siguiente campo visible; en el último, envía.
  function alEnter(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const lista = Array.from(form.current?.querySelectorAll<HTMLElement>("[data-sigue]") ?? []).filter(
      (el) => el.offsetParent !== null
    );
    const siguiente = lista[lista.indexOf(e.currentTarget) + 1];
    if (siguiente) siguiente.focus();
    else form.current?.requestSubmit();
  }

  async function revisarNombre() {
    const nombre = campos.nombre;
    if (nombre.trim().length < 3 || esOtra) return;
    const r = await buscarParecidos(nombre, "").catch(() => null);
    if (r) setParecidos(r.perfiles);
  }

  async function revisarEmpresa() {
    const empresa = campos.empresa;
    if (empresa.trim().length < 2 || empresaNueva || sumarA) return;
    const r = await buscarParecidos("", empresa).catch(() => null);
    if (r) setEmpresas(r.empresas);
  }

  function entrada(): EntradaAlta {
    return {
      nombre: campos.nombre,
      descripcion: campos.descripcion,
      empresa: sumarA ? "" : campos.empresa,
      empresaDescripcion: campos.empresaDescripcion,
      empresaTipo: fijas.empresaTipo,
      sumarA: sumarA?.id ?? null,
      email: campos.email,
      feria: fijas.feria,
      rol: fijas.rol,
      publicado: fijas.publicado,
      consentimiento,
    };
  }

  function enfocar(campo: CampoAlta) {
    document.getElementById(`alta-${campo}`)?.focus();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const datos = entrada();
    const locales = validarAlta(datos);
    setErrores(locales);
    const primero = Object.keys(locales)[0] as CampoAlta | undefined;
    if (primero) {
      enfocar(primero);
      return;
    }
    setError(null);
    // Si ya se mostraron parecidos (o se dijo que es otra), el envío es "Crear igual".
    const forzar = esOtra || parecidos.length > 0;
    iniciar(async () => {
      try {
        const r = await crearAlta(datos, forzar);
        if (r.ok) {
          const dia = fijas.dia;
          const stand = Number(campos.stand);
          const codigo = dia && campos.stand ? codigoTarjeta(dia, stand) : null;
          setCreado({
            id: r.id,
            slug: r.slug,
            nombre: datos.nombre.trim(),
            empresa: sumarA?.nombre ?? (datos.empresa.trim() || null),
            publicado: datos.publicado,
            tarjeta: codigo,
          });
          return;
        }
        if (r.parecidos) {
          setParecidos(r.parecidos);
          return;
        }
        setError(r.mensaje ?? "No se pudo crear. Probá de nuevo.");
        if (r.campo) {
          setErrores({ [r.campo]: r.mensaje });
          enfocar(r.campo);
        }
      } catch {
        setError("Se cortó la conexión. Lo escrito sigue acá: probá de nuevo.");
      }
    });
  }

  function crearOtro() {
    setCampos(VACIO);
    setConsentimiento(false);
    setParecidos([]);
    setEsOtra(false);
    setEmpresas([]);
    setEmpresaNueva(false);
    setSumarA(null);
    setErrores({});
    setError(null);
    setCreado(null);
  }

  if (creado) return <Exito creado={creado} onOtro={crearOtro} />;

  const conEmpresa = !sumarA && campos.empresa.trim() !== "";
  const codigoStand = fijas.dia && campos.stand ? codigoTarjeta(fijas.dia, Number(campos.stand)) : null;

  return (
    <form ref={form} onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-5">
      {error && (
        <div className="rounded-2xl border-2 border-arcilla px-4 py-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alta-nombre" className={ETIQUETA}>
          Nombre y apellido
        </label>
        <input
          id="alta-nombre"
          data-sigue
          autoFocus
          value={campos.nombre}
          onChange={(e) => poner("nombre", e.target.value)}
          onBlur={revisarNombre}
          onKeyDown={alEnter}
          maxLength={NOMBRE_MAX}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          aria-invalid={!!errores.nombre}
          aria-describedby={describir("alta-nombre", errores.nombre)}
          className={`${claseInput(errores.nombre)} ${INPUT}`}
        />
        {errores.nombre && <MensajeError id="alta-nombre-error">{errores.nombre}</MensajeError>}
        {parecidos.length > 0 && !esOtra && (
          <div role="status" className="flex flex-col gap-2 rounded-2xl bg-t-ocre-suave px-4 py-3 text-tinta">
            {parecidos.map((p) => (
              <p key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Ya existe: <strong className="font-semibold">{p.nombre}</strong>
                  {p.empresa ? ` (${p.empresa})` : ""}
                  {p.con_cuenta ? " · con cuenta" : ""}. ¿Es la misma persona?
                </span>
                <Link href={`/admin/perfil/${p.id}`} className={boton("secundario", "sm")}>
                  Abrir
                </Link>
              </p>
            ))}
            <button type="button" onClick={() => setEsOtra(true)} className={`${boton("fantasma", "sm")} self-start px-0`}>
              No, es otra persona
            </button>
          </div>
        )}
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="alta-descripcion" className={ETIQUETA}>
            Qué hace, en una línea
          </label>
          <span
            id="alta-descripcion-contador"
            className={`text-sm tabular-nums ${campos.descripcion.length > DESCRIPCION_MAX ? "font-semibold text-tinta" : "text-tinta/65"}`}
          >
            {campos.descripcion.length}/{DESCRIPCION_MAX}
          </span>
        </div>
        <input
          id="alta-descripcion"
          data-sigue
          value={campos.descripcion}
          onChange={(e) => poner("descripcion", e.target.value)}
          onKeyDown={alEnter}
          maxLength={DESCRIPCION_MAX}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
          aria-invalid={!!errores.descripcion}
          aria-describedby={[describir("alta-descripcion", errores.descripcion), "alta-descripcion-contador"].filter(Boolean).join(" ")}
          className={`${claseInput(errores.descripcion)} ${INPUT}`}
        />
        {errores.descripcion && <MensajeError id="alta-descripcion-error">{errores.descripcion}</MensajeError>}
      </div>

      {/* Empresa */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alta-empresa" className={ETIQUETA}>
          Empresa o emprendimiento <span className="font-normal text-tinta/65">(opcional)</span>
        </label>
        {sumarA ? (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-tinta/5 px-3.5 py-3 text-tinta">
            <span>
              Se suma a <strong className="font-semibold">{sumarA.nombre}</strong> ({sumarA.miembros}{" "}
              {sumarA.miembros === 1 ? "integrante" : "integrantes"})
            </span>
            <button type="button" onClick={() => setSumarA(null)} className={boton("fantasma", "sm")}>
              Cambiar
            </button>
          </p>
        ) : (
          <input
            id="alta-empresa"
            data-sigue
            value={campos.empresa}
            onChange={(e) => poner("empresa", e.target.value)}
            onBlur={revisarEmpresa}
            onKeyDown={alEnter}
            maxLength={EMPRESA_NOMBRE_MAX}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            aria-invalid={!!errores.empresa}
            aria-describedby={describir("alta-empresa", errores.empresa)}
            className={`${claseInput(errores.empresa)} ${INPUT}`}
          />
        )}
        {errores.empresa && <MensajeError id="alta-empresa-error">{errores.empresa}</MensajeError>}
        {!sumarA && empresas.length > 0 && !empresaNueva && (
          <div role="status" className="flex flex-col gap-2 rounded-2xl bg-t-ocre-suave px-4 py-3 text-tinta">
            {empresas.map((e) => (
              <p key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Ya existe <strong className="font-semibold">{e.nombre}</strong> ({e.miembros}{" "}
                  {e.miembros === 1 ? "integrante" : "integrantes"})
                  {e.participa && e.representante ? ` · en la feria con ${e.representante}` : ""}.
                </span>
                <button type="button" onClick={() => setSumarA(e)} className={boton("secundario", "sm")}>
                  Sumar a {e.nombre}
                </button>
              </p>
            ))}
            <button
              type="button"
              onClick={() => setEmpresaNueva(true)}
              className={`${boton("fantasma", "sm")} self-start px-0`}
            >
              No, es otra empresa
            </button>
          </div>
        )}
      </div>

      {conEmpresa && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alta-empresaDescripcion" className={ETIQUETA}>
            La empresa, en una línea <span className="font-normal text-tinta/65">(opcional)</span>
          </label>
          <input
            id="alta-empresaDescripcion"
            data-sigue
            value={campos.empresaDescripcion}
            onChange={(e) => poner("empresaDescripcion", e.target.value)}
            onKeyDown={alEnter}
            maxLength={EMPRESA_DESCRIPCION_MAX}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
            aria-invalid={!!errores.empresaDescripcion}
            className={`${claseInput(errores.empresaDescripcion)} ${INPUT}`}
          />
          {errores.empresaDescripcion && <MensajeError>{errores.empresaDescripcion}</MensajeError>}
        </div>
      )}

      {/* Email de reclamo */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alta-email" className={ETIQUETA}>
          Su email de Google <span className="font-normal text-tinta/65">(opcional)</span>
        </label>
        <input
          id="alta-email"
          data-sigue
          type="email"
          inputMode="email"
          value={campos.email}
          onChange={(e) => poner("email", e.target.value)}
          onKeyDown={alEnter}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-invalid={!!errores.email}
          aria-describedby={describir("alta-email", errores.email, true)}
          className={`${claseInput(errores.email)} ${INPUT}`}
        />
        <p id="alta-email-ayuda" className="text-sm text-tinta/65">
          Para que reclame su perfil cuando entre con Google. No se publica.
        </p>
        {errores.email && <MensajeError id="alta-email-error">{errores.email}</MensajeError>}
      </div>

      {/* Stand: solo para armar el link de la tarjeta, no se guarda */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className={ETIQUETA}>
          Stand <span className="font-normal text-tinta/65">(opcional, para el link de la tarjeta)</span>
        </legend>
        <div className="mt-1.5 flex gap-2">
          <select
            aria-label="Día"
            value={fijas.dia ?? ""}
            onChange={(e) => setFijas((f) => ({ ...f, dia: e.target.value ? Number(e.target.value) : null }))}
            className={`${claseInput()} ${INPUT} w-auto`}
          >
            <option value="">Día</option>
            {DIAS_FERIA.map((d) => (
              <option key={d.dia} value={d.dia}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Número de stand"
            data-sigue
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="N.º"
            value={campos.stand}
            onChange={(e) => poner("stand", e.target.value.replace(/\D/g, "").slice(0, 2))}
            onKeyDown={alEnter}
            enterKeyHint="next"
            className={`${claseInput()} ${INPUT} w-24`}
          />
          {codigoStand && <span className="self-center font-semibold tabular-nums text-tinta">{codigoStand}</span>}
        </div>
        {fijas.dia && campos.stand && !codigoStand && (
          <p className="text-sm text-tinta/65">El stand va de 1 a {STAND_MAX}.</p>
        )}
      </fieldset>

      <label className="flex min-h-12 items-center gap-3 text-base text-tinta">
        <input
          type="checkbox"
          checked={fijas.feria}
          onChange={(e) => setFijas((f) => ({ ...f, feria: e.target.checked }))}
          className="size-5 accent-arcilla"
        />
        Anotar en la {eventoNombre}
      </label>
      {fijas.feria && sumarA?.participa && (
        <p className="-mt-3 text-sm text-tinta/65">
          {sumarA.nombre} ya participa{sumarA.representante ? ` con ${sumarA.representante}` : ""}: queda anotada sin
          cambiar quién la representa.
        </p>
      )}

      <details className="rounded-2xl border border-tinta/15 px-4 py-2">
        <summary className="min-h-10 cursor-pointer py-2 text-base font-medium text-tinta">Más opciones</summary>
        <div className="flex flex-col gap-4 pb-3 pt-2">
          <label className="flex flex-col gap-1.5">
            <span className={ETIQUETA}>Rol</span>
            <select
              value={fijas.rol}
              onChange={(e) => setFijas((f) => ({ ...f, rol: e.target.value as Rol }))}
              className={`${claseInput()} ${INPUT}`}
            >
              {OPCIONES_ROL.map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ETIQUETA}>Tipo de la empresa</span>
            <select
              value={fijas.empresaTipo}
              onChange={(e) => setFijas((f) => ({ ...f, empresaTipo: e.target.value as TipoEmpresa }))}
              className={`${claseInput()} ${INPUT}`}
            >
              {TIPOS_EMPRESA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-3 text-base text-tinta">
            <input
              type="checkbox"
              checked={fijas.publicado}
              onChange={(e) => setFijas((f) => ({ ...f, publicado: e.target.checked }))}
              className="size-5 accent-arcilla"
            />
            Publicado (se ve en Pecera)
          </label>
        </div>
      </details>

      {/* Consentimiento: obligatorio */}
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-tinta/20 px-4 py-3">
        <label className="flex items-start gap-3 text-base font-medium text-tinta">
          <input
            id="alta-consentimiento"
            data-sigue
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => {
              setConsentimiento(e.target.checked);
              setErrores((x) => ({ ...x, consentimiento: undefined }));
            }}
            onKeyDown={alEnter}
            aria-invalid={!!errores.consentimiento}
            aria-describedby="alta-consentimiento-detalle"
            className="mt-0.5 size-6 shrink-0 accent-arcilla"
          />
          {CONSENTIMIENTO_ALTA.texto}
        </label>
        <p id="alta-consentimiento-detalle" className="text-sm leading-relaxed text-tinta/80">
          {CONSENTIMIENTO_ALTA.detalle(contacto)}
        </p>
        {errores.consentimiento && <MensajeError>{errores.consentimiento}</MensajeError>}
      </div>

      <button type="submit" disabled={pendiente} className={`${boton("primario", "lg")} w-full text-lg`}>
        {pendiente ? "Creando…" : parecidos.length > 0 && !esOtra ? "Crear igual" : "Crear perfil"}
      </button>
    </form>
  );
}

function Exito({ creado, onOtro }: { creado: Creado; onOtro: () => void }) {
  const url = urlPerfil(creado.slug);
  const tarjeta = creado.tarjeta ? conCodigoTarjeta(url, creado.tarjeta) : null;
  return (
    <section aria-labelledby="alta-lista" className="mt-4 flex flex-col gap-4">
      <h2 id="alta-lista" className="font-display text-2xl font-semibold text-tinta" tabIndex={-1}>
        Listo: {creado.nombre}
        {creado.empresa ? ` · ${creado.empresa}` : ""}
      </h2>
      {!creado.publicado && (
        <p className="rounded-2xl bg-t-ocre-suave px-4 py-3 text-tinta">
          Quedó sin publicar: el link anda cuando lo publiques desde Editar.
        </p>
      )}
      <div className="flex flex-col gap-2 rounded-2xl border border-tinta/15 px-4 py-3">
        <p className="text-sm font-medium text-tinta/80">Su perfil</p>
        <p className="break-all text-lg text-tinta">{url}</p>
        <div className="flex flex-wrap gap-2">
          <BotonCopiar texto={url} etiqueta="Copiar link" className={boton("secundario", "md")} />
          <a href={url} target="_blank" rel="noreferrer" className={boton("fantasma", "md")}>
            Ver
          </a>
        </div>
      </div>
      {tarjeta && (
        <div className="flex flex-col gap-2 rounded-2xl border border-tinta/15 px-4 py-3">
          <p className="text-sm font-medium text-tinta/80">Link de la tarjeta ({creado.tarjeta})</p>
          <p className="break-all text-lg text-tinta">{tarjeta}</p>
          <BotonCopiar texto={tarjeta} etiqueta="Copiar link de la tarjeta" className={`${boton("secundario", "md")} self-start`} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" autoFocus onClick={onOtro} className={`${boton("primario", "lg")} flex-1 text-lg`}>
          Crear otro
        </button>
        <Link href={`/admin/perfil/${creado.id}`} className={boton("secundario", "lg")}>
          Editar
        </Link>
      </div>
    </section>
  );
}
