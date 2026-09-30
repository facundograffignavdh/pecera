"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { entrar } from "@/app/cuenta/acciones";
import { type MiEstado, miEstadoEvento, quitarVoto, votar } from "@/app/eventos/acciones";
import Avatar from "@/components/Avatar";
import { BarraEtapa } from "@/components/Etiquetas";
import { useCuentaLocal } from "@/lib/cuenta-local";
import type { Participante } from "@/lib/datos";
import { getEventoDefinido } from "@/lib/eventos";
import type { Resultado } from "@/lib/errores-base";
import { cargo, labelIndustria } from "@/lib/etiquetas";

type Props = {
  evento: string;
  proyectos: Participante[];
  abierta: boolean;
  resultadosVisibles: boolean;
  resultados: Record<string, number>;
  totalVotos: number;
};

/**
 * Votación del público. La lista llega del servidor (página estática); el estado de
 * cada persona (sesión, voto) se pide al montar. Las reglas las aplica la base: acá
 * solo se esconden los botones que no tienen sentido (votarte a vos).
 */
export default function Votacion({
  evento,
  proyectos,
  abierta,
  resultadosVisibles,
  resultados,
  totalVotos,
}: Props) {
  const [estado, setEstado] = useState<MiEstado | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [votando, setVotando] = useState<string | null>(null);
  const cuenta = useCuentaLocal();
  const miSlug = cuenta?.perfil?.slug;

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

  const ordenados = resultadosVisibles
    ? [...proyectos].sort((a, b) => (resultados[b.perfil_id] ?? 0) - (resultados[a.perfil_id] ?? 0))
    : proyectos;
  const maximo = Math.max(1, ...Object.values(resultados));

  return (
    <div className="flex flex-col gap-4">
      <EstadoSesion evento={evento} estado={estado} abierta={abierta} resultadosVisibles={resultadosVisibles} />

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

      {resultadosVisibles && (
        <p className="text-sm text-tinta/70">
          {totalVotos} {totalVotos === 1 ? "voto" : "votos"} en total.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {ordenados.map((p, i) => {
          const esMio = estado?.voto === p.perfil_id;
          const soyYo = !!miSlug && miSlug === p.slug;
          const votos = resultados[p.perfil_id] ?? 0;
          const c = cargo(p.cargo);
          return (
            <li
              key={p.perfil_id}
              className={`flex flex-col gap-3 rounded-3xl border px-4 py-4 transition-colors duration-200 ease-pecera ${
                esMio ? "border-arcilla bg-t-arcilla-suave/60" : "border-tinta/10 bg-tinta/[0.02]"
              }`}
            >
              <div className="flex items-start gap-3">
                {resultadosVisibles && (
                  <span className="mt-1 w-6 shrink-0 text-center font-display text-lg font-semibold tabular-nums text-tinta/60">
                    {i + 1}
                  </span>
                )}
                <Link href={`/p/${p.slug}`} className="shrink-0" aria-label={`Ver el perfil de ${p.nombre}`}>
                  {p.poster_url ? (
                    <Image
                      src={p.poster_url}
                      alt=""
                      width={96}
                      height={170}
                      className="aspect-[9/16] w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <Avatar perfil={p} size={56} />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${p.slug}`} className="font-display text-lg font-semibold leading-tight text-tinta hover:text-arcilla">
                    {p.empresa_nombre ?? p.nombre}
                  </Link>
                  {p.empresa_nombre && (
                    <p className="text-xs text-tinta/60">
                      {p.nombre}
                      {c ? ` · ${c.label}` : ""}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-tinta/80">{p.descripcion}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <BarraEtapa etapa={p.etapa} />
                    {(p.industrias ?? []).slice(0, 2).map((ind) => (
                      <span key={ind} className="rounded-full border border-tinta/20 px-2 py-0.5 text-xs text-tinta/80">
                        {labelIndustria(ind)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {resultadosVisibles && (
                <div className="flex items-center gap-3">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-tinta/10">
                    <span
                      className="block h-full rounded-full bg-arcilla transition-[width] duration-700 ease-pecera"
                      style={{ width: `${(votos / maximo) * 100}%` }}
                    />
                  </span>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-tinta">
                    {votos} {votos === 1 ? "voto" : "votos"}
                  </span>
                </div>
              )}

              {abierta && estado?.conSesion && (
                <div className="flex items-center justify-end gap-2">
                  {soyYo ? (
                    <span className="text-sm text-tinta/60">Es tu proyecto</span>
                  ) : esMio ? (
                    <>
                      <span className="mr-auto text-sm font-semibold text-t-arcilla">✓ Tu voto</span>
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={alQuitar}
                        className="min-h-11 rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta disabled:opacity-60"
                      >
                        Quitar voto
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => alVotar(p.perfil_id)}
                      className="min-h-11 rounded-full bg-tinta px-5 text-sm font-medium text-marfil transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-60"
                    >
                      {votando === p.perfil_id ? "Votando…" : estado.voto ? "Cambiar mi voto acá" : "Votar"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EstadoSesion({
  evento,
  estado,
  abierta,
  resultadosVisibles,
}: {
  evento: string;
  estado: MiEstado | null;
  abierta: boolean;
  resultadosVisibles: boolean;
}) {
  if (resultadosVisibles && !abierta) {
    return (
      <p className="rounded-2xl bg-tinta px-4 py-3 text-sm text-marfil">
        La votación cerró. Estos son los resultados del público.
      </p>
    );
  }
  if (!abierta) {
    // Se abre y se cierra a mano desde /admin: el texto da el cronograma, no el estado.
    const cronograma = getEventoDefinido(evento)?.votacion;
    return (
      <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
        La votación no está abierta ahora.
        {cronograma &&
          ` Abre el ${cronograma.abre} y cierra el ${cronograma.cierra}. Los resultados ${cronograma.resultados}.`}
      </p>
    );
  }
  if (!estado) {
    return <p className="min-h-12 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta/60">Cargando tu voto…</p>;
  }
  if (!estado.conSesion) {
    return (
      <form action={entrar} className="flex flex-col gap-2 rounded-2xl bg-tinta px-4 py-4 text-marfil">
        <input type="hidden" name="next" value={`/eventos/${evento}#votacion`} />
        <p className="text-sm">¡La votación está abierta! Entrá con Google para votar: un voto por persona.</p>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-marfil px-5 font-medium text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        >
          Entrar con Google para votar
        </button>
      </form>
    );
  }
  return (
    <p className="rounded-2xl bg-t-verde-suave px-4 py-3 text-sm text-t-verde">
      {estado.voto
        ? "Ya votaste. Podés cambiar tu voto mientras la votación siga abierta."
        : "La votación está abierta: elegí tu proyecto favorito."}
    </p>
  );
}
