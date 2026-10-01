"use client";

import { useState, useTransition } from "react";
import { type DatosServicio, borrarServicio, guardarServicio } from "@/app/cuenta/portfolio";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { ESPECIALIDADES } from "@/lib/etiquetas";
import { LIMITES_PORTFOLIO as L, MODALIDADES, type Servicio, labelModalidad } from "@/lib/portfolio";

const VACIO: DatosServicio = { id: null, nombre: "", categoria: "", descripcion: "", modalidad: "", precio: "" };

/** Servicios del aliado: qué ofrece, de forma estructurada (no un párrafo suelto). */
export default function TarjetaServicios({ servicios }: { servicios: Servicio[] }) {
  const [editando, setEditando] = useState<DatosServicio | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar(d: DatosServicio) {
    iniciar(async () => {
      const r = await guardarServicio(d);
      setAviso(r);
      if (r.ok) setEditando(null);
    });
  }

  return (
    <Tarjeta titulo="Tus servicios" etiqueta="Aliado" bajada="Qué ofrecés a las startups, uno por uno. Aparecen en tu perfil y en el directorio.">
      {servicios.length === 0 && !editando && (
        <p className="rounded-2xl border border-dashed border-tinta/25 px-4 py-3 text-sm text-tinta/80">
          Todavía no cargaste servicios. Ej.: “Constitución de SAS”, “Growth marketing”, “Due diligence”.
        </p>
      )}
      {servicios.length > 0 && (
        <ul className="flex flex-col gap-2">
          {servicios.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-2xl bg-marfil px-4 py-3">
              <div>
                <p className="font-semibold text-tinta">{s.nombre}</p>
                <p className="text-xs text-tinta/65">
                  {[ESPECIALIDADES.find((e) => e.valor === s.categoria)?.label, labelModalidad(s.modalidad), s.precio].filter(Boolean).join(" · ")}
                </p>
                {s.descripcion && <p className="mt-1 text-sm text-tinta/85">{s.descripcion}</p>}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAviso(null);
                    setEditando({ id: s.id, nombre: s.nombre, categoria: s.categoria ?? "", descripcion: s.descripcion ?? "", modalidad: s.modalidad ?? "", precio: s.precio ?? "" });
                  }}
                  className={`${BOTON_SECUNDARIO} min-h-10`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => {
                    if (!window.confirm(`¿Borrar “${s.nombre}”?`)) return;
                    iniciar(async () => setAviso(await borrarServicio(s.id)));
                  }}
                  className={`${BOTON_SECUNDARIO} min-h-10`}
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando ? (
        <FormServicio inicial={editando} pendiente={pendiente} onGuardar={guardar} onCancelar={() => setEditando(null)} />
      ) : (
        <button type="button" onClick={() => { setAviso(null); setEditando(VACIO); }} className={`${BOTON_PRIMARIO} self-start`}>
          + Sumar servicio
        </button>
      )}
      {aviso?.mensaje && <Aviso ok={aviso.ok}>{aviso.mensaje}</Aviso>}
    </Tarjeta>
  );
}

function FormServicio({
  inicial,
  pendiente,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosServicio;
  pendiente: boolean;
  onGuardar: (d: DatosServicio) => void;
  onCancelar: () => void;
}) {
  const [d, setD] = useState(inicial);
  const poner = (k: keyof DatosServicio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(d);
      }}
      className="flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-marfil p-4"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Nombre del servicio
        <input required maxLength={L.servicio} value={d.nombre} onChange={poner("nombre")} placeholder="Ej.: Constitución de SAS" autoComplete="off" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Categoría (opcional)
        <select value={d.categoria} onChange={poner("categoria")} className={INPUT}>
          <option value="">Sin categoría</option>
          {ESPECIALIDADES.map((e) => (
            <option key={e.valor} value={e.valor}>{e.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Qué incluye (opcional)
        <textarea rows={3} maxLength={L.servicioDescripcion} value={d.descripcion} onChange={poner("descripcion")} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Modalidad (opcional)
        <select value={d.modalidad} onChange={poner("modalidad")} className={INPUT}>
          <option value="">Sin especificar</option>
          {MODALIDADES.map((m) => (
            <option key={m.valor} value={m.valor}>{m.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Precio de referencia (opcional)
        <input maxLength={L.precio} value={d.precio} onChange={poner("precio")} placeholder="Ej.: Desde USD 300 / A convenir" autoComplete="off" className={INPUT} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
          {pendiente ? "Guardando…" : "Guardar servicio"}
        </button>
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
