"use client";

import AvisoNavegadorInterno, { useNavegadorInterno } from "@/components/AvisoNavegadorInterno";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { entrar } from "@/app/cuenta/acciones";
import AvisoEntrar from "@/components/AvisoEntrar";
import { type MiEstado, miEstadoEvento, quitarVoto, votar } from "@/app/eventos/acciones";
import { TrazoAmarillo } from "@/components/eventos/MarcaFeria21";
import TarjetaParticipante, { type AccionTarjeta, TarjetaEsqueleto } from "@/components/eventos/TarjetaParticipante";
import { useCuentaLocal } from "@/lib/cuenta-local";
import type { Participante } from "@/lib/datos";
import { getEventoDefinido } from "@/lib/eventos";
import type { Resultado } from "@/lib/errores-base";
import { ordenVotacion } from "@/lib/orden-votacion";
import { marcarVoto, miVotoSinCuenta, quitarVotoSinCuenta, votarSinCuenta } from "@/lib/voto-feria";

type Props = {
  evento: string;
  /** Todos los anotados: compite cualquier rol. */
  participantes: Participante[];
  /** Logo de cada empresa, por slug (empresa_logos con respaldo en empresas.logo_url). */
  logos: Record<string, string>;
  /** Días de cada participante según la planilla de stands (`feria_dias`), "YYYY-MM-DD". */
  dias: Record<string, string[]>;
  abierta: boolean;
  resultadosVisibles: boolean;
  resultados: Record<string, number>;
  totalVotos: number;
};

const sinCambios = () => () => {};

/** Id del aviso de navegador interno de la franja: las tarjetas llevan ahí el foco. */
const AVISO_ID = "aviso-navegador-votacion";

/**
 * Votación del público. La lista llega del servidor (página estática); el estado de
 * cada persona (sesión, voto) se pide al montar. Con sesión se vota con la cuenta
 * (`votar`); sin sesión, con el dispositivo (`lib/voto-feria.ts`), si la migración
 * feria_stands_votos corrió (si no, hay que entrar como antes). Las reglas las aplica
 * la base: acá solo se esconden los botones que no tienen sentido (votarte a vos).
 */
export default function Votacion(props: Props) {
  const { evento } = props;
  const [estado, setEstado] = useState<MiEstado | null>(null);
  const [sinCuenta, setSinCuenta] = useState(false);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [votando, setVotando] = useState<string | null>(null);
  const cuenta = useCuentaLocal();

  useEffect(() => {
    let vigente = true;
    (async () => {
      const e = await miEstadoEvento(evento);
      if (e.conSesion) {
        if (vigente) setEstado(e);
        if (e.voto) marcarVoto(evento, true);
        return;
      }
      const d = await miVotoSinCuenta(evento);
      if (!vigente) return;
      setSinCuenta(d.disponible);
      setEstado({ ...e, voto: d.voto });
      if (d.voto) marcarVoto(evento, true);
    })();
    return () => {
      vigente = false;
    };
  }, [evento]);

  function alVotar(perfilId: string) {
    setVotando(perfilId);
    iniciar(async () => {
      const r = estado?.conSesion ? await votar(evento, perfilId) : await votarSinCuenta(evento, perfilId);
      setAviso(r);
      if (r.ok) {
        setEstado((e) => e && { ...e, voto: perfilId });
        marcarVoto(evento, true);
        // Con la cuenta: si este celular había votado sin cuenta, ese voto se va.
        if (estado?.conSesion) void quitarVotoSinCuenta(evento);
      }
      setVotando(null);
    });
  }

  function alQuitar() {
    iniciar(async () => {
      const r = estado?.conSesion ? await quitarVoto(evento) : await quitarVotoSinCuenta(evento);
      setAviso(r);
      if (r.ok) {
        setEstado((e) => e && { ...e, voto: null });
        marcarVoto(evento, false);
      }
    });
  }

  return (
    <VistaVotacion
      {...props}
      estado={estado}
      sinCuenta={sinCuenta}
      aviso={aviso}
      pendiente={pendiente}
      votando={votando}
      miSlug={cuenta?.perfil?.slug}
      alVotar={alVotar}
      alQuitar={alQuitar}
    />
  );
}

