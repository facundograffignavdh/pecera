import { faltaMigracion } from "@/lib/datos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Sesión, perfil y empresa para las páginas de /cuenta que trabajan sobre la
 * empresa (Dataroom). Solo servidor. `disponible` es false si la base todavía no
 * tiene la migración dataroom.
 */
export async function cuentaConEmpresa() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, empresa: null, disponible: true } as const;

  const { data, error } = await supabase.rpc("mi_empresa");
  const empresa = (data as Array<{ id: string; slug: string; nombre: string; visible: boolean }> | null)?.[0] ?? null;
  if (error && !faltaMigracion(error)) console.error(`Supabase (mi_empresa): ${error.message}`);

  let disponible = !faltaMigracion(error);
  if (empresa) {
    const prueba = await supabase.from("empresa_documentos").select("id").limit(1);
    disponible = !faltaMigracion(prueba.error);
  }
  return { supabase, user, empresa, disponible } as const;
}
