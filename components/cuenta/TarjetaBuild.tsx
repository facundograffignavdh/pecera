"use client";

import { useActionState, useState, useTransition, type CSSProperties } from "react";
import {
  actualizarProgreso,
  borrarAvance,
  borrarHito,
  guardarHito,
  moverHito,
  publicarAvance,
} from "@/app/cuenta/build";
import Racha from "@/components/build/Racha";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import {
  AVANCE_MAX,
  DETALLE_HITO_MAX,
  ESTADOS_HITO,
  ETAPAS_BUILD,
  type Avance,
  type EstadoHito,
  type Hito,
  type Racha as DatosRacha,
  TITULO_HITO_MAX,
  fechaAvance,
  fechaHito,
  labelEtapaBuild,
  ordenarHitos,
} from "@/lib/build";
import type { Resultado } from "@/lib/errores-base";

const INICIAL: Resultado = { ok: false };

/**
 * Build in Public de la empresa en /cuenta. Lo edita cualquier miembro y es
 * público (empresa, perfiles del equipo y feed). Lo frecuente queda a un toque:
 * mover el progreso, publicar un avance, marcar un hito como logrado.
 */
export default function TarjetaBuild({
  hitos,
  avances,
  racha,
}: {
  hitos: Hito[];
  avances: Avance[];
  racha: DatosRacha;
}) {
  const { actual, logrados, proximos } = ordenarHitos(hitos);

  return (
    <Tarjeta
      titulo="Build in Public"
      etiqueta="Público"
      bajada="Mostrá cómo avanza tu empresa: el hito en curso, lo que lograron y lo que viene. Se ve en la página de la empresa, en el perfil de cada miembro y en el feed."
    >
      {actual ? (
        <HitoEnCurso key={`${actual.id}-${actual.progreso}`} hito={actual} />
      ) : (
        <p className="rounded-2xl border border-dashed border-tinta/25 px-4 py-3 text-sm text-tinta/80">
          No hay un hito en curso.{" "}
          {proximos.length > 0 ? "Empezá uno de los próximos o creá uno nuevo." : "Creá el primero: ¿en qué están trabajando ahora?"}
        </p>
      )}

      <PublicarAvance actual={actual} />

      <Racha racha={racha} propia />

      {proximos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Próximos</h3>
          <ul className="flex flex-col gap-2">
            {proximos.map((h) => (
              <FilaHito key={h.id} hito={h} hayActual={!!actual} />
            ))}
          </ul>
        </div>
      )}

      {logrados.length > 0 && (
        <details className="group rounded-2xl border border-tinta/15 bg-marfil">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
            Historial de logros ({logrados.length})
            <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="flex flex-col gap-2 border-t border-tinta/10 p-3">
            {logrados.map((h) => (
              <FilaHito key={h.id} hito={h} hayActual={!!actual} />
            ))}
          </ul>
        </details>
      )}

      <NuevoHito hayActual={!!actual} />

      {avances.length > 0 && (
        <details className="group rounded-2xl border border-tinta/15 bg-marfil">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
            Avances publicados ({avances.length})
            <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="flex flex-col divide-y divide-tinta/10 border-t border-tinta/10">
            {avances.map((a) => (
              <FilaAvance key={a.id} avance={a} />
            ))}
          </ul>
        </details>
      )}
    </Tarjeta>
  );
}

function useAccion() {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const correr = (accion: () => Promise<Resultado>, confirmar?: string) => {
    if (confirmar && !window.confirm(confirmar)) return;
    setResultado(null);
    iniciar(async () => setResultado(await accion()));
  };
  return { pendiente, resultado, correr };
}

