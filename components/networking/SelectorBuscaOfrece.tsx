"use client";

import { useId, useMemo, useState } from "react";
import { CLASES_CHIP, Tilde } from "@/components/Chips";
import EntradaTags from "@/components/EntradaTags";
import { MensajeError } from "@/components/perfil/editores/campos";
import type { Errores } from "@/lib/cuenta";
import {
  CATEGORIAS_NECESIDAD,
  COMOS,
  DETALLE_MAX,
  MAX_DETALLE,
  MAX_NECESIDADES,
  categoriaDe,
  necesidad,
  type Tono,
} from "@/lib/etiquetas";
import { EJEMPLOS_BUSCA_OFRECE, OPCIONES_ELEGIBLES, type EjemploBuscaOfrece } from "@/lib/networking";
import type { Perfil } from "@/types/pecera";

/**
 * "Qué buscás y qué ofrecés": el mismo componente en el perfil (/cuenta) y en la pestaña
 * Networking de /cofundadores. Va adentro de un form (FormSeccion, sección "buscaOfrece"):
 * todo viaja como inputs ocultos con los nombres de las columnas, así las dos pestañas
 * internas (Busco · Ofrezco) mandan siempre los dos lados.
 *
 * Por categorías plegables, con buscador (sin tildes) y ejemplos por rol que SUMAN
 * opciones hasta el tope (nunca reemplazan).
 */

type Lado = "busca" | "ofrece";

export type ValoresBuscaOfrece = Pick<
  Perfil,
  "busca" | "ofrece" | "busca_detalle" | "ofrece_detalle" | "busca_como" | "ofrece_como"
>;

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const TITULOS: Record<Lado, { pestana: string; pregunta: string; detalle: string; como: string }> = {
  busca: {
    pestana: "Busco",
    pregunta: "¿Qué buscás?",
    detalle: "Algo puntual que buscás (opcional)",
    como: "¿Cómo lo buscás?",
  },
  ofrece: {
    pestana: "Ofrezco",
    pregunta: "¿Qué ofrecés?",
    detalle: "Algo puntual que ofrecés (opcional)",
    como: "¿Cómo lo ofrecés?",
  },
};

const SUGERENCIAS_DETALLE: Record<Lado, string[]> = {
  busca: ["Créditos de AWS", "Figma", "Mentoría en ventas", "Socio/a comercial"],
  ofrece: ["Figma", "Excel avanzado", "Mentoría en ventas", "Sala de reuniones"],
};

/** Punto de color de cada categoría (clases completas: Tailwind solo genera las que ve). */
const PUNTO: Record<Tono, string> = {
  arcilla: "bg-t-arcilla",
  azul: "bg-t-azul",
  verde: "bg-t-verde",
  ocre: "bg-t-ocre",
  ciruela: "bg-t-ciruela",
  violeta: "bg-t-violeta",
  petroleo: "bg-t-petroleo",
  tierra: "bg-t-tierra",
};

const CHIP = `${CLASES_CHIP.base} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla`;

function Chip({
  valor,
  elegido,
  bloqueado,
  onTocar,
}: {
  valor: string;
  elegido: boolean;
  bloqueado: boolean;
  onTocar: () => void;
}) {
  const n = necesidad(valor);
  return (
    <button
      type="button"
      aria-pressed={elegido}
      disabled={bloqueado}
      onClick={onTocar}
      className={`${CHIP} ${elegido ? `border-transparent ${n.clase}` : CLASES_CHIP.apagado} ${bloqueado ? CLASES_CHIP.bloqueado : ""}`}
    >
      {elegido && <Tilde />}
      {n.label}
    </button>
  );
}

