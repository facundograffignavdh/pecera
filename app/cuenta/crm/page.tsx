import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import PestanasCuenta from "@/components/cuenta/PestanasCuenta";
import BorrarHistorial from "@/components/crm/BorrarHistorial";
import InterruptorVisitas from "@/components/crm/InterruptorVisitas";
import { faltaMigracion, getMetricasPerfil } from "@/lib/datos";
import { urlMedia } from "@/lib/media";
import { ROLES } from "@/lib/rol";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { boton } from "@/lib/ui";
import { type TipoVisita, diaBuenosAires } from "@/lib/visitas-dia";
import type { Metricas, Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi CRM — Pecera",
  robots: { index: false },
};

type Estado = {
  activa: boolean;
  desde: string | null;
  mostrar: boolean;
  aviso_visto_at: string | null;
  tiene_perfil: boolean;
};

type Resumen =
  | { visible: false }
  | { visible: true; personas: number; perfil: number; pitch: number; pique: number; sin_perfil: number; privado: number; dias: string[] };

type Fila = {
  slug: string;
  nombre: string;
  rol: Rol;
  avatar_url: string | null;
  empresa: string | null;
  empresa_slug: string | null;
  tipo: TipoVisita;
  dia: string;
  total: number;
};

type Hecha = { slug: string; nombre: string; tipo: TipoVisita; dia: string };

const TIPOS: Record<TipoVisita, { dueno: string; mio: string }> = {
  perfil: { dueno: "vio tu perfil", mio: "viste su perfil" },
  pitch: { dueno: "vio tu pitch", mio: "viste su pitch" },
  pique: { dueno: "te dio pique", mio: "le diste pique" },
};

const POR_PAGINA = 20;
const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "hoy", "ayer" o "lun 6/10". `dia` viene como YYYY-MM-DD (Buenos Aires). */
function nombreDia(dia: string, hoy: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const [ha, hm, hd] = hoy.split("-").map(Number);
  const diferencia = Math.round((Date.UTC(ha, hm - 1, hd) - fecha.getTime()) / 86_400_000);
  if (diferencia === 0) return "hoy";
  if (diferencia === 1) return "ayer";
  return `${DIAS_SEMANA[fecha.getUTCDay()]} ${d}/${m}`;
}

function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(iso)
  );
}

function hrefFiltro(tipo: string | null, dia: string | null, pagina = 1): string {
  const p = new URLSearchParams();
  if (tipo) p.set("tipo", tipo);
  if (dia) p.set("dia", dia);
  if (pagina > 1) p.set("pagina", String(pagina));
  const q = p.toString();
  return `/cuenta/crm${q ? `?${q}` : ""}`;
}

/**
 * Mi CRM: quién vio tu perfil y tus pitches (últimos 30 días), el interruptor "Mostrar mis
 * visitas" (recíproco) y lo que otros ven de vos. Privada y dinámica: todo sale de funciones de la
 * base con la sesión. Nada de datos de los visitantes más allá de su perfil público.
 */
