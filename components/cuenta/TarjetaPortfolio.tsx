"use client";

import { useState, useTransition } from "react";
import { borrarEntrada } from "@/app/cuenta/portfolio";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Tarjeta } from "@/components/cuenta/ui";
import EditorEntrada, { datosDe } from "@/components/portfolio/EditorEntrada";
import TarjetaEntrada from "@/components/portfolio/TarjetaEntrada";
import type { Resultado } from "@/lib/errores-base";
import { labelIndustria } from "@/lib/etiquetas";
import { type EntradaPortfolio, agrupar, trackRecord } from "@/lib/portfolio";
import type { Rol } from "@/types/pecera";

/**
 * "Tu portfolio" en /cuenta (inversores y aliados). Los números salen de las
 * entradas (nada se tipea a mano); sumar y editar es un editor por pasos.
 */
export default function TarjetaPortfolio({ rol, entradas }: { rol: Rol; entradas: EntradaPortfolio[] }) {
  const [editando, setEditando] = useState<EntradaPortfolio | "nueva" | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const inversor = rol === "inversor";
  const tr = trackRecord(entradas);
  const grupos = agrupar(rol, entradas);

  return (
    <Tarjeta
      titulo="Tu portfolio"
      etiqueta={inversor ? "Inversor" : "Aliado"}
      bajada={
        inversor
          ? "En qué invertiste y a quién apoyaste, por separado. Los founders lo miran para saber si sos para ellos."
          : "Con quién trabajaste y qué hiciste. Tus clientes y casos son la mejor carta de presentación."
      }
    >
      {entradas.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {(inversor
            ? [
                { n: tr.inversiones, label: tr.inversiones === 1 ? "inversión" : "inversiones" },
                { n: tr.exits, label: tr.exits === 1 ? "exit" : "exits" },
                { n: tr.apoyos, label: "otros apoyos" },
              ]
            : [
                { n: entradas.length, label: entradas.length === 1 ? "relación" : "relaciones" },
                { n: entradas.filter((e) => e.desafio || e.solucion).length, label: "casos" },
                { n: tr.confirmadas, label: "confirmadas" },
              ]
          ).map((x) => (
            <div key={x.label} className="flex flex-col rounded-2xl bg-marfil px-3 py-2.5">
              <dt className="order-2 text-xs text-tinta/65">{x.label}</dt>
              <dd className="order-1 font-display text-2xl font-semibold tabular-nums text-tinta">{x.n}</dd>
            </div>
          ))}
        </dl>
      )}
      {tr.industrias.length > 0 && (
        <p className="text-xs text-tinta/65">Industrias: {tr.industrias.map(labelIndustria).join(", ")}. Se calcula de tus entradas.</p>
      )}

      {aviso?.mensaje && <Aviso ok={aviso.ok}>{aviso.mensaje}</Aviso>}

      {editando ? (
        <EditorEntrada
          rol={rol}
          inicial={editando === "nueva" ? undefined : datosDe(editando)}
          empresaInicial={editando === "nueva" ? null : (editando.empresa ?? null)}
          onListo={(mensaje) => {
            setEditando(null);
            setAviso({ ok: true, mensaje });
          }}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAviso(null);
            setEditando("nueva");
          }}
          className={`${BOTON_PRIMARIO} self-start`}
        >
          + Sumar al portfolio
        </button>
      )}

      {entradas.length === 0 && !editando && (
        <div className="rounded-2xl border border-dashed border-tinta/25 px-4 py-4 text-sm text-tinta/80">
          <p className="font-medium text-tinta">{inversor ? "Mostrá a quién respaldaste." : "Mostrá lo que construiste con otros."}</p>
          <p className="mt-1">
            {inversor
              ? "Sumá tu primera inversión o participación. Si la empresa está en Pecera, la enlazás y su equipo la puede confirmar."
              : "Sumá empresas con las que trabajaste, proyectos o casos de éxito."}
          </p>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.id} aria-label={g.titulo} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">
            {g.titulo} ({g.items.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {g.items.map((e) => (
              <li key={e.id}>
                <TarjetaEntrada
                  e={e}
                  mostrarVisibilidad
                  acciones={
                    <Acciones
                      onEditar={() => {
                        setAviso(null);
                        setEditando(e);
                      }}
                      id={e.id}
                      nombre={e.nombre}
                      onResultado={setAviso}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Tarjeta>
  );
}

function Acciones({
  id,
  nombre,
  onEditar,
  onResultado,
}: {
  id: string;
  nombre: string;
  onEditar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={onEditar} className={`${BOTON_SECUNDARIO} min-h-10`}>
        Editar
      </button>
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (!window.confirm(`¿Borrar “${nombre}” de tu portfolio?`)) return;
          iniciar(async () => onResultado(await borrarEntrada(id)));
        }}
        className={`${BOTON_SECUNDARIO} min-h-10`}
      >
        {pendiente ? "Borrando…" : "Borrar"}
      </button>
    </div>
  );
}
