"use client";

import { useCallback, useEffect, useState } from "react";
import type { Conexion, DatosEncaje } from "@/lib/cofundador";
import { supabaseNavegador } from "@/lib/supabase-navegador";

/** Mi perfil de cofundador (lo que hace falta para el encaje y para poder mostrar interés). */
export type MiPerfilMatch = DatosEncaje & {
  id: string;
  nombre: string;
  busca_cofundador: boolean;
  publicado: boolean;
  oculto: boolean;
};

export type EstadoMatch =
  | { fase: "cargando" }
  | { fase: "sin_sesion" }
  | { fase: "sin_perfil" }
  /** No se pudo leer (por ejemplo, falta una migración): la página queda como directorio. */
  | { fase: "sin_datos" }
  | { fase: "listo"; yo: MiPerfilMatch; conexiones: Conexion[]; flujo: boolean };

/** Códigos de "eso todavía no existe en la base" (los mismos que usa lib/datos.ts). */
const SIN_MIGRACION = new Set(["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

const COLUMNAS_YO =
  "id, nombre, busca_cofundador, publicado, oculto, cofundador_aporta, cofundador_busca, cofundador_dedicacion, ubicacion, industrias, etapa";

/** Lee la sesión, mi perfil y mis conexiones. Solo lee: quien la llama decide cuándo guardar el estado. */
async function leer(): Promise<EstadoMatch> {
  const supabase = supabaseNavegador();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fase: "sin_sesion" };
  const { data: yo, error } = await supabase
    .from("perfiles")
    .select(COLUMNAS_YO)
    .eq("usuario_id", user.id)
    .maybeSingle<MiPerfilMatch>();
  if (error) return { fase: "sin_datos" };
  if (!yo) return { fase: "sin_perfil" };
  const { data, error: errorConexiones } = await supabase.rpc("mis_cofundador_conexiones");
  const flujo = !errorConexiones || !SIN_MIGRACION.has(errorConexiones.code ?? "");
  return { fase: "listo", yo, conexiones: errorConexiones ? [] : ((data ?? []) as Conexion[]), flujo };
}

/**
 * La sesión, mi perfil de cofundador y mis conexiones, leídos en el navegador (la página es
 * estática y pública: lo personal se pide acá, con la sesión de la persona). `flujo` es falso
 * si la migración del flujo (cofundador_conexiones) todavía no corrió: la lista sigue
 * mostrándose, sin botones de interés.
 */
export type AccionesMatch = {
  interesar: (a: string, mensaje: string) => Promise<{ resultado?: string; error?: string }>;
  responder: (de: string, aceptar: boolean) => Promise<{ resultado?: string; error?: string }>;
  retirar: (a: string) => Promise<{ resultado?: string; error?: string }>;
};

export function useMatch() {
  const [estado, setEstado] = useState<EstadoMatch>({ fase: "cargando" });

  useEffect(() => {
    let vigente = true;
    leer().then(
      (e) => vigente && setEstado(e),
      () => vigente && setEstado({ fase: "sin_datos" })
    );
    return () => {
      vigente = false;
    };
  }, []);

  /** Llama una función de la base y vuelve a leer: el estado siempre sale de la base. */
  const llamar = useCallback(
    async (nombre: string, args: Record<string, unknown>): Promise<{ resultado?: string; error?: string }> => {
      const { data, error } = await supabaseNavegador().rpc(nombre, args);
      setEstado(await leer().catch((): EstadoMatch => ({ fase: "sin_datos" })));
      if (error) return { error: error.message };
      return { resultado: typeof data === "string" ? data : undefined };
    },
    []
  );

  return {
    estado,
    interesar: (a: string, mensaje: string) => llamar("cofundador_interesar", { p_a: a, p_mensaje: mensaje }),
    responder: (de: string, aceptar: boolean) => llamar("cofundador_responder", { p_de: de, p_aceptar: aceptar }),
    retirar: (a: string) => llamar("cofundador_retirar", { p_a: a }),
  };
}
