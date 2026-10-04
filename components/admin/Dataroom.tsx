import Link from "next/link";
import { ROLES } from "@/lib/rol";
import type { Rol } from "@/types/pecera";

/**
 * Secciones del dataroom de /admin (pestaña Medición), sobre `admin_dataroom`. Todo
 * agregado. Gráficos en SVG sin dependencias: cada marca lleva su <title> (hover) y
 * cada gráfico tiene su tabla. CI en arcilla, CI-Q en `--color-serie-ciq`
 * (paleta validada en claro y oscuro).
 */

export type Dataroom = {
  desde: string;
  hasta: string;
  resumen: {
    ci: number;
    ci_q: number;
    proyectos: number;
    proyectos_con_ci: number;
    proyectos_con_ciq: number;
    ci_por_participante: number | null;
    liquidez: number | null;
    liquidez_q: number | null;
    vistas: number;
    vistas_fuera_horario: number;
    pct_vistas_fuera_horario: number | null;
  };
  curva: Array<{ hora: string; ci: number; ci_q: number; ci_acum: number; ci_q_acum: number; vistas: number; sesiones: number }>;
  embudo: { fuente: string | null; visitas: number; con_vista: number; con_perfil: number; con_contacto: number };
  liquidez: {
    histograma: Record<string, number>;
    top10_pct: number | null;
    ceros: Array<{ slug: string; nombre: string; vistas: number }>;
  };
  matriz: { roles: Record<string, number>; pares_con_cuenta: number; pares_reciprocos: number };
  atribucion: {
    por_fuente: Record<string, { dispositivos: number; ci: number }>;
    por_tarjeta: Record<string, { escaneos: number; dispositivos: number; ci: number }>;
  };
  cohortes: Array<{ dia: string; dispositivos: number; con_contacto: number; volvieron: number }>;
  calidad: {
    eventos: number;
    eventos_por_minuto_max: number;
    descartes: Record<string, number>;
    dispositivos_anomalos: number;
    dispositivos_equipo: number;
  };
};

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const SUBTITULO = "font-display text-xl font-semibold text-tinta";
const ZONA = "America/Argentina/Buenos_Aires";
const BUCKETS = ["0", "1", "2", "3-5", "6-10", "11+"];
const ROLES_ORDEN = ["emprendedor", "inversor", "aliado"] as const;

