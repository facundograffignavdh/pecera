"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { borrarEdicion, guardarEdicion, guardarNewsletter } from "@/app/cuenta/newsletter";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { crearBorrador } from "@/lib/borrador";
import type { Resultado } from "@/lib/errores-base";
import { type Edicion, LIMITES_NEWSLETTER, fechaEdicion } from "@/lib/newsletter";

const INICIAL: Resultado = { ok: false };

export type MiNewsletter = {
  titulo: string;
  descripcion: string | null;
  suscriptores: number;
  ediciones: number;
};

type BorradorEdicion = { titulo: string; cuerpo: string; guardado: string };
const borrador = crearBorrador<BorradorEdicion>("pecera:borrador-edicion");

/**
 * "Tu newsletter" en /cuenta. Sin newsletter: qué es y el formulario corto para
 * abrirla. Con newsletter: escribir una edición (con borrador automático en el
 * celular), las publicadas y los números. Las suscripciones son privadas: solo se
 * ve el total.
 */
export default function TarjetaNewsletter({
  newsletter,
  ediciones,
  slug,
  visible,
}: {
  newsletter: MiNewsletter | null;
  ediciones: Edicion[];
  slug: string;
  /** El perfil está publicado y no oculto: la newsletter se ve. */
  visible: boolean;
}) {
  return (
    <Tarjeta
      titulo="Tu newsletter"
      etiqueta={newsletter ? "Público" : "Nuevo"}
      bajada={
        newsletter
          ? "Contá novedades a quienes siguen tu proyecto. Cada edición queda en tu perfil y les aparece a tus suscriptores en Mi perfil."
          : "Una newsletter en tu perfil: publicás ediciones cortas y la gente de Pecera se suscribe para seguirte. Sin listas de emails ni configuraciones."
      }
    >
      {newsletter ? (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <Numero valor={newsletter.suscriptores} label={newsletter.suscriptores === 1 ? "suscriptor" : "suscriptores"} />
            <Numero valor={newsletter.ediciones} label={newsletter.ediciones === 1 ? "edición" : "ediciones"} />
          </dl>
          {visible ? (
            <Link href={`/p/${slug}/newsletter`} className="self-start text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
              Ver mi newsletter
            </Link>
          ) : (
            <p className="text-sm text-tinta/70">Se va a ver cuando tu perfil esté publicado y visible.</p>
          )}
          <NuevaEdicion />
          {ediciones.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Publicadas</h3>
              <ul className="flex flex-col gap-2">
                {ediciones.map((e) => (
                  <FilaEdicion key={e.id} edicion={e} />
                ))}
              </ul>
            </div>
          )}
          <details className="group rounded-2xl border border-tinta/15 bg-marfil">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
              Nombre y descripción
              <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-tinta/10 p-4">
              <FormNewsletter newsletter={newsletter} />
            </div>
          </details>
        </>
      ) : (
        <FormNewsletter newsletter={null} />
      )}
    </Tarjeta>
  );
}

function Numero({ valor, label }: { valor: number; label: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-marfil px-3.5 py-3">
      <dt className="order-2 text-xs text-tinta/70">{label}</dt>
      <dd className="order-1 font-display text-2xl font-semibold tabular-nums text-tinta">{valor}</dd>
    </div>
  );
}

