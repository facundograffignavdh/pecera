import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente del navegador CON la sesión (cookies de @supabase/ssr). Solo para lo que
 * necesita saber quién sos en el navegador: Realtime de /cuenta y /cuenta/empresa.
 * Lo público sigue con lib/supabase.ts (anon, sin sesión).
 */
let cliente: SupabaseClient | null = null;

export function supabaseNavegador(): SupabaseClient {
  cliente ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return cliente;
}