const hora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric", month: "numeric", hour: "2-digit" });
const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "short", day: "numeric", month: "numeric" });
const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("es-AR"));
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(Number(v) * 100)} %`);
const parte = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");
const rolLabel = (r: string) => (r === "anonimo" ? "Sin cuenta" : (ROLES[r as Rol]?.label ?? r));

export default function DataroomSecciones({ d, fuente }: { d: Dataroom; fuente: string | null }) {
  const fuentes = Object.keys(d.atribucion.por_fuente).sort();
  return (
    <div className="flex flex-col gap-10">
      <NorthStar d={d} />
      <Embudo d={d} fuente={fuente} fuentes={fuentes} />
      <Liquidez d={d} />
      <Matriz d={d} />
      <Atribucion d={d} />
      <Cohortes d={d} />
      <Calidad d={d} />
    </div>
  );
}

function Seccion({ id, titulo, children, nota }: { id: string; titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className={SUBTITULO}>
        {titulo}
      </h2>
      {nota && <p className="text-sm leading-relaxed text-tinta/75">{nota}</p>}
      {children}
    </section>
  );
}

function Tile({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className={`${CAJA} flex flex-col`}>
      <dt className="order-2 text-xs text-tinta/70">{titulo}</dt>
      <dd className="order-1 font-display text-3xl font-semibold tabular-nums text-tinta">{valor}</dd>
      {detalle && <dd className="order-3 text-xs text-tinta/70">{detalle}</dd>}
    </div>
  );
}

function Tabla({ resumen, columnas, filas }: { resumen: string; columnas: string[]; filas: Array<Array<string | number>> }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-tinta/80">{resumen}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="text-xs text-tinta/70">
              {columnas.map((c) => (
                <th key={c} className="py-1 pr-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-t border-tinta/10">
                {f.map((c, j) => (
                  <td key={j} className="py-1 pr-3">
                    {typeof c === "number" ? n(c) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------

function NorthStar({ d }: { d: Dataroom }) {
  const r = d.resumen;
  return (
    <Seccion
      id="north-star"
      titulo="North Star: conexiones iniciadas"
      nota="Un toque en un canal de contacto, sin repetir el mismo par en 24 h. Una intención, no una reunión."
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile titulo="Conexiones iniciadas" valor={n(r.ci)} />
        <Tile titulo="Calificadas (CI-Q)" valor={n(r.ci_q)} detalle="inversor o aliado → emprendedor" />
        <Tile titulo="CI por participante" valor={n(r.ci_por_participante)} detalle={`${n(r.proyectos)} proyectos`} />
        <Tile titulo="Liquidez" valor={pct(r.liquidez)} detalle={`${n(r.proyectos_con_ci)} con al menos una CI`} />
        <Tile titulo="Liquidez calificada" valor={pct(r.liquidez_q)} detalle={`${n(r.proyectos_con_ciq)} con CI-Q`} />
        <Tile
          titulo="Vistas fuera del horario de la feria"
          valor={pct(r.pct_vistas_fuera_horario)}
          detalle={`${n(r.vistas_fuera_horario)} de ${n(r.vistas)} vistas`}
        />
      </dl>
      <Curva curva={d.curva} />
    </Seccion>
  );
}

/** Acumulado por hora de CI y CI-Q (un solo eje: mismas unidades). */
function Curva({ curva }: { curva: Dataroom["curva"] }) {
  if (curva.length < 2) {
    return <p className="text-sm text-tinta/70">La curva aparece cuando el workflow de métricas lleve dos horas guardadas.</p>;
  }
  const W = 640;
  const H = 220;
  const izq = 36;
  const abajo = 24;
  const arriba = 12;
  const der = 56;
  const max = Math.max(1, ...curva.map((c) => c.ci_acum));
  const x = (i: number) => izq + (i / (curva.length - 1)) * (W - izq - der);
  const y = (v: number) => H - abajo - (v / max) * (H - abajo - arriba);
  const linea = (k: "ci_acum" | "ci_q_acum") => curva.map((c, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(c[k]).toFixed(1)}`).join(" ");
  const paso = Math.max(1, Math.ceil(curva.length / 6));
  const ultimo = curva[curva.length - 1];
  const ancho = (W - izq - der) / Math.max(1, curva.length - 1);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-4 text-xs text-tinta/80">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-arcilla" /> Conexiones iniciadas (acumulado)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-serie-ciq" /> Calificadas (acumulado)
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Conexiones iniciadas acumuladas por hora">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={izq} x2={W - der} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-tinta/10" />
            <text x={izq - 6} y={y(max * f) + 4} textAnchor="end" className="fill-tinta/70 text-[11px]">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        <path d={linea("ci_acum")} fill="none" stroke="var(--color-arcilla)" strokeWidth={2} strokeLinejoin="round" />
        <path d={linea("ci_q_acum")} fill="none" stroke="var(--color-serie-ciq)" strokeWidth={2} strokeLinejoin="round" />
        <text x={x(curva.length - 1) + 6} y={y(ultimo.ci_acum) + 4} className="fill-tinta text-[11px] font-semibold">
          {ultimo.ci_acum}
        </text>
        <text x={x(curva.length - 1) + 6} y={y(ultimo.ci_q_acum) + 4} className="fill-tinta/80 text-[11px]">
          {ultimo.ci_q_acum}
        </text>
        {curva.map((c, i) =>
          i % paso === 0 ? (
            <text key={c.hora} x={x(i)} y={H - 6} textAnchor="middle" className="fill-tinta/70 text-[10px]">
              {hora.format(new Date(c.hora))}
            </text>
          ) : null
        )}
        {/* Zonas de hover más anchas que la marca: una por hora. */}
        {curva.map((c, i) => (
          <rect key={`h-${c.hora}`} x={x(i) - ancho / 2} y={arriba} width={ancho} height={H - abajo - arriba} fill="transparent">
            <title>{`${hora.format(new Date(c.hora))} h · ${c.ci} CI (${c.ci_q} CI-Q) en la hora · acumulado ${c.ci_acum} / ${c.ci_q_acum}`}</title>
          </rect>
        ))}
      </svg>
      <Tabla
        resumen="Ver tabla por hora"
        columnas={["Hora", "CI", "CI-Q", "CI acum.", "CI-Q acum.", "Vistas", "Sesiones"]}
        filas={curva.map((c) => [hora.format(new Date(c.hora)), c.ci, c.ci_q, c.ci_acum, c.ci_q_acum, c.vistas, c.sesiones])}
      />
    </figure>
  );
}

