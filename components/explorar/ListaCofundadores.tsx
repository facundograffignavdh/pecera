"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { Etiqueta } from "@/components/Etiquetas";
import { type AccionesMatch, type EstadoMatch, useMatch } from "@/components/explorar/useMatch";
import { canalesDe } from "@/lib/contacto";
import { type Conexion, encaje, MENSAJE_MAX, NIVELES_ENCAJE } from "@/lib/cofundador";
import { APORTES, aporte, industria, labelDedicacion } from "@/lib/etiquetas";
import { ROLES } from "@/lib/rol";
import type { Perfil } from "@/types/pecera";

/**
 * Cofounder match, al estilo del de YC pero para el ecosistema de acá:
 *  1. Tu perfil de cofundador: qué aportás, qué buscás y cuánto tiempo le podés dedicar.
 *  2. La lista se ordena por ENCAJE (complemento antes que parecido) y cada tarjeta dice por qué.
 *  3. «Me interesa» manda un mensaje corto; la otra persona acepta o pasa.
 *  4. Si se aceptan (o se eligieron los dos) hay match, y recién ahí aparece el contacto.
 * Lo personal se pide en el navegador con la sesión: la página sigue siendo estática y pública.
 * Sin sesión, o sin la migración del flujo, queda como directorio con filtro.
 */
export default function ListaCofundadores({ perfiles }: { perfiles: Perfil[] }) {
  const match = useMatch();
  return <VistaCofundadores perfiles={perfiles} {...match} />;
}

