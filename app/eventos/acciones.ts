"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { getEventoDefinido } from "@/lib/eventos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Votación del evento. La página es estática: el estado de cada persona (si entró,
 * si participa, a quién votó) se pide desde el navegador con `miEstadoEvento`.
 * Las reglas (un voto por cuenta, no votarse, votación abierta) las aplica la base. El voto
 * sin cuenta va directo del navegador a la base (`lib/voto-feria.ts`).
 */

export type MiEstado = {
  conSesion: boolean;
  conPerfil: boolean;
  participa: boolean;
  voto: string | null;
};

const SIN_ESTADO: MiEstado = { conSesion: false, conPerfil: false, participa: false, voto: null };

export async function miEstadoEvento(evento: string): Promise<MiEstado> {
  if (!getEventoDefinido(evento)) return SIN_ESTADO;
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return SIN_ESTADO;

  const { data, error } = await supabase.rpc("mi_evento", { p_evento: evento });
  if (error) {
    traducir(error, "mi_evento");
    return { ...SIN_ESTADO, conSesion: true };
  }
  const fila = (data as Array<{ participa: boolean; voto: string | null; con_perfil: boolean }>)[0];
  return {
    conSesion: true,
    conPerfil: !!fila?.con_perfil,
    participa: !!fila?.participa,
    voto: fila?.voto ?? null,
  };
}

export async function votar(evento: string, perfilId: string): Promise<Resultado> {
  if (!getEventoDefinido(evento)) return { ok: false, mensaje: "Ese evento no está activo." };
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("votar", { p_evento: evento, p_perfil: perfilId });
  if (error) return traducir(error, "votar");
  revalidatePath(`/eventos/${evento}`);
  return { ok: true, mensaje: "¡Voto registrado! Podés cambiarlo mientras la votación siga abierta." };
}

export async function quitarVoto(evento: string): Promise<Resultado> {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const { error } = await supabase.rpc("quitar_voto", { p_evento: evento });
  if (error) return traducir(error, "quitar_voto");
  revalidatePath(`/eventos/${evento}`);
  return { ok: true, mensaje: "Sacaste tu voto." };
}
