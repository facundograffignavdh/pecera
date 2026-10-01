import { boton } from "@/lib/ui";
import type { ReactNode } from "react";

/** Piezas compartidas por las tarjetas de /cuenta (empresa, transparencia, evento). */

export const INPUT =
  "w-full rounded-xl border border-tinta/55 bg-marfil px-3.5 py-2.5 text-base font-normal text-tinta placeholder:text-tinta/60 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

export const BOTON_PRIMARIO = boton("primario", "lg");

export const BOTON_SECUNDARIO = boton("secundario", "md");

export function Tarjeta({
  titulo,
  bajada,
  etiqueta,
  children,
}: {
  titulo: string;
  bajada?: ReactNode;
  /** Píldora chica arriba del título ("Nuevo", "Feria 21"…). */
  etiqueta?: string;
  children: ReactNode;
}) {
  const id = `tarjeta-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5"
    >
      <div className="flex flex-col gap-1">
        {etiqueta && (
          <span className="self-start rounded-full bg-arcilla/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-arcilla">
            {etiqueta}
          </span>
        )}
        <h2 id={id} className="scroll-mt-24 font-display text-xl font-semibold leading-tight text-tinta">
          {titulo}
        </h2>
        {bajada && <p className="text-sm text-tinta/70">{bajada}</p>}
      </div>
      {children}
    </section>
  );
}

/** Resultado de una acción: neutro si salió bien, con punto arcilla si no. */
export function Aviso({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm text-tinta ${
        ok ? "bg-t-verde-suave" : "border-2 border-arcilla font-medium"
      }`}
    >
      {!ok && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />}
      {children}
    </p>
  );
}
