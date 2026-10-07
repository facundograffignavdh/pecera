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

type Props = {
  evento: string;
  /** Todos los anotados: compite cualquier rol. */
  participantes: Participante[];
  /** Logo de cada empresa, por slug (empresa_logos con respaldo en empresas.logo_url). */
  logos: Record<string, string>;
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
 * cada persona (sesión, voto) se pide al montar. Las reglas las aplica la base: acá
 * solo se esconden los botones que no tienen sentido (votarte a vos).
 */
export default function Votacion(props: Props) {
  const { evento } = props;
  const [estado, setEstado] = useState<MiEstado | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [votando, setVotando] = useState<string | null>(null);
  const cuenta = useCuentaLocal();

  useEffect(() => {
    let vigente = true;
    miEstadoEvento(evento).then((e) => {
      if (vigente) setEstado(e);
    });
    return () => {
      vigente = false;
    };
  }, [evento]);

  function alVotar(perfilId: string) {
    setVotando(perfilId);
    iniciar(async () => {
      const r = await votar(evento, perfilId);
      setAviso(r);
      if (r.ok) setEstado((e) => e && { ...e, voto: perfilId });
      setVotando(null);
    });
  }

  function alQuitar() {
    iniciar(async () => {
      const r = await quitarVoto(evento);
      setAviso(r);
      if (r.ok) setEstado((e) => e && { ...e, voto: null });
    });
  }

  return (
    <VistaVotacion
      {...props}
      estado={estado}
      aviso={aviso}
      pendiente={pendiente}
      votando={votando}
      miSlug={cuenta?.perfil?.slug}
      alVotar={alVotar}
      alQuitar={alQuitar}
    />
  );
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
  abierta,
  resultadosVisibles,
  resultados,
  totalVotos,
  estado,
  aviso,
  pendiente,
  votando,
  miSlug,
  alVotar,
  alQuitar,
}: Props & {
  estado: MiEstado | null;
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

  function irAlAviso() {
    const el = document.getElementById(AVISO_ID);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }

  function accionDe(p: Participante): AccionTarjeta {
    if (!abierta) return { tipo: "nada" };
    if (!estado) return { tipo: "cargando" };
    if (!estado.conSesion) return { tipo: "entrar", interno, alIrAlAviso: irAlAviso };
    if (miSlug && miSlug === p.slug) return { tipo: "sos-vos" };
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
        <ul
          aria-busy={!ordenados}
          aria-label="Participantes"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {ordenados
            ? ordenados.map((p, i) => {
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
    </div>
  );
}

function EstadoSesion({
  evento,
  estado,
  abierta,
  resultadosVisibles,
  cronograma,
}: {
  evento: string;
  estado: MiEstado | null;
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