/** La pantalla, sin saber de dónde salen los datos (así se puede probar con un estado inventado). */
export function VistaCofundadores({
  perfiles,
  estado,
  interesar,
  responder,
  retirar,
}: { perfiles: Perfil[]; estado: EstadoMatch } & AccionesMatch) {
  const [busco, setBusco] = useState<string | null>(null);
  const [aporto, setAporto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const listo = estado.fase === "listo" ? estado : null;
  const yo = listo?.yo ?? null;
  const conexiones = listo?.conexiones ?? [];
  const puedeInteresar = !!listo && listo.flujo && yo!.busca_cofundador && yo!.publicado && !yo!.oculto;

  const candidatos = useMemo(() => {
    const filtrados = perfiles.filter((p) => p.id !== yo?.id && (!busco || p.cofundador_aporta === busco));
    const conEncaje = filtrados.map((p) => ({ p, enc: yo ? encaje(yo, p) : null }));
    if (yo) conEncaje.sort((a, b) => (b.enc?.puntos ?? 0) - (a.enc?.puntos ?? 0));
    return conEncaje;
  }, [perfiles, yo, busco]);

  const porPerfil = new Map(conexiones.map((c) => [c.perfil_id, c]));
  const recibidos = conexiones.filter((c) => c.tipo === "recibido");
  const matches = conexiones.filter((c) => c.tipo === "match");

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
        ? "¡Hubo match! Los dos se eligieron: ya tenés su contacto."
        : r.resultado === "rechazado"
          ? "Por ahora no hay match con esta persona."
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
    setAviso(r.error ?? (aceptar ? "¡Hubo match! Ya podés escribirle." : "Listo, la dejamos pasar."));
  }

  async function sacar(id: string) {
    setTrabajando(id);
    await retirar(id);
    setTrabajando(null);
    setAviso("Retiraste tu interés.");
  }

  return (
    <div className="flex flex-col gap-8">
      <ComoFunciona />
      <Estado estado={estado} />

      {aviso && (
        <p role="status" aria-live="polite" className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm font-medium text-tinta">
          {aviso}
        </p>
      )}

      {(recibidos.length > 0 || matches.length > 0) && (
        <section aria-labelledby="conexiones" className="flex flex-col gap-3">
          <h2 id="conexiones" className="font-display text-2xl font-semibold text-tinta">
            Tus conexiones
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {[...recibidos, ...matches].map((c) => (
              <li key={`${c.tipo}-${c.perfil_id}`}>
                <TarjetaConexion c={c} trabajando={trabajando === c.perfil_id} alResponder={contestar} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="lista" className="flex flex-col gap-4">
        <h2 id="lista" className="font-display text-2xl font-semibold text-tinta">
          {yo ? "Quiénes encajan con vos" : "Quiénes buscan cofundador/a"}
        </h2>

        <div className="grid gap-4 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4 sm:grid-cols-2 sm:px-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-tinta">Busco a alguien…</legend>
            <div className="flex flex-wrap gap-2">
              {[null, ...APORTES.map((a) => a.valor)].map((v) => {
                const a = v ? aporte(v) : null;
                const elegido = busco === v;
                return (
                  <button
                    key={v ?? "todos"}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => setBusco(v)}
                    className={`boton min-h-10 rounded-full border px-3.5 text-sm font-medium ${
                      elegido ? (a ? `border-transparent ${a.clase}` : "border-tinta bg-tinta text-marfil") : "border-tinta/20 text-tinta"
                    }`}
                  >
                    {a ? a.label : "De cualquier perfil"}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {!yo && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-tinta">Yo aporto… (para ver a quién le encajás)</legend>
              <div className="flex flex-wrap gap-2">
                {APORTES.map((a) => {
                  const elegido = aporto === a.valor;
                  return (
                    <button
                      key={a.valor}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => setAporto(elegido ? null : a.valor)}
                      className={`boton min-h-10 rounded-full border px-3.5 text-sm font-medium ${
                        elegido ? `border-transparent ${aporte(a.valor)?.clase}` : "border-tinta/20 text-tinta"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <p className="text-sm text-tinta/70" aria-live="polite">
          {candidatos.length} {candidatos.length === 1 ? "persona" : "personas"}
          {yo && " · ordenadas por encaje"}
        </p>
        {yo && (
          <p className="-mt-2 text-xs text-tinta/65">
            El encaje es una guía para ordenar la lista (complemento, dedicación, zona, industrias y etapa). No dice cuán bien
            van a trabajar juntos: eso se ve hablando.
          </p>
        )}

        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {candidatos.map(({ p, enc }, i) => {
            const propio = aporte(p.cofundador_aporta);
            const teBusca = !yo && !!aporto && (p.cofundador_busca ?? []).includes(aporto);
            const c = porPerfil.get(p.id);
            return (
              <li key={p.id} className="aparecer" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
                <article
                  className={`flex h-full flex-col gap-3 rounded-3xl border px-4 py-4 ${
                    c?.tipo === "match"
                      ? "border-t-verde bg-t-verde-suave/40"
                      : teBusca
                        ? "border-arcilla bg-t-arcilla-suave/40"
                        : "border-tinta/10 bg-tinta/[0.02]"
                  }`}
                >
                  <Link href={`/p/${p.slug}`} className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla">
                    <Avatar perfil={p} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{p.nombre}</span>
                      <span className="block text-xs text-tinta/65">
                        {ROLES[p.rol].label}
                        {labelDedicacion(p.cofundador_dedicacion) ? ` · ${labelDedicacion(p.cofundador_dedicacion)}` : ""}
                        {p.ubicacion ? ` · ${p.ubicacion}` : ""}
                      </span>
                    </span>
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
                  {teBusca && <span className="self-start rounded-full bg-arcilla px-2 py-0.5 text-xs font-semibold text-marfil">Te busca</span>}

                  <span className="flex flex-wrap items-center gap-1.5 text-xs">
                    {propio && (
                      <>
                        <span className="text-tinta/65">Aporta</span>
                        <Etiqueta clase={propio.clase}>{propio.label}</Etiqueta>
                      </>
                    )}
                    {(p.cofundador_busca ?? []).length > 0 && <span className="ml-1 text-tinta/65">Busca</span>}
                    {(p.cofundador_busca ?? []).map((b) => {
                      const a = aporte(b);
                      return a ? (
                        <Etiqueta key={b} clase={a.clase}>
                          {a.label}
                        </Etiqueta>
                      ) : null;
                    })}
                  </span>

                  {p.cofundador_nota ? (
                    <span className="text-sm leading-relaxed text-tinta/85">“{p.cofundador_nota}”</span>
                  ) : (
                    <span className="line-clamp-2 text-sm leading-relaxed text-tinta/75">{p.descripcion}</span>
                  )}
                  {(p.industrias ?? []).length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {(p.industrias ?? []).slice(0, 3).map((ind) => (
                        <Etiqueta key={ind} clase={industria(ind).clase}>
                          {industria(ind).label}
                        </Etiqueta>
                      ))}
                    </span>
                  )}

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
                          onClick={() => sacar(p.id)}
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
                            placeholder="Contale por qué te interesa y qué querés construir."
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
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Los pasos, siempre a la vista: qué pasa y quién decide en cada uno. */
function ComoFunciona() {
  const pasos = [
    ["Completá tu perfil", "Qué aportás, qué buscás y cuánto tiempo le podés dedicar."],
    ["Mirá quién encaja", "La lista se ordena por complemento, y cada tarjeta dice por qué."],
    ["Mostrá interés", "Con un mensaje corto. No se ve tu contacto todavía."],
    ["Aceptan y hay match", "Si la otra persona acepta (o se eligieron los dos), se habilita el contacto."],
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {pasos.map(([titulo, texto], i) => (
        <li key={titulo} className="flex gap-3 rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tinta font-display text-sm font-semibold text-marfil">
            {i + 1}
          </span>
          <span>
            <span className="block font-semibold text-tinta">{titulo}</span>
            <span className="block text-sm leading-snug text-tinta/75">{texto}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Dónde estás parado: sin sesión, sin perfil, sin cofundador activado o listo. */
function Estado({ estado }: { estado: EstadoMatch }) {
  const caja = "flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4";
  const boton = "boton inline-flex min-h-11 items-center justify-center rounded-full bg-tinta px-5 text-sm font-semibold text-marfil";
  if (estado.fase === "cargando" || estado.fase === "sin_datos") return null;
  if (estado.fase === "sin_sesion") {
    return (
      <div className={`${caja} bg-tinta/5`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">Entrá para ver tu encaje y mostrar interés.</strong> Sin cuenta podés mirar a todos y
          filtrar.
        </p>
        <Link href="/cuenta" className={boton}>
          Entrar con Google
        </Link>
      </div>
    );
  }
  if (estado.fase === "sin_perfil") {
    return (
      <div className={`${caja} bg-tinta/5`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">Primero creá tu perfil.</strong> Después contás qué aportás y qué buscás.
        </p>
        <Link href="/cuenta" className={boton}>
          Crear mi perfil
        </Link>
      </div>
    );
  }
  const { yo, flujo } = estado;
  if (!yo.busca_cofundador) {
    return (
      <div className={`${caja} bg-t-arcilla-suave/60`}>
        <p className="max-w-xl text-sm leading-relaxed text-tinta">
          <strong className="font-semibold">Todavía no estás en el match.</strong> Activá «Busco cofundador/a» y contá qué aportás y
          qué buscás: así aparecés, ves tu encaje y podés mostrar interés.
        </p>
        <Link href="/cuenta?editar=1" className={boton}>
          Activar mi perfil de cofundador
        </Link>
      </div>
    );
  }
  const a = aporte(yo.cofundador_aporta);
  return (
    <div className={`${caja} bg-t-verde-suave/50`}>
      <p className="max-w-2xl text-sm leading-relaxed text-tinta">
        <strong className="font-semibold">Tu perfil de cofundador está activo.</strong>{" "}
        {a ? `Aportás ${a.label.toLowerCase()}` : "Todavía no elegiste qué aportás"}
        {(yo.cofundador_busca ?? []).length > 0 &&
          ` y buscás ${(yo.cofundador_busca ?? []).map((b) => aporte(b)?.label.toLowerCase()).filter(Boolean).join(", ")}`}
        .{!flujo && " (Mostrar interés se habilita en un rato: estamos actualizando Pecera.)"}
      </p>
      <Link href="/cuenta?editar=1" className="text-sm font-semibold text-tinta underline underline-offset-4">
        Cambiar
      </Link>
    </div>
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

/** Match: el contacto se habilita acá (WhatsApp y email), no antes. */
function ContactoMatch({ c }: { c: Conexion }) {
  const canales = canalesDe({ whatsapp: c.whatsapp, email: c.email } as Perfil, `Hola ${c.nombre}, hicimos match en Pecera.`);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-t-verde">¡Hubo match! Ya pueden hablar.</p>
      <div className="flex flex-wrap gap-2">
        {canales.length > 0 ? (
          canales.map((k) => (
            <a
              key={k.clave}
              href={k.href}
              target={k.externo ? "_blank" : undefined}
              rel={k.externo ? "noopener noreferrer" : undefined}
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
