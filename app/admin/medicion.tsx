import Link from "next/link";
import { congelarDemoDay } from "@/app/admin/acciones";
import BotonAccion from "@/components/admin/BotonAccion";
import { faltaMigracion } from "@/lib/datos";
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
 * Pestaña "Medición" de /admin (super dataroom): el snapshot del Demo Day y los CSV.
 * Solo agregados. Definiciones en docs/GUIA-MEDICION.md.
 */
export default async function Medicion({ supabase }: { supabase: Supabase }) {
  const { data, error } = await supabase.rpc("admin_demo_day_snapshots");
  if (faltaMigracion(error)) {
    return (
      <p className={`${CAJA} text-sm text-tinta`}>
        Falta correr la migración <code>20261011120000_super_dataroom.sql</code>. Ver docs/GUIA-MEDICION.md.
      </p>
    );
  }
  if (error) throw new Error(`Supabase (admin_demo_day_snapshots): ${error.message}`);
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

      <section aria-labelledby="demo-day" className="flex flex-col gap-3">
        <h2 id="demo-day" className={SUBTITULO}>
          Demo Day
        </h2>
        <p className="text-sm leading-relaxed text-tinta/80">
          Congela los números desde el comienzo de la feria hasta este momento. Queda guardado y no se puede cambiar:
          congelá justo antes de subir al escenario.
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
                  Congelado el {fecha.format(new Date(s.creado_at))} · desde el {fecha.format(new Date(s.desde))}
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
                <p className="mt-2 text-xs text-tinta/70">{s.proyectos} proyectos participantes.</p>
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