function HitoEnCurso({ hito }: { hito: Hito }) {
  const [progreso, setProgreso] = useState(hito.progreso ?? 0);
  const { pendiente, resultado, correr } = useAccion();
  const cambiado = progreso !== (hito.progreso ?? 0);
  const etapa = labelEtapaBuild(hito.etapa);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-obra/70 bg-obra-suave/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-t-ocre">
        <span aria-hidden className="punto-vivo size-2 rounded-full bg-obra" />
        Hito actual{etapa && ` · ${etapa}`}
      </p>
      <p className="font-display text-xl font-semibold leading-tight text-tinta">{hito.titulo}</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`progreso-${hito.id}`} className="flex items-baseline justify-between text-sm text-tinta">
          <span className="font-medium">¿Cuánto llevan?</span>
          <span className="font-semibold tabular-nums">{progreso}%</span>
        </label>
        <input
          id={`progreso-${hito.id}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={progreso}
          onChange={(e) => setProgreso(Number(e.target.value))}
          className="w-full accent-[#6b4f06]"
        />
        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-tinta/10">
          <div
            className="h-full origin-left rounded-full bg-t-ocre transition-transform duration-300 ease-pecera"
            style={{ transform: `scaleX(${progreso / 100})` } as CSSProperties}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cambiado && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => actualizarProgreso(hito.id, progreso))}
            className={BOTON_PRIMARIO}
          >
            {pendiente ? "Guardando…" : "Guardar progreso"}
          </button>
        )}
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => moverHito(hito.id, "logrado"))}
          className={cambiado ? BOTON_SECUNDARIO : BOTON_PRIMARIO}
        >
          Lo logramos
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => moverHito(hito.id, "proximo"))}
          className={BOTON_SECUNDARIO}
        >
          Pausar
        </button>
      </div>
      {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
    </div>
  );
}

function PublicarAvance({ actual }: { actual: Hito | null }) {
  const [texto, setTexto] = useState("");
  const [estado, accion, pendiente] = useActionState(async (previo: Resultado, formData: FormData) => {
    const r = await publicarAvance(previo, formData);
    if (r.ok) setTexto("");
    return r;
  }, INICIAL);
  const restan = AVANCE_MAX - texto.length;

  return (
    <form action={accion} className="flex flex-col gap-2">
      <label htmlFor="avance" className="text-sm font-medium text-tinta">
        Contá un avance
      </label>
      <textarea
        id="avance"
        name="texto"
        rows={3}
        maxLength={AVANCE_MAX}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ej.: cerramos el primer cliente pago; lanzamos la beta a 30 usuarios…"
        aria-describedby="avance-ayuda"
        className={INPUT}
      />
      <p id="avance-ayuda" className="flex justify-between gap-3 text-xs text-tinta/70">
        <span>Una o dos líneas, en concreto. Suma a la racha de la semana.</span>
        <span className={`tabular-nums ${restan < 20 ? "font-semibold text-tinta" : ""}`}>{restan}</span>
      </p>
      {actual && <input type="hidden" name="hito" value={actual.id} />}
      <button type="submit" disabled={pendiente || !texto.trim()} className={`${BOTON_PRIMARIO} self-start`}>
        {pendiente ? "Publicando…" : "Publicar avance"}
      </button>
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
    </form>
  );
}

function FilaHito({ hito, hayActual }: { hito: Hito; hayActual: boolean }) {
  const { pendiente, resultado, correr } = useAccion();
  const etapa = labelEtapaBuild(hito.etapa);
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-tinta/[0.04] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={`mt-1 size-2.5 shrink-0 rounded-full ${hito.estado === "logrado" ? "bg-aliado" : "border-2 border-tinta/30"}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-tinta">{hito.titulo}</p>
          <p className="text-xs text-tinta/60">
            {[etapa, hito.fecha && fechaHito(hito.fecha)].filter(Boolean).join(" · ") || "Sin fecha"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hito.estado === "proximo" && (
          <button
            type="button"
            disabled={pendiente || hayActual}
            title={hayActual ? "Ya hay un hito en curso" : undefined}
            onClick={() => correr(() => moverHito(hito.id, "en_curso"))}
            className={`${BOTON_SECUNDARIO} min-h-10`}
          >
            Empezar
          </button>
        )}
        {hito.estado === "proximo" && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => moverHito(hito.id, "logrado"))}
            className={`${BOTON_SECUNDARIO} min-h-10`}
          >
            Ya lo logramos
          </button>
        )}
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => borrarHito(hito.id), `¿Borrar "${hito.titulo}"? No se puede deshacer.`)}
          className={`${BOTON_SECUNDARIO} min-h-10`}
        >
          Borrar
        </button>
      </div>
      {hayActual && hito.estado === "proximo" && (
        <p className="text-xs text-tinta/60">Para empezarlo, primero marcá el actual como logrado o pausalo.</p>
      )}
      {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
    </li>
  );
}

