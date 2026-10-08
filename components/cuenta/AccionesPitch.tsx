"use client";

import { useState, useTransition } from "react";
import { editarDescripcionPitch, ocultarPitch } from "@/app/cuenta/pitch";
import { DESCRIPCION_PITCH_MAX, largoDescripcionPitch } from "@/lib/pitch";

const BOTON =
  "inline-flex min-h-10 items-center rounded-full px-3 text-xs font-semibold text-tinta transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60";

/**
 * Editar la descripción y ocultar/mostrar un pitch propio. Ocultar pregunta antes
 * (deja de verse en el feed y en el perfil); mostrar no. Cada acción avisa cómo
 * terminó; si falla, el mensaje dice qué hacer.
 */
export default function AccionesPitch({
  id,
  descripcion,
  oculto,
  compacto = false,
}: {
  id: string;
  descripcion: string | null;
  oculto: boolean;
  /** En la grilla de anteriores: solo ocultar/mostrar. */
  compacto?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(descripcion ?? "");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  function alternarOculto() {
    if (!oculto && !window.confirm("¿Ocultar este pitch? Deja de verse en el feed y en tu perfil. Lo podés volver a mostrar cuando quieras.")) {
      return;
    }
    setMensaje(null);
    iniciar(async () => {
      const r = await ocultarPitch(id, !oculto);
      setMensaje({ ok: r.ok, texto: r.mensaje ?? (r.ok ? "Listo." : "No se pudo.") });
    });
  }

  function guardar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await editarDescripcionPitch(id, texto);
      setMensaje({ ok: r.ok, texto: r.mensaje ?? (r.ok ? "Guardado." : "No se pudo.") });
      if (r.ok) setEditando(false);
    });
  }

  if (editando) {
    // #feria21 no cuenta para el tope (lo suma el equipo aunque esté en 150).
    const restan = DESCRIPCION_PITCH_MAX - largoDescripcionPitch(texto);
    const delTag = texto.length - largoDescripcionPitch(texto);
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={`desc-${id}`} className="sr-only">
          Descripción del pitch
        </label>
        <textarea
          id={`desc-${id}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={DESCRIPCION_PITCH_MAX + delTag}
          rows={3}
          className="w-full rounded-xl border border-tinta/55 bg-marfil px-3 py-2 text-sm text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
        />
        <p className={`text-right text-xs tabular-nums ${restan < 15 ? "font-semibold text-tinta" : "text-tinta/60"}`}>
          {restan} {restan === 1 ? "caracter" : "caracteres"}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={guardar} disabled={pendiente} className={`${BOTON} bg-naranja text-tinta hover:bg-pecera`}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTexto(descripcion ?? "");
              setEditando(false);
            }}
            disabled={pendiente}
            className={`${BOTON} border border-tinta/30 hover:border-tinta`}
          >
            Cancelar
          </button>
        </div>
        <Mensaje mensaje={mensaje} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5">
        {!compacto && !oculto && (
          <button
            type="button"
            onClick={() => {
              setMensaje(null);
              setEditando(true);
            }}
            className={`${BOTON} border border-tinta/30 hover:border-tinta`}
          >
            Editar descripción
          </button>
        )}
        <button
          type="button"
          onClick={alternarOculto}
          disabled={pendiente}
          className={`${BOTON} ${oculto ? "bg-naranja text-tinta hover:bg-pecera" : "border border-tinta/30 hover:border-tinta"}`}
        >
          {pendiente ? "…" : oculto ? "Mostrar" : "Ocultar"}
        </button>
      </div>
      <Mensaje mensaje={mensaje} />
    </div>
  );
}

function Mensaje({ mensaje }: { mensaje: { ok: boolean; texto: string } | null }) {
  if (!mensaje) return <span role="status" className="sr-only" />;
  return (
    <p role={mensaje.ok ? "status" : "alert"} className="flex items-center gap-1.5 text-xs font-medium text-tinta">
      <span aria-hidden className={`size-1.5 rounded-full ${mensaje.ok ? "bg-aliado" : "bg-arcilla"}`} />
      {mensaje.texto}
    </p>
  );
}
