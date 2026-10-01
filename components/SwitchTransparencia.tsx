"use client";

import { useState, useTransition } from "react";
import type { Resultado } from "@/lib/errores-base";

/**
 * Privado ↔ Transparente, con la perilla de vidrio. Optimista: cambia al toque y,
 * si la base no lo acepta, vuelve atrás y lo dice. El estado se dice siempre en
 * texto (nunca solo con color) y el resultado se anuncia a los lectores de pantalla.
 */
export default function SwitchTransparencia({
  visible: inicial,
  onCambiar,
  etiqueta,
  compacto = false,
}: {
  visible: boolean;
  onCambiar: (visible: boolean) => Promise<Resultado>;
  /** Qué se está haciendo transparente, para el nombre accesible. */
  etiqueta: string;
  compacto?: boolean;
}) {
  const [visible, setVisible] = useState(inicial);
  const [mensaje, setMensaje] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();

  // Si llega un valor nuevo del servidor (otro miembro lo cambió), se sigue.
  const [previo, setPrevio] = useState(inicial);
  if (previo !== inicial) {
    setPrevio(inicial);
    setVisible(inicial);
  }

  function alternar() {
    const nuevo = !visible;
    setVisible(nuevo);
    setMensaje(null);
    iniciar(async () => {
      let r: Resultado;
      try {
        r = await onCambiar(nuevo);
      } catch {
        r = { ok: false, mensaje: "No pudimos cambiarlo. Revisá tu conexión y probá de nuevo." };
      }
      if (!r.ok) setVisible(!nuevo);
      setMensaje(r);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label={`${etiqueta}: ${visible ? "transparente" : "privado"}`}
          onClick={alternar}
          disabled={pendiente}
          className="switch-vidrio shrink-0"
        >
          <span aria-hidden className="switch-perilla">
            <svg viewBox="0 0 16 16" className="icono-privado size-3.5">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <svg viewBox="0 0 16 16" className="icono-transparente size-3.5">
              <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2" fill="currentColor" />
            </svg>
          </span>
        </button>
        <span aria-hidden className={`text-sm font-semibold ${visible ? "text-t-verde" : "text-tinta"}`}>
          {visible ? "Transparente" : "Privado"}
        </span>
      </div>
      {!compacto && !mensaje && (
        <p className="text-xs text-tinta/60">
          {visible ? "Se ve en la página de tu empresa." : "Solo lo ve tu equipo."}
        </p>
      )}
      <p role={mensaje && !mensaje.ok ? "alert" : "status"} className="text-xs font-medium text-tinta">
        {mensaje?.mensaje && (
          <span className="aparecer-pop inline-flex items-center gap-1.5">
            <span aria-hidden className={`size-1.5 rounded-full ${mensaje.ok ? "bg-aliado" : "bg-arcilla"}`} />
            {mensaje.ok ? "✓ " : ""}
            {mensaje.mensaje}
          </span>
        )}
      </p>
    </div>
  );
}
