"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useState, useTransition } from "react";
import { guardarEmpresaPestana, renovarCodigo, subirLogo } from "@/app/cuenta/empresa";
import Avatar from "@/components/Avatar";
import BotonCopiar from "@/components/BotonCopiar";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import { Etiqueta } from "@/components/Etiquetas";
import TarjetaTransparencia from "@/components/cuenta/TarjetaTransparencia";
import { type MiEmpresa, formatoCodigo } from "@/components/cuenta/TarjetaEmpresa";
import { Aviso, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { conEmpresa, urlSitio } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import {
  CARGOS,
  ETAPAS,
  INDUSTRIAS,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  TIPOS_EMPRESA,
  cargo,
  conTono,
} from "@/lib/etiquetas";
import { mensajeEnvioImagen, mensajeImagen, nombreImagen, prepararImagen } from "@/lib/imagen";
import { boton } from "@/lib/ui";
import type { DatoEmpresa, Rol } from "@/types/pecera";

export type Miembro = {
  slug: string;
  nombre: string;
  cargo: string | null;
  avatar_url: string | null;
  rol: Rol;
  visible: boolean;
  es_dueno: boolean;
  soy_yo: boolean;
};

export type Pestana = "info" | "logo" | "contacto" | "equipo" | "producto" | "build" | "metricas";

/** Las pestañas con formulario: "Guardar cambios" guarda solo la pestaña actual. */
const CON_FORM: Pestana[] = ["info", "contacto"];

const INICIAL: Resultado = { ok: false };
const OPCIONES_CARGOS = conTono(CARGOS);
const OPCIONES_INDUSTRIAS = conTono(INDUSTRIAS);

type EmpresaPanel = MiEmpresa & { tipo?: string | null };

/**
 * Administrar una empresa, en pestañas: Información, Logo y marca, Contacto, Equipo,
 * Producto, Build in Public y Métricas y documentos. Todas muestran "Guardar
 * cambios": en Información y Contacto guarda esa pestaña; en las demás cada cambio
 * se guarda solo (o con el botón de cada parte) y el botón lo dice. Si hay cambios
 * sin guardar, cambiar de pestaña o salir pregunta antes.
 */
export default function PanelEmpresa({
  empresa,
  miembros,
  datos,
  multi,
  inicial = "info",
  producto,
  build,
  dataroomHref,
}: {
  empresa: EmpresaPanel;
  miembros: Miembro[];
  datos: DatoEmpresa[];
  /** La base tiene multi_empresa: cargo por empresa. */
  multi: boolean;
  inicial?: Pestana;
  /** TarjetaProducto, ya armada con los datos (null si la base no lo tiene). */
  producto?: ReactNode;
  /** TarjetaBuild, ya armada (null si la base no lo tiene). */
  build?: ReactNode;
  dataroomHref?: string | null;
}) {
  const [pestana, setPestana] = useState<Pestana>(inicial);
  const [sucias, setSucias] = useState<Partial<Record<Pestana, boolean>>>({});
  const [pedida, setPedida] = useState<Pestana | null>(null);
  const [versiones, setVersiones] = useState<Partial<Record<Pestana, number>>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const miCargo = miembros.find((m) => m.soy_yo)?.cargo ?? null;
  const haySucias = Object.values(sucias).some(Boolean);

  // Cerrar la pestaña del navegador con cambios: el aviso del navegador.
  useEffect(() => {
    if (!haySucias) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [haySucias]);

  // "Guardado" se va solo.
  useEffect(() => {
    if (!resultado?.ok) return;
    const t = setTimeout(() => setResultado(null), 3000);
    return () => clearTimeout(t);
  }, [resultado]);

  const pestanas: Array<[Pestana, string]> = [
    ["info", "Información"],
    ["logo", "Logo y marca"],
    ["contacto", "Contacto"],
    ["equipo", `Equipo · ${empresa.miembros}`],
    ...(producto ? ([["producto", "Producto"]] as Array<[Pestana, string]>) : []),
    ...(build ? ([["build", "Build in Public"]] as Array<[Pestana, string]>) : []),
    ["metricas", "Métricas y documentos"],
  ];
  const nombreDe = (p: Pestana) => pestanas.find(([v]) => v === p)?.[1] ?? p;

  function ir(destino: Pestana) {
    if (destino === pestana) return;
    if (sucias[pestana]) {
      setPedida(destino);
      return;
    }
    setPedida(null);
    setResultado(null);
    setPestana(destino);
  }

  function descartar() {
    setSucias((s) => ({ ...s, [pestana]: false }));
    setVersiones((v) => ({ ...v, [pestana]: (v[pestana] ?? 0) + 1 }));
    if (pedida) setPestana(pedida);
    setPedida(null);
  }

  const marcar = (p: Pestana) => (sucia: boolean) => setSucias((s) => (s[p] === sucia ? s : { ...s, [p]: sucia }));
  const alGuardar = (p: Pestana) => (r: Resultado) => {
    setResultado(r);
    if (!r.ok) return;
    setSucias((s) => ({ ...s, [p]: false }));
    if (pedida) {
      setPestana(pedida);
      setPedida(null);
    }
  };

  const conForm = CON_FORM.includes(pestana);

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Secciones de la empresa" className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {pestanas.map(([valor, label]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={pestana === valor}
            onClick={() => ir(valor)}
            className={`boton min-h-11 shrink-0 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              pestana === valor ? "bg-tinta text-marfil" : "bg-tinta/[0.06] text-tinta hover:bg-tinta/10"
            }`}
          >
            {label}
            {sucias[valor] && <span aria-label=" (sin guardar)" className="ml-1.5 inline-block size-2 rounded-full bg-arcilla" />}
          </button>
        ))}
      </div>

      {pedida && (
        <div role="alertdialog" aria-label="Cambios sin guardar" className="flex flex-col gap-3 rounded-2xl border-2 border-arcilla px-4 py-3">
          <p className="text-sm font-medium text-tinta">Tenés cambios sin guardar en {nombreDe(pestana)}.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" form={`form-empresa-${pestana}`} className={boton("oscuro", "sm")}>
              Guardar
            </button>
            <button type="button" onClick={descartar} className={boton("peligro", "sm")}>
              Descartar
            </button>
            <button type="button" onClick={() => setPedida(null)} className={boton("fantasma", "sm")}>
              Seguir acá
            </button>
          </div>
        </div>
      )}

      <div key={pestana} role="tabpanel" aria-label={nombreDe(pestana)} className="paso-entra flex flex-col gap-6">
        {pestana === "info" && (
          <FormEmpresa
            key={`info-${versiones.info ?? 0}`}
            pestana="info"
            empresa={empresa}
            miCargo={miCargo}
            multi={multi}
            onSucio={marcar("info")}
            onGuardado={alGuardar("info")}
          />
        )}
        {pestana === "contacto" && (
          <FormEmpresa
            key={`contacto-${versiones.contacto ?? 0}`}
            pestana="contacto"
            empresa={empresa}
            miCargo={miCargo}
            multi={multi}
            onSucio={marcar("contacto")}
            onGuardado={alGuardar("contacto")}
          />
        )}
        {pestana === "logo" && <EditorLogo empresa={empresa} />}
        {pestana === "equipo" && <Equipo empresa={empresa} miembros={miembros} />}
        {pestana === "producto" && producto}
        {pestana === "build" && build}
        {pestana === "metricas" && (
          <>
            <TarjetaTransparencia datos={datos} slugEmpresa={empresa.slug} />
            {dataroomHref && (
              <Link
                href={dataroomHref}
                className="flex min-h-16 items-center justify-between gap-3 rounded-3xl bg-tinta px-5 py-4 text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <span>
                  <span className="block font-display text-xl font-semibold">Dataroom</span>
                  <span className="block text-sm text-marfil/75">Templates, documentos y métricas, ordenados para un inversor.</span>
                </span>
                <span aria-hidden>&rarr;</span>
              </Link>
            )}
          </>
        )}
      </div>

      {/* Barra de guardar: en todas las pestañas, arriba de la barra de navegación. */}
      <div className="sticky bottom-[calc(var(--alto-nav)+0.75rem)] z-10 flex flex-col gap-2 rounded-3xl bg-marfil/95 p-2 shadow-[0_8px_24px_rgb(28_27_22/0.16)] backdrop-blur">
        {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            form={conForm ? `form-empresa-${pestana}` : undefined}
            disabled={!conForm || !sucias[pestana]}
            className={`${boton("oscuro", "lg")} flex-1`}
          >
            Guardar cambios
          </button>
          {!conForm && <p className="max-w-[12rem] text-xs leading-snug text-tinta/70">Acá cada cambio se guarda en el momento.</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {empresa.visible ? (
          <Link href={`/e/${empresa.slug}`} className={`${BOTON_SECUNDARIO} boton`}>
            Ver la página pública
          </Link>
        ) : (
          <p className="text-sm text-tinta/65">La página pública se ve cuando al menos un perfil del equipo está publicado.</p>
        )}
        {/* Qué pasa (y, si es la última integrante, el borrado) se confirma en su pantalla. */}
        <Link href={conEmpresa("/cuenta/empresa/salir", empresa.slug)} className={`${BOTON_SECUNDARIO} boton`}>
          Salir de la empresa
        </Link>
      </div>
    </div>
  );
}

