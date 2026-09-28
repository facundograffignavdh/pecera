import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Rol, TipoPerfil } from "@/types/pecera";

/** Filtra "¿Qué sos?" según el rol elegido: menos ruido que las 7 opciones juntas. */
export const TIPOS_POR_ROL: Record<Rol, TipoPerfil[]> = {
  emprendedor: ["startup", "emprendimiento"],
  inversor: ["angel", "fondo"],
  aliado: ["aceleradora", "incubadora", "coach"],
};

export type DatosFormulario = {
  rol: Rol | null;
  tipo: TipoPerfil | null;
  nombre: string;
  descripcion: string;
  whatsapp: string;
  email: string;
  linkedin: string;
  instagram: string;
  web: string;
};

export const DATOS_VACIOS: DatosFormulario = {
  rol: null,
  tipo: null,
  nombre: "",
  descripcion: "",
  whatsapp: "",
  email: "",
  linkedin: "",
  instagram: "",
  web: "",
};

const CLAVE_DISPOSITIVO = "pecera:dispositivo";

/** uuid v4 a mano: `crypto.randomUUID` no existe fuera de https (ej. la IP de la LAN). */
function uuidAlAzar(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Mismo dispositivo anónimo que usan los piques: un uuid al azar en localStorage. */
function dispositivo(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (guardado) return guardado;
    const nuevo = uuidAlAzar();
    localStorage.setItem(CLAVE_DISPOSITIVO, nuevo);
    return nuevo;
  } catch {
    return uuidAlAzar();
  }
}

/**
 * Cliente propio y perezoso: a diferencia de lib/supabase.ts (que revienta al
 * importarse si faltan las env vars), /sumate no puede caerse entera por eso.
 * Sin las vars, el error queda contenido a este envío — no a toda la landing.
 */
let clienteCache: SupabaseClient | null = null;
function clienteSupabase(): SupabaseClient {
  if (clienteCache) return clienteCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Falta la configuración de Supabase.");
  clienteCache = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clienteCache;
}

/**
 * Guarda la postulación en Supabase (tabla `postulaciones`, vía la función
 * `crear_postulacion` — anon no toca la tabla directo). Sin video todavía:
 * el equipo lo coordina después por WhatsApp o email. Ver la migración
 * 20260928180000_postulaciones.sql.
 */
export async function enviarPostulacion(d: DatosFormulario): Promise<void> {
  if (!d.rol || !d.tipo) throw new Error("Falta el rol o el tipo de perfil.");

  const { error } = await clienteSupabase().rpc("crear_postulacion", {
    p_dispositivo: dispositivo(),
    p_rol: d.rol,
    p_tipo: d.tipo,
    p_nombre: d.nombre,
    p_descripcion: d.descripcion,
    p_whatsapp: d.whatsapp || null,
    p_email: d.email || null,
    p_linkedin: d.linkedin || null,
    p_instagram: d.instagram || null,
    p_web: d.web || null,
  });

  if (error) throw error;
}