/** Hoy en Buenos Aires, "YYYY-MM-DD" (en-CA da ese formato). */
function hoyBA(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

/** Para buscar sin tildes ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Abre las reglas (un `<details id="reglas">` de la página) antes de saltar a ellas. */
function abrirReglas() {
  const reglas = document.getElementById("reglas");
  if (reglas instanceof HTMLDetailsElement) reglas.open = true;
}

/**
 * Lo que se ve, sin hablar con el servidor: recibe el estado y qué hacer al tocar.
 * `Votacion` lo conecta con la base.
 */
export function VistaVotacion({
  evento,
  participantes,
  logos,
  dias,
  abierta,
  resultadosVisibles,
  resultados,
  totalVotos,
  estado,
  sinCuenta,
  aviso,
  pendiente,
  votando,
  miSlug,
  alVotar,
  alQuitar,
}: Props & {
  estado: MiEstado | null;
  /** Se puede votar sin cuenta (la migración corrió). */
  sinCuenta: boolean;
  aviso: Resultado | null;
  pendiente: boolean;
  votando: string | null;
  miSlug: string | undefined;
  alVotar: (perfilId: string) => void;
  alQuitar: () => void;
}) {
  const enCliente = useSyncExternalStore(sinCambios, () => true, () => false);
  const interno = useNavegadorInterno();

  // Llegando con /eventos/…#reglas, las reglas se ven abiertas.
  useEffect(() => {
    if (window.location.hash === "#reglas") abrirReglas();
  }, []);

  // Con resultados: por votos (desempate por nombre, estable). Si no, al azar por
  // visitante, armado recién en el navegador: el servidor y la hidratación dibujan
  // esqueletos del mismo alto.
  const ordenados = useMemo(() => {
    if (resultadosVisibles) {
      return [...participantes].sort(
        (a, b) =>
          (resultados[b.perfil_id] ?? 0) - (resultados[a.perfil_id] ?? 0) ||
          (a.empresa_nombre ?? a.nombre).localeCompare(b.empresa_nombre ?? b.nombre, "es")
      );
    }
    return enCliente ? ordenVotacion(evento, participantes) : null;
  }, [enCliente, evento, participantes, resultados, resultadosVisibles]);
  const maximo = Math.max(1, ...Object.values(resultados));

  // Filtro por día (los de la feria, sacados del programa) y búsqueda. Arranca en el día
  // de hoy si es un día de feria; el servidor y la hidratación arrancan en "Todos".
  const diasFeria = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const j of getEventoDefinido(evento)?.agenda ?? []) {
      const fecha = j.inicio.slice(0, 10);
      if (!vistos.has(fecha)) vistos.set(fecha, j.dia);
    }
    return [...vistos].map(([fecha, label]) => ({ fecha, label }));
  }, [evento]);
  const hoy = useSyncExternalStore(sinCambios, hoyBA, () => null);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const dia = diaElegido ?? (hoy && diasFeria.some((d) => d.fecha === hoy) ? hoy : "todos");
  const [busqueda, setBusqueda] = useState("");
  const visibles = useMemo(() => {
    if (!ordenados) return null;
    const q = normalizar(busqueda.trim());
    return ordenados.filter((p) => {
      const susDias = dias[p.perfil_id];
      // Quien no está en la planilla aparece todos los días: nadie queda afuera de la votación.
      if (dia !== "todos" && susDias && !susDias.includes(dia)) return false;
      if (!q) return true;
      return normalizar(`${p.nombre} ${p.empresa_nombre ?? ""} ${p.descripcion ?? ""}`).includes(q);
    });
  }, [ordenados, dias, dia, busqueda]);

  function irAlAviso() {
    const el = document.getElementById(AVISO_ID);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }

  function accionDe(p: Participante): AccionTarjeta {
    if (!abierta) return { tipo: "nada" };
    if (!estado) return { tipo: "cargando" };
    if (!estado.conSesion && !sinCuenta) return { tipo: "entrar", interno, alIrAlAviso: irAlAviso };
    if (estado.conSesion && miSlug && miSlug === p.slug) return { tipo: "sos-vos" };
    if (estado.voto === p.perfil_id) return { tipo: "tu-voto", pendiente, alQuitar };
    return {
      tipo: "votar",
      pendiente,
      votando: votando === p.perfil_id,
      cambiar: !!estado.voto,
      alVotar: () => alVotar(p.perfil_id),
    };
  }

  const cronograma = getEventoDefinido(evento)?.votacion;
  const [titulo, bajada] = resultadosVisibles
    ? ["Ranking del público", `${totalVotos} ${totalVotos === 1 ? "voto" : "votos"} en total.`]
    : abierta
      ? ["¡Votá por tu favorito!", "Un voto por persona. Podés cambiarlo hasta que cierre la votación."]
      : ["Conocé a los participantes", "Mirá sus pitches y conocé qué están construyendo."];

  return (
    <div className="flex flex-col gap-5">
      <div className="tema-fijo rounded-[2rem] bg-s21-verde-oscuro px-4 py-6 text-white shadow-[0_18px_50px_rgb(2_101_102/0.18)] sm:px-8 sm:py-8 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-8">
        <div>
          <h2
            id="titulo-votacion"
            className="font-sans text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {titulo}
          </h2>
          <TrazoAmarillo className="mt-3 h-4 w-40 sm:w-52" />
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{bajada}</p>
          <a
            href="#reglas"
            onClick={abrirReglas}
            className="mt-1 inline-flex min-h-11 items-center rounded text-sm font-semibold text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver las reglas
          </a>
        </div>
        <div className="mt-4 md:mt-0">
          <EstadoSesion
            evento={evento}
            estado={estado}
            sinCuenta={sinCuenta}
            abierta={abierta}
            resultadosVisibles={resultadosVisibles}
            cronograma={cronograma}
          />
        </div>
      </div>

      {aviso?.mensaje && (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={`rounded-2xl px-4 py-3 text-sm text-tinta ${
            aviso.ok ? "bg-t-verde-suave" : "border-2 border-arcilla font-medium"
          }`}
        >
          {aviso.mensaje}
        </p>
      )}

      {participantes.length === 0 ? (
        <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
          Todavía no se anotó nadie. ¿Vas a estar?{" "}
          <Link href="/cuenta" className="font-medium underline underline-offset-4">
            Anotate desde tu perfil
          </Link>
          .
        </p>
      ) : (
        <>
        <Filtros
          dias={diasFeria}
          dia={dia}
          alElegirDia={setDiaElegido}
          busqueda={busqueda}
          alBuscar={setBusqueda}
          cantidad={visibles?.length ?? null}
        />
        {visibles && visibles.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-tinta/5 px-4 py-4 text-sm text-tinta">
            <p>
              {busqueda.trim()
                ? `No encontramos a nadie con «${busqueda.trim()}»${dia === "todos" ? "" : " ese día"}.`
                : "Ese día todavía no hay participantes en Pecera."}
            </p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setDiaElegido("todos");
              }}
              className="boton min-h-11 rounded-full border border-tinta/30 px-4 font-medium text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
            >
              Ver a todos
            </button>
          </div>
        ) : (
        <ul
          aria-busy={!ordenados}
          aria-label="Participantes"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visibles
            ? visibles.map((p, i) => {
                const votos = resultados[p.perfil_id] ?? 0;
                return (
                  <TarjetaParticipante
                    key={p.perfil_id}
                    p={p}
                    logo={(p.empresa_slug && logos[p.empresa_slug]) || null}
                    accion={accionDe(p)}
                    esMio={estado?.voto === p.perfil_id}
                    prioridad={i < 4}
                    resultado={
                      resultadosVisibles
                        ? {
                            // Puesto de competición: empatados comparten puesto.
                            puesto: 1 + participantes.filter((o) => (resultados[o.perfil_id] ?? 0) > votos).length,
                            votos,
                            maximo,
                          }
                        : undefined
                    }
                  />
                );
              })
            : participantes.map((p) => <TarjetaEsqueleto key={p.perfil_id} />)}
        </ul>
        )}
        </>
      )}
    </div>
  );
}

