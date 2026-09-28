"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useState } from "react";
import { type EstadoGuardar, guardarPerfil } from "@/app/cuenta/acciones";
import Avatar from "@/components/Avatar";
import {
  CONSENTIMIENTO,
  type CampoPerfil,
  DESCRIPCION_MAX,
  NOMBRE_MAX,
  OPCIONES_ROL,
  OPCIONES_TIPO,
  slugDesdeNombre,
  urlPerfil,
  validarPerfil,
  validarSlug,
} from "@/lib/cuenta";
import type { Perfil, Rol } from "@/types/pecera";

export type PerfilPropio = Perfil & { oculto: boolean };

type Valores = Record<Exclude<CampoPerfil, "slug" | "consentimiento">, string>;

const LADO_FOTO = 512;
const MAX_FOTO = 512 * 1024;

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

async function subirFoto(foto: Blob): Promise<string | null> {
  try {
    const res = await fetch("/cuenta/foto", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: foto,
    });
    if (res.ok) return null;
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    return error ?? "No pudimos guardar la foto.";
  } catch {
    return "No pudimos guardar la foto. Revisá tu conexión.";
  }
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

export default function FormPerfil({ perfil }: { perfil: PerfilPropio | null }) {
  const router = useRouter();
  const creando = perfil === null;

  const [valores, setValores] = useState<Valores>({
    nombre: perfil?.nombre ?? "",
    tipo: perfil?.tipo ?? "",
    rol: perfil?.rol ?? "",
    descripcion: perfil?.descripcion ?? "",
    whatsapp: perfil?.whatsapp ?? "",
    email: perfil?.email ?? "",
    linkedin: perfil?.linkedin ?? "",
    instagram: perfil?.instagram ?? "",
    web: perfil?.web ?? "",
  });
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [oculto, setOculto] = useState(perfil?.oculto ?? false);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const slugVisible = creando ? (slugTocado ? slug : slugDesdeNombre(valores.nombre)) : perfil.slug;

  const [estado, accion, guardando] = useActionState(
    async (previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> => {
      // Mismas reglas que el servidor, para avisar al toque.
      const { errores } = validarPerfil(valores);
      if (creando) {
        const errorSlug = validarSlug(slugVisible);
        if (errorSlug) errores.slug = errorSlug;
        if (!consentimiento) errores.consentimiento = "Para crear tu perfil tenés que aceptar.";
      }
      if (Object.keys(errores).length) return { errores };

      const resultado = await guardarPerfil(previo, formData);
      if (!resultado.guardado) return resultado;

      if (foto) {
        const error = await subirFoto(foto.blob);
        if (error) {
          setErrorFoto(error);
        } else {
          URL.revokeObjectURL(foto.url);
          setFoto(null);
        }
      }
      // Al crear, la página muestra la confirmación con la dirección para copiar.
      if (resultado.guardado.creado) router.replace("/cuenta?creado=1");
      else router.refresh();
      return resultado;
    },
    { errores: {} }
  );
  const errores = estado.errores;

  function cambiar(campo: keyof Valores) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValores((v) => ({ ...v, [campo]: e.target.value }));
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

  const rolAvatar = (valores.rol || "emprendedor") as Rol;
  const avatar = foto?.url ?? perfil?.avatar_url ?? null;

  return (
    <form action={accion} noValidate className="flex flex-col gap-5">
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

      <Campo id="nombre" label="Nombre del proyecto o persona" error={errores.nombre}>
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

      <Campo id="tipo" label="¿Qué sos?" error={errores.tipo}>
        <select
          id="tipo"
          name="tipo"
          value={valores.tipo}
          onChange={cambiar("tipo")}
          aria-invalid={!!errores.tipo}
          aria-describedby={describir("tipo", errores.tipo)}
          className={claseInput(errores.tipo)}
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {OPCIONES_TIPO.map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="rol" label="Tu rol en el ecosistema" error={errores.rol}>
        <select
          id="rol"
          name="rol"
          value={valores.rol}
          onChange={cambiar("rol")}
          aria-invalid={!!errores.rol}
          aria-describedby={describir("rol", errores.rol)}
          className={claseInput(errores.rol)}
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {OPCIONES_ROL.map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </Campo>

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
          aria-invalid={!!errores.descripcion}
          aria-describedby={describir("descripcion", errores.descripcion, true)}
          className={`${claseInput(errores.descripcion)} resize-none`}
        />
      </Campo>

      <fieldset className="flex flex-col gap-5">
        <legend className="font-display text-lg font-semibold text-tinta">
          Cómo te escriben
        </legend>
        <p className="-mt-3 text-sm text-tinta/70">
          Todo es opcional y se muestra en tu perfil público.
        </p>

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
      </fieldset>

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
          {/* Pestaña nueva: el formulario no guarda borrador y se perdería lo cargado. */}
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

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="min-h-12 rounded-full bg-tinta px-5 font-medium text-marfil transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-70"
        >
          {guardando ? "Guardando…" : creando ? "Crear mi perfil" : "Guardar cambios"}
        </button>
        <p role="status" className="min-h-5 text-center text-sm text-tinta">
          {!guardando && estado.guardado && !errorFoto ? "Listo, guardado." : ""}
        </p>
      </div>
    </form>
  );
}
