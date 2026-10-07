"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buscarParecidos } from "@/app/admin/alta/acciones";
import {
  agregarEmpresa,
  borrarPerfilEquipo,
  editarEmpresaEquipo,
  editarPerfilCuenta,
  editarPerfilEquipo,
  emailReclamo,
  participante,
  publicarPerfil,
  sumarAEmpresa,
  vincularCuenta,
} from "@/app/admin/acciones";
import BotonCopiar from "@/components/BotonCopiar";
import BotonAccion from "@/components/admin/BotonAccion";
import { MensajeError, claseInput } from "@/components/perfil/editores/campos";
import {
  type DetallePerfil,
  EMPRESA_DESCRIPCION_MAX,
  EMPRESA_NOMBRE_MAX,
  type EmpresaParecida,
  TOPE_EMPRESAS,
  validarTextosPerfil,
} from "@/lib/alta-rapida";
import { DESCRIPCION_MAX, NOMBRE_MAX, OPCIONES_ROL } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import { CARGOS, TIPOS_EMPRESA, labelTipoEmpresa } from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";
import { boton } from "@/lib/ui";
import type { Rol } from "@/types/pecera";

const CAJA = "flex flex-col gap-3 rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-4";
const TITULO = "font-display text-xl font-semibold text-tinta";
const ETIQUETA = "text-sm font-medium text-tinta";
const INPUT = "min-h-12";

/** Una acción con su estado: pendiente, error y un aviso de éxito. */
function useAccion() {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  function correr(accion: () => Promise<Resultado>, exito: string, despues?: (r: Resultado) => void) {
    setError(null);
    setAviso(null);
    iniciar(async () => {
      try {
        const r = await accion();
        if (r.ok) {
          setAviso(exito);
          despues?.(r);
        } else setError(r.mensaje ?? "No se pudo. Probá de nuevo.");
      } catch {
        setError("Se cortó la conexión. Probá de nuevo.");
      }
    });
  }
  return { pendiente, error, aviso, correr, setError };
}

function Estado({ error, aviso }: { error: string | null; aviso: string | null }) {
  if (error) return <MensajeError>{error}</MensajeError>;
  if (aviso)
    return (
      <p role="status" className="text-sm font-medium text-tinta">
        {aviso}
      </p>
    );
  return null;
}

/**
 * Editor del equipo para un perfil. Sin cuenta: todo (y email de reclamo, vincular, eliminar).
 * Con cuenta: solo nombre y descripción (queda registrado). Empresas: editar, agregar o sumar.
 */
