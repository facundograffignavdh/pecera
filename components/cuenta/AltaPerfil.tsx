"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { crearPerfilPersonal } from "@/app/cuenta/seccion";
import EditorFoto from "@/components/EditorFoto";
import AvisoCuentaPersonal from "@/components/cuenta/AvisoCuentaPersonal";
import { Campo, MensajeError, claseInput, describir } from "@/components/perfil/editores/campos";
import {
  CONSENTIMIENTO,
  DESCRIPCION_MAX,
  DESCRIPCION_ROL,
  NOMBRE_MAX,
  slugDesdeNombre,
  urlPerfil,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import { nombreImagen } from "@/lib/imagen";
import type { EstadoGuardar } from "@/lib/perfil-servidor";
import { ROLES } from "@/lib/rol";
import { boton } from "@/lib/ui";
import type { Rol } from "@/types/pecera";

const CLAVE_BORRADOR = "pecera:borrador-alta";
const ESPERA_MAXIMA_MS = 20_000;

type Borrador = { nombre: string; rol: Rol | ""; descripcion: string };

function leerBorrador(): Borrador | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_BORRADOR) ?? "null") as Borrador | null;
  } catch {
    return null;
  }
}

/**
 * Alta del perfil personal, con lo mínimo: nombre y apellido, rol, una línea sobre
 * vos, la dirección y el consentimiento (foto opcional). La cuenta es de una persona:
 * la empresa, la trayectoria y lo demás se suman después desde el propio perfil.
 */
