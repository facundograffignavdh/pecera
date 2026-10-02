"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { type ReactNode, useActionState, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type EstadoGuardar, guardarPerfil } from "@/app/cuenta/acciones";
import Avatar from "@/components/Avatar";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import EditorFoto from "@/components/EditorFoto";
import EntradaTags from "@/components/EntradaTags";
import { EtiquetasPerfil } from "@/components/Etiquetas";
import Info from "@/components/Info";
import TelefonoPais from "@/components/TelefonoPais";
import { completitud } from "@/lib/completitud";
import {
  AYUDA_TIPO,
  CAMPOS_LISTA,
  CAMPOS_SIMPLES,
  CONSENTIMIENTO,
  type CampoLista,
  type CampoPerfil,
  type CampoSimple,
  DESCRIPCION_MAX,
  DESCRIPCION_ROL,
  type EntradaPerfil,
  NOMBRE_MAX,
  TIPOS_POR_ROL,
  slugDesdeNombre,
  urlPerfil,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import {
  APORTES,
  CARGOS,
  DEDICACIONES,
  EDUCACION_MAX,
  ESPECIALIDADES,
  ETAPAS,
  EXPERIENCIA_MAX,
  INDUSTRIAS,
  MAX_ESPECIALIDADES,
  MAX_INDUSTRIAS_INTERES,
  MAX_INDUSTRIAS_PROYECTO,
  MAX_NECESIDADES,
  MAX_SKILLS,
  NECESIDADES,
  NOTA_COFUNDADOR_MAX,
  RONDAS,
  RONDAS_INTERES,
  SKILL_MAX,
  TICKETS,
  UBICACION_MAX,
  conTono,
} from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";
import type { EmpresaResumen, Perfil, Rol } from "@/types/pecera";

export type PerfilPropio = Perfil & { oculto: boolean };

type Valores = Record<CampoSimple, string>;
type Listas = Record<CampoLista, string[]>;

/** Sin respuesta en este tiempo, se ofrece recargar. */
const ESPERA_MAXIMA_MS = 20_000;
/** Al editar, se guarda solo después de esta pausa sin cambios. */
const PAUSA_AUTOGUARDADO_MS = 1500;
const CLAVE_BORRADOR = "pecera:borrador-perfil";

const OPCIONES_INDUSTRIAS = conTono(INDUSTRIAS);
const OPCIONES_CARGOS = conTono(CARGOS);
const OPCIONES_ESPECIALIDADES = conTono(ESPECIALIDADES);
const OPCIONES_APORTES = conTono(APORTES);
const OPCIONES_NECESIDADES = conTono(NECESIDADES);
const SUGERENCIAS_SKILLS = ["Ventas B2B", "Producto", "Marketing digital", "Finanzas", "Desarrollo web", "IA", "Diseño UX", "Liderazgo"];

const CLASE_INPUT =
  "w-full rounded-xl border bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 transition-shadow duration-200 ease-pecera focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

function claseInput(error?: string) {
  return `${CLASE_INPUT} ${error ? "border-2 border-arcilla" : "border-tinta/40"}`;
}

const BOTON =
  "boton inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60";

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function Campo({
  id,
  label,
  error,
  ayuda,
  info,
  opcional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  ayuda?: ReactNode;
  info?: ReactNode;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-tinta">
          {label}
          {opcional && <span className="ml-1.5 font-normal text-tinta/55">(opcional)</span>}
        </label>
        {info && <Info titulo={`Qué es: ${label}`}>{info}</Info>}
      </div>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-tinta/65">
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
    <p id={id} role="alert" className="flex items-start gap-2 text-sm font-medium text-tinta">
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
      {children}
    </p>
  );
}

function describir(id: string, error?: string, ayuda = false) {
  const ids = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ");
  return ids || undefined;
}

// ---------------------------------------------------------------------------
// Pasos
// ---------------------------------------------------------------------------

type Paso = { id: string; titulo: string; corto: string; bajada: string; campos: CampoPerfil[] };

function pasosPara(rol: Rol | null): Paso[] {
  const propio: Paso =
    rol === "inversor"
      ? {
          id: "propio",
          titulo: "Tu tesis de inversión",
          corto: "Tesis",
          bajada: "Así te llegan los proyectos que de verdad mirás.",
          campos: ["rondas_interes", "ticket", "industrias"],
        }
      : rol === "aliado"
        ? {
            id: "propio",
            titulo: "Tu especialidad",
            corto: "Especialidad",
            bajada: "Los proyectos te buscan por lo que sabés hacer.",
            campos: ["especialidades", "industrias"],
          }
        : {
            id: "propio",
            titulo: "Tu emprendimiento",
            corto: "Emprendimiento",
            bajada: "Con esto los inversores y aliados te encuentran por etapa e industria.",
            campos: ["etapa", "industrias", "ronda"],
          };
  return [
    {
      id: "basico",
      titulo: "Lo básico",
      corto: "Básico",
      bajada: "Es lo primero que ve quien toca tu tarjeta NFC.",
      campos: ["rol", "tipo", "nombre", "slug", "ubicacion", "descripcion"],
    },
    {
      id: "profesional",
      titulo: "Lo profesional",
      corto: "Profesional",
      bajada: "Tu empresa, tu trayectoria y lo que sabés hacer. Todo opcional.",
      campos: ["cargo", "experiencia", "educacion", "skills"],
    },
    {
      id: "contacto",
      titulo: "Redes y contacto",
      corto: "Contacto",
      bajada: "Todo es opcional. Con WhatsApp o email alcanza para que te escriban.",
      campos: ["whatsapp", "email", "linkedin", "instagram", "web"],
    },
    propio,
    {
      id: "preferencias",
      titulo: "Qué buscás y qué ofrecés",
      corto: "Preferencias",
      bajada: "Es lo que usamos para conectarte con quien te sirve.",
      campos: ["busca", "ofrece", "busca_cofundador", "cofundador_aporta", "cofundador_busca", "cofundador_nota"],
    },
    {
      id: "final",
      titulo: "Revisá y guardá",
      corto: "Final",
      bajada: "Así se va a ver tu tarjeta.",
      campos: ["consentimiento"],
    },
  ];
}

/** Lo que trae el FormData, igual que en el servidor. */
function entradaDesde(datos: FormData): EntradaPerfil {
  return {
    ...Object.fromEntries(CAMPOS_SIMPLES.map((c) => [c, String(datos.get(c) ?? "")])),
    ...Object.fromEntries(CAMPOS_LISTA.map((c) => [c, datos.getAll(c).map(String)])),
    busca_cofundador: datos.get("busca_cofundador") === "on",
  };
}

// ---------------------------------------------------------------------------
// Borrador (perfil nuevo): queda en el celular para seguir después
// ---------------------------------------------------------------------------

type Borrador = { valores: Valores; listas: Listas; buscaCofundador: boolean; guardado: number };

const sinCambios = () => () => {};
function leerBorrador(): string | null {
  try {
    return localStorage.getItem(CLAVE_BORRADOR);
  } catch {
    return null;
  }
}

type EstadoAutoguardado =
  | { tipo: "quieto" }
  | { tipo: "pendiente" }
  | { tipo: "guardando" }
  | { tipo: "ok"; en: number }
  | { tipo: "revisar"; mensaje: string }
  | { tipo: "error"; mensaje: string };

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

export default function FormPerfil({
  perfil,
  rolInicial,
  empresa,
}: {
  perfil: PerfilPropio | null;
  /** Desde la landing: el rol ya elegido. */
  rolInicial?: Rol;
  /** La empresa del perfil, si tiene (paso Profesional). */
  empresa?: EmpresaResumen | null;
}) {
  const creando = perfil === null;
  const formRef = useRef<HTMLFormElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const temporizador = useRef<number | null>(null);
  /** Hay cambios que todavía no se guardaron (así "Listo" no escribe si no tocaste nada). */
  const sucio = useRef(false);

  const [valores, setValores] = useState<Valores>({
    nombre: perfil?.nombre ?? "",
    tipo: perfil?.tipo ?? (rolInicial ? TIPOS_POR_ROL[rolInicial][0] : ""),
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
    cofundador_aporta: perfil?.cofundador_aporta ?? "",
    cofundador_dedicacion: perfil?.cofundador_dedicacion ?? "",
    cofundador_nota: perfil?.cofundador_nota ?? "",
    ubicacion: perfil?.ubicacion ?? "",
    experiencia: perfil?.experiencia ?? "",
    educacion: perfil?.educacion ?? "",
  });
  const [listas, setListas] = useState<Listas>({
    industrias: perfil?.industrias ?? [],
    especialidades: perfil?.especialidades ?? [],
    rondas_interes: perfil?.rondas_interes ?? [],
    cofundador_busca: perfil?.cofundador_busca ?? [],
    skills: perfil?.skills ?? [],
    busca: perfil?.busca ?? [],
    ofrece: perfil?.ofrece ?? [],
  });
  const [buscaCofundador, setBuscaCofundador] = useState(perfil?.busca_cofundador ?? false);
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [oculto, setOculto] = useState(perfil?.oculto ?? false);
  const [foto, setFoto] = useState<{ url: string; blob: Blob | null } | null>(
    perfil?.avatar_url ? { url: perfil.avatar_url, blob: null } : null
  );
  const [tardando, setTardando] = useState(false);
  const [paso, setPaso] = useState(0);
  const [visitado, setVisitado] = useState(creando ? 0 : 5);
  const [erroresPaso, setErroresPaso] = useState<Partial<Record<CampoPerfil, string>>>({});
  const [autoguardado, setAutoguardado] = useState<EstadoAutoguardado>({ tipo: "quieto" });
  const [ahora, setAhora] = useState(0);
  const [borradorDescartado, setBorradorDescartado] = useState(false);

  const borradorGuardado = useSyncExternalStore(sinCambios, leerBorrador, () => null);
  const hayBorrador = creando && !!borradorGuardado && !borradorDescartado;

  const slugVisible = creando ? (slugTocado ? slug : slugDesdeNombre(valores.nombre)) : perfil.slug;
  const rol = (valores.rol || null) as Rol | null;
  const pasos = pasosPara(rol);
  const actual = pasos[paso];
  const ultimo = paso === pasos.length - 1;
  const conCofundador = rol === "emprendedor" || rol === "aliado";

  const { porcentaje, items } = completitud({
    rol,
    foto: !!foto,
    nombre: valores.nombre,
    descripcion: valores.descripcion,
    ubicacion: valores.ubicacion,
    experiencia: valores.experiencia,
    educacion: valores.educacion,
    skills: listas.skills,
    whatsapp: valores.whatsapp,
    email: valores.email,
    linkedin: valores.linkedin,
    instagram: valores.instagram,
    web: valores.web,
    etapa: valores.etapa,
    industrias: listas.industrias,
    rondas_interes: listas.rondas_interes,
    especialidades: listas.especialidades,
    busca: listas.busca,
    ofrece: listas.ofrece,
  });

  // Perfil nuevo: el borrador se guarda solo en el celular (salir y seguir después).
  useEffect(() => {
    if (!creando) return;
    const espera = window.setTimeout(() => {
      const vacio = !valores.nombre && !valores.descripcion && !valores.rol;
      try {
        if (vacio) return;
        const borrador: Borrador = { valores, listas, buscaCofundador, guardado: Date.now() };
        localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
      } catch {
        // Sin localStorage, no hay borrador: el form anda igual.
      }
    }, 600);
    return () => clearTimeout(espera);
  }, [creando, valores, listas, buscaCofundador]);

  // "Guardado hace un momento" se actualiza solo.
  useEffect(() => {
    if (autoguardado.tipo !== "ok") return;
    const reloj = window.setInterval(() => setAhora(Date.now()), 20_000);
    return () => clearInterval(reloj);
  }, [autoguardado]);

  useEffect(
    () => () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    },
    []
  );

  /** Mismas reglas que el servidor: los errores de los pasos pedidos. */
  function erroresDe(indices: number[]) {
    const { errores } = validarPerfil({ ...valores, ...listas, busca_cofundador: buscaCofundador });
    if (creando) {
      const errorSlug = validarSlug(slugVisible);
      if (errorSlug) errores.slug = errorSlug;
      if (!consentimiento) errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
    }
    const campos = new Set(indices.flatMap((i) => pasos[i].campos));
    return Object.fromEntries(Object.entries(errores).filter(([c]) => campos.has(c as CampoPerfil)));
  }

  function irA(indice: number) {
    setPaso(indice);
    setVisitado((v) => Math.max(v, indice));
    // Arriba del formulario y el foco en el título del paso (lector de pantalla).
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      tituloRef.current?.focus({ preventScroll: true });
    });
  }

  function irAlPrimerError(errs: Partial<Record<CampoPerfil, string>>) {
    const indice = pasos.findIndex((p) => p.campos.some((c) => errs[c]));
    if (indice >= 0) irA(indice);
  }

  /** Guarda ya, sin esperar la pausa (si todo está bien). Devuelve cómo salió. */
  const guardarYa = useCallback(async (): Promise<{ ok: boolean; mensaje?: string }> => {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    const form = formRef.current;
    if (!form || !sucio.current) return { ok: true };
    const datos = new FormData(form);
    const { errores } = validarPerfil(entradaDesde(datos));
    const primero = Object.values(errores)[0];
    if (primero) {
      setAutoguardado({ tipo: "revisar", mensaje: primero });
      return { ok: false, mensaje: primero };
    }
    setAutoguardado({ tipo: "guardando" });
    try {
      const r = await guardarPerfil({ errores: {} }, datos);
      if (r.guardado) {
        sucio.current = false;
        setAutoguardado({ tipo: "ok", en: Date.now() });
        setAhora(Date.now());
        return { ok: true };
      }
      const mensaje = r.general ?? Object.values(r.errores)[0] ?? "No pudimos guardar.";
      setAutoguardado({ tipo: "error", mensaje });
      return { ok: false, mensaje };
    } catch {
      const mensaje = "Sin conexión: tus cambios todavía no se guardaron.";
      setAutoguardado({ tipo: "error", mensaje });
      return { ok: false, mensaje };
    }
  }, []);

  /** Al editar: guarda solo, después de una pausa, si todo está bien. */
  function programarAutoguardado() {
    if (creando) return;
    sucio.current = true;
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    setAutoguardado({ tipo: "pendiente" });
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      void guardarYa();
    }, PAUSA_AUTOGUARDADO_MS);
  }

  // "Listo" (PerfilCuenta) pide guardar lo pendiente antes de volver a la vista del perfil, y
  // espera la respuesta: así el último cambio no se pierde por salir antes de la pausa.
  useEffect(() => {
    if (creando) return;
    const alPedir = async () => {
      const resultado = await guardarYa();
      window.dispatchEvent(new CustomEvent("pecera:perfil-guardado", { detail: resultado }));
    };
    window.addEventListener("pecera:guardar-perfil", alPedir);
    return () => window.removeEventListener("pecera:guardar-perfil", alPedir);
  }, [creando, guardarYa]);

  const [estado, accion, guardando] = useActionState(
    async (previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> => {
      setTardando(false);
      const errores = erroresDe(pasos.map((_, i) => i));
      if (Object.keys(errores).length) {
        irAlPrimerError(errores);
        return { errores };
      }
      // Al crear, la foto viaja con el resto: la action la sube antes de redirigir.
      if (creando && foto?.blob) formData.set("foto", foto.blob, "foto.jpg");
      let resultado: EstadoGuardar;
      try {
        if (creando) {
          try {
            localStorage.removeItem(CLAVE_BORRADOR);
          } catch {}
        }
        resultado = await guardarPerfil(previo, formData);
      } catch (e) {
        // Al crear, la action redirige y eso llega acá como error: lo maneja Next.
        unstable_rethrow(e);
        return { errores: {}, general: "No pudimos guardar. Revisá tu conexión y probá de nuevo." };
      }
      if (Object.keys(resultado.errores).length) irAlPrimerError(resultado.errores);
      if (resultado.guardado) setAutoguardado({ tipo: "ok", en: Date.now() });
      return resultado;
    },
    { errores: {} }
  );
  const errores = { ...erroresPaso, ...estado.errores };

  // Límite de seguridad: si el guardado no vuelve, que nadie quede mirando
  // "Guardando…" para siempre.
  useEffect(() => {
    if (!guardando) return;
    const espera = setTimeout(() => setTardando(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(espera);
  }, [guardando]);

  function siguiente() {
    const errs = erroresDe([paso]);
    setErroresPaso(errs);
    if (Object.keys(errs).length) return;
    irA(Math.min(paso + 1, pasos.length - 1));
  }

  const cambiar = (campo: CampoSimple) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));
  const poner = (campo: CampoSimple) => (valor: string) => setValores((v) => ({ ...v, [campo]: valor }));
  const ponerLista = (campo: CampoLista) => (valor: string[]) => setListas((l) => ({ ...l, [campo]: valor }));

  /** Cambiar de rol limpia el "qué sos" si ya no corresponde. */
  function elegirRol(nuevo: Rol) {
    setValores((v) => ({
      ...v,
      rol: nuevo,
      tipo: TIPOS_POR_ROL[nuevo].includes(v.tipo as never) ? v.tipo : TIPOS_POR_ROL[nuevo][0],
    }));
  }

  function continuarBorrador() {
    try {
      const b = JSON.parse(borradorGuardado ?? "") as Borrador;
      setValores((v) => ({ ...v, ...b.valores }));
      setListas((l) => ({ ...l, ...b.listas }));
      setBuscaCofundador(!!b.buscaCofundador);
    } catch {
      // Borrador roto: se descarta.
    }
    setBorradorDescartado(true);
  }

  function descartarBorrador() {
    try {
      localStorage.removeItem(CLAVE_BORRADOR);
    } catch {}
    setBorradorDescartado(true);
  }

  const rolAvatar = rol ?? "emprendedor";

  const textoEstado =
    autoguardado.tipo === "guardando"
      ? "Guardando…"
      : autoguardado.tipo === "pendiente"
        ? "Cambios sin guardar…"
        : autoguardado.tipo === "ok"
          ? ahora - autoguardado.en < 45_000
            ? "Guardado hace un momento"
            : `Guardado hace ${Math.max(1, Math.round((ahora - autoguardado.en) / 60_000))} min`
          : autoguardado.tipo === "revisar"
            ? `Para guardar, revisá: ${autoguardado.mensaje}`
            : autoguardado.tipo === "error"
              ? autoguardado.mensaje
              : creando
                ? "Tu borrador se guarda en este celular"
                : "Los cambios se guardan solos";

  return (
    <form
      ref={formRef}
      action={accion}
      noValidate
      onChange={programarAutoguardado}
      onKeyDown={(e) => {
        // Enter en un campo de texto avanza de paso en vez de enviar a medias.
        const t = e.target as HTMLElement;
        if (e.key === "Enter" && !ultimo && t.tagName === "INPUT") {
          e.preventDefault();
          siguiente();
        }
      }}
      className="flex scroll-mt-24 flex-col gap-5"
    >
      {hayBorrador && (
        <div role="status" className="aparecer flex flex-col gap-3 rounded-3xl border-2 border-dashed border-arcilla/50 bg-t-arcilla-suave/40 px-4 py-4">
          <p className="text-sm font-medium text-tinta">Tenés un perfil a medio hacer en este celular.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={continuarBorrador} className={`${BOTON} min-h-11 bg-tinta text-marfil`}>
              Seguir donde lo dejé
            </button>
            <button type="button" onClick={descartarBorrador} className={`${BOTON} min-h-11 border border-tinta/30 text-tinta`}>
              Empezar de cero
            </button>
          </div>
        </div>
      )}

      {/* Progreso: Paso X de Y, completitud y estado del guardado. */}
      <nav aria-label="Pasos del formulario" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-tinta">
            Paso {paso + 1} de {pasos.length} · <span className="font-normal text-tinta/70">{actual.titulo}</span>
          </span>
          <span className="shrink-0 tabular-nums text-tinta/60">{porcentaje}% completo</span>
        </div>
        <ol className="grid grid-cols-6 gap-1.5">
          {pasos.map((p, i) => {
            const accesible = !creando || i <= visitado;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!accesible}
                  onClick={() => irA(i)}
                  aria-current={i === paso ? "step" : undefined}
                  aria-label={`Paso ${i + 1}: ${p.titulo}`}
                  className="group flex w-full flex-col gap-1.5 py-1 disabled:cursor-default"
                >
                  <span
                    className={`h-1.5 w-full rounded-full transition-colors duration-500 ease-pecera ${
                      i <= paso ? "bg-arcilla" : i <= visitado ? "bg-tinta/35" : "bg-tinta/12"
                    }`}
                  />
                  <span
                    className={`hidden truncate text-left text-xs sm:block ${
                      i === paso ? "font-semibold text-tinta" : "text-tinta/55 group-enabled:group-hover:text-tinta"
                    }`}
                  >
                    {p.corto}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-xs ${
            autoguardado.tipo === "error" || autoguardado.tipo === "revisar"
              ? "font-medium text-t-arcilla"
              : autoguardado.tipo === "ok"
                ? "text-t-verde"
                : "text-tinta/60"
          }`}
        >
          {autoguardado.tipo === "guardando" ? (
            <span className="girando size-3 rounded-full border-2 border-current border-t-transparent" />
          ) : autoguardado.tipo === "ok" ? (
            <span aria-hidden>✓</span>
          ) : null}
          {textoEstado}
        </p>
      </nav>

      <section
        key={actual.id}
        aria-labelledby="paso-titulo"
        className="paso-entra flex flex-col gap-5 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5 sm:px-6 sm:py-6"
      >
        <header className="flex flex-col gap-1">
          <h2
            id="paso-titulo"
            ref={tituloRef}
            tabIndex={-1}
            className="font-display text-2xl font-semibold leading-tight text-tinta outline-none"
          >
            {actual.titulo}
          </h2>
          <p className="text-sm text-tinta/70">{actual.bajada}</p>
        </header>

        {/* ---- 1 · Lo básico ---- */}
        <div hidden={actual.id !== "basico"} className="flex flex-col gap-5">
          <EditorFoto
            nombre={valores.nombre}
            rol={rolAvatar}
            foto={foto?.url ?? null}
            guardarEnElActo={!creando}
            onCambio={setFoto}
          />

          <fieldset className="flex flex-col gap-2" aria-describedby={errores.rol ? "rol-error" : undefined}>
            <legend className="mb-2 text-sm font-medium text-tinta">¿Cómo entrás a Pecera?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(ROLES) as Rol[]).map((r) => {
                const elegido = rol === r;
                return (
                  <label
                    key={r}
                    className={`tarjeta-opcion flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-marfil px-3.5 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla sm:flex-col sm:gap-1.5 ${
                      elegido ? "border-tinta shadow-[0_6px_20px_rgb(28_27_22/0.10)]" : "border-tinta/15 hover:border-tinta/40"
                    }`}
                  >
                    <input type="radio" name="rol" value={r} checked={elegido} onChange={() => elegirRol(r)} className="sr-only" />
                    <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full sm:mt-0 ${ROLES[r].bg}`} />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-display text-lg font-semibold leading-tight text-tinta">{ROLES[r].label}</span>
                      <span className="text-xs leading-snug text-tinta/70">{DESCRIPCION_ROL[r]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errores.rol && <MensajeError id="rol-error">{errores.rol}</MensajeError>}
          </fieldset>

          {rol && (
            <ChipsUnico
              id="tipo"
              nombre="tipo"
              legend="¿Qué sos?"
              info={
                <span className="flex flex-col gap-1.5">
                  {TIPOS_POR_ROL[rol].map((t) => (
                    <span key={t}>
                      <strong className="font-semibold">{t === "fondo" ? "Fondo de inversión" : TIPOS[t]}:</strong> {AYUDA_TIPO[t]}
                    </span>
                  ))}
                </span>
              }
              opciones={TIPOS_POR_ROL[rol].map((t) => ({ valor: t, label: t === "fondo" ? "Fondo de inversión" : TIPOS[t] }))}
              valor={valores.tipo}
              onCambiar={poner("tipo")}
              error={errores.tipo}
            />
          )}

          <Campo
            id="nombre"
            label={rol === "emprendedor" ? "Tu nombre o el del proyecto" : "Tu nombre o el de tu organización"}
            error={errores.nombre}
          >
            <input
              id="nombre"
              name="nombre"
              type="text"
              maxLength={NOMBRE_MAX}
              autoComplete="name"
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
              info="Es el link de tu tarjeta NFC y del QR. Se elige una sola vez: después no se puede cambiar, así las tarjetas impresas nunca se rompen."
              ayuda={<span className="break-all font-medium text-tinta">{urlPerfil(slugVisible || "tu-direccion")}</span>}
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
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-tinta">Tu dirección en Pecera</p>
              <p className="break-all text-sm text-tinta/70">{urlPerfil(perfil.slug)}</p>
            </div>
          )}

          <Campo id="ubicacion" label="Ubicación" opcional error={errores.ubicacion}>
            <input
              id="ubicacion"
              name="ubicacion"
              type="text"
              maxLength={UBICACION_MAX}
              autoComplete="address-level2"
              placeholder="Córdoba, Argentina"
              value={valores.ubicacion}
              onChange={cambiar("ubicacion")}
              className={claseInput(errores.ubicacion)}
            />
          </Campo>

          <Campo
            id="descripcion"
            label="Bio en una línea"
            error={errores.descripcion}
            info="Una frase que se entienda sin contexto: qué hacés y para quién. Es lo primero que se lee debajo de tu nombre. Podés sumar hashtags como #feria21."
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
                    ? "Hago marketing para startups B2B: de 0 a los primeros 100 clientes."
                    : "Convertimos la borra de café en sustrato para huertas."
              }
              aria-invalid={!!errores.descripcion}
              aria-describedby={describir("descripcion", errores.descripcion, true)}
              className={`${claseInput(errores.descripcion)} resize-none`}
            />
          </Campo>
        </div>

        {/* ---- 2 · Lo profesional ---- */}
        <div hidden={actual.id !== "profesional"} className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-tinta/15 bg-marfil px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta/55">Empresa</p>
              <p className="truncate font-display text-lg font-semibold text-tinta">
                {empresa ? empresa.nombre : creando ? "La sumás después de crear tu perfil" : "Todavía no estás en una empresa"}
              </p>
            </div>
            {!creando && (
              <Link href="/cuenta/empresa" className={`${BOTON} min-h-10 shrink-0 border border-tinta/30 text-sm text-tinta`}>
                {empresa ? "Administrar" : "Crear o unirme"}
              </Link>
            )}
          </div>

          {rol === "emprendedor" && (
            <ChipsUnico
              id="cargo"
              nombre="cargo"
              legend="Tu cargo"
              opciones={OPCIONES_CARGOS}
              valor={valores.cargo}
              onCambiar={poner("cargo")}
              permitirNinguno
              ayuda="Opcional."
              info="CEO: rumbo, equipo y plata. CTO: tecnología. CFO: finanzas. COO: operaciones. CMO: marketing. CPO: producto. En la página de la empresa, cada miembro muestra el suyo."
              error={errores.cargo}
            />
          )}

          <Campo
            id="experiencia"
            label="Experiencia"
            opcional
            error={errores.experiencia}
            ayuda={`${valores.experiencia.length}/${EXPERIENCIA_MAX}`}
          >
            <textarea
              id="experiencia"
              name="experiencia"
              rows={3}
              maxLength={EXPERIENCIA_MAX}
              placeholder="8 años en ventas B2B. Antes, cofundé una agtech que llegó a 40 clientes."
              value={valores.experiencia}
              onChange={cambiar("experiencia")}
              className={`${claseInput(errores.experiencia)} resize-none`}
            />
          </Campo>

          <Campo id="educacion" label="Educación" opcional error={errores.educacion}>
            <input
              id="educacion"
              name="educacion"
              type="text"
              maxLength={EDUCACION_MAX}
              placeholder="Lic. en Administración, Universidad Siglo 21"
              value={valores.educacion}
              onChange={cambiar("educacion")}
              className={claseInput(errores.educacion)}
            />
          </Campo>

          <Campo id="skills" label="Skills" opcional error={errores.skills} info="Lo que sabés hacer, en pocas palabras. Escribí y tocá Enter (o coma) para sumar cada una.">
            <EntradaTags
              id="skills"
              nombre="skills"
              valores={listas.skills}
              onCambiar={(v) => {
                ponerLista("skills")(v);
                programarAutoguardado();
              }}
              max={MAX_SKILLS}
              largoMax={SKILL_MAX}
              placeholder="Ventas, Python, Diseño…"
              sugerencias={SUGERENCIAS_SKILLS}
            />
          </Campo>
        </div>

        {/* ---- 3 · Redes y contacto ---- */}
        <div hidden={actual.id !== "contacto"} className="flex flex-col gap-5">
          <Campo
            id="whatsapp"
            label="WhatsApp"
            opcional
            error={errores.whatsapp}
            info="Es el botón más usado del perfil: te escriben con un toque y el mensaje ya dice que te vieron en Pecera. Elegí el país con la bandera."
          >
            <TelefonoPais
              id="whatsapp"
              nombre="whatsapp"
              valorInicial={valores.whatsapp}
              onCambiar={poner("whatsapp")}
              invalido={!!errores.whatsapp}
              describedBy={describir("whatsapp", errores.whatsapp)}
            />
          </Campo>

          <Campo id="email" label="Email de contacto" opcional error={errores.email} ayuda="Puede ser distinto al de tu cuenta de Google.">
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="linkedin" label="LinkedIn" opcional error={errores.linkedin}>
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
                className={claseInput(errores.linkedin)}
              />
            </Campo>
            <Campo id="instagram" label="Instagram" opcional error={errores.instagram}>
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
                className={claseInput(errores.instagram)}
              />
            </Campo>
          </div>
          <Campo id="web" label="Web" opcional error={errores.web}>
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
              className={claseInput(errores.web)}
            />
          </Campo>
        </div>

        {/* ---- 4 · Emprendimiento / tesis / especialidad ---- */}
        <div hidden={actual.id !== "propio"} className="flex flex-col gap-6">
          {!rol && <p className="text-sm text-tinta/70">Elegí tu rol en el paso 1 para ver esta parte.</p>}
          {rol === "emprendedor" && (
            <>
              <SelectorEtapa
                id="etapa"
                nombre="etapa"
                legend="¿En qué etapa está?"
                etapas={ETAPAS}
                valor={valores.etapa}
                onCambiar={poner("etapa")}
                info="Idea: todavía no hay producto. Prototipo: algo que se puede mostrar. MVP: primeros usuarios reales. Funcionando: clientes que pagan. Escalando: crece rápido y suma equipo."
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
                info="Los colores agrupan por área: verde es plata, azul tecnología, petróleo impacto (planeta y personas), ocre operaciones e industria y tierra lo legal e institucional."
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
                ayuda="Opcional."
                info="Pre-seed: la primera plata de afuera para validar (USD 50-500 mil). Seed: para validar el negocio (USD 500 mil-3 M). Serie A: para escalar lo que ya funciona."
                error={errores.ronda}
              />
            </>
          )}
          {rol === "inversor" && (
            <>
              <ChipsMultiple
                id="rondas_interes"
                nombre="rondas_interes"
                legend="¿En qué rondas invertís?"
                opciones={RONDAS_INTERES}
                valores={listas.rondas_interes}
                onCambiar={ponerLista("rondas_interes")}
                info="Pre-seed y seed son las etapas tempranas (lo que más hay en la feria). Serie A y B, empresas que ya escalan."
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
                info="Cuánto ponés en general por proyecto. Ayuda a que te escriban los que buscan ese monto."
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
            </>
          )}
          {rol === "aliado" && (
            <>
              <ChipsMultiple
                id="especialidades"
                nombre="especialidades"
                legend="Tus especialidades"
                opciones={OPCIONES_ESPECIALIDADES}
                valores={listas.especialidades}
                onCambiar={ponerLista("especialidades")}
                max={MAX_ESPECIALIDADES}
                info="Lo que ofrecés a los proyectos, como mentor/a, coach o profesional. El color es el área: petróleo acompañamiento, arcilla negocio, verde plata, azul tecnología, violeta producto, ciruela marca, ocre operaciones, tierra legal."
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
            </>
          )}
        </div>

        {/* ---- 5 · Preferencias ---- */}
        <div hidden={actual.id !== "preferencias"} className="flex flex-col gap-6">
          <ChipsMultiple
            id="busca"
            nombre="busca"
            legend="¿Qué buscás?"
            opciones={OPCIONES_NECESIDADES}
            valores={listas.busca}
            onCambiar={ponerLista("busca")}
            max={MAX_NECESIDADES}
            info="Se muestra en tu perfil y sirve para el matching: quien ofrece lo que buscás te encuentra más fácil."
            error={errores.busca}
          />
          <ChipsMultiple
            id="ofrece"
            nombre="ofrece"
            legend="¿Qué ofrecés?"
            opciones={OPCIONES_NECESIDADES}
            valores={listas.ofrece}
            onCambiar={ponerLista("ofrece")}
            max={MAX_NECESIDADES}
            error={errores.ofrece}
          />

          {conCofundador && (
            <div className="flex flex-col gap-4 rounded-2xl border border-tinta/15 bg-marfil px-4 py-4">
              <label className="relative flex cursor-pointer items-start justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium text-tinta">
                    Busco cofundador/a
                    <Info titulo="Qué es el cofounder match">
                      Como el Co-Founder Matching de Y Combinator: aparecés en la sección Cofundadores con lo que aportás y lo
                      que buscás, y quien encaje te escribe.
                    </Info>
                  </span>
                  <span className="text-sm text-tinta/65">Aparecés en la sección Cofundadores.</span>
                </span>
                <input
                  type="checkbox"
                  name="busca_cofundador"
                  checked={buscaCofundador}
                  onChange={(e) => setBuscaCofundador(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative mt-1 h-6 w-10 shrink-0 rounded-full bg-tinta/20 transition-colors duration-300 ease-pecera peer-checked:bg-arcilla peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-arcilla after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-marfil after:shadow after:transition-transform after:duration-300 after:ease-pecera peer-checked:after:translate-x-4"
                />
              </label>
              <div hidden={!buscaCofundador} className="flex flex-col gap-5">
                <ChipsUnico
                  id="cofundador_aporta"
                  nombre="cofundador_aporta"
                  legend="¿Qué aportás vos?"
                  opciones={OPCIONES_APORTES}
                  valor={valores.cofundador_aporta}
                  onCambiar={poner("cofundador_aporta")}
                  info={APORTES.map((a) => `${a.label}: ${a.ayuda}`).join(" ")}
                  error={errores.cofundador_aporta}
                />
                <ChipsMultiple
                  id="cofundador_busca"
                  nombre="cofundador_busca"
                  legend="¿A quién buscás?"
                  opciones={OPCIONES_APORTES}
                  valores={listas.cofundador_busca}
                  onCambiar={ponerLista("cofundador_busca")}
                  error={errores.cofundador_busca}
                />
                <ChipsUnico
                  id="cofundador_dedicacion"
                  nombre="cofundador_dedicacion"
                  legend="Tu dedicación"
                  opciones={DEDICACIONES}
                  valor={valores.cofundador_dedicacion}
                  onCambiar={poner("cofundador_dedicacion")}
                  permitirNinguno
                  ayuda="Opcional."
                />
                <Campo
                  id="cofundador_nota"
                  label="En una frase, qué socio/a buscás"
                  opcional
                  error={errores.cofundador_nota}
                  ayuda={`${valores.cofundador_nota.length}/${NOTA_COFUNDADOR_MAX}`}
                >
                  <textarea
                    id="cofundador_nota"
                    name="cofundador_nota"
                    rows={2}
                    maxLength={NOTA_COFUNDADOR_MAX}
                    value={valores.cofundador_nota}
                    onChange={cambiar("cofundador_nota")}
                    placeholder="Busco un CTO que quiera construir la infraestructura de pagos del agro."
                    className={`${claseInput(errores.cofundador_nota)} resize-none`}
                  />
                </Campo>
              </div>
            </div>
          )}
        </div>

        {/* ---- 6 · Final ---- */}
        <div hidden={actual.id !== "final"} className="flex flex-col gap-5">
          <Completitud porcentaje={porcentaje} items={items} onIr={irA} />

          <div className="overflow-hidden rounded-3xl border border-tinta/10 bg-marfil shadow-[0_10px_30px_rgb(28_27_22/0.08)]">
            <div className={`h-16 ${rol ? ROLES[rol].bg : "bg-tinta"} opacity-90`} />
            <div className="relative -mt-10 flex flex-col gap-3 px-4 pb-5">
              <span className="self-start rounded-full ring-4 ring-marfil">
                <Avatar perfil={{ nombre: valores.nombre || "?", rol: rolAvatar, avatar_url: foto?.url ?? null }} size={72} />
              </span>
              <div>
                <p className="font-display text-xl font-semibold leading-tight text-tinta">{valores.nombre || "Tu nombre"}</p>
                <p className="text-sm text-tinta/65">
                  {rol ? ROLES[rol].label : "Tu rol"}
                  {valores.tipo ? ` · ${TIPOS[valores.tipo as keyof typeof TIPOS] ?? ""}` : ""}
                  {valores.ubicacion ? ` · ${valores.ubicacion}` : ""}
                </p>
              </div>
              {rol && (
                <EtiquetasPerfil
                  perfil={{
                    rol,
                    etapa: valores.etapa || null,
                    ronda: valores.ronda || null,
                    cargo: valores.cargo || null,
                    ticket: valores.ticket || null,
                    industrias: listas.industrias,
                    especialidades: listas.especialidades,
                    rondas_interes: listas.rondas_interes,
                  }}
                />
              )}
              <p className="text-sm leading-relaxed text-tinta/85">{valores.descripcion || "Tu bio en una línea."}</p>
            </div>
          </div>

          <p className="rounded-2xl bg-t-arcilla-suave px-4 py-3 text-sm text-t-arcilla">
            <strong className="font-semibold">Próximo paso: tu pitch.</strong> Después de guardar, subí un video de hasta 90
            segundos desde tu perfil. Es lo que más contactos genera.
          </p>

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
              <p className="pl-8 text-sm text-tinta/75">
                Leé la{" "}
                <a href="/privacidad" target="_blank" rel="noopener" className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
                  política de privacidad
                </a>{" "}
                y las{" "}
                <a href="/terminos" target="_blank" rel="noopener" className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
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
                <span className="block text-tinta/70">Mientras esté tildado, nadie lo ve en Pecera.</span>
              </span>
            </label>
          )}
        </div>
      </section>

      {estado.general && <MensajeError>{estado.general}</MensajeError>}

      {/* Barra fija: atrás, siguiente y guardar. En edición, guardar está siempre. */}
      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex flex-col gap-2">
        <div className="vidrio flex items-center gap-2 rounded-full p-1.5 shadow-[0_10px_30px_rgb(28_27_22/0.18)]">
          {paso > 0 && (
            <button type="button" onClick={() => irA(paso - 1)} className={`${BOTON} px-4 text-tinta hover:bg-tinta/5`}>
              <span aria-hidden>&larr;</span> Atrás
            </button>
          )}
          {!ultimo && (
            <button
              type="button"
              onClick={siguiente}
              className={`${BOTON} flex-1 ${creando ? "bg-tinta text-marfil" : "border border-tinta/30 text-tinta"}`}
            >
              Siguiente <span aria-hidden>&rarr;</span>
            </button>
          )}
          {(ultimo || !creando) && (
            <button type="submit" disabled={guardando} className={`${BOTON} flex-1 bg-tinta text-marfil`}>
              {guardando ? (
                <>
                  <span className="girando size-4 rounded-full border-2 border-marfil border-t-transparent" /> Guardando…
                </>
              ) : creando ? (
                "Crear mi perfil"
              ) : (
                "Guardar"
              )}
            </button>
          )}
        </div>
        {guardando && tardando && (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl bg-marfil p-3 text-center">
            <p className="text-sm text-tinta">Está tardando más de lo normal. Recargá la página: si tu perfil se guardó, lo vas a ver.</p>
            <button type="button" onClick={() => window.location.reload()} className={`${BOTON} min-h-11 border border-tinta/40 text-sm text-tinta`}>
              Recargar la página
            </button>
          </div>
        )}
        {creando && (
          <p className="text-center text-xs text-tinta/55">
            ¿Te tenés que ir? Tu borrador queda guardado en este celular y seguís cuando vuelvas.
          </p>
        )}
      </div>
    </form>
  );
}

