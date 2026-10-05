import type { ReactNode } from "react";
import Info from "@/components/Info";

/** Piezas de formulario de las hojas del perfil (mismo aspecto que el resto de /cuenta). */

const CLASE_INPUT =
  "w-full rounded-xl border bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 transition-shadow duration-200 ease-pecera focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";

export function claseInput(error?: string) {
  return `${CLASE_INPUT} ${error ? "border-2 border-arcilla" : "border-tinta/40"}`;
}

export function describir(id: string, error?: string, ayuda = false) {
  const ids = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ");
  return ids || undefined;
}

/** En Tinta (AA) con marca Arcilla: el Arcilla solo no llega a AA en texto chico. */
export function MensajeError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-sm font-medium text-tinta">
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
      {children}
    </p>
  );
}

export function Campo({
  id,
  label,
  error,
  ayuda,
  info,
  opcional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  ayuda?: ReactNode;
  info?: ReactNode;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-tinta">
          {label}
          {opcional && <span className="ml-1.5 font-normal text-tinta/65">(opcional)</span>}
        </label>
        {info && <Info titulo={`Qué es: ${label}`}>{info}</Info>}
      </div>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-tinta/65">
          {ayuda}
        </p>
      )}
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}
