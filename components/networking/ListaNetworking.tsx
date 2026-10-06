"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { Etiqueta } from "@/components/Etiquetas";
import { SelloFeria21, TrazoAmarillo } from "@/components/eventos/MarcaFeria21";
import { AccionesTarjeta, AvisoFlujo, DialogoRetiro, SeccionConexiones, useFlujoConexion } from "@/components/explorar/conexiones";
import { type EstadoNetworking, useNetworking } from "@/components/explorar/useMatch";
import SelectorBuscaOfrece from "@/components/networking/SelectorBuscaOfrece";
import FormSeccion from "@/components/perfil/editores/FormSeccion";
import { NIVELES_ENCAJE } from "@/lib/cofundador";
import { CATEGORIAS_NECESIDAD, categoriaDe, necesidad } from "@/lib/etiquetas";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { encajeNetworking, haceNetworking, nombreCorto } from "@/lib/networking";
import { ROLES } from "@/lib/rol";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import { boton } from "@/lib/ui";
import type { Perfil } from "@/types/pecera";

export type Alcance = "feria" | "plataforma";

/** ¿La persona con sesión participa de la feria? null = todavía no se sabe (o sin sesión). */
function useParticipaFeria(): boolean | null {
  const [participa, setParticipa] = useState<boolean | null>(null);
  useEffect(() => {
    let vigente = true;
    (async () => {
      const supabase = supabaseNavegador();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.rpc("mi_evento", { p_evento: EVENTO_ACTUAL.slug });
      const fila = Array.isArray(data) ? (data[0] as { participa?: boolean } | undefined) : undefined;
      if (vigente && !error) setParticipa(!!fila?.participa);
    })().catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);
  return participa;
}

/** Máximo de chips por lado en cada tarjeta (el resto, "+N"). */
const CHIPS_TARJETA = 4;

function Chips({ titulo, lista }: { titulo: string; lista: string[] }) {
  if (!lista.length) return null;
  const visibles = lista.slice(0, CHIPS_TARJETA);
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-tinta/65">{titulo}</span>
      {visibles.map((v) => (
        <Etiqueta key={v} clase={necesidad(v).clase}>
          {necesidad(v).label}
        </Etiqueta>
      ))}
      {lista.length > visibles.length && <span className="text-tinta/70">+{lista.length - visibles.length}</span>}
    </span>
  );
}

/**
 * Networking de la Feria 21 (y de toda la plataforma): todos los roles, por lo que cada uno
 * busca y ofrece. La lista se ordena por encajeNetworking y cada tarjeta dice por qué; el
 * flujo de interés → match es el mismo del cofounder match, con su propia tabla. "Qué buscás
 * y qué ofrecés" se edita acá mismo, en una hoja, sin salir de la página.
 */