function FilaAvance({ avance }: { avance: Avance }) {
  const { pendiente, resultado, correr } = useAccion();
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <p className="text-xs text-tinta/60">{fechaAvance(avance.created_at)}</p>
      <p className="text-sm text-tinta">{avance.texto}</p>
      <button
        type="button"
        disabled={pendiente}
        onClick={() => correr(() => borrarAvance(avance.id), "¿Borrar este avance? Puede cortar la racha.")}
        className="self-start text-xs font-medium text-tinta underline underline-offset-4 hover:text-arcilla disabled:opacity-60"
      >
        {pendiente ? "Borrando…" : "Borrar"}
      </button>
      {resultado?.mensaje && !resultado.ok && <Aviso ok={false}>{resultado.mensaje}</Aviso>}
    </li>
  );
}

/** Alta de un hito: primero lo esencial (qué y en qué estado); el resto, si hace falta. */
function NuevoHito({ hayActual }: { hayActual: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  const [estadoHito, setEstadoHito] = useState<EstadoHito>(hayActual ? "proximo" : "en_curso");
  const [progreso, setProgreso] = useState(0);
  const [estado, accion, pendiente] = useActionState(async (previo: Resultado, formData: FormData) => {
    const r = await guardarHito(previo, formData);
    if (r.ok) {
      setVuelta((v) => v + 1);
      setAbierto(false);
    }
    return r;
  }, INICIAL);

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setAbierto(true)} className={`${BOTON_SECUNDARIO} self-start`}>
          + Sumar hito
        </button>
        {estado.ok && estado.mensaje && <Aviso ok>{estado.mensaje}</Aviso>}
      </div>
    );
  }

  return (
    <form key={vuelta} action={accion} className="flex flex-col gap-4 rounded-2xl border border-tinta/15 bg-marfil p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="hito-titulo" className="text-sm font-medium text-tinta">
          ¿Cuál es el hito?
        </label>
        <input
          id="hito-titulo"
          name="titulo"
          required
          maxLength={TITULO_HITO_MAX}
          placeholder="Ej.: Beta con 100 usuarios"
          autoComplete="off"
          className={INPUT}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-tinta">Estado</legend>
        <div className="flex flex-wrap gap-2">
          {ESTADOS_HITO.map((e) => {
            const deshabilitado = e.valor === "en_curso" && hayActual;
            return (
              <label
                key={e.valor}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla ${
                  estadoHito === e.valor ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"
                } ${deshabilitado ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="estado"
                  value={e.valor}
                  checked={estadoHito === e.valor}
                  disabled={deshabilitado}
                  onChange={() => setEstadoHito(e.valor)}
                  className="sr-only"
                />
                {e.label}
              </label>
            );
          })}
        </div>
        {hayActual && <p className="text-xs text-tinta/60">Ya hay un hito en curso: este puede ser logrado o próximo.</p>}
      </fieldset>

      {estadoHito === "en_curso" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hito-progreso" className="flex justify-between text-sm font-medium text-tinta">
            <span>¿Cuánto llevan?</span>
            <span className="tabular-nums">{progreso}%</span>
          </label>
          <input
            id="hito-progreso"
            name="progreso"
            type="range"
            min={0}
            max={100}
            step={5}
            value={progreso}
            onChange={(e) => setProgreso(Number(e.target.value))}
            className="w-full accent-[#6b4f06]"
          />
        </div>
      )}

      {estadoHito !== "en_curso" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hito-fecha" className="text-sm font-medium text-tinta">
            {estadoHito === "logrado" ? "¿Cuándo lo lograron?" : "¿Para cuándo? (opcional)"}
          </label>
          <input id="hito-fecha" name="fecha" type="date" className={INPUT} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hito-etapa" className="text-sm font-medium text-tinta">
          Etapa (opcional)
        </label>
        <select id="hito-etapa" name="etapa" defaultValue="" className={INPUT}>
          <option value="">Sin etapa</option>
          {ETAPAS_BUILD.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-tinta/60">Es una guía: no hace falta pasar por todas.</p>
      </div>

      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="transition-transform duration-300 ease-pecera group-open:rotate-90">›</span>
          Agregar detalle
        </summary>
        <textarea
          name="detalle"
          rows={3}
          maxLength={DETALLE_HITO_MAX}
          aria-label="Detalle del hito"
          placeholder="Qué implica y cómo lo van a medir."
          className={INPUT}
        />
      </details>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
          {pendiente ? "Guardando…" : "Guardar hito"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
      </div>
      {estado.mensaje && !estado.ok && <Aviso ok={false}>{estado.mensaje}</Aviso>}
    </form>
  );
}