/**
 * Información o Contacto. Manda todos los campos: los de esta pestaña como inputs y
 * los de la otra, ocultos y como estaban guardados.
 */
function FormEmpresa({
  pestana,
  empresa,
  miCargo,
  multi,
  onSucio,
  onGuardado,
}: {
  pestana: "info" | "contacto";
  empresa: EmpresaPanel;
  miCargo: string | null;
  multi: boolean;
  onSucio: (sucia: boolean) => void;
  onGuardado: (r: Resultado) => void;
}) {
  const [tipo, setTipo] = useState(empresa.tipo ?? "");
  const [etapa, setEtapa] = useState(empresa.etapa ?? "");
  const [ronda, setRonda] = useState(empresa.ronda ?? "");
  const [industrias, setIndustrias] = useState<string[]>(empresa.industrias ?? []);
  const [descripcion, setDescripcion] = useState(empresa.descripcion ?? "");
  const [cargoElegido, setCargo] = useState(miCargo ?? "");
  const [, accion, guardando] = useActionState(async (previo: Resultado, datos: FormData) => {
    try {
      const r = await guardarEmpresaPestana(previo, datos);
      onGuardado(r);
      return r;
    } catch {
      const r = { ok: false, mensaje: "Sin conexión: los cambios todavía no se guardaron." };
      onGuardado(r);
      return r;
    }
  }, INICIAL);
  const sucio = () => onSucio(true);
  const dueno = empresa.es_dueno;
  const oculto = (name: string, value: string | null | undefined) => <input type="hidden" name={name} value={value ?? ""} />;

  return (
    <form id={`form-empresa-${pestana}`} action={accion} noValidate onChange={sucio} aria-busy={guardando} className="flex flex-col gap-6">
      <input type="hidden" name="empresa_id" value={empresa.id} />
      <input type="hidden" name="es_dueno" value={dueno ? "1" : "0"} />

      {pestana === "info" ? (
        <>
          {dueno ? (
            <Tarjeta titulo="Información" bajada="Lo que se ve en la página pública de la empresa.">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                Nombre
                <input name="nombre" required maxLength={80} defaultValue={empresa.nombre} className={INPUT} />
              </label>
              <ChipsUnico
                id="empresa-tipo"
                nombre="tipo"
                legend="¿Qué es?"
                opciones={TIPOS_EMPRESA}
                valor={tipo}
                onCambiar={(v) => {
                  setTipo(v);
                  sucio();
                }}
                permitirNinguno
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                <span>
                  Qué hace <span className="font-normal text-tinta/65">(opcional)</span>
                </span>
                <textarea
                  name="descripcion"
                  rows={3}
                  maxLength={280}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Convertimos la borra de café en sustrato para huertas."
                  className={`${INPUT} resize-none`}
                />
                <span className="text-right text-xs font-normal text-tinta/65">{descripcion.length}/280</span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                <span>
                  Ubicación <span className="font-normal text-tinta/65">(opcional)</span>
                </span>
                <input name="ubicacion" maxLength={80} defaultValue={empresa.ubicacion ?? ""} placeholder="Córdoba, Argentina" className={INPUT} />
              </label>
              <SelectorEtapa
                id="empresa-etapa"
                nombre="etapa"
                legend="Etapa"
                etapas={ETAPAS}
                valor={etapa}
                onCambiar={(v) => {
                  setEtapa(v);
                  sucio();
                }}
              />
              <ChipsMultiple
                id="empresa-industrias"
                nombre="industrias"
                legend="Industria"
                opciones={OPCIONES_INDUSTRIAS}
                valores={industrias}
                onCambiar={(v) => {
                  setIndustrias(v);
                  sucio();
                }}
                max={MAX_INDUSTRIAS_PROYECTO}
              />
              <ChipsUnico
                id="empresa-ronda"
                nombre="ronda"
                legend="¿Qué ronda buscan?"
                opciones={RONDAS}
                valor={ronda}
                onCambiar={(v) => {
                  setRonda(v);
                  sucio();
                }}
                permitirNinguno
              />
            </Tarjeta>
          ) : (
            <Tarjeta titulo="Información">
              <p className="text-sm text-tinta/70">Solo quien administra la empresa puede editar nombre, tipo, descripción y etapa.</p>
            </Tarjeta>
          )}
          {multi && (
            <Tarjeta titulo="Tu rol acá" bajada={`El que se ve junto a ${empresa.nombre} en tu perfil y en el reel.`}>
              <input type="hidden" name="cargo_actual" value={miCargo ?? ""} />
              <ChipsUnico
                id={`cargo-${empresa.id}`}
                nombre="cargo"
                legend="Cargo"
                opciones={OPCIONES_CARGOS}
                valor={cargoElegido}
                onCambiar={(v) => {
                  setCargo(v);
                  sucio();
                }}
                permitirNinguno
              />
            </Tarjeta>
          )}
          {/* Contacto, como está guardado. */}
          {oculto("web", empresa.web)}
          {oculto("linkedin", empresa.linkedin)}
          {oculto("instagram", empresa.instagram)}
        </>
      ) : (
        <>
          {dueno ? (
            <Tarjeta titulo="Contacto y redes" bajada="Todo opcional. Aparece en la página de la empresa.">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                Web
                <input name="web" defaultValue={empresa.web ?? ""} placeholder="tuempresa.com.ar" className={INPUT} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                LinkedIn de la empresa
                <input name="linkedin" defaultValue={empresa.linkedin ?? ""} placeholder="linkedin.com/company/…" className={INPUT} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
                Instagram
                <input name="instagram" defaultValue={empresa.instagram ?? ""} placeholder="@tuempresa" className={INPUT} />
              </label>
            </Tarjeta>
          ) : (
            <Tarjeta titulo="Contacto y redes">
              <p className="text-sm text-tinta/70">Solo quien administra la empresa puede editar la web y las redes.</p>
            </Tarjeta>
          )}
          {/* Información, como está guardada. */}
          {oculto("nombre", empresa.nombre)}
          {oculto("tipo", empresa.tipo)}
          {oculto("descripcion", empresa.descripcion)}
          {oculto("ubicacion", empresa.ubicacion)}
          {oculto("etapa", empresa.etapa)}
          {oculto("ronda", empresa.ronda)}
          {(empresa.industrias ?? []).map((i) => (
            <input key={i} type="hidden" name="industrias" value={i} />
          ))}
        </>
      )}
    </form>
  );
}