export default function SelectorBuscaOfrece({
  inicial,
  errores = {},
  marcar,
  ladoInicial = "busca",
}: {
  inicial: ValoresBuscaOfrece;
  errores?: Errores;
  /** Avisa que hubo cambios (la hoja pregunta antes de descartar). */
  marcar: () => void;
  ladoInicial?: Lado;
}) {
  const id = useId();
  const [lado, setLado] = useState<Lado>(ladoInicial);
  const [opciones, setOpciones] = useState<Record<Lado, string[]>>({
    busca: inicial.busca ?? [],
    ofrece: inicial.ofrece ?? [],
  });
  const [detalle, setDetalle] = useState<Record<Lado, string[]>>({
    busca: inicial.busca_detalle ?? [],
    ofrece: inicial.ofrece_detalle ?? [],
  });
  const [como, setComo] = useState<Record<Lado, string[]>>({
    busca: inicial.busca_como ?? [],
    ofrece: inicial.ofrece_como ?? [],
  });
  const [consulta, setConsulta] = useState("");
  const [ejemplo, setEjemplo] = useState<string | null>(null);
  const [avisoEjemplo, setAvisoEjemplo] = useState<string | null>(null);

  const elegidas = opciones[lado];
  const lleno = elegidas.length >= MAX_NECESIDADES;

  function alternar(valor: string) {
    setOpciones((o) => {
      const lista = o[lado];
      const nueva = lista.includes(valor) ? lista.filter((v) => v !== valor) : lista.length < MAX_NECESIDADES ? [...lista, valor] : lista;
      return { ...o, [lado]: nueva };
    });
    setAvisoEjemplo(null);
    marcar();
  }

  function alternarComo(valor: string) {
    setComo((c) => ({ ...c, [lado]: c[lado].includes(valor) ? c[lado].filter((v) => v !== valor) : [...c[lado], valor] }));
    marcar();
  }

  function usarEjemplo(e: EjemploBuscaOfrece) {
    const sumar = (actual: string[], nuevas: readonly string[]) => {
      const salida = [...actual];
      for (const v of nuevas) if (!salida.includes(v) && salida.length < MAX_NECESIDADES) salida.push(v);
      return salida;
    };
    const busca = sumar(opciones.busca, e.busca);
    const ofrece = sumar(opciones.ofrece, e.ofrece);
    const sumadas = busca.length - opciones.busca.length + ofrece.length - opciones.ofrece.length;
    setOpciones({ busca, ofrece });
    setComo((c) => ({
      busca: [...new Set([...c.busca, ...(e.busca_como ?? [])])],
      ofrece: [...new Set([...c.ofrece, ...(e.ofrece_como ?? [])])],
    }));
    setAvisoEjemplo(
      sumadas === 0
        ? "Ya tenías todo eso (o llegaste al tope de 10)."
        : `Sumamos ${sumadas} ${sumadas === 1 ? "opción" : "opciones"}. Sacá las que no van con vos.`
    );
    setEjemplo(null);
    marcar();
  }

  // Búsqueda: por opción o por categoría, sin tildes.
  const resultados = useMemo(() => {
    const q = sinTildes(consulta);
    if (!q) return null;
    return OPCIONES_ELEGIBLES.filter((o) => {
      const cat = CATEGORIAS_NECESIDAD.find((c) => c.valor === o.categoria)?.label ?? "";
      return sinTildes(o.label).includes(q) || sinTildes(cat).includes(q);
    });
  }, [consulta]);

  const t = TITULOS[lado];
  const errorOpciones = errores[lado];
  const errorDetalle = errores[`${lado}_detalle`];

  return (
    <div className="flex flex-col gap-5">
      {/* Todo viaja oculto: los dos lados, aunque se vea uno. */}
      {(["busca", "ofrece"] as const).map((l) => (
        <div key={l} hidden>
          {opciones[l].map((v) => (
            <input key={v} type="hidden" name={l} value={v} />
          ))}
          {detalle[l].map((v) => (
            <input key={v} type="hidden" name={`${l}_detalle`} value={v} />
          ))}
          {como[l].map((v) => (
            <input key={v} type="hidden" name={`${l}_como`} value={v} />
          ))}
        </div>
      ))}

      <div role="tablist" aria-label="Lado" className="grid grid-cols-2 gap-1 rounded-full bg-tinta/[0.06] p-1">
        {(["busca", "ofrece"] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            id={`${id}-tab-${l}`}
            aria-selected={lado === l}
            aria-controls={`${id}-panel`}
            onClick={() => {
              setLado(l);
              setConsulta("");
            }}
            className={`boton min-h-11 rounded-full text-sm font-semibold transition-colors duration-[var(--duracion-rapida)] ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              lado === l ? "bg-tinta text-marfil" : "text-tinta hover:bg-tinta/[0.06]"
            }`}
          >
            {TITULOS[l].pestana}{" "}
            <span className="font-normal tabular-nums opacity-80">
              {opciones[l].length}/{MAX_NECESIDADES}
            </span>
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${lado}`} className="flex flex-col gap-5">
        <section className="flex flex-col gap-2" aria-label={t.pregunta}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-tinta">{t.pregunta}</h3>
            <span className="text-xs tabular-nums text-tinta/65">
              {elegidas.length}/{MAX_NECESIDADES}
            </span>
          </div>
          {elegidas.length ? (
            <div className="flex flex-wrap gap-1.5">
              {elegidas.map((v) => (
                <span
                  key={v}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-medium ${necesidad(v).clase}`}
                >
                  {necesidad(v).label}
                  <button
                    type="button"
                    onClick={() => alternar(v)}
                    aria-label={`Sacar ${necesidad(v).label}`}
                    className="flex size-7 items-center justify-center rounded-full hover:bg-tinta/10 focus-visible:outline-2 focus-visible:outline-arcilla"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tinta/70">Todavía nada. Elegí de la lista o arrancá con un ejemplo.</p>
          )}
          {errorOpciones && <MensajeError>{errorOpciones}</MensajeError>}
        </section>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-buscar`} className="sr-only">
            Buscar una opción
          </label>
          <input
            id={`${id}-buscar`}
            type="search"
            enterKeyHint="search"
            value={consulta}
            onChange={(e) => {
              // Buscar no es un cambio del perfil: que no llegue al onChange del form.
              e.stopPropagation();
              setConsulta(e.target.value);
            }}
            onKeyDown={(e) => {
              // Enter no manda el form: solo cierra el teclado.
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder="Buscá: clientes, laboratorio, IA…"
            className="w-full rounded-full border border-tinta/40 bg-marfil px-4 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
          />
          {lleno && <p className="text-sm text-tinta/70">Llegaste a {MAX_NECESIDADES}: sacá una para sumar otra.</p>}
        </div>

        {resultados ? (
          <div aria-live="polite" className="flex flex-col gap-2">
            {resultados.length === 0 ? (
              <p className="text-sm text-tinta/70">Nada con «{consulta.trim()}». Probá con otra palabra o sumalo como detalle abajo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {resultados.map((o) => (
                  <Chip
                    key={o.valor}
                    valor={o.valor}
                    elegido={elegidas.includes(o.valor)}
                    bloqueado={lleno && !elegidas.includes(o.valor)}
                    onTocar={() => alternar(o.valor)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-tinta/10 rounded-2xl border border-tinta/15">
            {CATEGORIAS_NECESIDAD.map((c) => {
              const opcionesCat = OPCIONES_ELEGIBLES.filter((o) => o.categoria === c.valor);
              const cuantas = elegidas.filter((v) => categoriaDe(v) === c.valor).length;
              return (
                <details key={c.valor} className="group px-4">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${PUNTO[c.tono]}`} />
                      {c.label}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-normal text-tinta/70">
                      {cuantas > 0 && <span className="rounded-full bg-tinta px-2 py-0.5 font-semibold text-marfil">{cuantas}</span>}
                      <span aria-hidden className="transition-transform duration-[var(--duracion-rapida)] group-open:rotate-180">
                        ▾
                      </span>
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2 pb-4 pt-1">
                    {opcionesCat.map((o) => (
                      <Chip
                        key={o.valor}
                        valor={o.valor}
                        elegido={elegidas.includes(o.valor)}
                        bloqueado={lleno && !elegidas.includes(o.valor)}
                        onTocar={() => alternar(o.valor)}
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">
            {t.como} <span className="font-normal text-tinta/70">(opcional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {COMOS.map((c) => {
              const elegido = como[lado].includes(c.valor);
              return (
                <button
                  key={c.valor}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => alternarComo(c.valor)}
                  className={`${CHIP} ${elegido ? CLASES_CHIP.prendidoNeutro : CLASES_CHIP.apagado}`}
                >
                  {elegido && <Tilde />}
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-detalle-${lado}`} className="text-sm font-medium text-tinta">
            {t.detalle}
          </label>
          <p className="-mt-1 text-sm text-tinta/70">Herramientas o cosas concretas: «Figma», «créditos de AWS». Enter o coma para sumar.</p>
          <EntradaTags
            key={lado}
            id={`${id}-detalle-${lado}`}
            nombre={`_detalle_${lado}`}
            valores={detalle[lado]}
            onCambiar={(v) => {
              setDetalle((d) => ({ ...d, [lado]: v }));
              marcar();
            }}
            max={MAX_DETALLE}
            largoMax={DETALLE_MAX}
            placeholder="Ej.: Figma"
            sugerencias={SUGERENCIAS_DETALLE[lado]}
          />
          {errorDetalle && <MensajeError>{errorDetalle}</MensajeError>}
        </div>
      </div>

      <details className="rounded-2xl bg-tinta/[0.04] px-4" open={!(inicial.busca ?? []).length && !(inicial.ofrece ?? []).length}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
          ¿Por dónde empezar? Mirá ejemplos
          <span aria-hidden>▾</span>
        </summary>
        <div className="flex flex-col gap-2 pb-4">
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS_BUSCA_OFRECE.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-expanded={ejemplo === e.id}
                onClick={() => setEjemplo(ejemplo === e.id ? null : e.id)}
                className={`${CHIP} ${ejemplo === e.id ? CLASES_CHIP.prendidoNeutro : CLASES_CHIP.apagado}`}
              >
                {e.titulo}
              </button>
            ))}
          </div>
          {EJEMPLOS_BUSCA_OFRECE.filter((e) => e.id === ejemplo).map((e) => (
            <div key={e.id} className="mt-1 flex flex-col gap-2 rounded-xl border border-tinta/15 bg-marfil p-3 text-sm text-tinta">
              <p>
                <span className="font-semibold">Busca:</span> {e.busca.map((v) => necesidad(v).label).join(" · ")}
              </p>
              <p>
                <span className="font-semibold">Ofrece:</span> {e.ofrece.map((v) => necesidad(v).label).join(" · ")}
              </p>
              <button type="button" onClick={() => usarEjemplo(e)} className={`${CHIP} ${CLASES_CHIP.prendidoNeutro} self-start`}>
                Usar como punto de partida
              </button>
            </div>
          ))}
          {avisoEjemplo && (
            <p role="status" className="text-sm text-tinta">
              {avisoEjemplo}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
