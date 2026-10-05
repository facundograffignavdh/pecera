import type { MiEmpresa } from "@/components/cuenta/TarjetaEmpresa";
import { faltaMigracion } from "@/lib/datos";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Las empresas de la sesión, para /cuenta y sus páginas. Solo servidor.
 *
 * multi_empresa: una persona está en hasta 5 empresas. La empresa con la que se
 * trabaja viaja en la URL (`?empresa=<slug>`) y en cada action (`empresa_id`), nunca
 * como "empresa activa" guardada: con dos pestañas abiertas, el autoguardado del
 * Dataroom escribiría en la equivocada. La base verifica la membresía en cada llamada.
 * Sin la migración, la única empresa (la de `mi_empresa`) hace de todo.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;

export type EmpresaMia = MiEmpresa & {
  /** La que va primero en el perfil y el reel (`perfiles.empresa_id`). */
  es_principal: boolean;
  /** Su cargo en esta empresa. */
  cargo: string | null;
  /** Tipo de empresa (persona_empresa); null si no lo cargaron o falta la migración. */
  tipo?: string | null;
};

export const MAX_EMPRESAS = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FilaMisEmpresas = Omit<MiEmpresa, "logo_url"> & {
  logo: string | null;
  logo_url: string | null;
  cargo: string | null;
  es_principal: boolean;
  tipo?: string | null;
};

/**
 * Todas las empresas de la sesión, la principal primero, con el logo ya como URL.
 * `multi` es false si la base no tiene multi_empresa; `disponible`, si no tiene
 * empresas (feria_lista).
 */
export async function leerMisEmpresas(supabase: Supa): Promise<{ empresas: EmpresaMia[]; multi: boolean; disponible: boolean }> {
  // persona_empresa suma el tipo; sin ella, la de multi_empresa.
  let multi = await supabase.rpc("mis_empresas_v2");
  if (faltaMigracion(multi.error)) multi = await supabase.rpc("mis_empresas");
  if (!faltaMigracion(multi.error)) {
    if (multi.error) console.error(`Supabase (mis_empresas): ${multi.error.message}`);
    const filas = (multi.data ?? []) as FilaMisEmpresas[];
    return {
      empresas: filas.map(({ logo, logo_url, ...e }) => {
        const clave = logo ?? logo_url;
        return { ...e, logo_url: clave ? urlMedia(clave) : null };
      }),
      multi: true,
      disponible: true,
    };
  }

  // Sin multi_empresa: la de siempre (con logo desde feria_pro).
  let una = await supabase.rpc("mi_empresa_v2");
  if (faltaMigracion(una.error)) una = await supabase.rpc("mi_empresa");
  if (faltaMigracion(una.error)) return { empresas: [], multi: false, disponible: false };
  if (una.error) console.error(`Supabase (mi_empresa): ${una.error.message}`);
  const fila = ((una.data ?? []) as MiEmpresa[])[0];
  if (!fila) return { empresas: [], multi: false, disponible: true };
  const logo = await supabase.from("empresa_logos").select("clave").eq("empresa_id", fila.id).maybeSingle();
  const clave = (logo.data?.clave as string | undefined) ?? fila.logo_url ?? null;
  return {
    empresas: [{ ...fila, logo_url: clave ? urlMedia(clave) : null, es_principal: true, cargo: null }],
    multi: false,
    disponible: true,
  };
}

/** La empresa pedida (por slug o id) si es de la sesión; si no, la principal. */
export function elegirEmpresa<T extends { id: string; slug: string }>(empresas: T[], clave?: unknown): T | null {
  const buscada = typeof clave === "string" ? clave : "";
  return empresas.find((e) => e.slug === buscada || e.id === buscada) ?? empresas[0] ?? null;
}

/**
 * Sesión, sus empresas y la elegida (`?empresa=`), para las páginas de /cuenta que
 * trabajan sobre una empresa. `disponible` es false si la base todavía no tiene la
 * migración dataroom.
 */
export async function cuentaConEmpresa(clave?: unknown) {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, empresas: [], empresa: null, multi: false, disponible: true } as const;

  const leidas = await leerMisEmpresas(supabase);
  const empresa = elegirEmpresa(leidas.empresas, clave);
  let disponible = leidas.disponible;
  if (empresa) {
    const prueba = await supabase.from("empresa_documentos").select("id").limit(1);
    disponible = !faltaMigracion(prueba.error);
  }
  return { supabase, user, empresas: leidas.empresas, empresa, multi: leidas.multi, disponible } as const;
}

/**
 * La empresa sobre la que actúa una action: la que mandó el form (`empresa_id`), si
 * es de la sesión. Sin multi_empresa, la única. null si no es suya (la base lo
 * rechazaría igual) o si no tiene empresa.
 */
export async function empresaParaAccion(
  supabase: Supa,
  empresaId: unknown
): Promise<(EmpresaMia & { multi: boolean }) | null> {
  const { empresas, multi } = await leerMisEmpresas(supabase);
  const empresa = !multi
    ? empresas[0]
    : typeof empresaId === "string" && UUID.test(empresaId)
      ? empresas.find((e) => e.id === empresaId)
      : undefined;
  return empresa ? { ...empresa, multi } : null;
}

/**
 * Llama la función `_en` de multi_empresa sobre esa empresa y, si la base todavía no
 * la tiene, la de siempre (que trabaja sobre la única empresa).
 */
export async function rpcEn(
  supabase: Supa,
  nueva: string,
  vieja: string,
  empresaId: string,
  args: Record<string, unknown>
) {
  const r = await supabase.rpc(nueva, { p_empresa: empresaId, ...args });
  if (!faltaMigracion(r.error)) return r;
  return supabase.rpc(vieja, args);
}
