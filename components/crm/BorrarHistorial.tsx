"use client";

import { useState, useTransition } from "react";
import { borrarMisVisitas } from "@/app/cuenta/crm/acciones";
import { boton } from "@/lib/ui";

/** "Borrar mi historial de visitas" (supresión, Ley 25.326), con confirmación. */
export default function BorrarHistorial() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function borrar() {
    if (!window.confirm("¿Borrar tu historial de visitas? Los perfiles que visitaste dejan de ver tu nombre. No se puede deshacer.")) {
      return;
    }
    setMensaje(null);
    empezar(async () => {
      const r = await borrarMisVisitas();
      setMensaje(r.ok ? "Listo: borramos tu historial." : (r.mensaje ?? "No pudimos borrar. Probá de nuevo en un rato."));
    });
  }

  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <button type="button" disabled={pendiente} onClick={borrar} className={boton("peligro", "md")}>
        Borrar mi historial de visitas
      </button>
      {mensaje && (
        <p role="status" className="text-sm text-tinta">
          {mensaje}
        </p>
      )}
    </div>
  );
}