function EditorLogo({ empresa }: { empresa: MiEmpresa }) {
  const [logo, setLogo] = useState(empresa.logo_url ?? null);
  const [estado, setEstado] = useState<{ subiendo: boolean; r?: Resultado }>({ subiendo: false });

  async function enviar(datos: FormData, blob?: Blob) {
    setEstado({ subiendo: true });
    try {
      const r = await subirLogo(datos);
      if (r.ok) setLogo(r.url ?? null);
      setEstado({ subiendo: false, r });
    } catch {
      const mensaje = blob ? mensajeEnvioImagen(blob) : "No llegó al servidor. Revisá tu conexión.";
      setEstado({ subiendo: false, r: { ok: false, mensaje } });
    }
  }

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    let blob: Blob;
    try {
      // Entero y con su proporción; PNG si tiene transparencia.
      blob = await prepararImagen(archivo, "logo");
    } catch (e) {
      setEstado({ subiendo: false, r: { ok: false, mensaje: mensajeImagen(e) } });
      return;
    }
    setLogo(URL.createObjectURL(blob));
    const datos = new FormData();
    datos.set("logo", blob, nombreImagen(blob, "logo"));
    datos.set("empresa_id", empresa.id);
    await enviar(datos, blob);
  }

  return (
    <Tarjeta titulo="Logo y marca" bajada="Se ve en la página de la empresa, en el perfil de cada integrante y en Explorar. Se guarda apenas lo elegís.">
      <div className="flex items-center gap-4">
        <span className="relative">
          <LogoEmpresa nombre={empresa.nombre} logo={logo} size={88} />
          {estado.subiendo && (
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-tinta/55">
              <span className="girando size-6 rounded-full border-2 border-marfil border-t-transparent" />
            </span>
          )}
        </span>
        <div className="flex flex-col gap-2">
          <label className="boton inline-flex min-h-11 cursor-pointer items-center self-start rounded-full bg-tinta px-5 text-sm font-medium text-marfil focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-arcilla">
            {logo ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/*" onChange={elegir} className="sr-only" />
          </label>
          {logo && !estado.subiendo && (
            <button
              type="button"
              onClick={() => {
                const datos = new FormData();
                datos.set("quitar", "1");
                datos.set("empresa_id", empresa.id);
                enviar(datos);
              }}
              className="self-start text-sm text-tinta/65 underline underline-offset-4 hover:text-tinta"
            >
              Sacar el logo
            </button>
          )}
          <p className="text-xs text-tinta/65">PNG o JPG. Si es ancho, entra entero.</p>
        </div>
      </div>
      {estado.r?.mensaje && <Aviso ok={estado.r.ok}>{estado.r.mensaje}</Aviso>}
    </Tarjeta>
  );
}

function Equipo({ empresa, miembros }: { empresa: MiEmpresa; miembros: Miembro[] }) {
  const [codigo, setCodigo] = useState(empresa.codigo);
  const [mensaje, setMensaje] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();

  const invitacion = codigo
    ? `Sumate a ${empresa.nombre} en Pecera: entrá a ${urlSitio("/cuenta")}, en Empresas tocá "Agregar empresa" → "Tengo un código" y poné ${formatoCodigo(codigo)}`
    : "";

  return (
    <>
      {codigo && (
        <section className="flex flex-col gap-3 rounded-3xl bg-tinta px-5 py-5 text-marfil">
          <p className="text-sm text-marfil/80">Código para invitar a tu equipo</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.2em]">{formatoCodigo(codigo)}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar
              texto={formatoCodigo(codigo)}
              etiqueta="Copiar código"
              className="boton inline-flex min-h-11 items-center rounded-full bg-marfil px-4 text-sm font-medium text-tinta"
            />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(invitacion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="boton inline-flex min-h-11 items-center rounded-full border border-marfil/40 px-4 text-sm font-medium text-marfil hover:border-marfil"
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
                  if (!window.confirm("¿Generar un código nuevo? El actual deja de servir.")) return;
                  const r = await renovarCodigo(empresa.id);
                  if (r.ok && r.codigo) setCodigo(r.codigo);
                  setMensaje(r);
                })
              }
              className="self-start text-sm text-marfil/75 underline underline-offset-4 hover:text-marfil"
            >
              Generar un código nuevo
            </button>
          )}
        </section>
      )}
      {mensaje?.mensaje && <Aviso ok={mensaje.ok}>{mensaje.mensaje}</Aviso>}

      <Tarjeta titulo="El equipo" bajada="Cada integrante elige su rol en la pestaña Información.">
        <ul className="flex flex-col gap-2">
          {miembros.map((m) => {
            const c = cargo(m.cargo);
            return (
              <li key={m.slug} className="flex items-center gap-3 rounded-2xl border border-tinta/10 bg-marfil px-3 py-2.5">
                <Avatar perfil={m} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-tinta">
                    {m.nombre}
                    {m.soy_yo && <span className="ml-1.5 text-xs font-normal text-tinta/65">(vos)</span>}
                  </span>
                  <span className="block text-xs text-tinta/65">
                    {m.es_dueno ? "Administra la empresa" : "Integrante"}
                    {!m.visible && " · perfil sin publicar"}
                  </span>
                </span>
                {c && <Etiqueta clase={c.clase}>{c.label}</Etiqueta>}
              </li>
            );
          })}
        </ul>
        {miembros.length === 0 && <p className="text-sm text-tinta/65">No pudimos cargar el equipo. Probá recargar.</p>}
      </Tarjeta>
    </>
  );
}