export default async function CrmPage({ searchParams }: PageProps<"/cuenta/crm">) {
  const sp = await searchParams;
  const tipo = typeof sp.tipo === "string" && sp.tipo in TIPOS ? (sp.tipo as TipoVisita) : null;
  const dia = typeof sp.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : null;
  const pagina = Math.max(1, Math.min(100, Number(sp.pagina) || 1));

  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta");

  const [{ data: estadoData, error: errorEstado }, { data: perfil }] = await Promise.all([
    supabase.rpc("mi_estado_visitas"),
    supabase.from("perfiles").select("slug, publicado, oculto").eq("usuario_id", user.id).maybeSingle(),
  ]);
  if (errorEstado && !faltaMigracion(errorEstado)) console.error(`Supabase (mi_estado_visitas): ${errorEstado.code}`);
  const estado = (errorEstado ? null : estadoData) as Estado | null;
  const activa = !!estado?.activa;
  const avisoVisto = !!estado?.aviso_visto_at;
  const mostrar = estado?.mostrar ?? true;
  const visible = !!perfil && perfil.publicado && !perfil.oculto;

  const [resumen, filas, hechas, metricas] = await Promise.all([
    activa && perfil
      ? supabase.rpc("mis_visitas_resumen").then(({ data }) => (data as Resumen | null) ?? { visible: false as const })
      : ({ visible: false } as Resumen),
    activa && perfil && avisoVisto && mostrar
      ? supabase
          .rpc("mis_visitas", { p_tipo: tipo, p_dia: dia, p_pagina: pagina })
          .then(({ data }) => (data as Fila[] | null) ?? [])
      : [],
    activa ? supabase.rpc("mis_visitas_hechas").then(({ data }) => (data as Hecha[] | null) ?? []) : [],
    visible ? getMetricasPerfil(perfil.slug) : ({} as Metricas),
  ]);

  const anonimo = Object.values(metricas).reduce(
    (t, m) => ({ vistas: t.vistas + m.vistas, piques: t.piques + m.piques }),
    { vistas: 0, piques: 0 }
  );
  const total = Number(filas[0]?.total ?? 0);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hoy = diaBuenosAires();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl">
        <PestanasCuenta actual="crm" />

        <header className="mt-6">
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Mi CRM</h1>
          <p className="mt-1 leading-relaxed text-tinta/75">Quién vio tu perfil y tus pitches en los últimos 30 días.</p>
        </header>

        {!activa ? (
          <p className="mt-6 rounded-2xl bg-tinta/[0.05] px-4 py-3 text-sm leading-relaxed text-tinta">
            Todavía no está activo. Cuando lo prendamos, acá vas a ver quién visitó tu perfil (con su permiso) y vas a poder
            elegir si mostrás tus visitas.
          </p>
        ) : (
          <div className="mt-6">
            <InterruptorVisitas mostrar={mostrar} avisoVisto={avisoVisto} />
          </div>
        )}

        {!perfil && (
          <section className="mt-6 rounded-2xl border border-tinta/15 p-4">
            <h2 className="font-semibold text-tinta">Armá tu perfil para recibir visitas</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta/75">
              Te lleva un minuto. Mientras tanto, cuando visitás un perfil figurás como “sin perfil”.
            </p>
            <Link href="/cuenta" className={`${boton("primario", "md")} mt-3`}>
              Crear mi perfil
            </Link>
          </section>
        )}

        {perfil && (
          <section aria-labelledby="resumen-titulo" className="mt-8">
            <h2 id="resumen-titulo" className="font-display text-xl font-semibold text-tinta">
              Resumen
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-tinta/15 p-4">
                <h3 className="text-sm font-semibold text-tinta">Personas identificadas · 30 días</h3>
                {resumen.visible ? (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-tinta">
                    <dt className="text-tinta/75">Personas</dt>
                    <dd className="text-right font-semibold">{resumen.personas}</dd>
                    <dt className="text-tinta/75">Vieron tu perfil</dt>
                    <dd className="text-right font-semibold">{resumen.perfil}</dd>
                    <dt className="text-tinta/75">Vieron tu pitch</dt>
                    <dd className="text-right font-semibold">{resumen.pitch}</dd>
                    <dt className="text-tinta/75">Te dieron pique</dt>
                    <dd className="text-right font-semibold">{resumen.pique}</dd>
                    <dt className="text-tinta/75">En modo privado</dt>
                    <dd className="text-right font-semibold">{resumen.privado}</dd>
                    <dt className="text-tinta/75">Sin perfil</dt>
                    <dd className="text-right font-semibold">{resumen.sin_perfil}</dd>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-tinta/75">
                    {!activa
                      ? "Todavía no está activo."
                      : !avisoVisto
                        ? "Elegí arriba si mostrás tus visitas para ver las tuyas."
                        : "Estás en modo privado: no ves quién te visitó. Encendé “Mostrar mis visitas” para verlo."}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-tinta/15 p-4">
                <h3 className="text-sm font-semibold text-tinta">Total anónimo · desde que publicaste</h3>
                {visible ? (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-tinta">
                    <dt className="text-tinta/75">Vistas de tus pitches</dt>
                    <dd className="text-right font-semibold">{anonimo.vistas}</dd>
                    <dt className="text-tinta/75">Piques</dt>
                    <dd className="text-right font-semibold">{anonimo.piques}</dd>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-tinta/75">Tu perfil no está visible todavía.</p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-tinta/70">
                  Incluye a quien mira sin cuenta: por eso no hay nombres.
                </p>
              </div>
            </div>
          </section>
        )}

        {perfil && resumen.visible && (
          <section aria-labelledby="lista-titulo" className="mt-8">
            <h2 id="lista-titulo" className="font-display text-xl font-semibold text-tinta">
              Quién te visitó
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {([null, "perfil", "pitch", "pique"] as const).map((t) => (
                <Link
                  key={t ?? "todos"}
                  href={hrefFiltro(t, dia)}
                  aria-current={tipo === t ? "page" : undefined}
                  className={`min-h-10 rounded-full px-3.5 py-2 text-sm font-semibold ${
                    tipo === t ? "bg-tinta text-marfil" : "border border-tinta/25 text-tinta"
                  }`}
                >
                  {t ? TIPOS[t].dueno.replace(/^./, (c) => c.toUpperCase()) : "Todas"}
                </Link>
              ))}
            </div>
            {resumen.dias.length > 0 && (
              <form method="get" action="/cuenta/crm" className="mt-3 flex items-center gap-2">
                {tipo && <input type="hidden" name="tipo" value={tipo} />}
                <label htmlFor="filtro-dia" className="text-sm text-tinta">
                  Día
                </label>
                <select
                  id="filtro-dia"
                  name="dia"
                  defaultValue={dia ?? ""}
                  className="min-h-10 rounded-full border border-tinta/25 bg-transparent px-3 text-sm text-tinta"
                >
                  <option value="">Todos</option>
                  {resumen.dias.map((d) => (
                    <option key={d} value={d}>
                      {nombreDia(d, hoy)}
                    </option>
                  ))}
                </select>
                <button type="submit" className={boton("secundario", "sm")}>
                  Filtrar
                </button>
              </form>
            )}

            {filas.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-tinta/75">
                {tipo || dia
                  ? "No hay visitas con ese filtro."
                  : `Todavía no hay visitas con nombre. Contamos desde el ${estado?.desde ? fechaLarga(estado.desde) : "lanzamiento"}; nada de antes.`}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-tinta/10">
                {filas.map((f, i) => (
                  <li key={`${f.slug}-${f.tipo}-${f.dia}-${i}`} className="flex items-center gap-3 py-3">
                    <Avatar perfil={{ nombre: f.nombre, rol: f.rol, avatar_url: f.avatar_url && urlMedia(f.avatar_url) }} size={44} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/p/${f.slug}`} className="block truncate font-semibold text-tinta underline-offset-2 hover:underline">
                        {f.nombre}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-sm text-tinta/75">
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden className={`size-2 rounded-full ${ROLES[f.rol].bg}`} />
                          {ROLES[f.rol].label}
                        </span>
                        {f.empresa && f.empresa_slug && (
                          <Link href={`/e/${f.empresa_slug}`} className="truncate underline-offset-2 hover:underline">
                            {f.empresa}
                          </Link>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-medium text-tinta">{TIPOS[f.tipo].dueno}</p>
                      <p className="text-tinta/70">{nombreDia(f.dia, hoy)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {paginas > 1 && (
              <nav aria-label="Páginas" className="mt-4 flex items-center justify-between text-sm">
                {pagina > 1 ? (
                  <Link href={hrefFiltro(tipo, dia, pagina - 1)} className={boton("secundario", "sm")}>
                    Anteriores
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-tinta/75">
                  Página {pagina} de {paginas}
                </span>
                {pagina < paginas ? (
                  <Link href={hrefFiltro(tipo, dia, pagina + 1)} className={boton("secundario", "sm")}>
                    Siguientes
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        )}

        {activa && (
          <section aria-labelledby="mias-titulo" className="mt-8">
            <h2 id="mias-titulo" className="font-display text-xl font-semibold text-tinta">
              Lo que otros ven de mí
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta/75">
              Tus visitas de los últimos 30 días que sus dueños ven con tu nombre.
            </p>
            {hechas.length === 0 ? (
              <p className="mt-3 text-sm text-tinta/75">
                {mostrar ? "Nada por ahora." : "Nada: en modo privado no se guarda tu nombre."}
              </p>
            ) : (
              <>
                <ul className="mt-3 flex flex-col divide-y divide-tinta/10 text-sm">
                  {hechas.map((h, i) => (
                    <li key={`${h.slug}-${h.tipo}-${h.dia}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-tinta">
                        {TIPOS[h.tipo].mio.replace(/^./, (c) => c.toUpperCase())} de{" "}
                        <Link href={`/p/${h.slug}`} className="font-semibold underline-offset-2 hover:underline">
                          {h.nombre}
                        </Link>
                      </span>
                      <span className="shrink-0 text-tinta/70">{nombreDia(h.dia, hoy)}</span>
                    </li>
                  ))}
                </ul>
                <BorrarHistorial />
              </>
            )}
          </section>
        )}

        <p className="mt-10 text-sm text-tinta/75">
          Cómo funciona y qué guardamos:{" "}
          <Link href="/privacidad#visitas" className="underline underline-offset-2">
            privacidad
          </Link>
          .
        </p>
        <PieLegal tono="claro" className="mt-6" />
      </div>
    </main>
  );
}