function FormNewsletter({ newsletter }: { newsletter: MiNewsletter | null }) {
  const [estado, accion, pendiente] = useActionState(guardarNewsletter, INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="news-titulo" className="text-sm font-medium text-tinta">Nombre de la newsletter</label>
        <input
          id="news-titulo"
          name="titulo"
          required
          maxLength={LIMITES_NEWSLETTER.titulo}
          defaultValue={newsletter?.titulo ?? ""}
          placeholder="Ej.: Diario de una huerta urbana"
          autoComplete="off"
          className={INPUT}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="news-descripcion" className="text-sm font-medium text-tinta">¿De qué va? (opcional)</label>
        <textarea
          id="news-descripcion"
          name="descripcion"
          rows={2}
          maxLength={LIMITES_NEWSLETTER.descripcion}
          defaultValue={newsletter?.descripcion ?? ""}
          placeholder="Ej.: Cada quincena, cómo construimos Raíz Verde: números, errores y aprendizajes."
          className={INPUT}
        />
      </div>
      <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} self-start`}>
        {pendiente ? "Guardando…" : newsletter ? "Guardar" : "Abrir mi newsletter"}
      </button>
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
    </form>
  );
}

const HORA = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

/** Escribir una edición. Lo escrito se guarda en el celular mientras tanto. */
function NuevaEdicion() {
  const guardado = borrador.useGuardado();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null);
  const [estado, accion, pendiente] = useActionState(async (previo: Resultado, formData: FormData) => {
    const r = await guardarEdicion(previo, formData);
    if (r.ok) {
      borrador.borrar();
      setTitulo("");
      setCuerpo("");
      setUltimoGuardado(null);
      setAbierto(false);
    }
    return r;
  }, INICIAL);

  useEffect(() => {
    if (!abierto || (!titulo && !cuerpo)) return;
    const espera = setTimeout(() => {
      const ahora = new Date();
      borrador.guardar({ titulo, cuerpo, guardado: ahora.toISOString() });
      setUltimoGuardado(HORA.format(ahora));
    }, 600);
    return () => clearTimeout(espera);
  }, [abierto, titulo, cuerpo]);

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            if (guardado) {
              setTitulo(guardado.titulo ?? "");
              setCuerpo(guardado.cuerpo ?? "");
            }
            setAbierto(true);
          }}
          className={`${BOTON_PRIMARIO} self-start`}
        >
          {guardado ? "Seguir con el borrador" : "Escribir una edición"}
        </button>
        {guardado && (
          <p className="text-xs text-tinta/70">
            Tenés un borrador sin publicar en este celular.{" "}
            <button type="button" onClick={() => borrador.borrar()} className="font-medium underline underline-offset-4">
              Descartarlo
            </button>
          </p>
        )}
        {estado.ok && estado.mensaje && <Aviso ok>{estado.mensaje}</Aviso>}
      </div>
    );
  }

  const restan = LIMITES_NEWSLETTER.cuerpo - cuerpo.length;
  return (
    <form action={accion} className="flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-marfil p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ed-titulo" className="text-sm font-medium text-tinta">Título</label>
        <input
          id="ed-titulo"
          name="titulo"
          required
          maxLength={LIMITES_NEWSLETTER.tituloEdicion}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej.: Septiembre: primer cliente pago"
          autoComplete="off"
          className={INPUT}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ed-cuerpo" className="text-sm font-medium text-tinta">Contenido</label>
        <textarea
          id="ed-cuerpo"
          name="cuerpo"
          required
          rows={10}
          maxLength={LIMITES_NEWSLETTER.cuerpo}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          aria-describedby="ed-ayuda"
          className={INPUT}
        />
        <p id="ed-ayuda" className="flex justify-between gap-3 text-xs text-tinta/70">
          <span>Texto simple. Dejá una línea en blanco entre párrafos.</span>
          <span className="tabular-nums">{restan}</span>
        </p>
      </div>
      <p role="status" className="text-xs text-tinta/60">
        {ultimoGuardado ? `Borrador guardado en este celular a las ${ultimoGuardado}.` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pendiente || !titulo.trim() || !cuerpo.trim()} className={BOTON_PRIMARIO}>
          {pendiente ? "Publicando…" : "Publicar edición"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className={BOTON_SECUNDARIO}>
          Cerrar (queda el borrador)
        </button>
      </div>
      {estado.mensaje && !estado.ok && <Aviso ok={false}>{estado.mensaje}</Aviso>}
    </form>
  );
}

function FilaEdicion({ edicion }: { edicion: Edicion }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [estado, accion, guardando] = useActionState(async (previo: Resultado, formData: FormData) => {
    const r = await guardarEdicion(previo, formData);
    if (r.ok) setEditando(false);
    return r;
  }, INICIAL);

  if (editando) {
    return (
      <li className="rounded-2xl border border-tinta/15 bg-marfil p-3">
        <form action={accion} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={edicion.id} />
          <label htmlFor={`ed-t-${edicion.id}`} className="sr-only">Título</label>
          <input id={`ed-t-${edicion.id}`} name="titulo" defaultValue={edicion.titulo} maxLength={LIMITES_NEWSLETTER.tituloEdicion} className={INPUT} />
          <label htmlFor={`ed-c-${edicion.id}`} className="sr-only">Contenido</label>
          <textarea id={`ed-c-${edicion.id}`} name="cuerpo" defaultValue={edicion.cuerpo} rows={8} maxLength={LIMITES_NEWSLETTER.cuerpo} className={INPUT} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
              {guardando ? "Guardando…" : "Guardar corrección"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          </div>
          {estado.mensaje && !estado.ok && <Aviso ok={false}>{estado.mensaje}</Aviso>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-tinta/[0.04] px-3 py-2.5">
      <div>
        <p className="text-xs text-tinta/60">{fechaEdicion(edicion.publicada_at)}</p>
        <p className="text-sm font-semibold text-tinta">{edicion.titulo}</p>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setEditando(true)} className={`${BOTON_SECUNDARIO} min-h-10`}>
          Corregir
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm(`¿Borrar "${edicion.titulo}"? No se puede deshacer.`)) return;
            setResultado(null);
            iniciar(async () => setResultado(await borrarEdicion(edicion.id)));
          }}
          className={`${BOTON_SECUNDARIO} min-h-10`}
        >
          {pendiente ? "Borrando…" : "Borrar"}
        </button>
      </div>
      {(resultado?.mensaje || (estado.ok && estado.mensaje)) && (
        <Aviso ok={resultado?.ok ?? estado.ok}>{resultado?.mensaje ?? estado.mensaje}</Aviso>
      )}
    </li>
  );
}
