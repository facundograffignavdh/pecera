"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import type { AccionesMatch } from "@/components/explorar/useMatch";
import { type Conexion, MENSAJE_MAX } from "@/lib/cofundador";
import { canalesDe } from "@/lib/contacto";
import { registrarContacto } from "@/lib/medicion";
import { boton } from "@/lib/ui";
import type { Perfil } from "@/types/pecera";

/**
 * El flujo de conexión que comparten el cofounder match y el networking: mostrar interés con
 * un mensaje corto, aceptar o pasar, match y retirar (con confirmación, porque es definitivo).
 * Cada pestaña pone sus propias funciones de la base (AccionesMatch); acá solo está la pantalla.
 */

/** Lo que vale del match es que el interés es mutuo (el contacto ya era público). */
export const MENSAJE_MATCH = "¡Hubo match! Los dos quieren conocerse: escribile.";

/** Estado y acciones del flujo, para una lista entera. */
export function useFlujoConexion({ interesar, responder, retirar }: AccionesMatch) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aRetirar, setARetirar] = useState<string | null>(null);

  async function mostrarInteres(id: string) {
    setTrabajando(id);
    setAviso(null);
    const r = await interesar(id, mensaje);
    setTrabajando(null);
    if (r.error) {
      setAviso(r.error);
      return;
    }
    setAbierto(null);
    setMensaje("");
    setAviso(
      r.resultado === "match"
        ? MENSAJE_MATCH
        : r.resultado === "rechazado"
          ? "Por ahora no hay match con esta persona."
          : r.resultado === "retirado"
            ? "Ya habías retirado tu interés en esta persona."
            : r.resultado === "ya_enviado"
              ? "Ya le habías mostrado interés."
              : "Listo: le avisamos que te interesa. Si te acepta, hay match."
    );
  }

  async function contestar(id: string, aceptar: boolean) {
    setTrabajando(id);
    setAviso(null);
    const r = await responder(id, aceptar);
    setTrabajando(null);
    setAviso(r.error ?? (aceptar ? MENSAJE_MATCH : "Listo, la dejamos pasar."));
  }

  async function sacar(id: string) {
    setTrabajando(id);
    await retirar(id);
    setTrabajando(null);
    setAviso("Retiraste tu interés.");
  }

  function pedirRetiro(id: string) {
    setARetirar(id);
  }

  function confirmarRetiro() {
    const id = aRetirar;
    setARetirar(null);
    if (id) sacar(id);
  }

  return {
    abierto,
    setAbierto,
    mensaje,
    setMensaje,
    trabajando,
    aviso,
    setAviso,
    aRetirar,
    cancelarRetiro: () => setARetirar(null),
    mostrarInteres,
    contestar,
    pedirRetiro,
    confirmarRetiro,
  };
}

export type FlujoConexion = ReturnType<typeof useFlujoConexion>;

export function AvisoFlujo({ aviso }: { aviso: string | null }) {
  if (!aviso) return null;
  return (
    <p role="status" aria-live="polite" className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm font-medium text-tinta">
      {aviso}
    </p>
  );
}

/** Lo recibido y los matches, arriba de la lista. */
export function SeccionConexiones({ conexiones, flujo }: { conexiones: Conexion[]; flujo: FlujoConexion }) {
  const recibidos = conexiones.filter((c) => c.tipo === "recibido");
  const matches = conexiones.filter((c) => c.tipo === "match");
  if (recibidos.length === 0 && matches.length === 0) return null;
  return (
    <section aria-labelledby="conexiones" className="flex flex-col gap-3">
      <h2 id="conexiones" className="font-display text-2xl font-semibold text-tinta">
        Tus conexiones
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {[...recibidos, ...matches].map((c) => (
          <li key={`${c.tipo}-${c.perfil_id}`}>
            <TarjetaConexion c={c} trabajando={flujo.trabajando === c.perfil_id} alResponder={flujo.contestar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El pie de cada tarjeta de la lista: match, responder, enviado (con retirar) o «Me interesa». */
export function AccionesTarjeta({
  perfilId,
  conexion,
  puedeInteresar,
  flujo,
  placeholder,
}: {
  perfilId: string;
  conexion: Conexion | undefined;
  puedeInteresar: boolean;
  flujo: FlujoConexion;
  placeholder: string;
}) {
  const { abierto, setAbierto, mensaje, setMensaje, trabajando, setAviso, mostrarInteres, contestar, pedirRetiro } = flujo;
  const c = conexion;
  const p = { id: perfilId };
  return (
    <div className="mt-auto flex flex-col gap-2 pt-1">
      {c?.tipo === "match" ? (
        <ContactoMatch c={c} />
      ) : c?.tipo === "recibido" ? (
        <BotonesRespuesta id={p.id} trabajando={trabajando === p.id} alResponder={contestar} />
      ) : c?.tipo === "enviado" ? (
        <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-tinta">Interés enviado · esperando respuesta</span>
          <button
            type="button"
            disabled={trabajando === p.id}
            onClick={() => pedirRetiro(p.id)}
            className="font-medium text-tinta/70 underline underline-offset-4 hover:text-arcilla"
          >
            Retirar
          </button>
        </p>
      ) : puedeInteresar ? (
        abierto === p.id ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void mostrarInteres(p.id);
            }}
          >
            <label className="text-xs font-medium text-tinta" htmlFor={`msg-${p.id}`}>
              Un mensaje corto (opcional)
            </label>
            <textarea
              id={`msg-${p.id}`}
              value={mensaje}
              maxLength={MENSAJE_MAX}
              rows={3}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={placeholder}
              className="rounded-2xl border border-tinta/25 bg-marfil px-3 py-2 text-sm text-tinta placeholder:text-tinta/50"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-tinta/65">
                {mensaje.length}/{MENSAJE_MAX}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(null);
                    setMensaje("");
                  }}
                  className="min-h-10 rounded-full px-3 text-sm font-medium text-tinta/75 hover:text-tinta"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={trabajando === p.id}
                  className="boton min-h-10 rounded-full bg-tinta px-4 text-sm font-semibold text-marfil disabled:opacity-60"
                >
                  {trabajando === p.id ? "Enviando…" : "Enviar interés"}
                </button>
              </span>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAbierto(p.id);
              setMensaje("");
              setAviso(null);
            }}
            className="boton min-h-11 rounded-full bg-naranja px-4 text-sm font-semibold text-tinta hover:bg-pecera"
          >
            Me interesa
          </button>
        )
      ) : null}
    </div>
  );
}