function EstadoSesion({
  evento,
  estado,
  sinCuenta,
  abierta,
  resultadosVisibles,
  cronograma,
}: {
  evento: string;
  estado: MiEstado | null;
  sinCuenta: boolean;
  abierta: boolean;
  resultadosVisibles: boolean;
  cronograma: { abre: string; cierra: string; resultados: string } | undefined;
}) {
  const caja = "rounded-2xl bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/20";
  if (resultadosVisibles && !abierta) {
    return <p className={caja}>La votación cerró. Estos son los resultados del público.</p>;
  }
  if (!abierta) {
    // Se abre y se cierra a mano desde /admin: el texto da el cronograma, no el estado.
    return (
      <p className={caja}>
        La votación no está abierta ahora.
        {cronograma &&
          ` Abre el ${cronograma.abre} y cierra el ${cronograma.cierra}. Los resultados ${cronograma.resultados}.`}
      </p>
    );
  }
  if (!estado) {
    return <p className={`${caja} min-h-12 text-white/85`}>Cargando tu voto…</p>;
  }
  if (!estado.conSesion && sinCuenta) {
    // Se vota sin cuenta; entrar con Google queda como opción (para cambiar el voto desde otro lado).
    return (
      <form id="entrar-votar" action={entrar} className="flex flex-col gap-2 rounded-2xl bg-white/10 px-3 py-4 text-white ring-1 ring-white/20 sm:px-4">
        <p className="text-sm font-semibold">
          {estado.voto
            ? "Ya votaste desde este celular. Podés cambiar tu voto mientras la votación siga abierta."
            : "Tocá «Votar» en tu favorito. No hace falta cuenta: un voto por celular."}
        </p>
        <div className="rounded-2xl bg-marfil empty:hidden">
          <AvisoNavegadorInterno id={AVISO_ID} />
        </div>
        <input type="hidden" name="next" value={`/eventos/${evento}#votacion`} />
        <button
          type="submit"
          className="boton min-h-11 rounded-full border border-white/60 px-4 text-sm font-medium text-white hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Tengo cuenta: entrar con Google
        </button>
        <AvisoEntrar tono="oscuro" />
      </form>
    );
  }
  if (!estado.conSesion) {
    return (
      <form id="entrar-votar" action={entrar} className="flex flex-col gap-2 rounded-2xl bg-white/10 px-3 py-4 text-white ring-1 ring-white/20 sm:px-4">
        {/* Fondo sólido: el aviso usa texto Tinta. */}
        <div className="rounded-2xl bg-marfil empty:hidden">
          <AvisoNavegadorInterno id={AVISO_ID} />
        </div>
        <input type="hidden" name="next" value={`/eventos/${evento}#votacion`} />
        <p className="text-sm">¡La votación está abierta! Entrá con Google para votar: un voto por persona.</p>
        <button
          type="submit"
          className="boton min-h-12 rounded-full bg-marfil px-4 text-[0.9375rem] font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Entrar con Google para votar
        </button>
        <AvisoEntrar tono="oscuro" />
      </form>
    );
  }
  return (
    <p className={caja}>
      {estado.voto
        ? "Ya votaste. Podés cambiar tu voto mientras la votación siga abierta."
        : "La votación está abierta: elegí a tu favorito."}
    </p>
  );
}

