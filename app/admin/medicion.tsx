import Link from "next/link";
import { congelarDemoDay } from "@/app/admin/acciones";
import BotonAccion from "@/components/admin/BotonAccion";
import DataroomSecciones, { type Dataroom } from "@/components/admin/Dataroom";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import type { supabaseConSesion } from "@/lib/supabase-servidor";

type Supabase = Awaited<ReturnType<typeof supabaseConSesion>>;

export type SnapshotDemoDay = {
  id: number;
  creado_at: string;
  desde: string;
  hasta: string;
  ci: number;
  ci_q: number;
  proyectos: number;
  ci_por_participante: number | null;
  liquidez: number | null;
  liquidez_q: number | null;
  pct_vistas_fuera_horario: number | null;
  /** 'plataforma' o el slug del evento (migración vivo_feria; antes, siempre la plataforma). */
  alcance?: string;
};

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const SUBTITULO = "font-display text-xl font-semibold text-tinta";

const fecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function porcentaje(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(Number(v) * 100)} %`;
}

/**
 * Pestaña "Medición" de /admin (super dataroom): el snapshot del Demo Day, los CSV y
 * el dataroom desde el comienzo de la feria. `filtro` (?f=) = fuente del embudo;
 * `alcance` (?a=plataforma) = qué cuenta como proyecto para la liquidez y la CI por
 * participante (por defecto, los participantes del evento). Solo agregados.
 * Definiciones en docs/GUIA-MEDICION.md.
 */
export default async function Medicion({
  supabase,
  filtro,
  alcance,
}: {
  supabase: Supabase;
  filtro: string;
  alcance: "plataforma" | "evento";
}) {
  const fuente = filtro === "todos" ? null : filtro;
  const [{ data, error }, conAlcance] = await Promise.all([
    supabase.rpc("admin_demo_day_snapshots"),
    supabase.rpc("admin_dataroom_en", {
      p_fuente: fuente,
      p_alcance: alcance === "evento" ? EVENTO_ACTUAL.slug : "plataforma",
    }),
  ]);
  // Sin la migración vivo_feria: el dataroom de siempre (toda la plataforma).
  const sinAlcance = faltaMigracion(conAlcance.error);
  const dataroom = sinAlcance ? await supabase.rpc("admin_dataroom", { p_fuente: fuente }) : conAlcance;
  const sufijo = alcance === "plataforma" ? "&a=plataforma" : "";
  if (faltaMigracion(error)) {
    return (
      <p className={`${CAJA} text-sm text-tinta`}>
        Falta correr la migración <code>20261011120000_super_dataroom.sql</code>. Ver docs/GUIA-MEDICION.md.
      </p>
    );
  }
  if (error) throw new Error(`Supabase (admin_demo_day_snapshots): ${error.message}`);
  if (dataroom.error) throw new Error(`Supabase (admin_dataroom): ${dataroom.error.message}`);
  const snapshots = (data ?? []) as SnapshotDemoDay[];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm leading-relaxed text-tinta/80">
        Siempre decimos <strong className="font-semibold">conexiones iniciadas</strong>: un toque en un canal de contacto
        es una intención, no una reunión. Sin tráfico del equipo ni perfiles de prueba.{" "}
        <Link href="/admin/vivo" className="font-semibold underline underline-offset-4">
          Pantalla del stand →
        </Link>
      </p>

      {!sinAlcance && (
        <nav aria-label="Qué proyectos cuentan" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-tinta/80">Proyectos:</span>
          {(
            [
              ["evento", EVENTO_ACTUAL.nombre, `/admin?v=medicion${filtro === "todos" ? "" : `&f=${encodeURIComponent(filtro)}`}`],
              ["plataforma", "Toda la plataforma", `/admin?v=medicion${filtro === "todos" ? "" : `&f=${encodeURIComponent(filtro)}`}&a=plataforma`],
            ] as const
          ).map(([id, label, href]) => (
            <Link
              key={id}
              href={href}
              aria-current={alcance === id ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 ${
                alcance === id ? "border-tinta bg-tinta text-marfil" : "border-tinta/25 text-tinta"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="demo-day" className="flex flex-col gap-3">
        <h2 id="demo-day" className={SUBTITULO}>
          Demo Day
        </h2>
        <p className="text-sm leading-relaxed text-tinta/80">
          Congela los números desde el comienzo de la feria hasta este momento, dos veces: con los participantes de{" "}
          {EVENTO_ACTUAL.nombre} y con toda la plataforma. Queda guardado y no se puede cambiar: congelá justo antes de
          subir al escenario.
        </p>
        <div>
          <BotonAccion
            accion={congelarDemoDay}
            estilo="primario"
            confirmar="¿Congelar los números ahora? Queda guardado y no se puede cambiar."
          >
            Congelar snapshot para el Demo Day
          </BotonAccion>
        </div>

        {snapshots.length > 0 && (
          <ul className="flex flex-col gap-2">
            {snapshots.map((s) => (
              <li key={s.id} className={CAJA}>
                <p className="text-xs text-tinta/70">
                  <span className="font-semibold text-tinta">
                    {s.alcance && s.alcance !== "plataforma" ? EVENTO_ACTUAL.nombre : "Toda la plataforma"}
                  </span>{" "}
                  · Congelado el {fecha.format(new Date(s.creado_at))} · desde el {fecha.format(new Date(s.desde))}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  <Numero titulo="Conexiones iniciadas" valor={s.ci.toLocaleString("es-AR")} />
                  <Numero
                    titulo="CI por participante"
                    valor={s.ci_por_participante === null ? "—" : Number(s.ci_por_participante).toLocaleString("es-AR")}
                  />
                  <Numero titulo="Calificadas (CI-Q)" valor={s.ci_q.toLocaleString("es-AR")} />
                  <Numero titulo="Liquidez" valor={porcentaje(s.liquidez)} />
                  <Numero titulo="Liquidez calificada" valor={porcentaje(s.liquidez_q)} />
                  <Numero titulo="Vistas fuera del horario de la feria" valor={porcentaje(s.pct_vistas_fuera_horario)} />
                </dl>
                <p className="mt-2 text-xs text-tinta/70">
                  {s.proyectos} {s.alcance && s.alcance !== "plataforma" ? `participantes de ${EVENTO_ACTUAL.nombre}` : "proyectos de la plataforma"}.
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="/admin/csv?tipo=demo-day" className="font-semibold underline underline-offset-4">
            CSV de los snapshots
          </a>
          <a href="/admin/csv?tipo=horas" className="font-semibold underline underline-offset-4">
            CSV por hora
          </a>
        </p>
      </section>

      <DataroomSecciones d={dataroom.data as Dataroom} fuente={fuente} sufijo={sufijo} />
    </div>
  );
}

function Numero({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="order-2 text-xs text-tinta/70">{titulo}</dt>
      <dd className="order-1 font-display text-2xl font-semibold tabular-nums text-tinta">{valor}</dd>
    </div>
  );
}