/** Uno solo para toda la lista. Escape y tocar afuera cancelan; el foco vuelve solo. */
export function DialogoRetiro({ flujo }: { flujo: FlujoConexion }) {
  const ref = useRef<HTMLDialogElement>(null);
  const abierto = flujo.aRetirar !== null;
  const { cancelarRetiro, confirmarRetiro } = flujo;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    else if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="retirar-titulo"
      aria-describedby="retirar-texto"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      onClose={cancelarRetiro}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-3xl bg-marfil p-0 text-tinta shadow-[0_24px_64px_rgb(28_27_22/0.35)] backdrop:bg-tinta/50"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <h2 id="retirar-titulo" className="font-display text-2xl font-semibold">
            ¿Retirar tu interés?
          </h2>
          <p id="retirar-texto" className="text-tinta/80">
            No vas a poder volver a mostrárselo a esta persona.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={confirmarRetiro} className={boton("peligro", "lg")}>
            Retirar
          </button>
          <button type="button" onClick={() => ref.current?.close()} className={boton("secundario", "lg")}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}

function BotonesRespuesta({
  id,
  trabajando,
  alResponder,
}: {
  id: string;
  trabajando: boolean;
  alResponder: (id: string, aceptar: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={trabajando}
        onClick={() => alResponder(id, true)}
        className="boton min-h-11 flex-1 rounded-full bg-tinta px-4 text-sm font-semibold text-marfil disabled:opacity-60"
      >
        Aceptar
      </button>
      <button
        type="button"
        disabled={trabajando}
        onClick={() => alResponder(id, false)}
        className="boton min-h-11 flex-1 rounded-full border border-tinta/30 px-4 text-sm font-semibold text-tinta disabled:opacity-60"
      >
        Pasar
      </button>
    </div>
  );
}

/** Match: el interés es mutuo. El contacto ya es público en el perfil; acá queda a mano. */
function ContactoMatch({ c }: { c: Conexion }) {
  const canales = canalesDe({ whatsapp: c.whatsapp, email: c.email } as Perfil, `Hola ${c.nombre}, hicimos match en Pecera.`);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-t-verde">{MENSAJE_MATCH}</p>
      <div className="flex flex-wrap gap-2">
        {canales.length > 0 ? (
          canales.map((k) => (
            <a
              key={k.clave}
              href={k.href}
              target={k.externo ? "_blank" : undefined}
              rel={k.externo ? "noopener noreferrer" : undefined}
              onClick={() => registrarContacto({ perfilId: c.perfil_id, canal: k.clave })}
              className="boton inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-sm font-semibold text-marfil"
            >
              {k.label}
            </a>
          ))
        ) : (
          <Link href={`/p/${c.slug}`} className="text-sm font-medium underline underline-offset-4">
            Ver su perfil para contactarla/o
          </Link>
        )}
      </div>
    </div>
  );
}

function TarjetaConexion({
  c,
  trabajando,
  alResponder,
}: {
  c: Conexion;
  trabajando: boolean;
  alResponder: (id: string, aceptar: boolean) => void;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-3xl border px-4 py-4 ${c.tipo === "match" ? "border-t-verde bg-t-verde-suave/40" : "border-arcilla bg-t-arcilla-suave/40"}`}>
      <Link href={`/p/${c.slug}`} className="flex items-center gap-3">
        <Avatar perfil={{ nombre: c.nombre, rol: c.rol as Perfil["rol"], avatar_url: c.avatar_url }} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{c.nombre}</span>
          <span className="block text-xs text-tinta/65">{c.tipo === "match" ? "Match" : "Te mostró interés"}</span>
        </span>
      </Link>
      {c.mensaje && <p className="text-sm leading-relaxed text-tinta/85">“{c.mensaje}”</p>}
      {c.tipo === "match" ? (
        <ContactoMatch c={c} />
      ) : (
        <BotonesRespuesta id={c.perfil_id} trabajando={trabajando} alResponder={alResponder} />
      )}
    </div>
  );
}
