"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { guardarTesis } from "@/app/cuenta/portfolio";
import { Aviso, BOTON_PRIMARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { GEOGRAFIAS, LIMITES_PORTFOLIO as L, MODELOS, type Tesis } from "@/lib/portfolio";

const CHIP =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border-2 px-3.5 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla";

/**
 * Tesis de inversión: lo que no entra en etiquetas (industrias, rondas y ticket ya
 * están en tu perfil). Geografía y modelos de negocio son filtrables en el directorio.
 */
export default function TarjetaTesis({ tesis }: { tesis: Tesis | null }) {
  const [texto, setTexto] = useState(tesis?.texto ?? "");
  const [busca, setBusca] = useState(tesis?.busca ?? "");
  const [geografias, setGeografias] = useState<string[]>(tesis?.geografias ?? []);
  const [modelos, setModelos] = useState<string[]>(tesis?.modelos ?? []);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const alternar = (lista: string[], set: (v: string[]) => void, v: string) =>
    set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  return (
    <Tarjeta titulo="Tu tesis de inversión" etiqueta="Inversor" bajada="Qué buscás y dónde. Industrias, rondas y ticket van en las etiquetas de tu tarjeta.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAviso(null);
          iniciar(async () => setAviso(await guardarTesis({ texto, geografias, modelos, busca })));
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          Tu tesis en pocas líneas
          <textarea rows={4} maxLength={L.tesis} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: Software B2B con tracción temprana que digitaliza industrias tradicionales en LatAm." className={INPUT} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">Dónde invertís</legend>
          <div className="flex flex-wrap gap-2">
            {GEOGRAFIAS.map((g) => (
              <label key={g.valor} className={`${CHIP} ${geografias.includes(g.valor) ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"}`}>
                <input type="checkbox" checked={geografias.includes(g.valor)} onChange={() => alternar(geografias, setGeografias, g.valor)} className="sr-only" />
                {g.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">Modelos de negocio</legend>
          <div className="flex flex-wrap gap-2">
            {MODELOS.map((m) => (
              <label key={m.valor} className={`${CHIP} ${modelos.includes(m.valor) ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"}`}>
                <input type="checkbox" checked={modelos.includes(m.valor)} onChange={() => alternar(modelos, setModelos, m.valor)} className="sr-only" />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          Qué founders buscás (opcional)
          <textarea rows={2} maxLength={L.busca} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ej.: Equipos técnicos que ya venden." className={INPUT} />
        </label>
        <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} self-start`}>
          {pendiente ? "Guardando…" : "Guardar tesis"}
        </button>
        {aviso?.mensaje && <Aviso ok={aviso.ok}>{aviso.mensaje}</Aviso>}
        <Link href="#editar-etiquetas" className="text-xs font-medium text-tinta underline underline-offset-4">
          Editar industrias, rondas y ticket
        </Link>
      </form>
    </Tarjeta>
  );
}
