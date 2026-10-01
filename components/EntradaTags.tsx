"use client";

import { useState } from "react";

/**
 * Tags de texto libre (skills): Enter o coma agrega, × saca. Cada tag viaja como un
 * input oculto con el mismo `nombre`, así el FormData los trae como lista.
 */
export default function EntradaTags({
  id,
  nombre,
  valores,
  onCambiar,
  max,
  largoMax,
  placeholder,
  sugerencias = [],
}: {
  id: string;
  nombre: string;
  valores: string[];
  onCambiar: (valores: string[]) => void;
  max: number;
  largoMax: number;
  placeholder?: string;
  sugerencias?: string[];
}) {
  const [texto, setTexto] = useState("");
  const lleno = valores.length >= max;

  function agregar(crudo: string) {
    const tag = crudo.trim().replace(/\s+/g, " ").slice(0, largoMax);
    if (!tag || lleno || valores.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onCambiar([...valores, tag]);
    setTexto("");
  }

  const libres = sugerencias.filter((s) => !valores.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-tinta/40 bg-marfil px-2 py-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-arcilla">
        {valores.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-tinta px-2.5 py-1 text-sm font-medium text-marfil">
            {v}
            <button
              type="button"
              onClick={() => onCambiar(valores.filter((x) => x !== v))}
              aria-label={`Sacar ${v}`}
              className="-mr-1 flex size-5 items-center justify-center rounded-full text-marfil/70 hover:bg-marfil/15 hover:text-marfil"
            >
              ×
            </button>
            <input type="hidden" name={nombre} value={v} />
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={texto}
          disabled={lleno}
          maxLength={largoMax}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) agregar(v.slice(0, -1));
            else setTexto(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              agregar(texto);
            } else if (e.key === "Backspace" && !texto && valores.length) {
              onCambiar(valores.slice(0, -1));
            }
          }}
          onBlur={() => agregar(texto)}
          placeholder={lleno ? `Llegaste a ${max}` : valores.length ? "Sumá otra…" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-base text-tinta placeholder:text-tinta/45 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs tabular-nums text-tinta/55">
          {valores.length}/{max}
        </span>
        {!lleno &&
          libres.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agregar(s)}
              className="boton rounded-full border border-dashed border-tinta/30 px-2.5 py-0.5 text-xs text-tinta/70 hover:border-tinta hover:text-tinta"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}
