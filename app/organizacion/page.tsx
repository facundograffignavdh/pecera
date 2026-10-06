import type { Metadata } from "next";
import Link from "next/link";
import AvisoEntrar from "@/components/AvisoEntrar";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import Encabezado from "@/components/Encabezado";
import { Etiqueta } from "@/components/Etiquetas";
import { SelloFeria21, TituloFeria } from "@/components/eventos/MarcaFeria21";
import { entrar } from "@/app/cuenta/acciones";
import { faltaMigracion } from "@/lib/datos";
import { CATEGORIAS_NECESIDAD, COMOS, labelComo, necesidad } from "@/lib/etiquetas";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { type Consentido, type PanelOrganizacion, brechas, porCategoria, ranking } from "@/lib/organizacion";
import { ROLES } from "@/lib/rol";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { boton } from "@/lib/ui";
import type { Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Organización de la Feria 21 — Pecera",
  robots: { index: false, follow: false },
};

type Supabase = Awaited<ReturnType<typeof supabaseConSesion>>;

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const SUBTITULO = "font-display text-xl font-semibold text-tinta";

const dia = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "numeric" });
const fecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const rol = (r: string) => ROLES[r as Rol]?.label ?? r;
const pct = (n: number, de: number) => (de > 0 ? `${Math.round((n / de) * 100)} %` : "—");

/**
 * Panel de la organización de la Feria 21, para las autoridades de la Universidad Siglo 21.
 * Entran las cuentas de Google habilitadas por el equipo (/admin → Universidad) y los admins de
 * Pecera, para revisar. Lo decide la base (`puede_ver_organizacion`). Números de networking de la
 * feria y, con nombre, solo quienes aceptaron compartir su perfil con la organización.
 */
export default async function OrganizacionPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-3xl lg:max-w-5xl">
        <header className="flex flex-col items-start gap-2">
          <SelloFeria21 chico />
          <h1 className="font-display text-3xl font-semibold leading-tight text-tinta sm:text-4xl">Panel de la organización</h1>
          <p className="text-sm text-tinta/80">Networking de la {EVENTO_ACTUAL.nombre} · Universidad Siglo 21</p>
        </header>
        {!user ? <SinSesion /> : <ConSesion supabase={supabase} email={user.email ?? ""} />}
      </div>
    </main>
  );
}

function SinSesion() {
  return (
    <form action={entrar} className="mt-6 flex flex-col gap-3">
      <AvisoNavegadorInterno />
      <input type="hidden" name="next" value="/organizacion" />
      <p className="text-tinta/80">Entrá con la cuenta de Google que habilitó el equipo de Pecera.</p>
      <button type="submit" className={boton("primario", "lg")}>
        Entrar con Google
      </button>
      <AvisoEntrar />
    </form>
  );
}

async function ConSesion({ supabase, email }: { supabase: Supabase; email: string }) {
  const { data: puede, error } = await supabase.rpc("puede_ver_organizacion", { p_evento: EVENTO_ACTUAL.slug });
  if (faltaMigracion(error)) {
    return <p className={`mt-6 ${CAJA} text-sm text-tinta`}>Este panel todavía se está activando. Probá de nuevo en un rato.</p>;
  }
  if (error) throw new Error(`Supabase (puede_ver_organizacion): ${error.message}`);
  if (!puede) {
    return (
      <div className={`mt-6 ${CAJA} flex flex-col gap-2 text-sm text-tinta`}>
        <p>
          <strong className="font-semibold break-all">{email}</strong> no está habilitada para este panel.
        </p>
        <p>Si sos parte de la organización de la feria, pedile al equipo de Pecera que sume este email.</p>
      </div>
    );
  }

  const { data, error: errorPanel } = await supabase.rpc("organizacion_networking", { p_evento: EVENTO_ACTUAL.slug });
  if (errorPanel) throw new Error(`Supabase (organizacion_networking): ${errorPanel.message}`);
  return <Panel p={data as PanelOrganizacion} email={email} />;
}

