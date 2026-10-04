"use client";

import { useRef, useState } from "react";
import { registrarActividad } from "@/lib/actividad";
import { canalesDe } from "@/lib/contacto";
import { registrarContacto } from "@/lib/medicion";
import { dejarDeSeguir, seguir, useSigo } from "@/lib/red";
import { descargarVcard, vcard } from "@/lib/vcard";
import type { Perfil } from "@/types/pecera";

const SALUDO = "¡Hola! Te vi en Pecera";

const SECUNDARIO =
  "boton flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border border-tinta/12 bg-marfil px-2 text-xs font-medium text-tinta hover:border-tinta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/**
 * Acciones de la tarjeta pública: escribir (el canal principal), seguir, guardar
 * en los contactos del teléfono, compartir y crear un acceso directo. Es lo que
 * usa quien llega por la tarjeta NFC, así que va arriba y grande.
 */
export default function AccionesPerfil({
  perfil,
  url,
  seguidores,
  detalle,
  empresa,
  cargo,
}: {
  perfil: Perfil;
  url: string;
  seguidores: number;
  detalle: string | null;
  empresa: string | null;
  cargo: string | null;
}) {
  const sigo = useSigo(perfil.id);
  // Lo que cambió en esta visita: el total del servidor ya incluye lo anterior.
  const [delta, setDelta] = useState(0);
  const [plataforma, setPlataforma] = useState<"ios" | "android" | "otra">("otra");
  const [aviso, setAviso] = useState<string | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  const canales = canalesDe(perfil, SALUDO);
  const principal = canales.find((c) => c.clave === "whatsapp") ?? canales.find((c) => c.clave === "email");
  const total = Math.max(0, seguidores + delta);

  function avisar(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 2400);
  }

  function alternarSeguir() {
    if (sigo) {
      dejarDeSeguir(perfil.id);
      setDelta((d) => d - 1);
      avisar("Lo sacaste de tu red.");
    } else {
      setDelta((d) => d + 1);
      seguir({
        id: perfil.id,
        slug: perfil.slug,
        nombre: perfil.nombre,
        rol: perfil.rol,
        avatar_url: perfil.avatar_url,
        descripcion: perfil.descripcion,
        detalle,
      });
      navigator.vibrate?.(12);
      avisar("¡Guardado en tu red! Sus pitches aparecen en Stakeholding.");
    }
  }

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${perfil.nombre} — Pecera`, text: perfil.descripcion, url });
        registrarActividad({ nombre: "pitch_compartido", perfilId: perfil.id, canal: "nativo" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      registrarActividad({ nombre: "pitch_compartido", perfilId: perfil.id, canal: "copiado" });
      avisar("Link copiado.");
    } catch {
      window.prompt("Copiá el link:", url);
    }
  }

  function guardarContacto() {
    descargarVcard(
      vcard({
        nombre: perfil.nombre,
        descripcion: perfil.descripcion,
        whatsapp: perfil.whatsapp,
        email: perfil.email,
        web: perfil.web,
        linkedin: perfil.linkedin,
        empresa,
        cargo,
        url,
      }),
      perfil.slug
    );
    avisar("Abrí el archivo para agregarlo a tus contactos.");
  }

  function abrirAcceso() {
    const ua = navigator.userAgent;
    setPlataforma(/iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "otra");
    dialogo.current?.showModal();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {principal && (
          <a
            href={principal.href}
            {...(principal.externo && { target: "_blank", rel: "noopener noreferrer" })}
            onClick={() => registrarContacto({ perfilId: perfil.id, canal: principal.clave })}
            className="boton flex min-h-13 flex-1 items-center justify-center gap-2 rounded-full bg-arcilla px-5 text-base font-semibold text-marfil shadow-[0_8px_20px_rgb(217_90_34/0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
          >
            {principal.clave === "whatsapp" ? (
              <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z" />
              </svg>
            ) : (
              <Icono d="M4 6h16v12H4zM4 7l8 6 8-6" />
            )}
            Escribile
            <span className="sr-only">{principal.clave === "whatsapp" ? " por WhatsApp" : " por email"}</span>
          </a>
        )}
        <button
          type="button"
          onClick={alternarSeguir}
          aria-pressed={sigo}
          className={`boton flex min-h-13 items-center justify-center gap-1.5 rounded-full px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
            principal ? "" : "flex-1"
          } ${sigo ? "border-2 border-tinta bg-marfil text-tinta" : "bg-tinta text-marfil"}`}
        >
          {sigo ? (
            <>
              <Icono d="m5 12.5 4.5 4.5L19 7.5" /> Siguiendo
            </>
          ) : (
            <>
              <Icono d="M12 5v14M5 12h14" /> Seguir
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={guardarContacto} className={SECUNDARIO}>
          <Icono d="M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 8v6M22 11h-6" />
          Guardar contacto
        </button>
        <button type="button" onClick={compartir} className={SECUNDARIO}>
          <Icono d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          Compartir
        </button>
        <button type="button" onClick={abrirAcceso} className={SECUNDARIO}>
          <Icono d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM17 14v6M14 17h6" />
          Acceso directo
        </button>
      </div>

      <p className="text-center text-sm text-tinta/60" aria-live="polite">
        {aviso ?? `${total} ${total === 1 ? "persona lo sigue" : "personas lo siguen"}`}
      </p>

      <dialog
        ref={dialogo}
        aria-labelledby="acceso-titulo"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogo.current?.close();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-marfil p-0 text-tinta shadow-[0_24px_64px_rgb(28_27_22/0.35)] backdrop:bg-tinta/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="acceso-titulo" className="font-display text-2xl font-semibold leading-tight">
            Tené a {perfil.nombre} a un toque
          </h2>
          <ol className="flex flex-col gap-3 text-sm leading-relaxed">
            {plataforma === "ios" ? (
              <>
                <li>1. Tocá el botón Compartir de Safari (el cuadrado con la flecha).</li>
                <li>2. Elegí «Agregar a inicio».</li>
              </>
            ) : plataforma === "android" ? (
              <>
                <li>1. Tocá el menú ⋮ de Chrome, arriba a la derecha.</li>
                <li>2. Elegí «Agregar a la pantalla principal».</li>
              </>
            ) : (
              <>
                <li>1. Guardalo en favoritos con Ctrl + D (⌘ + D en Mac).</li>
                <li>2. O arrastrá el link a la barra de favoritos.</li>
              </>
            )}
          </ol>
          <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm">
            También podés tocar <strong className="font-semibold">Seguir</strong>: queda en «Mi red» dentro de
            Pecera y ves sus pitches nuevos en Stakeholding.
          </p>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="boton min-h-12 rounded-full bg-tinta px-5 font-medium text-marfil"
          >
            Listo
          </button>
        </div>
      </dialog>
    </div>
  );
}
