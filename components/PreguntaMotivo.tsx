"use client";

import { useEffect, useSyncExternalStore } from "react";
import { type MotivoContacto, registrarActividad } from "@/lib/actividad";
import { cerrarMotivo, motivoPendiente, suscribirMotivo } from "@/lib/motivo";

const MOTIVOS: Array<{ valor: MotivoContacto; label: string }> = [
  { valor: "inversion", label: "Inversión" },
  { valor: "alianza", label: "Alianza" },
  { valor: "cliente", label: "Cliente" },
  { valor: "cofundador", label: "Cofundador/a" },
  { valor: "otro", label: "Otro" },
];

/** Se va sola un minuto después de que la pantalla vuelve a estar a la vista. */
const VISIBLE_MS = 60_000;

/**
 * "¿Para qué?" después de tocar un contacto: un toque, opcional, sin texto libre.
 * Va en el layout (ver lib/motivo.ts). Sobre fondo Tinta: se lee igual sobre el
 * feed y sobre Marfil.
 */
export default function PreguntaMotivo() {
  const pedido = useSyncExternalStore(suscribirMotivo, motivoPendiente, () => null);

  useEffect(() => {
    if (!pedido) return;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const contar = () => {
      clearTimeout(reloj);
      if (document.visibilityState === "visible") reloj = setTimeout(cerrarMotivo, VISIBLE_MS);
    };
    contar();
    document.addEventListener("visibilitychange", contar);
    return () => {
      clearTimeout(reloj);
      document.removeEventListener("visibilitychange", contar);
    };
  }, [pedido]);

  if (!pedido) return null;
  return (
    <section
      aria-label="¿Para qué es este contacto?"
      className="tema-fijo aparecer fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl bg-tinta px-4 py-3 text-marfil shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">¿Para qué es este contacto?</p>
        <button
          type="button"
          onClick={cerrarMotivo}
          className="-m-1 min-h-9 shrink-0 rounded-full px-2 text-sm text-marfil/85 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        >
          Saltear
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {MOTIVOS.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => {
              registrarActividad({ nombre: "motivo_elegido", perfilId: pedido.perfilId, canal: pedido.canal, motivo: m.valor });
              cerrarMotivo();
            }}
            className="min-h-11 rounded-full border border-marfil/30 px-4 text-sm font-medium text-marfil hover:border-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-marfil/80">Es anónimo y opcional: nos ayuda a medir para qué sirve Pecera.</p>
    </section>
  );
}
