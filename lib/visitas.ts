import { hayCookieSesion } from "@/lib/cuenta-local";
import { supabase } from "@/lib/supabase";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import {
  type TipoVisita,
  AVISO_VISITAS,
  claveVisita,
  delDia,
  diaBuenosAires,
  sacarClave,
  sumarClave,
} from "@/lib/visitas-dia";

export { AVISO_VISITAS };

/**
 * "Quién vio tu perfil y tus pitches" en el navegador (migración 20261017120000_quien_vio.sql).
 * Solo con sesión: sin cuenta no se manda nada (queda la medición anónima de siempre). La base
 * decide todo lo demás (aviso visto, modo privado, autovisita, equipo); acá solo se evita mandar
 * dos veces lo mismo en el día. Nunca tira ni traba la página.
 */

export type ConfigFunciones = {
  visitas_activas: boolean;
  visitas_desde: string | null;
  pared_activa: boolean;
  pared_libres: number;
  traspaso_activo: boolean;
};

/** Si la config no llega (o falta la migración), todo apagado: nunca se traba a nadie. */
export const FUNCIONES_APAGADAS: ConfigFunciones = {
  visitas_activas: false,
  visitas_desde: null,
  pared_activa: false,
  pared_libres: 2,
  traspaso_activo: false,
};

/** Cada cuánto se vuelve a pedir: los interruptores de /admin llegan sin deploy. */
const CONFIG_VIGENTE_MS = 2 * 60 * 1000;
let config: { valor: Promise<ConfigFunciones>; hasta: number } | null = null;

/** Interruptores de /admin (anon, sin sesión). */
export function configFunciones(): Promise<ConfigFunciones> {
  const ahora = Date.now();
  if (config && config.hasta > ahora) return config.valor;
  const valor = (async () => {
    try {
      const { data, error } = await supabase.rpc("config_funciones");
      if (error || !data) throw error;
      return { ...FUNCIONES_APAGADAS, ...(data as Partial<ConfigFunciones>) };
    } catch {
      config = null; // reintenta en la próxima
      return FUNCIONES_APAGADAS;
    }
  })();
  config = { valor, hasta: ahora + CONFIG_VIGENTE_MS };
  return valor;
}

const CLAVE_DIA = "pecera:visitas-dia";

function leerDia(dia: string) {
  try {
    return delDia(JSON.parse(localStorage.getItem(CLAVE_DIA) ?? "null"), dia);
  } catch {
    return delDia(null, dia);
  }
}

function guardarDia(valor: ReturnType<typeof leerDia>) {
  try {
    localStorage.setItem(CLAVE_DIA, JSON.stringify(valor));
  } catch {}
}

/**
 * Registra que la cuenta vio un perfil, vio un pitch (3 s, el mismo criterio que las vistas) o le
 * dio pique. Sin sesión no hace nada.
 */
export function registrarVisita(tipo: TipoVisita, id: string): void {
  try {
    if (!hayCookieSesion()) return;
  } catch {
    return;
  }
  void (async () => {
    const { visitas_activas } = await configFunciones();
    if (!visitas_activas) return;
    const clave = claveVisita(tipo, id);
    const hoy = leerDia(diaBuenosAires());
    const nuevo = sumarClave(hoy, clave);
    if (!nuevo) return;
    guardarDia(nuevo);
    try {
      const { error } = await supabaseNavegador().rpc("registrar_visita", {
        p_tipo: tipo,
        p_perfil: tipo === "perfil" ? id : null,
        p_pitch: tipo === "perfil" ? null : id,
      });
      if (error) throw error;
    } catch {
      // Se reintenta la próxima vez que pase.
      guardarDia(sacarClave(leerDia(diaBuenosAires()), clave));
    }
  })();
}

/** Sacar el pique el mismo día borra la visita "te dio pique" de hoy. */
export function quitarVisitaPique(pitchId: string): void {
  try {
    if (!hayCookieSesion()) return;
  } catch {
    return;
  }
  void (async () => {
    const { visitas_activas } = await configFunciones();
    if (!visitas_activas) return;
    guardarDia(sacarClave(leerDia(diaBuenosAires()), claveVisita("pique", pitchId)));
    try {
      await supabaseNavegador().rpc("quitar_visita_pique", { p_pitch: pitchId });
    } catch {}
  })();
}