function Panel({ p, email }: { p: PanelOrganizacion; email: string }) {
  const masBuscado = ranking(p.busca);
  const masOfrecido = ranking(p.ofrece);
  const tope = Math.max(1, ...masBuscado.map((x) => x.n), ...masOfrecido.map((x) => x.n));
  const faltan = brechas(p.busca, p.ofrece);
  const catBusca = porCategoria(p.busca);
  const catOfrece = porCategoria(p.ofrece);
  const respondidos = p.aceptados + p.rechazados;

  return (
    <div className="mt-6 flex flex-col gap-10">
      <p className="break-all text-sm text-tinta/70">{email}</p>

      {p.es_admin && (
        <p className={`${CAJA} text-sm text-tinta`}>
          Sos del equipo de Pecera: ves lo mismo que la Universidad, más una sección del equipo al final.
        </p>
      )}

      <p className="text-sm leading-relaxed text-tinta">
        Los números cuentan a quienes participan de la feria (sin el equipo de Pecera ni perfiles de prueba). Con nombre
        aparecen <strong className="font-semibold">solo quienes aceptaron compartir</strong> su perfil y lo que buscan y
        ofrecen con la organización; si alguien lo retira, deja de aparecer. Nunca se ven mensajes ni quién le mostró
        interés a quién. Usá estos datos solo para facilitar conexiones durante el evento.
      </p>

      <section aria-labelledby="cifras" className="flex flex-col gap-3">
        <TituloFeria id="cifras">En números</TituloFeria>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Cifra titulo="Personas en la feria" valor={p.personas} />
          <Cifra titulo="Completaron qué buscan y qué ofrecen" valor={p.completos} pie={pct(p.completos, p.personas)} />
          <Cifra titulo="Mostraron interés en alguien" valor={p.con_interes} pie={pct(p.con_interes, p.personas)} />
          <Cifra titulo="Intereses enviados" valor={p.intereses} />
          <Cifra titulo="Matches" valor={p.matches} pie="interés de los dos lados" />
          <Cifra titulo="Aceptados de los respondidos" valor={respondidos ? pct(p.aceptados, respondidos) : "—"} pie={`${p.pendientes} sin responder`} />
        </dl>
      </section>

      {p.por_dia.length > 0 && (
        <section aria-labelledby="por-dia" className="flex flex-col gap-3">
          <h2 id="por-dia" className={SUBTITULO}>
            Por día
          </h2>
          <ul className="flex flex-col gap-1.5">
            {p.por_dia.map((d) => (
              <li key={d.dia} className={`${CAJA} flex items-center justify-between gap-3 text-sm`}>
                <span className="capitalize text-tinta">{dia.format(new Date(`${d.dia}T12:00:00Z`))}</span>
                <span className="tabular-nums text-tinta">
                  {d.intereses} intereses · {d.aceptados} aceptados
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.por_roles.length > 0 && (
        <section aria-labelledby="roles" className="flex flex-col gap-3">
          <h2 id="roles" className={SUBTITULO}>
            Entre roles
          </h2>
          <ul className="flex flex-col gap-1.5">
            {p.por_roles.map((r) => (
              <li key={`${r.de}-${r.a}`} className={`${CAJA} flex items-center justify-between gap-3 text-sm`}>
                <span className="text-tinta">
                  {rol(r.de)} → {rol(r.a)}
                </span>
                <span className="tabular-nums text-tinta">
                  {r.intereses} · {r.aceptados} aceptados
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="oferta" className="flex flex-col gap-4">
        <h2 id="oferta" className={SUBTITULO}>
          Qué se busca y qué se ofrece
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Ranking titulo="Lo más buscado" lista={masBuscado} tope={tope} />
          <Ranking titulo="Lo más ofrecido" lista={masOfrecido} tope={tope} />
        </div>

        {faltan.length > 0 && (
          <div className={`${CAJA} flex flex-col gap-2`}>
            <h3 className="font-medium text-tinta">Se busca mucho y se ofrece poco</h3>
            <p className="text-sm text-tinta/75">Pistas de a quién sumar a la feria para que haya con quién conectar.</p>
            <ul className="flex flex-col gap-1 text-sm text-tinta">
              {faltan.map((b) => (
                <li key={b.valor} className="flex justify-between gap-3">
                  <span>{necesidad(b.valor).label}</span>
                  <span className="tabular-nums">
                    buscan {b.buscan} · ofrecen {b.ofrecen}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`${CAJA} overflow-x-auto`}>
          <table className="w-full text-sm text-tinta">
            <caption className="pb-2 text-left font-medium">Por categoría</caption>
            <thead>
              <tr className="text-left text-xs text-tinta/70">
                <th className="py-1 font-normal">Categoría</th>
                <th className="py-1 text-right font-normal">Buscan</th>
                <th className="py-1 text-right font-normal">Ofrecen</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS_NECESIDAD.map((c) => (
                <tr key={c.valor} className="border-t border-tinta/10">
                  <td className="py-1.5">{c.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{catBusca[c.valor] ?? 0}</td>
                  <td className="py-1.5 text-right tabular-nums">{catOfrece[c.valor] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${CAJA} flex flex-col gap-1 text-sm text-tinta`}>
          <p className="font-medium">Cómo</p>
          {COMOS.map((c) => (
            <p key={c.valor} className="flex justify-between gap-3">
              <span>{c.label}</span>
              <span className="tabular-nums">
                buscan {p.busca_como[c.valor] ?? 0} · ofrecen {p.ofrece_como[c.valor] ?? 0}
              </span>
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="consentidos" className="flex flex-col gap-3">
        <TituloFeria id="consentidos">Quienes aceptaron compartir</TituloFeria>
        <p className="text-sm text-tinta">
          {p.consentimiento.aceptan} aceptaron · {p.consentimiento.retiraron} eligieron no compartir ·{" "}
          {p.consentimiento.sin_decidir} todavía no eligieron (participantes de la feria).
        </p>
        {p.consentidos.length > 0 && (
          <a href="/organizacion/csv" className={`${boton("secundario", "md")} self-start`}>
            Descargar CSV
          </a>
        )}
        {p.consentidos.length === 0 ? (
          <p className={`${CAJA} text-sm text-tinta`}>Todavía nadie aceptó compartir su perfil con la organización.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {p.consentidos.map((c) => (
              <li key={c.slug}>
                <TarjetaConsentido c={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.es_admin && p.sin_completar && (
        <section aria-labelledby="sin-completar" className="flex flex-col gap-3 border-t border-tinta/15 pt-8">
          <h2 id="sin-completar" className={SUBTITULO}>
            Solo el equipo: les falta completar
          </h2>
          <p className="text-sm text-tinta/80">
            Participantes de la feria sin qué buscan o qué ofrecen. La Universidad no ve esta lista. Para empujarlos en el stand:{" "}
            <code className="break-all">/cofundadores?ver=networking&amp;alcance=feria</code>
          </p>
          {p.sin_completar.length === 0 ? (
            <p className={`${CAJA} text-sm text-tinta`}>Todos completaron.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {p.sin_completar.map((s) => (
                <li key={s.slug} className={`${CAJA} flex items-center justify-between gap-3 text-sm`}>
                  <Link href={`/p/${s.slug}`} className="font-medium text-tinta underline underline-offset-4">
                    {s.nombre}
                  </Link>
                  <span className="text-tinta/80">
                    {rol(s.rol)} · falta {s.falta === "ambos" ? "busca y ofrece" : s.falta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Cifra({ titulo, valor, pie }: { titulo: string; valor: number | string; pie?: string }) {
  return (
    <div className={`${CAJA} flex flex-col`}>
      <dt className="order-2 text-xs text-tinta/70">{titulo}</dt>
      <dd className="order-1 font-display text-3xl font-semibold tabular-nums text-tinta">
        {typeof valor === "number" ? valor.toLocaleString("es-AR") : valor}
      </dd>
      {pie && <span className="order-3 text-xs text-tinta/70">{pie}</span>}
    </div>
  );
}

function Ranking({ titulo, lista, tope }: { titulo: string; lista: Array<{ valor: string; n: number }>; tope: number }) {
  return (
    <div className={`${CAJA} flex flex-col gap-2`}>
      <h3 className="font-medium text-tinta">{titulo}</h3>
      {lista.length === 0 ? (
        <p className="text-sm text-tinta/75">Todavía nada.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {lista.map((x) => (
            <li key={x.valor} className="flex flex-col gap-0.5 text-sm text-tinta">
              <span className="flex justify-between gap-3">
                <span>{necesidad(x.valor).label}</span>
                <span className="tabular-nums">{x.n}</span>
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-tinta/10">
                <span
                  className="block h-full origin-left rounded-full bg-s21-verde"
                  style={{ transform: `scaleX(${x.n / tope})` }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Lado({ titulo, opciones, detalle, como }: { titulo: string; opciones: string[]; detalle: string[]; como: string[] }) {
  if (!opciones.length && !detalle.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-tinta/70">{titulo}</span>
      <span className="flex flex-wrap gap-1.5">
        {opciones.map((v) => (
          <Etiqueta key={v} clase={necesidad(v).clase}>
            {necesidad(v).label}
          </Etiqueta>
        ))}
        {detalle.map((d) => (
          <Etiqueta key={d} clase="border border-tinta/20 text-tinta">
            {d}
          </Etiqueta>
        ))}
      </span>
      {como.length > 0 && <span className="text-xs text-tinta/75">Cómo: {como.map((c) => labelComo(c).toLowerCase()).join(" · ")}</span>}
    </div>
  );
}

function TarjetaConsentido({ c }: { c: Consentido }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.02] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/p/${c.slug}`} className="font-display text-lg font-semibold leading-tight text-tinta underline-offset-4 hover:underline">
            {c.nombre}
          </Link>
          <p className="text-xs text-tinta/70">
            {rol(c.rol)}
            {c.empresas ? ` · ${c.empresas}` : ""}
            {c.ubicacion ? ` · ${c.ubicacion}` : ""}
          </p>
        </div>
        {c.participa && (
          <span className="shrink-0 rounded-full bg-s21-verde-oscuro px-2 py-0.5 text-[0.7rem] font-bold uppercase text-white">
            En la feria
          </span>
        )}
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-tinta/85">{c.descripcion}</p>
      <Lado titulo="Busca" opciones={c.busca} detalle={c.busca_detalle} como={c.busca_como} />
      <Lado titulo="Ofrece" opciones={c.ofrece} detalle={c.ofrece_detalle} como={c.ofrece_como} />
      <p className="mt-auto text-xs text-tinta/70">Aceptó compartir el {fecha.format(new Date(c.acepto_at))}</p>
    </article>
  );
}
