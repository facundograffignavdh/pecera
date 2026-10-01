"use client";

import { unstable_rethrow } from "next/navigation";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { type EstadoGuardar, guardarPerfil } from "@/app/cuenta/acciones";
import Avatar from "@/components/Avatar";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import {
  CONSENTIMIENTO,
  type CampoLista,
  type CampoSimple,
  DESCRIPCION_MAX,
  DESCRIPCION_ROL,
  NOMBRE_MAX,
  TIPOS_POR_ROL,
  slugDesdeNombre,
  urlPerfil,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import {
  CARGOS,
  ESPECIALIDADES,
  ETAPAS,
  INDUSTRIAS,
  MAX_ESPECIALIDADES,
  MAX_INDUSTRIAS_INTERES,
  MAX_INDUSTRIAS_PROYECTO,
  RONDAS,
  RONDAS_INTERES,
  TICKETS,
  TONO,
} from "@/lib/etiquetas";
import { borrarBorrador, guardarBorrador, useBorradorGuardado } from "@/lib/borrador-perfil";
import { ROLES, TIPOS } from "@/lib/rol";
import type { Perfil, Rol } from "@/types/pecera";

export type PerfilPropio = Perfil & { oculto: boolean };

type Valores = Record<CampoSimple, string>;
type Listas = Record<CampoLista, string[]>;

const LADO_FOTO = 512;
const MAX_FOTO = 512 * 1024;
/** Sin respuesta en este tiempo, se ofrece recargar. */
const ESPERA_MAXIMA_MS = 20_000;

const OPCIONES_INDUSTRIAS = INDUSTRIAS.map(({ valor, label }) => ({ valor, label }));
const OPCIONES_CARGOS = CARGOS.map(({ valor, label, tono }) => ({ valor, label, tono: TONO[tono] }));
const OPCIONES_ESPECIALIDADES = ESPECIALIDADES.map(({ valor, label, tono }) => ({
  valor,
  label,
  tono: TONO[tono],
}));

/**
 * Achica la foto en el celular: cuadrada de 512 px, recortada al centro, en JPG.
 * Pasar por canvas borra el EXIF (GPS incluido); la orientación se aplica antes.
 */
async function achicarFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const lado = Math.min(imagen.width, imagen.height);
  const destino = Math.min(LADO_FOTO, lado);
  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(
    imagen,
    (imagen.width - lado) / 2,
    (imagen.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    destino,
    destino
  );
  imagen.close();

  for (const calidad of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, "image/jpeg", calidad)
    );
    if (blob && blob.size <= MAX_FOTO) return blob;
  }
  throw new Error("foto muy pesada");
}

const CLASE_INPUT =
  "w-full rounded-xl border bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/60 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

function claseInput(error?: string) {
  return `${CLASE_INPUT} ${error ? "border-2 border-arcilla" : "border-tinta/55"}`;
}

function Campo({
  id,
  label,
  error,
  ayuda,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  ayuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {label}
      </label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-tinta/70">
          {ayuda}
        </p>
      )}
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}

/** En Tinta (AA) con marca Arcilla: el Arcilla solo no llega a AA en texto chico. */
function MensajeError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm font-medium text-tinta">
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
      {children}
    </p>
  );
}

function describir(id: string, error?: string, ayuda = false) {
  const ids = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ");
  return ids || undefined;
}

