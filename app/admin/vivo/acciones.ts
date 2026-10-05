"use server";

import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** 'plataforma' o el slug del evento: qué cuenta como "proyecto" para el %. */
export type Alcance = "plataforma" | "evento";

export type DatosVivo = {
  ci_hoy: number;
  proyectos: number;
  /** null con menos de 5 proyectos (no se muestran celdas chicas). */
  proyectos_con_ci: number | null;
  pitches_vistos_hoy: number;
  ticker: Array<{ minutos: number; industria: string | null }>;
  actualizado: string;
};

export type FilaRanking = {
  perfil_id: string;
  nombre: string;
  es_empresa: boolean;
  /** URL lista para usar (o null: va la inicial). */
  imagen: string | null;
  votos: number;
  puesto: number;
  empate: boolean;
};

export type Ranking = {
  filas: FilaRanking[];
  /** Proyectos con votos que no entran en el top. */
  fuera: number;
  total: number;
  votacion_abierta: boolean;
};

export type LecturaVivo =
  | {
      ok: true;
      datos: DatosVivo;
      /** null si falta la migración vivo_feria o falló solo el ranking. */
      ranking: Ranking | null;
      /** false si falta la migración vivo_feria: el % es de toda la plataforma. */
      conAlcance: boolean;
    }
  | { ok: false; motivo: "migracion" | "acceso" | "error" };

function imagen(clave: string | null): string | null {
  if (!clave) return null;
  try {
    return urlMedia(clave);
  } catch {
    return null;
  }
}

/**
 * Lo que muestra la pantalla del stand: métricas (`admin_vivo_en`, o `admin_vivo` si
 * falta la migración vivo_feria) y el ranking de la votación (`admin_ranking_evento`).
 * Solo agregados. Nunca tira.
 */
export async function leerVivo(alcance: Alcance): Promise<LecturaVivo> {
  try {
    const supabase = await supabaseConSesion();
    const [metricas, ranking] = await Promise.all([
      supabase.rpc("admin_vivo_en", { p_alcance: alcance === "evento" ? EVENTO_ACTUAL.slug : "plataforma" }),
      supabase.rpc("admin_ranking_evento", { p_evento: EVENTO_ACTUAL.slug }),
    ]);

    let datos = metricas.data as DatosVivo | null;
    let conAlcance = true;
    if (metricas.error) {
      if (metricas.error.code === "42501") return { ok: false, motivo: "acceso" };
      if (!faltaMigracion(metricas.error)) {
        console.error(`Supabase (admin_vivo_en): ${metricas.error.code} ${metricas.error.message}`);
        return { ok: false, motivo: "error" };
      }
      // Sin vivo_feria: los números de siempre, sin ranking.
      const viejo = await supabase.rpc("admin_vivo");
      if (viejo.error) {
        if (faltaMigracion(viejo.error)) return { ok: false, motivo: "migracion" };
        if (viejo.error.code === "42501") return { ok: false, motivo: "acceso" };
        console.error(`Supabase (admin_vivo): ${viejo.error.code} ${viejo.error.message}`);
        return { ok: false, motivo: "error" };
      }
      datos = viejo.data as DatosVivo;
      conAlcance = false;
    }

    let lista: Ranking | null = null;
    if (ranking.error) {
      if (!faltaMigracion(ranking.error)) {
        console.error(`Supabase (admin_ranking_evento): ${ranking.error.code} ${ranking.error.message}`);
      }
    } else {
      const r = ranking.data as Ranking & { filas: Array<FilaRanking & { imagen: string | null }> };
      lista = { ...r, filas: r.filas.map((f) => ({ ...f, imagen: imagen(f.imagen) })) };
    }

    return { ok: true, datos: datos as DatosVivo, ranking: lista, conAlcance };
  } catch {
    return { ok: false, motivo: "error" };
  }
}
