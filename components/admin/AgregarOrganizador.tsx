"use client";

import { useState, useTransition } from "react";
import { organizador } from "@/app/admin/acciones";
import { boton } from "@/lib/ui";

/** Sumar un email de la Universidad al panel de la organización. La base valida y decide. */
export default function AgregarOrganizador() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMensaje(null);
        iniciar(async () => {
          const r = await organizador(email, true);
          if (r.ok) setEmail("");
          setMensaje(r.ok ? "Listo: ya puede entrar con esa cuenta de Google." : (r.mensaje ?? "No pudimos sumarlo."));
        });
      }}
    >
      <label htmlFor="email-organizador" className="text-sm font-medium text-tinta">
        Email de Google de la persona
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="email-organizador"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@siglo21.edu.ar"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-tinta/40 bg-marfil px-3.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
        />
        <button type="submit" disabled={pendiente} className={boton("primario", "md")}>
          {pendiente ? "Sumando…" : "Habilitar"}
        </button>
      </div>
      {mensaje && (
        <p role="status" className="text-sm text-tinta">
          {mensaje}
        </p>
      )}
    </form>
  );
}
