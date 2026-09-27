import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente con la sesión del usuario (cookies). Solo para /cuenta y /auth: el feed
 * y los perfiles públicos usan `lib/supabase.ts` y no leen cookies, así siguen
 * estáticos. Uno nuevo por request.
 */
export async function supabaseConSesion() {
  const almacen = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll(nuevas) {
          // Desde una página no se pueden escribir cookies; el proxy ya refrescó
          // la sesión antes, así que se puede ignorar.
          try {
            for (const { name, value, options } of nuevas) {
              almacen.set(name, value, options);
            }
          } catch {}
        },
      },
    }
  );
}
