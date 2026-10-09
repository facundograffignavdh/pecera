"use server";

import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** Totales de toda la plataforma desde siempre (`admin_vivo_stand`), sin tráfico interno. */
export type Totales = {
  conexiones: number;
  proyectos_con_conexion: number;
  vistas: number;
  contactos: number;
  piques: number;
  personas: number;
  empresas: number;
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

export type LecturaVivo =
  | {
      ok: true;
      /** null si falta la migración vivo_stand. */
      totales: Totales | null;
      /** null si falta la migración vivo_feria o falló solo el ranking. */
      ranking: FilaRanking[] | null;
    }
  | { ok: false; motivo: "acceso" | "error" };

/** Cuántos puestos muestra la pantalla. */
const TOP = 5;

/**
 * Cuentas cuyos votos cuentan la mitad en la pantalla del stand (decisión del equipo).
 * Por nombre visible, normalizado. No cambia los votos guardados ni `resultados_evento`.
 */
const A_LA_MITAD = new Set(["arrecife", "mariel salvatierra"]);

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function imagen(clave: string | null): string | null {
  if (!clave) return null;
  try {
    return urlMedia(clave);
  } catch {
    return null;
  }
}

/**
 * Aplica la mitad a las cuentas de `A_LA_MITAD` (redondeando para arriba), reordena y
 * recalcula puesto (de competición: 1, 1, 3) y empate. El ranking trae hasta 12 filas,
 * así que nadie de más abajo puede quedar afuera del top 5 por el ajuste.
 */
function ajustarRanking(filas: FilaRanking[]): FilaRanking[] {
  const ajustadas = filas
    .map((f) => (A_LA_MITAD.has(normalizar(f.nombre)) ? { ...f, votos: Math.ceil(f.votos / 2) } : f))
    .filter((f) => f.votos > 0)
    .sort((a, b) => b.votos - a.votos || a.nombre.localeCompare(b.nombre, "es"));
  const conPuesto = ajustadas.map((f) => ({ ...f, puesto: 1 + ajustadas.filter((o) => o.votos > f.votos).length }));
  return conPuesto
    .map((f) => ({ ...f, empate: conPuesto.some((o) => o !== f && o.puesto === f.puesto) }))
    .filter((f) => f.puesto <= TOP)
    .slice(0, TOP);
}

/**
 * Lo que muestra la pantalla del stand: los totales (`admin_vivo_stand`) y el ranking de
 * la votación (`admin_ranking_evento`). Solo agregados. Nunca tira.
 */
export async function leerVivo(): Promise<LecturaVivo> {
  try {
    const supabase = await supabaseConSesion();
    const [totales, ranking] = await Promise.all([
      supabase.rpc("admin_vivo_stand"),
      supabase.rpc("admin_ranking_evento", { p_evento: EVENTO_ACTUAL.slug }),
    ]);

    for (const r of [totales, ranking]) {
      if (r.error?.code === "42501") return { ok: false, motivo: "acceso" };
    }
    if (totales.error && !faltaMigracion(totales.error)) {
      console.error(`Supabase (admin_vivo_stand): ${totales.error.code} ${totales.error.message}`);
      return { ok: false, motivo: "error" };
    }

    let filas: FilaRanking[] | null = null;
    if (ranking.error) {
      if (!faltaMigracion(ranking.error)) {
        console.error(`Supabase (admin_ranking_evento): ${ranking.error.code} ${ranking.error.message}`);
      }
    } else {
      const r = ranking.data as { filas: FilaRanking[] };
      filas = ajustarRanking(r.filas.map((f) => ({ ...f, imagen: imagen(f.imagen) })));
    }

    return { ok: true, totales: totales.error ? null : (totales.data as Totales), ranking: filas };
  } catch {
    return { ok: false, motivo: "error" };
  }
}
