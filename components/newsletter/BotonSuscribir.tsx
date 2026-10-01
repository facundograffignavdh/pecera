"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { entrar } from "@/app/cuenta/acciones";
import { type EstadoSuscripcion, estadoSuscripcion, suscribirse } from "@/app/cuenta/newsletter";
import { formatoCompacto } from "@/lib/formato";

/**
 * Suscribirse a la newsletter de un perfil. La página es estática: el estado de la
 * sesión se pide por action al montar. Sin sesión, el botón lleva a entrar con
 * Google y vuelve acá. Optimista: cambia al toque y se corrige si falla.
 */
export default function BotonSuscribir({ slug, total: totalInicial }: { slug: string; total: number }) {
  const [estado, setEstado] = useState<EstadoSuscripcion | null>(null);
  const [total, setTotal] = useState(totalInicial);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    let cancelado = false;
    estadoSuscripcion(slug)
      .then((e) => {
        if (!cancelado) setEstado(e);
      })
      .catch(() => {
        if (!cancelado) setEstado({ sesion: false, suscripto: false, propia: false });
      });
    return () => {
      cancelado = true;
    };
  }, [slug]);

  const contador = (
    <p className="text-sm tabular-nums text-tinta/70">
      {total === 0 ? "Todavía sin suscriptores" : `${formatoCompacto(total)} ${total === 1 ? "suscriptor" : "suscriptores"}`}
    </p>
  );

  if (!estado) {
    return (
      <div className="flex flex-col gap-2">
        <span aria-hidden className="inline-flex min-h-12 w-40 animate-pulse rounded-full bg-tinta/10" />
        <span role="status" className="sr-only">Cargando…</span>
        {contador}
      </div>
    );
  }

  if (estado.propia) {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/cuenta#tarjeta-tu-newsletter" className="inline-flex min-h-12 items-center self-start rounded-full border border-tinta/30 px-5 font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta">
          Es tu newsletter · Gestionar
        </Link>
        {contador}
      </div>
    );
  }

  if (!estado.sesion) {
    return (
      <form action={entrar} className="flex flex-col gap-2">
        <input type="hidden" name="next" value={`/p/${slug}/newsletter`} />
        <button type="submit" className="inline-flex min-h-12 items-center self-start rounded-full bg-tinta px-5 font-medium text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla">
          Suscribirme
        </button>
        <p className="text-xs text-tinta/70">Entrás con tu cuenta de Google; no hace falta tener perfil.</p>
        {contador}
      </form>
    );
  }

  function alternar(activa: boolean) {
    if (!activa && !window.confirm("¿Darte de baja de esta newsletter?")) return;
    const anterior = estado;
    setEstado((e) => e && { ...e, suscripto: activa });
    setTotal((t) => Math.max(0, t + (activa ? 1 : -1)));
    setMensaje(null);
    iniciar(async () => {
      const r = await suscribirse(slug, activa);
      if (!r.ok) {
        setEstado(anterior);
        setTotal(totalInicial);
      } else if (typeof r.total === "number") {
        setTotal(r.total);
      }
      setMensaje({ ok: r.ok, texto: r.mensaje ?? (r.ok ? "Listo." : "No se pudo.") });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {estado.suscripto ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="aparecer-pop inline-flex min-h-12 items-center gap-2 rounded-full bg-aliado px-5 font-medium text-marfil">
            <svg aria-hidden viewBox="0 0 12 12" className="size-3.5">
              <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Suscripto
          </span>
          <button
            type="button"
            onClick={() => alternar(false)}
            disabled={pendiente}
            className="min-h-11 text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla disabled:opacity-60"
          >
            Darme de baja
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => alternar(true)}
          disabled={pendiente}
          className="inline-flex min-h-12 items-center self-start rounded-full bg-tinta px-5 font-medium text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla disabled:opacity-70"
        >
          Suscribirme
        </button>
      )}
      {contador}
      <p role={mensaje && !mensaje.ok ? "alert" : "status"} className="text-sm text-tinta">
        {mensaje?.texto ?? ""}
      </p>
    </div>
  );
}