export default function EditarPerfil({
  detalle,
  url,
  eventoNombre,
}: {
  detalle: DetallePerfil;
  url: string;
  eventoNombre: string;
}) {
  const d = detalle;
  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-marfil ${ROLES[d.rol].bg}`}>
          {ROLES[d.rol].label}
        </span>
        <span className="rounded-full bg-tinta/10 px-2 py-0.5 text-xs font-medium text-tinta">
          {d.con_cuenta ? "Con cuenta" : "Sin cuenta"}
        </span>
        {d.creado_equipo && (
          <span className="rounded-full bg-tinta/10 px-2 py-0.5 text-xs font-medium text-tinta">Creado por el equipo</span>
        )}
        {!d.publicado && <span className="rounded-full bg-t-ocre-suave px-2 py-0.5 text-xs font-medium text-t-ocre">Sin publicar</span>}
        {d.oculto && <span className="rounded-full bg-tinta/10 px-2 py-0.5 text-xs font-medium text-tinta">Oculto por la persona</span>}
      </div>
      <div className="flex flex-col gap-2">
        <p className="break-all text-tinta">{url}</p>
        <div className="flex flex-wrap gap-2">
          <BotonCopiar texto={url} etiqueta="Copiar link" className={boton("secundario", "sm")} />
          <a href={url} target="_blank" rel="noreferrer" className={boton("fantasma", "sm")}>
            Ver perfil
          </a>
        </div>
      </div>

      {d.con_cuenta ? <DatosConCuenta d={d} /> : <DatosSinCuenta d={d} />}

      <section aria-labelledby="feria" className={CAJA}>
        <h2 id="feria" className={TITULO}>
          {eventoNombre}
        </h2>
        <p className="text-sm text-tinta/80">
          {d.participa ? "Está anotada." : "No está anotada."}
          {d.representa ? ` Representa a ${d.representa}.` : ""}
        </p>
        <span className="self-start">
          <BotonAccion
            accion={participante.bind(null, d.id, !d.participa)}
            estilo={d.participa ? "secundario" : "primario"}
            confirmar={d.participa ? `¿Sacar a ${d.nombre} de la ${eventoNombre}?` : undefined}
          >
            {d.participa ? "Sacar de la feria" : "Anotar en la feria"}
          </BotonAccion>
        </span>
      </section>

      <Empresas d={d} />

      {!d.con_cuenta && <Reclamo d={d} />}
      {!d.con_cuenta && d.creado_equipo && <Eliminar d={d} />}
    </div>
  );
}

function DatosSinCuenta({ d }: { d: DetallePerfil }) {
  const [nombre, setNombre] = useState(d.nombre);
  const [descripcion, setDescripcion] = useState(d.descripcion);
  const [rol, setRol] = useState<Rol>(d.rol);
  const [tipo, setTipo] = useState(d.tipo);
  const [publicado, setPublicado] = useState(d.publicado);
  const [oculto, setOculto] = useState(d.oculto);
  const a = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const errores = validarTextosPerfil(nombre, descripcion);
    const primero = errores.nombre ?? errores.descripcion;
    if (primero) return a.setError(primero);
    a.correr(
      () => editarPerfilEquipo(d.id, { nombre, descripcion, rol, tipo, publicado, oculto }),
      "Guardado. Se ve en Pecera en menos de un minuto."
    );
  }

  return (
    <form onSubmit={guardar} aria-labelledby="datos" className={CAJA}>
      <h2 id="datos" className={TITULO}>
        Datos
      </h2>
      <CamposTexto nombre={nombre} setNombre={setNombre} descripcion={descripcion} setDescripcion={setDescripcion} />
      <label className="flex flex-col gap-1.5">
        <span className={ETIQUETA}>Rol</span>
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} className={`${claseInput()} ${INPUT}`}>
          {OPCIONES_ROL.map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ETIQUETA}>Tipo</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${claseInput()} ${INPUT}`}>
          {Object.entries(TIPOS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label || "Persona (cuenta personal)"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-tinta">
        <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} className="size-5 accent-arcilla" />
        Publicado
      </label>
      <label className="flex min-h-11 items-center gap-3 text-tinta">
        <input type="checkbox" checked={oculto} onChange={(e) => setOculto(e.target.checked)} className="size-5 accent-arcilla" />
        Oculto
      </label>
      <Estado error={a.error} aviso={a.aviso} />
      <button type="submit" disabled={a.pendiente} className={`${boton("primario", "md")} self-start`}>
        {a.pendiente ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function DatosConCuenta({ d }: { d: DetallePerfil }) {
  const [nombre, setNombre] = useState(d.nombre);
  const [descripcion, setDescripcion] = useState(d.descripcion);
  const a = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const errores = validarTextosPerfil(nombre, descripcion);
    const primero = errores.nombre ?? errores.descripcion;
    if (primero) return a.setError(primero);
    a.correr(() => editarPerfilCuenta(d.id, nombre, descripcion), "Corregido. Quedó registrado quién y cuándo.");
  }

  return (
    <form onSubmit={guardar} aria-labelledby="datos" className={CAJA}>
      <h2 id="datos" className={TITULO}>
        Datos
      </h2>
      <p className="text-sm text-tinta/80">
        Tiene cuenta: lo edita su dueña. Desde acá solo se corrigen el nombre y la descripción, y queda registrado.
      </p>
      <CamposTexto nombre={nombre} setNombre={setNombre} descripcion={descripcion} setDescripcion={setDescripcion} />
      <Estado error={a.error} aviso={a.aviso} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={a.pendiente} className={boton("primario", "md")}>
          {a.pendiente ? "Guardando…" : "Guardar corrección"}
        </button>
        <BotonAccion
          accion={publicarPerfil.bind(null, d.id, !d.publicado)}
          confirmar={d.publicado ? `¿Despublicar a ${d.nombre}? Deja de verse en el feed.` : undefined}
        >
          {d.publicado ? "Despublicar" : "Publicar"}
        </BotonAccion>
      </div>
    </form>
  );
}

function CamposTexto({
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
}: {
  nombre: string;
  setNombre: (v: string) => void;
  descripcion: string;
  setDescripcion: (v: string) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={ETIQUETA}>Nombre y apellido</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={NOMBRE_MAX}
          autoCapitalize="words"
          className={`${claseInput()} ${INPUT}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className={ETIQUETA}>Descripción (una línea)</span>
          <span className="text-sm tabular-nums text-tinta/65">
            {descripcion.length}/{DESCRIPCION_MAX}
          </span>
        </span>
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={DESCRIPCION_MAX}
          className={`${claseInput()} ${INPUT}`}
        />
      </label>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

function Empresas({ d }: { d: DetallePerfil }) {
  const [agregando, setAgregando] = useState(d.empresas.length === 0);
  const lleno = d.empresas.length >= TOPE_EMPRESAS;
  return (
    <section aria-labelledby="empresa" className={CAJA}>
      <h2 id="empresa" className={TITULO}>
        Empresa
      </h2>
      {d.empresas.length === 0 && <p className="text-sm text-tinta/80">No tiene empresa.</p>}
      <ul className="flex flex-col gap-3">
        {d.empresas.map((e) => (
          <EmpresaFila key={e.id} empresa={e} />
        ))}
      </ul>
      {agregando && !lleno ? (
        <AgregarEmpresa d={d} onListo={() => setAgregando(false)} />
      ) : (
        !lleno && (
          <button type="button" onClick={() => setAgregando(true)} className={`${boton("secundario", "sm")} self-start`}>
            Sumar otra
          </button>
        )
      )}
      {lleno && <p className="text-sm text-tinta/65">Está en {TOPE_EMPRESAS} empresas, el máximo.</p>}
    </section>
  );
}

function EmpresaFila({ empresa: e }: { empresa: DetallePerfil["empresas"][number] }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(e.nombre);
  const [descripcion, setDescripcion] = useState(e.descripcion ?? "");
  const a = useAccion();

  return (
    <li className="flex flex-col gap-2 border-t border-tinta/10 pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-tinta">
            {e.nombre}
            {e.principal && <span className="ml-2 text-xs font-normal text-tinta/65">principal</span>}
          </p>
          <p className="text-sm text-tinta/65">
            /e/{e.slug}
            {e.tipo ? ` · ${labelTipoEmpresa(e.tipo)}` : ""} · {e.miembros} {e.miembros === 1 ? "integrante" : "integrantes"}
            {e.con_dueno ? " · la administra una cuenta" : " · sin administradora"}
            {e.participa ? " · en la feria" : ""}
          </p>
        </div>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className={boton("secundario", "sm")}>
            Editar
          </button>
        )}
      </div>
      {editando && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            a.correr(() => editarEmpresaEquipo(e.id, nombre, descripcion), "Guardado. Quedó registrado.", () => setEditando(false));
          }}
          className="flex flex-col gap-2"
        >
          {e.con_dueno && (
            <p className="text-sm text-tinta/80">La administra una cuenta: el cambio queda registrado.</p>
          )}
          <input
            aria-label="Nombre de la empresa"
            value={nombre}
            onChange={(ev) => setNombre(ev.target.value)}
            maxLength={EMPRESA_NOMBRE_MAX}
            className={`${claseInput()} ${INPUT}`}
          />
          <input
            aria-label="La empresa, en una línea"
            placeholder="En una línea (opcional)"
            value={descripcion}
            onChange={(ev) => setDescripcion(ev.target.value)}
            maxLength={EMPRESA_DESCRIPCION_MAX}
            className={`${claseInput()} ${INPUT}`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={a.pendiente} className={boton("primario", "sm")}>
              {a.pendiente ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={boton("fantasma", "sm")}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      <Estado error={a.error} aviso={a.aviso} />
    </li>
  );
}

function AgregarEmpresa({ d, onListo }: { d: DetallePerfil; onListo: () => void }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("startup");
  const [feria, setFeria] = useState(false);
  const [cargo, setCargo] = useState("");
  const [parecidas, setParecidas] = useState<EmpresaParecida[]>([]);
  const [esOtra, setEsOtra] = useState(false);
  const a = useAccion();
  const yaSuya = new Set(d.empresas.map((e) => e.id));
  // Una empresa participa a través de una sola persona: si ya representa a otra, no se ofrece.
  const puedeRepresentar = !d.representa;

  async function revisar() {
    if (nombre.trim().length < 2 || esOtra) return;
    const r = await buscarParecidos("", nombre).catch(() => null);
    if (r) setParecidas(r.empresas.filter((e) => !yaSuya.has(e.id)));
  }

  function crear(ev: React.FormEvent) {
    ev.preventDefault();
    if (!nombre.trim()) return a.setError("Falta el nombre de la empresa.");
    a.correr(
      () => agregarEmpresa(d.id, nombre, descripcion, tipo, feria && puedeRepresentar),
      d.con_cuenta
        ? "Empresa creada. La persona va a poder administrar esta empresa desde su cuenta."
        : "Empresa creada. Va a poder administrarla cuando reclame su perfil.",
      () => {
        setNombre("");
        setDescripcion("");
        onListo();
      }
    );
  }

  return (
    <form onSubmit={crear} className="flex flex-col gap-3 border-t border-tinta/10 pt-3">
      <label className="flex flex-col gap-1.5">
        <span className={ETIQUETA}>Nombre de la empresa</span>
        <input
          value={nombre}
          onChange={(ev) => {
            setNombre(ev.target.value);
            setParecidas([]);
            setEsOtra(false);
          }}
          onBlur={revisar}
          maxLength={EMPRESA_NOMBRE_MAX}
          autoCapitalize="words"
          className={`${claseInput()} ${INPUT}`}
        />
      </label>

      {parecidas.length > 0 && !esOtra ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl bg-t-ocre-suave px-4 py-3 text-tinta">
          <label className="flex flex-col gap-1.5">
            <span className={ETIQUETA}>Cargo en la empresa (opcional)</span>
            <select value={cargo} onChange={(ev) => setCargo(ev.target.value)} className={`${claseInput()} ${INPUT}`}>
              <option value="">Sin cargo</option>
              {CARGOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {parecidas.map((e) => (
            <p key={e.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Ya existe <strong className="font-semibold">{e.nombre}</strong> ({e.miembros}{" "}
                {e.miembros === 1 ? "integrante" : "integrantes"})
                {e.participa && e.representante ? ` · en la feria con ${e.representante}` : ""}.
              </span>
              <button
                type="button"
                disabled={a.pendiente}
                onClick={() =>
                  a.correr(() => sumarAEmpresa(d.id, e.id, cargo, feria), `Sumada a ${e.nombre}. No cambia quién la administra ni quién la representa.`, () => onListo())
                }
                className={boton("secundario", "sm")}
              >
                Sumar a {e.nombre}
              </button>
            </p>
          ))}
          <button type="button" onClick={() => setEsOtra(true)} className={`${boton("fantasma", "sm")} self-start px-0`}>
            No, es otra empresa
          </button>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={ETIQUETA}>
              En una línea <span className="font-normal text-tinta/65">(opcional)</span>
            </span>
            <input
              value={descripcion}
              onChange={(ev) => setDescripcion(ev.target.value)}
              maxLength={EMPRESA_DESCRIPCION_MAX}
              className={`${claseInput()} ${INPUT}`}
            />
          </label>
          <details className="rounded-xl border border-tinta/15 px-3 py-1">
            <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium text-tinta">Más opciones</summary>
            <label className="flex flex-col gap-1.5 pb-3">
              <span className={ETIQUETA}>Tipo</span>
              <select value={tipo} onChange={(ev) => setTipo(ev.target.value)} className={`${claseInput()} ${INPUT}`}>
                {TIPOS_EMPRESA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </details>
        </>
      )}

      {puedeRepresentar ? (
        <label className="flex min-h-11 items-center gap-3 text-tinta">
          <input type="checkbox" checked={feria} onChange={(ev) => setFeria(ev.target.checked)} className="size-5 accent-arcilla" />
          Anotar en la feria
        </label>
      ) : (
        <p className="text-sm text-tinta/65">
          Ya representa a {d.representa} en la feria: la empresa nueva no se anota a través de ella.
        </p>
      )}

      <Estado error={a.error} aviso={a.aviso} />
      {!(parecidas.length > 0 && !esOtra) && (
        <button type="submit" disabled={a.pendiente} className={`${boton("primario", "md")} self-start`}>
          {a.pendiente ? "Creando…" : "Crear empresa"}
        </button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Reclamo, vincular y eliminar (solo perfiles sin cuenta)
// ---------------------------------------------------------------------------

function Reclamo({ d }: { d: DetallePerfil }) {
  const [email, setEmail] = useState(d.email_reclamo ?? "");
  const [cuenta, setCuenta] = useState("");
  const guardar = useAccion();
  const vincular = useAccion();
  const campoEmail = {
    type: "email",
    inputMode: "email",
    autoCapitalize: "none",
    autoCorrect: "off",
    spellCheck: false,
    autoComplete: "off",
  } as const;

  return (
    <section aria-labelledby="reclamo" className={CAJA}>
      <h2 id="reclamo" className={TITULO}>
        Cuenta
      </h2>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar.correr(() => emailReclamo(d.id, email), email.trim() ? "Email guardado." : "Email borrado.");
        }}
        className="flex flex-col gap-2"
      >
        <label className="flex flex-col gap-1.5">
          <span className={ETIQUETA}>Email de Google para que reclame su perfil</span>
          <input value={email} onChange={(ev) => setEmail(ev.target.value)} {...campoEmail} className={`${claseInput()} ${INPUT}`} />
        </label>
        <p className="text-sm text-tinta/65">
          Cuando entre con esa cuenta, en Mi perfil le preguntamos si es suyo. Vacío = borrarlo.
          {d.reclamo_rechazado ? " Ojo: con ese email dijo que no era suyo; guardarlo de nuevo se lo vuelve a ofrecer." : ""}
        </p>
        <Estado error={guardar.error} aviso={guardar.aviso} />
        <button type="submit" disabled={guardar.pendiente} className={`${boton("secundario", "sm")} self-start`}>
          Guardar email
        </button>
      </form>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!cuenta.trim()) return vincular.setError("Escribí el email de Google de la persona.");
          vincular.correr(() => vincularCuenta(d.id, cuenta), "Vinculado: el perfil ya es de esa cuenta.");
        }}
        className="flex flex-col gap-2 border-t border-tinta/10 pt-3"
      >
        <label className="flex flex-col gap-1.5">
          <span className={ETIQUETA}>Vincular con cuenta</span>
          <input value={cuenta} onChange={(ev) => setCuenta(ev.target.value)} {...campoEmail} className={`${claseInput()} ${INPUT}`} />
        </label>
        <p className="text-sm text-tinta/65">
          Para cuando entró con otro email. Solo si esa cuenta ya entró una vez a Pecera y todavía no tiene perfil.
        </p>
        <Estado error={vincular.error} aviso={vincular.aviso} />
        <button type="submit" disabled={vincular.pendiente} className={`${boton("secundario", "sm")} self-start`}>
          Vincular
        </button>
      </form>
    </section>
  );
}

function Eliminar({ d }: { d: DetallePerfil }) {
  const [texto, setTexto] = useState("");
  const router = useRouter();
  const a = useAccion();
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        a.correr(() => borrarPerfilEquipo(d.id), "Eliminado.", () => router.push("/admin?v=perfiles"));
      }}
      aria-labelledby="eliminar"
      className={CAJA}
    >
      <h2 id="eliminar" className={TITULO}>
        Eliminar perfil
      </h2>
      <p className="text-sm text-tinta/80">
        Para cuando la persona lo pide (derecho de supresión). Se borra el perfil con sus pitches y, si era la única
        integrante, su empresa. No se puede deshacer.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className={ETIQUETA}>Escribí ELIMINAR para confirmar</span>
        <input
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          className={`${claseInput()} ${INPUT}`}
        />
      </label>
      <Estado error={a.error} aviso={a.aviso} />
      <button
        type="submit"
        disabled={texto.trim() !== "ELIMINAR" || a.pendiente}
        className={`${boton("peligro", "md")} self-start`}
      >
        {a.pendiente ? "Eliminando…" : "Eliminar perfil"}
      </button>
    </form>
  );
}