/** Barras horizontales de un solo tono (magnitud), con el número al lado. */
function Barras({ filas, etiqueta }: { filas: Array<{ label: string; valor: number; detalle?: string }>; etiqueta: string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-2" aria-label={etiqueta}>
      {filas.map((f) => (
        <li key={f.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="text-tinta/80">{f.label}</span>
          <span className="h-3 overflow-hidden rounded-r-[4px] bg-tinta/5" title={`${f.label}: ${n(f.valor)}${f.detalle ? ` (${f.detalle})` : ""}`}>
            <span className="block h-full rounded-r-[4px] bg-arcilla" style={{ width: `${(f.valor / max) * 100}%` }} />
          </span>
          <span className="tabular-nums text-tinta">
            {n(f.valor)}
            {f.detalle && <span className="ml-1 text-xs text-tinta/70">{f.detalle}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Embudo({ d, fuente, fuentes }: { d: Dataroom; fuente: string | null; fuentes: string[] }) {
  const e = d.embudo;
  const opciones = [null, ...fuentes];
  return (
    <Seccion
      id="embudo"
      titulo="Embudo"
      nota="Dispositivos por día. Cada paso cuenta a quienes lo hicieron ese día: el contacto del pop-up del pique no pasa por el perfil."
    >
      <nav aria-label="Filtrar por fuente" className="flex flex-wrap gap-2">
        {opciones.map((f) => (
          <Link
            key={f ?? "todas"}
            href={f ? `/admin?v=medicion&f=${encodeURIComponent(f)}` : "/admin?v=medicion"}
            aria-current={fuente === f ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm ${
              fuente === f ? "border-tinta bg-tinta text-marfil" : "border-tinta/25 text-tinta"
            }`}
          >
            {f ?? "Todas"}
          </Link>
        ))}
      </nav>
      <Barras
        etiqueta="Embudo"
        filas={[
          { label: "Visita", valor: e.visitas },
          { label: "Vio ≥ 3 s", valor: e.con_vista, detalle: parte(e.con_vista, e.visitas) },
          { label: "Abrió un perfil", valor: e.con_perfil, detalle: parte(e.con_perfil, e.visitas) },
          { label: "Inició contacto", valor: e.con_contacto, detalle: parte(e.con_contacto, e.visitas) },
        ]}
      />
    </Seccion>
  );
}

function Liquidez({ d }: { d: Dataroom }) {
  const l = d.liquidez;
  return (
    <Seccion id="liquidez" titulo="Liquidez y concentración" nota="Cuántas conexiones iniciadas recibió cada proyecto.">
      <dl className="grid grid-cols-2 gap-2">
        <Tile titulo="Del total se lo lleva el 10 % de arriba" valor={pct(l.top10_pct)} />
        <Tile titulo="Ceros (vistas y ninguna CI)" valor={n(l.ceros.length)} />
      </dl>
      <Barras etiqueta="Proyectos por cantidad de CI" filas={BUCKETS.map((b) => ({ label: `${b} CI`, valor: l.histograma[b] ?? 0 }))} />
      {l.ceros.length > 0 && (
        <Tabla
          resumen={`Ver los ${l.ceros.length} ceros`}
          columnas={["Proyecto", "Vistas"]}
          filas={l.ceros.map((c) => [c.nombre, c.vistas])}
        />
      )}
    </Seccion>
  );
}

function Matriz({ d }: { d: Dataroom }) {
  const m = d.matriz;
  const origenes = ["anonimo", ...ROLES_ORDEN];
  return (
    <Seccion
      id="matriz"
      titulo="Quién inicia conexiones con quién"
      nota={`Rol del origen (fila) → rol del destino (columna). Reciprocidad: ${n(m.pares_reciprocos)} de ${n(m.pares_con_cuenta)} pares con cuenta se contactaron en las dos direcciones.`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-tinta/70">
              <th className="py-1 pr-3 font-medium">Origen → destino</th>
              {ROLES_ORDEN.map((r) => (
                <th key={r} className="py-1 pr-3 font-medium">
                  {rolLabel(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {origenes.map((o) => (
              <tr key={o} className="border-t border-tinta/10">
                <th className="py-1 pr-3 font-medium text-tinta/80">{rolLabel(o)}</th>
                {ROLES_ORDEN.map((r) => (
                  <td key={r} className="py-1 pr-3">
                    {n(m.roles[`${o}>${r}`] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

function Atribucion({ d }: { d: Dataroom }) {
  const f = Object.entries(d.atribucion.por_fuente).sort((a, b) => b[1].ci - a[1].ci);
  const t = Object.entries(d.atribucion.por_tarjeta).sort((a, b) => b[1].ci - a[1].ci || b[1].escaneos - a[1].escaneos);
  return (
    <Seccion id="atribucion" titulo="Atribución" nota="Fuente = de dónde llegó la última visita (tarjeta NFC, campaña o directo).">
      <Barras etiqueta="CI por fuente" filas={f.map(([k, v]) => ({ label: k, valor: v.ci, detalle: `${n(v.dispositivos)} disp.` }))} />
      <Tabla
        resumen={`Por tarjeta (${t.length})`}
        columnas={["Stand", "Escaneos", "Dispositivos", "CI"]}
        filas={t.map(([k, v]) => [k, v.escaneos, v.dispositivos, v.ci])}
      />
    </Seccion>
  );
}

function Cohortes({ d }: { d: Dataroom }) {
  return (
    <Seccion id="cohortes" titulo="Cohortes por día" nota="Dispositivos según el día de su primera visita en el período.">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-tinta/70">
              <th className="py-1 pr-3 font-medium">Día</th>
              <th className="py-1 pr-3 font-medium">Dispositivos</th>
              <th className="py-1 pr-3 font-medium">Iniciaron contacto</th>
              <th className="py-1 pr-3 font-medium">Volvieron otro día</th>
            </tr>
          </thead>
          <tbody>
            {d.cohortes.map((c) => (
              <tr key={c.dia} className="border-t border-tinta/10">
                <td className="py-1 pr-3">{dia.format(new Date(c.dia))}</td>
                <td className="py-1 pr-3">{n(c.dispositivos)}</td>
                <td className="py-1 pr-3">{parte(c.con_contacto, c.dispositivos)}</td>
                <td className="py-1 pr-3">{parte(c.volvieron, c.dispositivos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

function Calidad({ d }: { d: Dataroom }) {
  const c = d.calidad;
  const descartes = Object.values(c.descartes).reduce((a, b) => a + Number(b), 0);
  return (
    <Seccion id="calidad" titulo="Calidad de datos" nota="Sobre lo crudo, con el tráfico del equipo incluido.">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile titulo="Eventos registrados" valor={n(c.eventos)} />
        <Tile titulo="Pico de eventos por minuto" valor={n(c.eventos_por_minuto_max)} />
        <Tile titulo="Descartados por el límite" valor={n(descartes)} />
        <Tile titulo="Dispositivos anómalos" valor={n(c.dispositivos_anomalos)} detalle="> 300 eventos o > 30 contactos en una hora" />
        <Tile titulo="Dispositivos del equipo" valor={n(c.dispositivos_equipo)} detalle="excluidos de todo" />
      </dl>
    </Seccion>
  );
}
