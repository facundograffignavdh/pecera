"use client";

import { useState } from "react";
import { PAISES, separarTelefono, unirTelefono } from "@/lib/paises";

/**
 * WhatsApp con bandera de país. El <select> nativo queda invisible encima de la
 * bandera (accesible y con la lista del sistema en el celular); el número se escribe
 * al lado. El valor que viaja en el form (input oculto `nombre`) ya va unido.
 */
export default function TelefonoPais({
  id,
  nombre,
  valorInicial,
  onCambiar,
  invalido,
  describedBy,
}: {
  id: string;
  nombre: string;
  valorInicial: string;
  onCambiar: (valor: string) => void;
  invalido?: boolean;
  describedBy?: string;
}) {
  const inicial = separarTelefono(valorInicial);
  const [iso, setIso] = useState(inicial.pais.iso);
  const [local, setLocal] = useState(inicial.local);
  const pais = PAISES.find((p) => p.iso === iso) ?? PAISES[0];
  const valor = unirTelefono(pais, local);

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border bg-marfil focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-arcilla ${
        invalido ? "border-2 border-arcilla" : "border-tinta/55"
      }`}
    >
      <label className="relative flex shrink-0 items-center gap-1.5 border-r border-tinta/20 px-3 text-base text-tinta">
        <span aria-hidden className="text-xl leading-none">
          {pais.bandera}
        </span>
        <span aria-hidden className="tabular-nums">
          +{pais.codigo}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-tinta/60">
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
        <select
          aria-label="País del WhatsApp"
          value={iso}
          onChange={(e) => {
            const nuevo = PAISES.find((p) => p.iso === e.target.value) ?? PAISES[0];
            setIso(nuevo.iso);
            onCambiar(unirTelefono(nuevo, local));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {PAISES.map((p) => (
            <option key={p.iso} value={p.iso}>
              {p.bandera} {p.nombre} (+{p.codigo})
            </option>
          ))}
        </select>
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={18}
        placeholder={pais.ejemplo}
        value={local}
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^\d\s-]/g, "");
          setLocal(limpio);
          onCambiar(unirTelefono(pais, limpio));
        }}
        aria-invalid={invalido}
        aria-describedby={describedBy}
        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-none"
      />
      <input type="hidden" name={nombre} value={valor} />
    </div>
  );
}
