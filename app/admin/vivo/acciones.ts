"use server";

import { faltaMigracion } from "@/lib/datos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export type DatosVivo = {
  ci_hoy: number;
  proyectos: number;
  /** null con menos de 5 proyectos (no se muestran celdas chicas). */
  proyectos_con_ci: number | null;
  pitches_vistos_hoy: number;
  ticker: Array<{ minutos: number; industria: string | null }>;
  actualizado: string;
};

export type LecturaVivo = { ok: true; datos: DatosVivo } | { ok: false; motivo: "migracion" | "acceso" | "error" };

/** Lo que muestra la pantalla del stand (función `admin_vivo`, solo agregados). Nunca tira. */
export async function leerVivo(): Promise<LecturaVivo> {
  try {
    const supabase = await supabaseConSesion();
    const { data, error } = await supabase.rpc("admin_vivo");
    if (error) {
      if (faltaMigracion(error)) return { ok: false, motivo: "migracion" };
      if (error.code === "42501") return { ok: false, motivo: "acceso" };
      console.error(`Supabase (admin_vivo): ${error.code} ${error.message}`);
      return { ok: false, motivo: "error" };
    }
    return { ok: true, datos: data as DatosVivo };
  } catch {
    return { ok: false, motivo: "error" };
  }
}