export default function ListaNetworking({
  perfiles,
  idsFeria,
  alcanceUrl,
  editarAlEntrar,
  onCambiarAlcance,
}: {
  perfiles: Perfil[];
  idsFeria: string[];
  /** ?alcance= de la URL (null = el de por defecto). */
  alcanceUrl: Alcance | null;
  /** ?editar=1: abre la hoja apenas se sabe quién es la persona. */
  editarAlEntrar: boolean;
  onCambiarAlcance: (a: Alcance) => void;
}) {
  const participa = useParticipaFeria();
  // Por defecto: Feria 21 para quien participa; el resto, toda la plataforma.
  const alcance: Alcance = alcanceUrl ?? (participa ? "feria" : "plataforma");
  const feria = alcance === "feria";
  const { estado, recargar, ...acciones } = useNetworking(feria ? EVENTO_ACTUAL.slug : null);
  const flujo = useFlujoConexion(acciones);
  const [editando, setEditando] = useState(false);
  const [vez, setVez] = useState(0);
  const [abrioSola, setAbrioSola] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);

  const listo = estado.fase === "listo" ? estado : null;
  const yo = listo?.yo ?? null;
  const conexiones = useMemo(() => listo?.conexiones ?? [], [listo]);
  const puedeInteresar = !!listo && listo.flujo && !!yo && yo.publicado && !yo.oculto && haceNetworking(yo);

  // ?editar=1 (el aviso de la feria): abre la hoja una sola vez, cuando ya hay perfil.
  if (editarAlEntrar && !abrioSola && listo) {
    setAbrioSola(true);
    setEditando(true);
  }

  const enFeria = useMemo(() => new Set(idsFeria), [idsFeria]);
  const candidatos = useMemo(() => {
    const filtrados = perfiles.filter(
      (p) =>
        p.id !== yo?.id &&
        (!feria || enFeria.has(p.id)) &&
        (!categoria || (p.ofrece ?? []).some((v) => categoriaDe(v) === categoria))
    );
    const conEncaje = filtrados.map((p) => ({ p, enc: yo && haceNetworking(yo) ? encajeNetworking(yo, p, nombreCorto(p)) : null }));
    if (yo && haceNetworking(yo)) conEncaje.sort((a, b) => (b.enc?.puntos ?? 0) - (a.enc?.puntos ?? 0));
    return conEncaje;
  }, [perfiles, yo, feria, enFeria, categoria]);

  const porPerfil = new Map(conexiones.map((c) => [c.perfil_id, c]));

  function abrirEditor() {
    setVez((v) => v + 1);
    setEditando(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        className={`flex flex-col gap-3 rounded-3xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          feria ? "border border-s21-verde/40 bg-s21-verde/10" : "border border-tinta/10 bg-tinta/[0.03]"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          {feria ? (
            <span className="flex flex-col items-start gap-1">
              <SelloFeria21 chico />
              <TrazoAmarillo className="h-2.5 w-24" />
            </span>
          ) : (
            <span className="text-sm font-semibold text-tinta">Toda la plataforma</span>
          )}
          <p className="text-sm text-tinta/80">
            {feria
              ? "Solo quienes participan de la Feria 21: para encontrarse en la carpa."
              : "Todas las personas de Pecera que cuentan qué buscan y qué ofrecen."}
          </p>
        </div>
        <div role="radiogroup" aria-label="Dónde buscar" className="grid shrink-0 grid-cols-2 gap-1 rounded-full bg-tinta/[0.06] p-1">
          {(
            [
              ["feria", "Feria 21"],
              ["plataforma", "Toda la plataforma"],
            ] as const
          ).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={alcance === valor}
              onClick={() => onCambiarAlcance(valor)}
              className={`boton min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
                alcance === valor ? (valor === "feria" ? "bg-s21-verde-oscuro text-white" : "bg-tinta text-marfil") : "text-tinta"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <MiNetworking estado={estado} feria={feria} onEditar={abrirEditor} />

      <AvisoFlujo aviso={flujo.aviso} />
      <SeccionConexiones conexiones={conexiones} flujo={flujo} />

      <section aria-labelledby="lista-networking" className="flex flex-col gap-4">
        <h2 id="lista-networking" className="font-display text-2xl font-semibold text-tinta">
          {yo && haceNetworking(yo) ? "Quiénes te complementan" : feria ? "Quiénes hacen networking en la feria" : "Quiénes hacen networking"}
        </h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">Que ofrezca algo de…</legend>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[null, ...CATEGORIAS_NECESIDAD.map((c) => c.valor)].map((v) => {
              const elegido = categoria === v;
              const label = v ? CATEGORIAS_NECESIDAD.find((c) => c.valor === v)?.label : "Todo";
              return (
                <button
                  key={v ?? "todo"}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => setCategoria(v)}
                  className={`boton min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium ${
                    elegido ? "border-tinta bg-tinta text-marfil" : "border-tinta/20 text-tinta"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="text-sm text-tinta/70" aria-live="polite">
          {candidatos.length} {candidatos.length === 1 ? "persona" : "personas"}
          {yo && haceNetworking(yo) && " · ordenadas por encaje"}
        </p>
        {yo && haceNetworking(yo) && (
          <p className="-mt-2 text-xs text-tinta/65">
            El encaje es una guía para ordenar: lo que buscás y el otro ofrece (y al revés), el cómo, la zona, las industrias y
            la etapa. Lo demás se ve hablando.
          </p>
        )}

        {candidatos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-tinta/20 px-6 py-10 text-center">
            <p className="font-display text-xl font-semibold text-tinta">
              {feria ? "Todavía nadie de la feria por acá" : "Todavía no hay nadie con este filtro"}
            </p>
            <p className="max-w-sm text-sm text-tinta/70">
              {feria
                ? "Probá con «Toda la plataforma», o contá vos qué buscás y qué ofrecés para aparecer primero."
                : "Probá con otra categoría."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {candidatos.map(({ p, enc }, i) => {
              const c = porPerfil.get(p.id);
              return (
                <li key={p.id} className="aparecer" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
                  <article
                    className={`flex h-full flex-col gap-3 rounded-3xl border px-4 py-4 ${
                      c?.tipo === "match" ? "border-t-verde bg-t-verde-suave/40" : "border-tinta/10 bg-tinta/[0.02]"
                    }`}
                  >
                    <Link
                      href={`/p/${p.slug}`}
                      className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                    >
                      <Avatar perfil={p} size={52} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{p.nombre}</span>
                        <span className="block text-xs text-tinta/65">
                          {ROLES[p.rol].label}
                          {p.ubicacion ? ` · ${p.ubicacion}` : ""}
                        </span>
                      </span>
                      {!feria && enFeria.has(p.id) && (
                        <span className="shrink-0 rounded-full bg-s21-verde-oscuro px-2 py-0.5 text-[0.7rem] font-bold uppercase text-white">
                          Feria 21
                        </span>
                      )}
                    </Link>

                    {enc && (
                      <div className="flex flex-col gap-1.5">
                        <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${NIVELES_ENCAJE[enc.nivel].clase}`}>
                          {NIVELES_ENCAJE[enc.nivel].label}
                        </span>
                        {enc.razones.length > 0 && (
                          <ul className="flex flex-col gap-0.5 text-xs text-tinta/80">
                            {enc.razones.map((r) => (
                              <li key={r} className="flex gap-1.5">
                                <span aria-hidden className="text-t-verde">
                                  ✓
                                </span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <Chips titulo="Busca" lista={p.busca ?? []} />
                    <Chips titulo="Ofrece" lista={p.ofrece ?? []} />
                    <span className="line-clamp-2 text-sm leading-relaxed text-tinta/75">{p.descripcion}</span>

                    <AccionesTarjeta
                      perfilId={p.id}
                      conexion={c}
                      puedeInteresar={puedeInteresar}
                      flujo={flujo}
                      placeholder="Contale qué te interesa: qué buscás, qué ofrecés o dónde encontrarse en la feria."
                    />
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DialogoRetiro flujo={flujo} />

      {yo && (
        <FormSeccion
          key={vez}
          seccion="buscaOfrece"
          titulo="Qué buscás y qué ofrecés"
          bajada="Hasta 10 de cada lado. Se guarda en tu perfil."
          abierta={editando}
          onCerrar={() => {
            setEditando(false);
            void recargar();
          }}
        >
          {(p) => <SelectorBuscaOfrece inicial={yo} errores={p.errores} marcar={p.marcar} />}
        </FormSeccion>
      )}
    </div>
  );
}

/** Dónde estás parado: sin sesión, sin perfil, sin busca/ofrece o listo (con "Editar"). */
function MiNetworking({ estado, feria, onEditar }: { estado: EstadoNetworking; feria: boolean; onEditar: () => void }) {
  const caja = "flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4";
  if (estado.fase === "cargando" || estado.fase === "sin_datos") return null;
  if (estado.fase === "sin_sesion") {
    return (
      <div className={`${caja} bg-tinta/5`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">Entrá para conectar.</strong> Sin cuenta podés mirar a todos y filtrar.
        </p>
        <Link href="/cuenta" className={boton("oscuro", "md")}>
          Entrar con Google
        </Link>
      </div>
    );
  }
  if (estado.fase === "sin_perfil") {
    return (
      <div className={`${caja} bg-tinta/5`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">Primero creá tu perfil.</strong> Después contás qué buscás y qué ofrecés.
        </p>
        <Link href="/cuenta" className={boton("oscuro", "md")}>
          Crear mi perfil
        </Link>
      </div>
    );
  }
  const { yo, flujo } = estado;
  if (!haceNetworking(yo)) {
    return (
      <div className={`${caja} ${feria ? "bg-s21-amarillo/20" : "bg-t-arcilla-suave/60"}`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">
            {feria ? "Para hacer networking en la Feria 21, contanos qué buscás y qué ofrecés." : "Contá qué buscás y qué ofrecés."}
          </strong>{" "}
          Así aparecés acá, ves con quién encajás y podés mostrar interés.
        </p>
        <button type="button" onClick={onEditar} className={boton("primario", "md")}>
          Completar
        </button>
      </div>
    );
  }
  return (
    <div className={`${caja} bg-t-verde-suave/50`}>
      <div className="flex max-w-2xl flex-col gap-2">
        <p className="text-sm font-semibold text-tinta">Tu networking</p>
        <ResumenLado titulo="Buscás" lista={yo.busca ?? []} />
        <ResumenLado titulo="Ofrecés" lista={yo.ofrece ?? []} />
        {(!yo.publicado || yo.oculto) && (
          <p className="text-sm text-tinta">Tu perfil no está visible: nadie te ve en la lista y no podés mostrar interés.</p>
        )}
        {!flujo && <p className="text-sm text-tinta">Mostrar interés se habilita en un rato: estamos actualizando Pecera.</p>}
      </div>
      <button type="button" onClick={onEditar} className={boton("secundario", "md")}>
        Editar
      </button>
    </div>
  );
}

function ResumenLado({ titulo, lista }: { titulo: string; lista: string[] }) {
  return (
    <p className="text-sm text-tinta">
      <span className="font-medium">{titulo}:</span>{" "}
      {lista.length ? lista.map((v) => necesidad(v).label.toLowerCase()).join(", ") : <span className="text-tinta/70">nada todavía</span>}
    </p>
  );
}
