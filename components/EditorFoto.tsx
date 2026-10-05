"use client";

import { useRef, useState } from "react";
import { quitarFoto, subirFoto } from "@/app/cuenta/acciones";
import Avatar from "@/components/Avatar";
import { mensajeEnvioImagen, mensajeImagen, nombreImagen, prepararImagen } from "@/lib/imagen";
import type { Rol } from "@/types/pecera";

type Estado =
  | { tipo: "quieto" }
  | { tipo: "preview"; blob: Blob; url: string }
  | { tipo: "subiendo"; url: string }
  | { tipo: "ok"; mensaje: string }
  | { tipo: "error"; mensaje: string };

/**
 * La foto del perfil como botón: tocás el avatar, elegís una imagen, la ves antes de
 * confirmar, se sube con indicador y se actualiza al instante. Con foto, el menú
 * deja cambiarla o eliminarla.
 *
 * - Perfil ya creado (`guardarEnElActo`): sube o borra en el servidor al confirmar.
 * - Perfil nuevo: entrega el blob con `onElegida` y viaja con el formulario.
 */
export default function EditorFoto({
  nombre,
  rol,
  foto,
  guardarEnElActo,
  onCambio,
  size = 96,
}: {
  nombre: string;
  rol: Rol;
  foto: string | null;
  guardarEnElActo: boolean;
  /** La foto nueva (URL para mostrar y blob para el form) o null si se sacó. */
  onCambio: (nueva: { url: string; blob: Blob | null } | null) => void;
  size?: number;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "quieto" });
  const [menu, setMenu] = useState(false);

  const subiendo = estado.tipo === "subiendo";
  const mostrada = estado.tipo === "subiendo" ? estado.url : foto;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0];
    e.target.value = "";
    setMenu(false);
    if (!elegido) return;
    try {
      const blob = await prepararImagen(elegido, "foto");
      setEstado({ tipo: "preview", blob, url: URL.createObjectURL(blob) });
      dialogo.current?.showModal();
    } catch (e) {
      setEstado({ tipo: "error", mensaje: mensajeImagen(e) });
    }
  }

  async function confirmar() {
    if (estado.tipo !== "preview") return;
    const { blob, url } = estado;
    dialogo.current?.close();
    if (!guardarEnElActo) {
      onCambio({ url, blob });
      setEstado({ tipo: "ok", mensaje: "Se sube cuando crees tu perfil." });
      return;
    }
    setEstado({ tipo: "subiendo", url });
    try {
      const datos = new FormData();
      datos.set("foto", blob, nombreImagen(blob, "foto"));
      const r = await subirFoto(datos);
      if (!r.ok) {
        setEstado({ tipo: "error", mensaje: r.mensaje ?? "No pudimos subir la foto." });
        return;
      }
      onCambio({ url: r.url ?? url, blob: null });
      setEstado({ tipo: "ok", mensaje: "Foto actualizada." });
      navigator.vibrate?.(10);
    } catch {
      setEstado({ tipo: "error", mensaje: mensajeEnvioImagen(blob) });
    }
  }

  async function eliminar() {
    setMenu(false);
    if (!window.confirm("¿Eliminar tu foto? Vas a quedar con tus iniciales.")) return;
    if (!guardarEnElActo) {
      onCambio(null);
      setEstado({ tipo: "quieto" });
      return;
    }
    setEstado({ tipo: "subiendo", url: "" });
    const r = await quitarFoto();
    if (r.ok) {
      onCambio(null);
      setEstado({ tipo: "ok", mensaje: "Sacaste la foto." });
    } else {
      setEstado({ tipo: "error", mensaje: r.mensaje ?? "No pudimos sacar la foto." });
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <button
          type="button"
          disabled={subiendo}
          onClick={() => (foto ? setMenu((m) => !m) : archivo.current?.click())}
          aria-label={foto ? "Cambiar o eliminar la foto" : "Subir una foto"}
          aria-haspopup={foto ? "menu" : undefined}
          aria-expanded={foto ? menu : undefined}
          className="boton group relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-arcilla"
        >
          <Avatar perfil={{ nombre: nombre || "?", rol, avatar_url: mostrada || null }} size={size} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-tinta/0 transition-colors duration-200 group-hover:bg-tinta/25">
            {subiendo && <span className="girando size-7 rounded-full border-2 border-marfil border-t-transparent" />}
          </span>
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-tinta text-marfil ring-4 ring-marfil"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        {menu && (
          <div role="menu" className="aparecer absolute left-0 top-full z-20 mt-2 flex w-48 flex-col overflow-hidden rounded-2xl border border-tinta/10 bg-marfil shadow-[0_14px_40px_rgb(28_27_22/0.18)]">
            <button role="menuitem" type="button" onClick={() => archivo.current?.click()} className="min-h-11 px-4 text-left text-sm font-medium text-tinta hover:bg-tinta/5">
              Cambiar foto
            </button>
            <button role="menuitem" type="button" onClick={eliminar} className="min-h-11 px-4 text-left text-sm font-medium text-t-arcilla hover:bg-tinta/5">
              Eliminar foto
            </button>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-tinta">{foto ? "Tu foto" : "Sumá una foto tuya (el logo va en tu empresa)"}</p>
        <p
          role="status"
          className={`text-xs ${estado.tipo === "error" ? "font-medium text-t-arcilla" : estado.tipo === "ok" ? "text-t-verde" : "text-tinta/60"}`}
        >
          {estado.tipo === "subiendo"
            ? "Guardando…"
            : estado.tipo === "ok" || estado.tipo === "error"
              ? estado.mensaje
              : "Tocá el círculo. Se guarda sin ubicación."}
        </p>
      </div>
      <input ref={archivo} type="file" accept="image/*" onChange={elegir} className="sr-only" tabIndex={-1} aria-hidden />

      <dialog
        ref={dialogo}
        aria-labelledby="foto-preview-titulo"
        onClose={() => setEstado((e) => (e.tipo === "preview" ? { tipo: "quieto" } : e))}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-3xl bg-marfil p-0 text-tinta shadow-[0_24px_64px_rgb(28_27_22/0.35)] backdrop:bg-tinta/50"
      >
        {estado.tipo === "preview" && (
          <div className="flex flex-col items-center gap-5 p-6">
            <h2 id="foto-preview-titulo" className="font-display text-2xl font-semibold">
              ¿Usamos esta foto?
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
            <img src={estado.url} alt="Vista previa de tu foto" className="size-44 rounded-full object-cover ring-4 ring-tinta/10" />
            <div className="flex w-full flex-col gap-2">
              <button type="button" onClick={confirmar} className="boton min-h-12 rounded-full bg-tinta px-5 font-semibold text-marfil">
                Usar esta foto
              </button>
              <button
                type="button"
                onClick={() => {
                  dialogo.current?.close();
                  archivo.current?.click();
                }}
                className="boton min-h-12 rounded-full border border-tinta/30 px-5 font-medium text-tinta"
              >
                Elegir otra
              </button>
              <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 text-sm text-tinta/60 hover:text-tinta">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