export default function AltaPerfil({ rolInicial }: { rolInicial?: Rol }) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol | "">(rolInicial ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [cambiarSlug, setCambiarSlug] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [foto, setFoto] = useState<{ url: string; blob: Blob | null } | null>(null);
  const [tardando, setTardando] = useState(false);
  const [locales, setLocales] = useState<EstadoGuardar["errores"]>({});

  const slugVisible = slug ?? slugDesdeNombre(nombre);

  // Borrador en el celular: si sale a buscar algo, sigue donde estaba.
  useEffect(() => {
    const b = leerBorrador();
    if (!b) return;
    const t = setTimeout(() => {
      setNombre((n) => n || b.nombre);
      setRol((r) => r || b.rol);
      setDescripcion((d) => d || b.descripcion);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (nombre || descripcion) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, rol, descripcion }));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [nombre, rol, descripcion]);

  const [estado, accion, guardando] = useActionState(async (previo: EstadoGuardar, datos: FormData): Promise<EstadoGuardar> => {
    setTardando(false);
    // Mismas reglas que el servidor, antes de mandar.
    const { errores } = validarPerfil({ nombre, rol, tipo: "persona", descripcion }, { pedirEtiquetas: false });
    const errorSlug = validarSlug(slugVisible);
    if (errorSlug) errores.slug = errorSlug;
    if (!consentimiento) errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
    setLocales(errores);
    if (Object.keys(errores).length) return { errores };
    if (foto?.blob) datos.set("foto", foto.blob, nombreImagen(foto.blob, "foto"));
    try {
      localStorage.removeItem(CLAVE_BORRADOR);
    } catch {}
    try {
      return await crearPerfilPersonal(previo, datos);
    } catch (e) {
      // La action termina con redirect(): eso llega acá como error y lo maneja Next.
      unstable_rethrow(e);
      return { errores: {}, general: "No pudimos crear tu perfil. Revisá tu conexión y probá de nuevo." };
    }
  }, { errores: {} });
  const errores = { ...locales, ...estado.errores };

  useEffect(() => {
    if (!guardando) return;
    const t = setTimeout(() => setTardando(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [guardando]);

  return (
    <form action={accion} noValidate className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Creá tu perfil personal</h1>
      </header>
      <AvisoCuentaPersonal />

      <EditorFoto nombre={nombre || "?"} rol={rol || "emprendedor"} foto={foto?.url ?? null} guardarEnElActo={false} onCambio={setFoto} />

      <Campo id="alta-nombre" label="Tu nombre y apellido" error={errores.nombre} ayuda="El tuyo, no el de tu emprendimiento: ese va en tu empresa.">
        <input
          id="alta-nombre"
          name="nombre"
          type="text"
          maxLength={NOMBRE_MAX}
          autoComplete="name"
          placeholder="Ana Pérez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={!!errores.nombre}
          aria-describedby={describir("alta-nombre", errores.nombre, true)}
          className={claseInput(errores.nombre)}
        />
      </Campo>

      <fieldset className="flex flex-col gap-2" aria-describedby={errores.rol ? "alta-rol-error" : undefined}>
        <legend className="mb-2 text-sm font-medium text-tinta">¿Cómo participás en Pecera?</legend>
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
                <input type="radio" name="rol" value={r} checked={elegido} onChange={() => setRol(r)} className="sr-only" />
                <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full sm:mt-0 ${ROLES[r].bg}`} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-display text-lg font-semibold leading-tight text-tinta">{ROLES[r].label}</span>
                  <span className="text-xs leading-snug text-tinta/70">{DESCRIPCION_ROL[r]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errores.rol && <MensajeError id="alta-rol-error">{errores.rol}</MensajeError>}
      </fieldset>

      <Campo
        id="alta-descripcion"
        label="Una línea sobre vos"
        error={errores.descripcion}
        info="Qué hacés y qué te interesa, en una frase. Es lo primero que se lee debajo de tu nombre."
        ayuda={`${descripcion.length}/${DESCRIPCION_MAX}`}
      >
        <textarea
          id="alta-descripcion"
          name="descripcion"
          rows={2}
          maxLength={DESCRIPCION_MAX}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={
            rol === "inversor"
              ? "Invierto en fintech y agtech en etapa temprana."
              : rol === "aliado"
                ? "Mentora de startups B2B. Antes, 10 años en ventas."
                : "Fundadora, ingeniera agrónoma. Me interesa el agro sustentable."
          }
          aria-invalid={!!errores.descripcion}
          aria-describedby={describir("alta-descripcion", errores.descripcion, true)}
          className={`${claseInput(errores.descripcion)} resize-none`}
        />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-tinta">Tu dirección en Pecera</p>
        <p className="break-all text-sm text-tinta/75">{urlPerfil(slugVisible || "tu-nombre")}</p>
        {cambiarSlug ? (
          <Campo
            id="alta-slug"
            label="Cambiar la dirección"
            error={errores.slug}
            ayuda="Es el link de tu tarjeta NFC y del QR. Después no se puede cambiar."
          >
            <input
              id="alta-slug"
              name="slug"
              type="text"
              maxLength={60}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={slugVisible}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              aria-invalid={!!errores.slug}
              aria-describedby={describir("alta-slug", errores.slug, true)}
              className={claseInput(errores.slug)}
            />
          </Campo>
        ) : (
          <>
            <input type="hidden" name="slug" value={slugVisible} />
            <button type="button" onClick={() => setCambiarSlug(true)} className="self-start text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
              Cambiar
            </button>
            {errores.slug && <MensajeError>{errores.slug}</MensajeError>}
          </>
        )}
      </div>

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

      {estado.general && <MensajeError>{estado.general}</MensajeError>}
      <button type="submit" disabled={guardando} className={boton("oscuro", "lg")}>
        {guardando ? "Creando tu perfil…" : "Crear mi perfil"}
      </button>
      {guardando && tardando && (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl bg-tinta/5 p-3 text-center">
          <p className="text-sm text-tinta">Está tardando más de lo normal. Recargá la página: si tu perfil se creó, lo vas a ver.</p>
          <button type="button" onClick={() => window.location.reload()} className={boton("secundario", "md")}>
            Recargar la página
          </button>
        </div>
      )}
      <p className="text-center text-sm text-tinta/70">
        Después creás tu empresa (o te sumás a la de tu equipo), tu experiencia y tu pitch desde tu perfil.
      </p>
    </form>
  );
}