/** Puntaje de completitud con lo que falta, cada ítem lleva a su paso. */
function Completitud({
  porcentaje,
  items,
  onIr,
}: {
  porcentaje: number;
  items: ReturnType<typeof completitud>["items"];
  onIr: (paso: number) => void;
}) {
  const faltan = items.filter((i) => !i.hecho);
  const radio = 34;
  const circ = 2 * Math.PI * radio;
  return (
    <section aria-label="Qué tan completo está tu perfil" className="flex flex-col gap-4 rounded-3xl border border-tinta/10 bg-marfil px-4 py-4 sm:flex-row sm:items-start">
      <div className="flex items-center gap-4 sm:flex-col sm:items-center">
        <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={radio} fill="none" stroke="currentColor" strokeWidth="8" className="text-tinta/10" />
          <circle
            cx="40"
            cy="40"
            r={radio}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - porcentaje / 100)}
            className={`transition-[stroke-dashoffset] duration-700 ease-pecera ${porcentaje >= 80 ? "text-t-verde" : "text-arcilla"}`}
          />
        </svg>
        <p className="sm:text-center">
          <span className="block font-display text-3xl font-semibold tabular-nums text-tinta">{porcentaje}%</span>
          <span className="text-sm text-tinta/65">{porcentaje >= 80 ? "¡Perfil sólido!" : "de tu perfil"}</span>
        </p>
      </div>
      <div className="min-w-0 flex-1">
        {faltan.length === 0 ? (
          <p className="text-sm text-tinta">Está todo. Solo falta tu pitch, que subís después de guardar.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-tinta">Te falta para destacar:</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {faltan.map((i) => (
                <li key={i.clave}>
                  <button
                    type="button"
                    onClick={() => onIr(i.paso)}
                    className="boton flex w-full items-center justify-between gap-2 rounded-xl bg-tinta/[0.04] px-3 py-2 text-left text-sm text-tinta hover:bg-tinta/[0.08]"
                  >
                    <span>{i.label}</span>
                    <span className="shrink-0 text-xs text-tinta/55">+{i.peso}% · Completar →</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
