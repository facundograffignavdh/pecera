"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { responderRelacion } from "@/app/cuenta/portfolio";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { defTipo } from "@/lib/portfolio";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

export type RelacionPendiente = {
  id: string;
  tipo: string;
  rol_perfil: Rol;
  slug: string;
  nombre: string;
  descripcion: string | null;
  /** multi_empresa: a cuál de tus empresas nombra. */
  empresa_nombre?: string;
};

/**
 * Inversores y aliados que dicen haber trabajado con tu empresa. Confirmarlo suma
 * confianza a su perfil (y a la tuya); si no es así, no lo confirmes.
 */
export default function RelacionesPendientes({ relaciones }: { relaciones: RelacionPendiente[] }) {
  if (relaciones.length === 0) return null;
  return (
    <Tarjeta titulo="Para confirmar" etiqueta={`${relaciones.length} pendiente${relaciones.length === 1 ? "" : "s"}`} bajada="Personas que dicen haber trabajado con tu empresa. Confirmalo solo si es cierto: se muestra en su perfil y en la página de tu empresa.">
      <ul className="flex flex-col gap-2">
        {relaciones.map((r) => (
          <Fila key={r.id} r={r} />
        ))}
      </ul>
    </Tarjeta>
  );
}

function Fila({ r }: { r: RelacionPendiente }) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  if (resultado?.ok) return <li><Aviso ok>{resultado.mensaje}</Aviso></li>;
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-marfil px-4 py-3">
      <p className="text-sm text-tinta">
        <Link href={`/p/${r.slug}`} className="font-semibold underline-offset-4 hover:underline">{r.nombre}</Link>{" "}
        <span className="text-tinta/60">({ROLES[r.rol_perfil]?.label ?? r.rol_perfil})</span> dice:{" "}
        <strong className="font-semibold">
          {defTipo(r.tipo)?.verbo ?? "Trabajó con"} {r.empresa_nombre ?? "tu empresa"}
        </strong>
        .
      </p>
      {r.descripcion && <p className="text-sm text-tinta/75">“{r.descripcion}”</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pendiente} onClick={() => iniciar(async () => setResultado(await responderRelacion(r.id, true)))} className={BOTON_PRIMARIO}>
          Confirmar
        </button>
        <button type="button" disabled={pendiente} onClick={() => iniciar(async () => setResultado(await responderRelacion(r.id, false)))} className={BOTON_SECUNDARIO}>
          No es así
        </button>
      </div>
      {resultado && !resultado.ok && <Aviso ok={false}>{resultado.mensaje}</Aviso>}
    </li>
  );
}