/** Bloque numerado del formulario: guía el orden sin partirlo en pantallas. */
function Paso({
  numero,
  titulo,
  bajada,
  children,
}: {
  numero: number;
  titulo: string;
  bajada?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`paso-${numero}`}
      className="flex flex-col gap-5 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-tinta font-display text-sm font-semibold text-marfil"
        >
          {numero}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id={`paso-${numero}`} className="scroll-mt-24 font-display text-xl font-semibold leading-tight text-tinta">
            {titulo}
          </h2>
          {bajada && <p className="text-sm text-tinta/70">{bajada}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Solo las claves conocidas y con el tipo correcto (el borrador viene del celular). */
function pick(origen: Record<string, unknown>, claves: string[]): Record<string, string> {
  return Object.fromEntries(
    claves.filter((c) => typeof origen?.[c] === "string").map((c) => [c, origen[c] as string])
  );
}

function pickListas(origen: Record<string, unknown>, claves: string[]): Record<string, string[]> {
  return Object.fromEntries(
    claves
      .filter((c) => Array.isArray(origen?.[c]))
      .map((c) => [c, (origen[c] as unknown[]).filter((x): x is string => typeof x === "string")])
  );
}

function valoresDe(perfil: PerfilPropio | null, rolInicial?: Rol): Valores {
  return {
    nombre: perfil?.nombre ?? "",
    tipo: perfil?.tipo ?? "",
    rol: perfil?.rol ?? rolInicial ?? "",
    descripcion: perfil?.descripcion ?? "",
    whatsapp: perfil?.whatsapp ?? "",
    email: perfil?.email ?? "",
    linkedin: perfil?.linkedin ?? "",
    instagram: perfil?.instagram ?? "",
    web: perfil?.web ?? "",
    etapa: perfil?.etapa ?? "",
    ronda: perfil?.ronda ?? "",
    cargo: perfil?.cargo ?? "",
    ticket: perfil?.ticket ?? "",
  };
}

function listasDe(perfil: PerfilPropio | null): Listas {
  return {
    industrias: perfil?.industrias ?? [],
    especialidades: perfil?.especialidades ?? [],
    rondas_interes: perfil?.rondas_interes ?? [],
  };
}

export default function FormPerfil({
  perfil,
  rolInicial,
}: {
  perfil: PerfilPropio | null;
  /** Desde /sumate: el rol ya elegido en la landing. */
  rolInicial?: Rol;
}) {
  const creando = perfil === null;

  const [valores, setValores] = useState<Valores>(() => valoresDe(perfil, rolInicial));
  const [listas, setListas] = useState<Listas>(() => listasDe(perfil));
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [oculto, setOculto] = useState(perfil?.oculto ?? false);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [tardando, setTardando] = useState(false);

  const slugVisible = creando ? (slugTocado ? slug : slugDesdeNombre(valores.nombre)) : perfil.slug;
  const rol = (valores.rol || null) as Rol | null;

  const [estado, accion, guardando] = useActionState(
    async (previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> => {
      setTardando(false);
      // Mismas reglas que el servidor, para avisar al toque.
      const { errores } = validarPerfil({ ...valores, ...listas });
      if (creando) {
        const errorSlug = validarSlug(slugVisible);
        if (errorSlug) errores.slug = errorSlug;
        if (!consentimiento) errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
      }
      if (Object.keys(errores).length) return { errores };

      // La foto viaja con el resto: al crear, la action la sube antes de redirigir.
      if (foto) {
        setErrorFoto(null);
        formData.set("foto", foto.blob, "foto.jpg");
      }
      let resultado: EstadoGuardar;
      try {
        resultado = await guardarPerfil(previo, formData);
      } catch (e) {
        // Al crear, la action redirige y eso llega acá como error: lo maneja Next.
        unstable_rethrow(e);
        return {
          errores: {},
          general: "No pudimos guardar. Revisá tu conexión y probá de nuevo.",
        };
      }
      if (resultado.guardado && foto) {
        if (resultado.errorFoto) {
          setErrorFoto(resultado.errorFoto);
        } else {
          URL.revokeObjectURL(foto.url);
          setFoto(null);
        }
      }
      return resultado;
    },
    { errores: {} }
  );
  const errores = estado.errores;
  const hayErrores = Object.keys(errores).length > 0;

  // Límite de seguridad: si el guardado no vuelve, que nadie quede mirando
  // "Guardando…" para siempre.
  useEffect(() => {
    if (!guardando) return;
    const espera = setTimeout(() => setTardando(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(espera);
  }, [guardando]);

  function cambiar(campo: CampoSimple) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValores((v) => ({ ...v, [campo]: e.target.value }));
  }

  const poner = (campo: CampoSimple) => (valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }));
  const ponerLista = (campo: CampoLista) => (valor: string[]) =>
    setListas((l) => ({ ...l, [campo]: valor }));

  /** Cambiar de rol limpia el "qué sos" si ya no corresponde. */
  function elegirRol(nuevo: Rol) {
    setValores((v) => ({
      ...v,
      rol: nuevo,
      tipo: TIPOS_POR_ROL[nuevo].includes(v.tipo as never) ? v.tipo : TIPOS_POR_ROL[nuevo][0],
    }));
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorFoto(null);
    try {
      const blob = await achicarFoto(archivo);
      if (foto) URL.revokeObjectURL(foto.url);
      setFoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setErrorFoto("No pudimos leer esa foto. Probá con otra (JPG o PNG).");
    }
  }

  // Cambios contra lo guardado. Al guardar, /cuenta se revalida y `perfil` trae lo
  // nuevo: el formulario vuelve a estar "al día" sin remontarse.
  const actual = JSON.stringify([valores, listas, slugTocado ? slug : ""]);
  const original = JSON.stringify([valoresDe(perfil, rolInicial), listasDe(perfil), ""]);
  const sinCambios = actual === original && oculto === (perfil?.oculto ?? false) && !foto;

  // Al crear, lo cargado se guarda en el celular como borrador.
  const borrador = useBorradorGuardado();
  const [borradorDescartado, setBorradorDescartado] = useState(false);
  const ofrecerBorrador = creando && !!borrador && !borradorDescartado && sinCambios;

  useEffect(() => {
    if (!creando) {
      borrarBorrador();
      return;
    }
    if (sinCambios) return;
    const espera = setTimeout(
      () => guardarBorrador({ valores, listas, slug: slugTocado ? slug : "" }),
      400
    );
    return () => clearTimeout(espera);
  }, [creando, sinCambios, valores, listas, slug, slugTocado]);

  // Salir con cambios sin guardar: el navegador pregunta antes (al editar; al
  // crear queda el borrador).
  useEffect(() => {
    if (creando || sinCambios || guardando) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [creando, sinCambios, guardando]);

  function recuperarBorrador() {
    if (!borrador) return;
    setValores((v) => ({ ...v, ...pick(borrador.valores, Object.keys(v)) }));
    setListas((l) => ({ ...l, ...pickListas(borrador.listas, Object.keys(l)) }));
    if (borrador.slug) {
      setSlug(borrador.slug);
      setSlugTocado(true);
    }
    setBorradorDescartado(true);
  }

  function descartarBorrador() {
    borrarBorrador();
    setBorradorDescartado(true);
  }

  const rolAvatar = rol ?? "emprendedor";
  const avatar = foto?.url ?? perfil?.avatar_url ?? null;

  return (
    <form action={accion} noValidate className="flex flex-col gap-5">
      {ofrecerBorrador && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl bg-celeste-suave px-4 py-3 text-sm text-tinta">
          <p>Tenés un perfil a medio cargar en este celular. ¿Seguimos desde ahí?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recuperarBorrador}
              className="min-h-11 rounded-full bg-naranja px-4 font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
            >
              Recuperar lo que cargué
            </button>
            <button
              type="button"
              onClick={descartarBorrador}
              className="min-h-11 rounded-full border border-tinta/30 px-4 font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              Empezar de cero
            </button>
          </div>
        </div>
      )}
      {/* 1 · Rol: la decisión que ordena todo lo demás. */}
      <Paso numero={1} titulo="¿Cómo entrás a Pecera?">
        <fieldset className="flex flex-col gap-2.5" aria-describedby={errores.rol ? "rol-error" : undefined}>
          <legend className="sr-only">Tu rol en el ecosistema</legend>
          {(Object.keys(ROLES) as Rol[]).map((r) => {
            const elegido = rol === r;
            return (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-marfil px-4 py-3.5 transition-colors duration-200 ease-pecera has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla ${
                  elegido ? "border-tinta" : "border-tinta/15 hover:border-tinta/40"
                }`}
              >
                <input
                  type="radio"
                  name="rol"
                  value={r}
                  checked={elegido}
                  onChange={() => elegirRol(r)}
                  className="sr-only"
                />
                <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full ${ROLES[r].bg}`} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-lg font-semibold leading-tight text-tinta">
                    {ROLES[r].label}
                  </span>
                  <span className="text-sm text-tinta/75">{DESCRIPCION_ROL[r]}</span>
                </span>
                <span
                  aria-hidden
                  className={`ml-auto mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    elegido ? "border-tinta bg-tinta" : "border-tinta/30"
                  }`}
                >
                  {elegido && <span className="size-2 rounded-full bg-marfil" />}
                </span>
              </label>
            );
          })}
          {errores.rol && <MensajeError id="rol-error">{errores.rol}</MensajeError>}
        </fieldset>

        {rol && (
          <ChipsUnico
            id="tipo"
            nombre="tipo"
            legend="¿Qué sos?"
            opciones={TIPOS_POR_ROL[rol].map((t) => ({
              valor: t,
              label: t === "fondo" ? "Fondo de inversión" : TIPOS[t],
            }))}
            valor={valores.tipo}
            onCambiar={poner("tipo")}
            error={errores.tipo}
          />
        )}
      </Paso>

      {/* 2 · Quién sos. */}
      <Paso numero={2} titulo="Tu perfil" bajada="Es lo que ve quien toca tu pitch o tu tarjeta NFC.">
        <div className="flex items-center gap-4">
          <Avatar
            perfil={{ nombre: valores.nombre || "?", rol: rolAvatar, avatar_url: avatar }}
            size={72}
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="foto"
              className="inline-flex min-h-11 cursor-pointer items-center self-start rounded-full border border-tinta/55 px-4 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-arcilla hover:border-arcilla hover:text-arcilla"
            >
              {avatar ? "Cambiar foto o logo" : "Subir foto o logo"}
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={elegirFoto}
                className="sr-only"
              />
            </label>
            <p className="text-xs text-tinta/70">Se guarda cuadrada y sin datos de ubicación.</p>
          </div>
        </div>
        {errorFoto && <MensajeError>{errorFoto}</MensajeError>}

        <Campo
          id="nombre"
          label={rol === "emprendedor" ? "Nombre del proyecto o el tuyo" : "Tu nombre o el de tu organización"}
          error={errores.nombre}
        >
          <input
            id="nombre"
            name="nombre"
            type="text"
            maxLength={NOMBRE_MAX}
            autoComplete="off"
            value={valores.nombre}
            onChange={cambiar("nombre")}
            aria-invalid={!!errores.nombre}
            aria-describedby={describir("nombre", errores.nombre)}
            className={claseInput(errores.nombre)}
          />
        </Campo>

        {creando ? (
          <Campo
            id="slug"
            label="Tu dirección en Pecera"
            error={errores.slug}
            ayuda={
              <>
                <span className="break-all font-medium text-tinta">
                  {urlPerfil(slugVisible || "tu-direccion")}
                </span>
                <br />
                Después no se puede cambiar: es la dirección de tu tarjeta NFC.
              </>
            }
          >
            <input
              id="slug"
              name="slug"
              type="text"
              maxLength={60}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={slugVisible}
              onChange={(e) => {
                setSlugTocado(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              aria-invalid={!!errores.slug}
              aria-describedby={describir("slug", errores.slug, true)}
              className={claseInput(errores.slug)}
            />
          </Campo>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-tinta">Tu dirección en Pecera</p>
            <p className="break-all text-sm text-tinta/70">{urlPerfil(perfil.slug)}</p>
          </div>
        )}

        <Campo
          id="descripcion"
          label="Descripción en una línea"
          error={errores.descripcion}
          ayuda={`${valores.descripcion.length}/${DESCRIPCION_MAX}`}
        >
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            maxLength={DESCRIPCION_MAX}
            value={valores.descripcion}
            onChange={cambiar("descripcion")}
            placeholder={
              rol === "inversor"
                ? "Invierto en fintech y agtech en etapa temprana."
                : rol === "aliado"
                  ? "Acompaño founders en ventas B2B y primeros clientes."
                  : "Convertimos la borra de café en sustrato para huertas."
            }
            aria-invalid={!!errores.descripcion}
            aria-describedby={describir("descripcion", errores.descripcion, true)}
            className={`${claseInput(errores.descripcion)} resize-none`}
          />
        </Campo>
      </Paso>

      {/* 3 · Lo que pide cada rol. */}
      {rol === "emprendedor" && (
        <Paso
          numero={3}
          titulo="Tu proyecto"
          bajada="Con esto los inversores y aliados te encuentran por etapa e industria."
        >
          <SelectorEtapa
            id="etapa"
            nombre="etapa"
            legend="¿En qué etapa está?"
            etapas={ETAPAS}
            valor={valores.etapa}
            onCambiar={poner("etapa")}
            error={errores.etapa}
          />
          <ChipsMultiple
            id="industrias"
            nombre="industrias"
            legend="Industria"
            opciones={OPCIONES_INDUSTRIAS}
            valores={listas.industrias}
            onCambiar={ponerLista("industrias")}
            max={MAX_INDUSTRIAS_PROYECTO}
            error={errores.industrias}
          />
          <ChipsUnico
            id="ronda"
            nombre="ronda"
            legend="¿Qué ronda estás buscando?"
            opciones={RONDAS}
            valor={valores.ronda}
            onCambiar={poner("ronda")}
            permitirNinguno
            ayuda="Opcional. Pre-seed y seed son las primeras rondas con inversores."
            error={errores.ronda}
          />
          <ChipsUnico
            id="cargo"
            nombre="cargo"
            legend="Tu cargo en el equipo"
            opciones={OPCIONES_CARGOS}
            valor={valores.cargo}
            onCambiar={poner("cargo")}
            permitirNinguno
            ayuda="Opcional. Si tu equipo tiene página de empresa, cada uno muestra el suyo."
            error={errores.cargo}
          />
        </Paso>
      )}

      {rol === "inversor" && (
        <Paso numero={3} titulo="Tu tesis" bajada="Así te llegan los proyectos que de verdad mirás.">
          <ChipsMultiple
            id="rondas_interes"
            nombre="rondas_interes"
            legend="¿En qué rondas invertís?"
            opciones={RONDAS_INTERES}
            valores={listas.rondas_interes}
            onCambiar={ponerLista("rondas_interes")}
            error={errores.rondas_interes}
          />
          <ChipsUnico
            id="ticket"
            nombre="ticket"
            legend="Ticket típico"
            opciones={TICKETS}
            valor={valores.ticket}
            onCambiar={poner("ticket")}
            permitirNinguno
            ayuda="Opcional. Se muestra en tu perfil."
            error={errores.ticket}
          />
          <ChipsMultiple
            id="industrias"
            nombre="industrias"
            legend="Industrias que mirás"
            opciones={OPCIONES_INDUSTRIAS}
            valores={listas.industrias}
            onCambiar={ponerLista("industrias")}
            max={MAX_INDUSTRIAS_INTERES}
            error={errores.industrias}
          />
        </Paso>
      )}

      {rol === "aliado" && (
        <Paso numero={3} titulo="Cómo ayudás" bajada="Los proyectos te buscan por lo que sabés hacer.">
          <ChipsMultiple
            id="especialidades"
            nombre="especialidades"
            legend="Tus especialidades"
            opciones={OPCIONES_ESPECIALIDADES}
            valores={listas.especialidades}
            onCambiar={ponerLista("especialidades")}
            max={MAX_ESPECIALIDADES}
            error={errores.especialidades}
          />
          <ChipsMultiple
            id="industrias"
            nombre="industrias"
            legend="Industrias donde más aportás"
            opciones={OPCIONES_INDUSTRIAS}
            valores={listas.industrias}
            onCambiar={ponerLista("industrias")}
            max={MAX_INDUSTRIAS_INTERES}
            ayuda="Opcional."
            error={errores.industrias}
          />
        </Paso>
      )}

      {/* 4 · Contacto. */}
      <Paso
        numero={rol ? 4 : 3}
        titulo="Cómo te escriben"
        bajada="Todo es opcional y se muestra en tu perfil público. Sumá al menos uno."
      >
        <Campo
          id="whatsapp"
          label="WhatsApp"
          error={errores.whatsapp}
          ayuda="10 dígitos, con código de área, sin 0 ni 15."
        >
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            maxLength={16}
            placeholder="3516123456"
            value={valores.whatsapp}
            onChange={cambiar("whatsapp")}
            aria-invalid={!!errores.whatsapp}
            aria-describedby={describir("whatsapp", errores.whatsapp, true)}
            className={claseInput(errores.whatsapp)}
          />
        </Campo>

        <Campo
          id="email"
          label="Email de contacto"
          error={errores.email}
          ayuda="Puede ser distinto al de tu cuenta de Google."
        >
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            maxLength={200}
            value={valores.email}
            onChange={cambiar("email")}
            aria-invalid={!!errores.email}
            aria-describedby={describir("email", errores.email, true)}
            className={claseInput(errores.email)}
          />
        </Campo>

        <Campo id="linkedin" label="LinkedIn" error={errores.linkedin}>
          <input
            id="linkedin"
            name="linkedin"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            maxLength={200}
            placeholder="linkedin.com/in/tuusuario"
            value={valores.linkedin}
            onChange={cambiar("linkedin")}
            aria-invalid={!!errores.linkedin}
            aria-describedby={describir("linkedin", errores.linkedin)}
            className={claseInput(errores.linkedin)}
          />
        </Campo>

        <Campo id="instagram" label="Instagram" error={errores.instagram}>
          <input
            id="instagram"
            name="instagram"
            type="text"
            autoCapitalize="none"
            maxLength={100}
            placeholder="@tuusuario"
            value={valores.instagram}
            onChange={cambiar("instagram")}
            aria-invalid={!!errores.instagram}
            aria-describedby={describir("instagram", errores.instagram)}
            className={claseInput(errores.instagram)}
          />
        </Campo>

        <Campo id="web" label="Web" error={errores.web}>
          <input
            id="web"
            name="web"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            maxLength={200}
            placeholder="tuweb.com.ar"
            value={valores.web}
            onChange={cambiar("web")}
            aria-invalid={!!errores.web}
            aria-describedby={describir("web", errores.web)}
            className={claseInput(errores.web)}
          />
        </Campo>
      </Paso>

      {creando ? (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 text-sm text-tinta">
            <input
              name="consentimiento"
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              aria-invalid={!!errores.consentimiento}
              className="mt-0.5 size-5 shrink-0 accent-tinta"
            />
            {CONSENTIMIENTO}
          </label>
          {/* Pestaña nueva: no saca a la persona del formulario a medio cargar. */}
          <p className="pl-8 text-sm text-tinta/80">
            Leé la{" "}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener"
              className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla"
            >
              política de privacidad
            </a>{" "}
            y las{" "}
            <a
              href="/terminos"
              target="_blank"
              rel="noopener"
              className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla"
            >
              condiciones
            </a>
            .
          </p>
          {errores.consentimiento && <MensajeError>{errores.consentimiento}</MensajeError>}
        </div>
      ) : (
        <label className="flex items-start gap-3 text-sm text-tinta">
          <input
            name="oculto"
            type="checkbox"
            checked={oculto}
            onChange={(e) => setOculto(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-tinta"
          />
          <span>
            Ocultar mi perfil
            <span className="block text-tinta/70">
              Mientras esté tildado, nadie lo ve en Pecera.
            </span>
          </span>
        </label>
      )}

      {estado.general && <MensajeError>{estado.general}</MensajeError>}
      {hayErrores && !estado.general && (
        <MensajeError>Revisá los campos marcados más arriba.</MensajeError>
      )}

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex flex-col gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="min-h-12 rounded-full bg-naranja px-5 font-semibold text-tinta shadow-[0_8px_24px_rgb(28_27_22/0.25)] transition-[background-color,transform] duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-70 hover:bg-pecera active:scale-[0.98]"
        >
          {guardando ? "Guardando…" : creando ? "Crear mi perfil" : "Guardar cambios"}
        </button>
        {guardando && tardando ? (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl bg-marfil p-3 text-center">
            <p className="text-sm text-tinta">
              Está tardando más de lo normal. Recargá la página: si tu perfil se guardó, lo vas
              a ver.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-full border border-tinta/55 px-5 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:border-arcilla hover:text-arcilla"
            >
              Recargar la página
            </button>
          </div>
        ) : (
          <p role="status" className="flex min-h-5 items-center justify-center gap-1.5 text-center text-sm text-tinta">
            {guardando ? null : !sinCambios && !creando ? (
              <>
                <span aria-hidden className="size-2 rounded-full bg-arcilla" />
                Tenés cambios sin guardar
              </>
            ) : estado.guardado && !errorFoto ? (
              estado.aviso ?? (
                <>
                  <span
                    aria-hidden
                    className="aparecer-pop flex size-4 items-center justify-center rounded-full bg-aliado text-marfil"
                  >
                    <svg viewBox="0 0 12 12" className="size-2.5">
                      <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Guardado
                </>
              )
            ) : creando ? (
              "Lo que cargás queda guardado en este celular hasta que crees tu perfil."
            ) : null}
          </p>
        )}
      </div>
    </form>
  );
}
