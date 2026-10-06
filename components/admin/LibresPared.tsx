"use client";

import { useState, useTransition } from "react";
import { funciones } from "@/app/admin/acciones";
import { boton } from "@/lib/ui";

type Config = { visitas_activas: boolean; pared_activa: boolean; pared_libres: number; traspaso_activo: boolean };

/** Cuántos pitches se ven sin cuenta antes de la pared (0 a 20). La base valida. */
export default function LibresPared({ config }: { config: Config }) {
  const [libres, setLibres] = useState(String(config.pared_libres));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMensaje(null);
        iniciar(async () => {
          const r = await funciones(config.visitas_activas, config.pared_activa, Number(libres), config.traspaso_activo);
          setMensaje(r.ok ? "Listo." : (r.mensaje ?? "No pudimos guardar."));
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-tinta">
        Pitches libres sin cuenta
        <input
          type="number"
          min={0}
          max={20}
          required
          inputMode="numeric"
          value={libres}
          onChange={(e) => setLibres(e.target.value)}
          className="min-h-11 w-24 rounded-xl border border-tinta/40 bg-marfil px-3.5 text-base text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
        />
      </label>
      <button type="submit" disabled={pendiente} className={boton("secundario", "md")}>
        Guardar
      </button>
      {mensaje && (
        <p role="status" className="w-full text-sm text-tinta">
          {mensaje}
        </p>
      )}
    </form>
  );
}
