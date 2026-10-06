"use client";

import { useCallback, useEffect, useState } from "react";
import type { Conexion, DatosEncaje } from "@/lib/cofundador";
import type { DatosEncajeNetworking } from "@/lib/networking";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { Perfil } from "@/types/pecera";

/** Mi perfil de cofundador (lo que hace falta para el encaje y para poder mostrar interés). */
export type MiPerfilMatch = DatosEncaje & {
  id: string;
  nombre: string;
  busca_cofundador: boolean;
  publicado: boolean;
  oculto: boolean;
};

/** Mi perfil de networking: busca/ofrece (con detalle y cómo si ya está la migración). */
export type MiPerfilNetworking = DatosEncajeNetworking &
  Pick<Perfil, "busca_detalle" | "ofrece_detalle"> & {
    id: string;
    nombre: string;
    publicado: boolean;
    oculto: boolean;
  };

export type EstadoConexiones<Yo> =
  | { fase: "cargando" }
  | { fase: "sin_sesion" }
  | { fase: "sin_perfil" }
  /** No se pudo leer (por ejemplo, falta una migración): la página queda como directorio. */
  | { fase: "sin_datos" }
  | { fase: "listo"; yo: Yo; conexiones: Conexion[]; flujo: boolean };

export type EstadoMatch = EstadoConexiones<MiPerfilMatch>;
export type EstadoNetworking = EstadoConexiones<MiPerfilNetworking>;

/** Códigos de "eso todavía no existe en la base" (los mismos que usa lib/datos.ts). */
const SIN_MIGRACION = new Set(["42703", "42P01", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

type Tipo = "cofundador" | "networking";

/** Qué lee y a qué funciones llama cada flujo. Las columnas van en cascada (la más nueva primero). */
const CONFIG: Record<Tipo, { columnas: string[]; conexiones: string; interesar: string; responder: string; retirar: string }> = {
  cofundador: {
    columnas: [
      "id, nombre, busca_cofundador, publicado, oculto, cofundador_aporta, cofundador_busca, cofundador_dedicacion, ubicacion, industrias, etapa",
    ],
    conexiones: "mis_cofundador_conexiones",
    interesar: "cofundador_interesar",
    responder: "cofundador_responder",
    retirar: "cofundador_retirar",
  },
  networking: {
    columnas: [
      "id, nombre, tipo, publicado, oculto, busca, ofrece, busca_detalle, ofrece_detalle, busca_como, ofrece_como, ubicacion, industrias, etapa",
      "id, nombre, tipo, publicado, oculto, busca, ofrece, ubicacion, industrias, etapa",
    ],
    conexiones: "mis_networking_conexiones",
    interesar: "networking_interesar",
    responder: "networking_responder",
    retirar: "networking_retirar",
  },
};

/** Lee la sesión, mi perfil y mis conexiones. Solo lee: quien la llama decide cuándo guardar el estado. */
async function leer<Yo>(tipo: Tipo): Promise<EstadoConexiones<Yo>> {
  const config = CONFIG[tipo];
  const supabase = supabaseNavegador();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fase: "sin_sesion" };
  const consulta = (columnas: string) =>
    supabase.from("perfiles").select(columnas).eq("usuario_id", user.id).maybeSingle<Yo>();
  let { data: yo, error } = await consulta(config.columnas[0]);
  for (let i = 1; i < config.columnas.length && error && SIN_MIGRACION.has(error.code ?? ""); i++) {
    ({ data: yo, error } = await consulta(config.columnas[i]));
  }
  if (error) return { fase: "sin_datos" };
  if (!yo) return { fase: "sin_perfil" };
  const { data, error: errorConexiones } = await supabase.rpc(config.conexiones);
  const flujo = !errorConexiones || !SIN_MIGRACION.has(errorConexiones.code ?? "");
  return { fase: "listo", yo, conexiones: errorConexiones ? [] : ((data ?? []) as Conexion[]), flujo };
}

/**
 * La sesión, mi perfil y mis conexiones (de cofundador o de networking), leídos en el
 * navegador (la página es estática y pública: lo personal se pide acá, con la sesión de la
 * persona). `flujo` es falso si la migración del flujo todavía no corrió: la lista sigue
 * mostrándose, sin botones de interés.
 */
export type AccionesMatch = {
  interesar: (a: string, mensaje: string) => Promise<{ resultado?: string; error?: string }>;
  responder: (de: string, aceptar: boolean) => Promise<{ resultado?: string; error?: string }>;
  retirar: (a: string) => Promise<{ resultado?: string; error?: string }>;
};

function useConexiones<Yo>(tipo: Tipo, extraInteres?: Record<string, unknown>) {
  const [estado, setEstado] = useState<EstadoConexiones<Yo>>({ fase: "cargando" });

  useEffect(() => {
    let vigente = true;
    leer<Yo>(tipo).then(
      (e) => vigente && setEstado(e),
      () => vigente && setEstado({ fase: "sin_datos" })
    );
    return () => {
      vigente = false;
    };
  }, [tipo]);

  const recargar = useCallback(async () => {
    setEstado(await leer<Yo>(tipo).catch((): EstadoConexiones<Yo> => ({ fase: "sin_datos" })));
  }, [tipo]);

  /** Llama una función de la base y vuelve a leer: el estado siempre sale de la base. */
  const llamar = useCallback(
    async (nombre: string, args: Record<string, unknown>): Promise<{ resultado?: string; error?: string }> => {
      const { data, error } = await supabaseNavegador().rpc(nombre, args);
      await recargar();
      if (error) return { error: error.message };
      return { resultado: typeof data === "string" ? data : undefined };
    },
    [recargar]
  );

  const config = CONFIG[tipo];
  return {
    estado,
    recargar,
    interesar: (a: string, mensaje: string) => llamar(config.interesar, { p_a: a, p_mensaje: mensaje, ...extraInteres }),
    responder: (de: string, aceptar: boolean) => llamar(config.responder, { p_de: de, p_aceptar: aceptar }),
    retirar: (a: string) => llamar(config.retirar, { p_a: a }),
  };
}

/** Cofounder match: igual que siempre. */
export function useMatch() {
  return useConexiones<MiPerfilMatch>("cofundador");
}

/** Networking: el mismo flujo, con su tabla. `evento` = en qué evento se hace (Feria 21) o null. */
export function useNetworking(evento: string | null) {
  return useConexiones<MiPerfilNetworking>("networking", { p_evento: evento });
}
