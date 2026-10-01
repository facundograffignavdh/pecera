"use client";

import type { ReactNode } from "react";
import Info from "@/components/Info";

/**
 * Chips de selección del formulario. Por dentro son radios o checkboxes nativos
 * (teclado, lector de pantalla y FormData andan solos); por fuera, píldoras de 44 px.
 */

export type OpcionChip = {
  valor: string;
  label: string;
  /** Clases de color para el estado elegido (lib/etiquetas.ts → TONO). Sin tono: tinta. */
  tono?: string;
};

const BASE =
  "relative inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ease-pecera has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla";
const APAGADO = "border-tinta/25 bg-marfil text-tinta hover:border-tinta/60";
const PRENDIDO_NEUTRO = "border-tinta bg-tinta text-marfil";
const BLOQUEADO = "cursor-not-allowed opacity-40 hover:border-tinta/25";

function Tilde() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0">
      <path
        d="m3.5 8.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Grupo({
  id,
  legend,
  ayuda,
  info,
  error,
  contador,
  children,
}: {
  id: string;
  legend: string;
  ayuda?: ReactNode;
  /** Explicación detrás del ícono "i". */
  info?: ReactNode;
  error?: string;
  contador?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={[ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
    >
      <legend className="relative flex w-full items-center justify-between gap-2 text-sm font-medium text-tinta">
        <span className="flex items-center gap-2">
          {legend}
          {info && <Info titulo={`Qué es: ${legend}`}>{info}</Info>}
        </span>
        {contador && <span className="text-xs font-normal tabular-nums text-tinta/60">{contador}</span>}
      </legend>
      {ayuda && (
        <p id={`${id}-ayuda`} className="-mt-1 text-sm text-tinta/70">
          {ayuda}
        </p>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-tinta">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Una sola opción (radios). `valor` vacío = nada elegido. */
export function ChipsUnico({
  id,
  nombre,
  legend,
  opciones,
  valor,
  onCambiar,
  ayuda,
  info,
  error,
  permitirNinguno = false,
}: {
  id: string;
  nombre: string;
  legend: string;
  opciones: readonly OpcionChip[];
  valor: string;
  onCambiar: (valor: string) => void;
  ayuda?: ReactNode;
  info?: ReactNode;
  error?: string;
  /** Tocar el elegido lo desmarca (para campos opcionales). */
  permitirNinguno?: boolean;
}) {
  return (
    <Grupo id={id} legend={legend} ayuda={ayuda} info={info} error={error}>
      {opciones.map((o) => {
        const elegido = valor === o.valor;
        return (
          <label
            key={o.valor}
            className={`${BASE} ${elegido ? (o.tono ? `border-transparent ${o.tono}` : PRENDIDO_NEUTRO) : APAGADO}`}
          >
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              checked={elegido}
              onChange={() => onCambiar(o.valor)}
              onClick={() => {
                if (permitirNinguno && elegido) onCambiar("");
              }}
              className="sr-only"
            />
            {elegido && <Tilde />}
            {o.label}
          </label>
        );
      })}
    </Grupo>
  );
}

/** Varias opciones (checkboxes), con tope opcional. */
export function ChipsMultiple({
  id,
  nombre,
  legend,
  opciones,
  valores,
  onCambiar,
  max,
  ayuda,
  info,
  error,
}: {
  id: string;
  nombre: string;
  legend: string;
  opciones: readonly OpcionChip[];
  valores: string[];
  onCambiar: (valores: string[]) => void;
  max?: number;
  ayuda?: ReactNode;
  info?: ReactNode;
  error?: string;
}) {
  const lleno = max !== undefined && valores.length >= max;
  return (
    <Grupo
      id={id}
      legend={legend}
      ayuda={ayuda}
      info={info}
      error={error}
      contador={max ? `${valores.length}/${max}` : undefined}
    >
      {opciones.map((o) => {
        const elegido = valores.includes(o.valor);
        const bloqueado = lleno && !elegido;
        return (
          <label
            key={o.valor}
            className={`${BASE} ${
              elegido ? (o.tono ? `border-transparent ${o.tono}` : PRENDIDO_NEUTRO) : APAGADO
            } ${bloqueado ? BLOQUEADO : ""}`}
          >
            <input
              type="checkbox"
              name={nombre}
              value={o.valor}
              checked={elegido}
              disabled={bloqueado}
              onChange={() =>
                onCambiar(elegido ? valores.filter((v) => v !== o.valor) : [...valores, o.valor])
              }
              className="sr-only"
            />
            {elegido && <Tilde />}
            {o.label}
          </label>
        );
      })}
    </Grupo>
  );
}

/**
 * Etapa del proyecto como una línea de progreso: elegir "MVP" pinta las tres
 * primeras. Mismos radios nativos por dentro.
 */
export function SelectorEtapa({
  id,
  nombre,
  legend,
  etapas,
  valor,
  onCambiar,
  info,
  error,
}: {
  id: string;
  nombre: string;
  legend: string;
  etapas: ReadonlyArray<{ valor: string; label: string; ayuda: string }>;
  info?: ReactNode;
  valor: string;
  onCambiar: (valor: string) => void;
  error?: string;
}) {
  const indice = etapas.findIndex((e) => e.valor === valor);
  const elegida = indice >= 0 ? etapas[indice] : null;

  return (
    <Grupo id={id} legend={legend} info={info} error={error}>
      <div className="w-full">
        <div className="grid w-full grid-cols-5 gap-1.5">
          {etapas.map((e, i) => {
            const alcanzada = indice >= 0 && i <= indice;
            return (
              <label
                key={e.valor}
                className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl py-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla"
              >
                <input
                  type="radio"
                  name={nombre}
                  value={e.valor}
                  checked={valor === e.valor}
                  onChange={() => onCambiar(e.valor)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`h-2 w-full rounded-full transition-colors duration-300 ease-pecera ${
                    alcanzada ? "bg-arcilla" : "bg-tinta/15 group-hover:bg-tinta/30"
                  }`}
                />
                <span
                  className={`text-center text-xs leading-tight ${
                    i === indice ? "font-semibold text-tinta" : "text-tinta/70"
                  }`}
                >
                  {e.label}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 min-h-5 text-sm text-tinta/70" aria-live="polite">
          {elegida ? elegida.ayuda : "Tocá la etapa en la que está tu proyecto hoy."}
        </p>
      </div>
    </Grupo>
  );
}