/**
 * Días de la feria y búsqueda. Los chips son botones con `aria-pressed`; en el celular
 * se deslizan de costado y la búsqueda va abajo, a todo el ancho.
 */
function Filtros({
  dias,
  dia,
  alElegirDia,
  busqueda,
  alBuscar,
  cantidad,
}: {
  dias: Array<{ fecha: string; label: string }>;
  dia: string;
  alElegirDia: (dia: string) => void;
  busqueda: string;
  alBuscar: (texto: string) => void;
  cantidad: number | null;
}) {
  const chip = (activo: boolean) =>
    `boton min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta ${
      activo ? "bg-s21-verde-oscuro text-white" : "border border-tinta/20 text-tinta hover:border-tinta/50"
    }`;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div role="group" aria-label="Día de la feria" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
        <button type="button" aria-pressed={dia === "todos"} onClick={() => alElegirDia("todos")} className={chip(dia === "todos")}>
          Todos
        </button>
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            aria-pressed={dia === d.fecha}
            onClick={() => alElegirDia(d.fecha)}
            className={chip(dia === d.fecha)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 md:w-80">
        <label className="relative flex-1">
          <span className="sr-only">Buscar un participante</span>
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta/60">
            ⌕
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => alBuscar(e.target.value)}
            placeholder="Buscar por nombre o emprendimiento"
            enterKeyHint="search"
            className="min-h-11 w-full rounded-full border border-tinta/20 bg-marfil pl-10 pr-4 text-base text-tinta placeholder:text-tinta/60 focus-visible:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta md:text-sm"
          />
        </label>
      </div>
      {cantidad !== null && (
        <p aria-live="polite" className="sr-only">
          {cantidad === 1 ? "1 participante" : `${cantidad} participantes`}
        </p>
      )}
    </div>
  );
}
