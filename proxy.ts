import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase. Solo corre en /cuenta, /auth y /subir: las páginas
 * públicas no pasan por acá y siguen estáticas.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(nuevas, encabezados) {
          for (const { name, value } of nuevas) request.cookies.set(name, value);
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of nuevas) {
            respuesta.cookies.set(name, value, options);
          }
          for (const [clave, valor] of Object.entries(encabezados)) {
            respuesta.headers.set(clave, valor);
          }
        },
      },
    }
  );

  // Valida el token con Supabase y, si venció, lo renueva (vía setAll).
  await supabase.auth.getUser();

  return respuesta;
}

export const config = {
  matcher: ["/cuenta/:path*", "/auth/:path*", "/subir"],
};
