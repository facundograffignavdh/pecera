"use client";

import { useState, useTransition } from "react";
import { configurarStand } from "@/app/admin/acciones";
import { boton } from "@/lib/ui";

type Config = { activo: boolean; listo: boolean; premios: number };

const CAMPO =
  "min-h-11 rounded-xl border border-tinta/40 bg-marfil px-3.5 text-base text-tinta focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

/**
 * Juego del stand: abierto o cerrado, cuántas tarjetas y el número. El número solo se escribe: la
 * base nunca lo devuelve, así que acá se ve si está cargado, nunca cuál es. Vacío = no tocarlo.
 */
export default function ConfigStand({ config }: { config: Config }) {
  const [activo, setActivo] = useState(config.activo);
  const [premios, setPremios] = useState(String(config.premios));
  const [numero, setNumero] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMensaje(null);
        if (numero !== "" && !/^\d{3}$/.test(numero)) {
          setMensaje("El número tiene que tener 3 cifras (por ejemplo 042).");
          return;
        }
        const tarjetas = Number(premios);
        if (!Number.isInteger(tarjetas) || tarjetas < 0 || tarjetas > 100) {
          setMensaje("Las tarjetas van de 0 a 100.");
          return;
        }
        iniciar(async () => {
          const r = await configurarStand(activo, tarjetas, numero === "" ? null : Number(numero));
          if (r.ok) setNumero("");
          setMensaje(r.ok ? "Listo." : (r.mensaje ?? "No pudimos guardar."));
        });
      }}
    >
      <label className="flex items-center gap-3 text-sm font-medium text-tinta">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-5 accent-tinta" />
        Juego abierto (se puede jugar)
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-tinta">
          Tarjetas en juego
          <input
            type="number"
            min={0}
            max={100}
            required
            inputMode="numeric"
            value={premios}
            onChange={(e) => setPremios(e.target.value)}
            className={`${CAMPO} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-tinta">
          {config.listo ? "Cambiar el número" : "Número (3 cifras)"}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            placeholder={config.listo ? "Sin cambiar" : "•••"}
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className={`${CAMPO} w-36 tracking-[0.3em]`}
          />
        </label>
      </div>
      <p className="text-sm text-tinta/70">
        {config.listo
          ? "El número ya está cargado. No se muestra en ningún lado: dejalo vacío para no cambiarlo."
          : "Sin número el juego dice “arranca pronto”. Cargalo acá: no queda en el código ni se muestra después."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className={boton("primario", "md")}>
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {mensaje && (
          <p role="status" className="text-sm text-tinta">
            {mensaje}
          </p>
        )}
      </div>
    </form>
  );
}
