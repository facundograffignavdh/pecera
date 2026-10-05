import { type NextRequest, NextResponse } from "next/server";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * CSV agregados para el equipo (solo admins; la base lo vuelve a chequear):
 *   ?tipo=demo-day → los snapshots congelados del Demo Day
 *   ?tipo=horas    → la curva por hora (metricas_hora, desde el comienzo de la feria)
 * Nada de identificadores: solo fechas y números.
 */

const COLUMNAS = {
  "demo-day": [
    "alcance",
    "creado_at",
    "desde",
    "hasta",
    "ci",
    "ci_q",
    "proyectos",
    "ci_por_participante",
    "liquidez",
    "liquidez_q",
    "pct_vistas_fuera_horario",
  ],
  horas: ["hora", "ci", "ci_q", "ci_acum", "ci_q_acum", "vistas", "sesiones"],
} as const;

function csv(columnas: readonly string[], filas: Array<Record<string, unknown>>) {
  const celda = (v: unknown) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  return [columnas.join(","), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(","))].join("\n") + "\n";
}

export async function GET(request: NextRequest) {
  const tipo = request.nextUrl.searchParams.get("tipo") === "horas" ? "horas" : "demo-day";
  const supabase = await supabaseConSesion();

  let filas: Array<Record<string, unknown>> = [];
  if (tipo === "demo-day") {
    const { data, error } = await supabase.rpc("admin_demo_day_snapshots");
    if (error) return new NextResponse("No autorizado o sin datos.", { status: error.code === "42501" ? 403 : 500 });
    filas = (data ?? []) as Array<Record<string, unknown>>;
  } else {
    const { data, error } = await supabase.rpc("admin_dataroom");
    if (error) return new NextResponse("No autorizado o sin datos.", { status: error.code === "42501" ? 403 : 500 });
    filas = ((data as { curva?: Array<Record<string, unknown>> } | null)?.curva ?? []) as Array<Record<string, unknown>>;
  }

  return new NextResponse(csv(COLUMNAS[tipo], filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pecera-${tipo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
