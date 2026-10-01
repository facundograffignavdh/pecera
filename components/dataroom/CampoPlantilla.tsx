"use client";

import type { ValorCampo } from "@/lib/dataroom";
import type { Campo } from "@/lib/plantillas";
import { MAX_LARGO, MAX_TEXTO } from "@/lib/plantillas";
import { defDato } from "@/lib/transparencia";

const INPUT =
  "w-full rounded-xl border bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla";
const PILDORA =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla";

/** Un campo de template según su tipo, con su ayuda y su error al lado. */
export default function CampoPlantilla({
  campo: c,
  valor,
  error,
  moneda,
  onCambiar,
  onSalir,
}: {
  campo: Campo;
  valor: ValorCampo | undefined;
  error: string | null;
  /** Moneda elegida en el template, para el prefijo de los montos. */
  moneda: string;
  onCambiar: (v: ValorCampo) => void;
  onSalir: () => void;
}) {
  const id = `campo-${c.id}`;
  const texto = typeof valor === "string" ? valor : "";
  const describe = [c.ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const clase = `${INPUT} ${error ? "border-2 border-arcilla" : "border-tinta/45"}`;
  const espejo = c.dato ? defDato(c.dato)?.label : null;

  let control: React.ReactNode;
  switch (c.tipo) {
    case "largo":
      control = (
        <textarea
          id={id}
          rows={4}
          maxLength={c.max ?? MAX_LARGO}
          value={texto}
          placeholder={c.placeholder}
          onChange={(e) => onCambiar(e.target.value)}
          onBlur={onSalir}
          aria-invalid={!!error}
          aria-describedby={describe}
          className={clase}
        />
      );
      break;
    case "numero":
    case "moneda":
    case "porcentaje":
      control = (
        <div className="flex items-center gap-2">
          {c.tipo === "moneda" && <span className="text-sm font-semibold text-tinta/70">{moneda}</span>}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={texto}
            placeholder={c.placeholder ?? (c.tipo === "moneda" ? "Ej.: 150.000" : "Ej.: 12")}
            onChange={(e) => onCambiar(e.target.value)}
            onBlur={onSalir}
            aria-invalid={!!error}
            aria-describedby={describe}
            className={`${clase} tabular-nums`}
          />
          {c.tipo === "porcentaje" && <span className="text-sm font-semibold text-tinta/70">%</span>}
        </div>
      );
      break;
    case "fecha":
      control = (
        <input id={id} type="date" value={texto} onChange={(e) => onCambiar(e.target.value)} onBlur={onSalir} aria-invalid={!!error} aria-describedby={describe} className={clase} />
      );
      break;
    case "url":
      control = (
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={texto}
          placeholder="https://…"
          onChange={(e) => onCambiar(e.target.value)}
          onBlur={onSalir}
          aria-invalid={!!error}
          aria-describedby={describe}
          className={clase}
        />
      );
      break;
    case "seleccion":
    case "si_no": {
      const opciones = c.tipo === "si_no" ? [{ valor: "si", label: "Sí" }, { valor: "no", label: "No" }] : (c.opciones ?? []);
      return (
        <fieldset className="flex flex-col gap-2" aria-describedby={describe}>
          <legend className="text-sm font-medium text-tinta">
            {c.label}
            {c.requerido && <span className="sr-only"> (obligatorio)</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {opciones.map((o) => (
              <label
                key={o.valor}
                className={`${PILDORA} ${texto === o.valor ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta hover:border-tinta/50"}`}
              >
                <input type="radio" name={id} value={o.valor} checked={texto === o.valor} onChange={() => onCambiar(o.valor)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
          <Pie id={id} ayuda={c.ayuda} error={error} espejo={espejo} />
        </fieldset>
      );
    }
    case "tabla": {
      const filas = Array.isArray(valor) && valor.length ? valor : [{}];
      const columnas = c.columnas ?? [];
      const poner = (i: number, col: string, v: string) =>
        onCambiar(filas.map((f, j) => (j === i ? { ...f, [col]: v } : f)) as Array<Record<string, string>>);
      return (
        <fieldset className="flex flex-col gap-2" aria-describedby={describe}>
          <legend className="text-sm font-medium text-tinta">{c.label}</legend>
          <ol className="flex flex-col gap-2">
            {filas.map((f, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-2xl border border-tinta/10 bg-tinta/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-tinta/60">Fila {i + 1}</span>
                  {filas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onCambiar(filas.filter((_, j) => j !== i) as Array<Record<string, string>>)}
                      className="min-h-9 px-2 text-xs font-medium text-tinta underline underline-offset-4"
                      aria-label={`Quitar la fila ${i + 1}`}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {columnas.map((col) => (
                  <label key={col.id} className="flex flex-col gap-1 text-xs font-medium text-tinta/80">
                    {col.label}
                    <input
                      value={(f as Record<string, string>)[col.id] ?? ""}
                      placeholder={i === 0 ? col.placeholder : undefined}
                      maxLength={200}
                      autoComplete="off"
                      onChange={(e) => poner(i, col.id, e.target.value)}
                      onBlur={onSalir}
                      className={`${INPUT} border-tinta/45 text-sm`}
                    />
                  </label>
                ))}
              </li>
            ))}
          </ol>
          {filas.length < (c.maxFilas ?? 10) && (
            <button
              type="button"
              onClick={() => onCambiar([...filas, {}] as Array<Record<string, string>>)}
              className="inline-flex min-h-11 items-center self-start rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              + Sumar fila
            </button>
          )}
          <Pie id={id} ayuda={c.ayuda} error={error} espejo={espejo} />
        </fieldset>
      );
    }
    default:
      control = (
        <input
          id={id}
          type="text"
          autoComplete="off"
          maxLength={c.max ?? MAX_TEXTO}
          value={texto}
          placeholder={c.placeholder}
          onChange={(e) => onCambiar(e.target.value)}
          onBlur={onSalir}
          aria-invalid={!!error}
          aria-describedby={describe}
          className={clase}
        />
      );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {c.label}
        {!c.requerido && <span className="font-normal text-tinta/60"> (opcional)</span>}
      </label>
      {control}
      <Pie id={id} ayuda={c.ayuda} error={error} espejo={espejo} />
    </div>
  );
}

function Pie({ id, ayuda, error, espejo }: { id: string; ayuda?: string; error: string | null; espejo?: string | null }) {
  return (
    <>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs leading-relaxed text-tinta/70">
          {ayuda}
        </p>
      )}
      {espejo && <p className="text-xs text-tinta/60">También actualiza «{espejo}» en Transparencia.</p>}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-tinta">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-arcilla" />
          {error}
        </p>
      )}
    </>
  );
}
