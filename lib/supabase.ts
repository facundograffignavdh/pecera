import { createClient } from "@supabase/supabase-js";

// Nombres literales: Next solo inyecta las NEXT_PUBLIC_* si aparecen así.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_URL: cargala en .env.local (local) o en las variables de entorno de Vercel."
  );
}
if (!anonKey) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY: cargala en .env.local (local) o en las variables de entorno de Vercel."
  );
}

/** Cliente único, solo lectura con la anon key. Sin login: no hay sesión que guardar. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
