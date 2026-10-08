import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase. Corre en /cuenta, /auth, /subir, /admin,
 * /eventos (por las actions de votación), /cofundadores (por la action que guarda
 * busca/ofrece desde Networking) y /organizacion (el panel de la Universidad). El
 * feed, los perfiles y las empresas no pasan por acá y siguen estáticos. El proxy
 * no hace dinámica a una página: solo renueva la cookie si vence.
 *
 * El juego del stand se comparte como "/Tarjetas": cualquier mayúscula va a /tarjetas. Va acá y no en
 * `redirects()` de next.config porque esas comparan sin distinguir mayúsculas (/tarjetas entraba en bucle).
 * /tarjetas no necesita sesión: pasa de largo.
 */
export async function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  if (ruta.toLowerCase() === "/tarjetas") {
    if (ruta === "/tarjetas") return NextResponse.next();
    const destino = request.nextUrl.clone();
    destino.pathname = "/tarjetas";
    return NextResponse.redirect(destino);
  }

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
  matcher: [
    "/cuenta/:path*",
    "/auth/:path*",
    "/subir",
    "/admin/:path*",
    "/eventos/:path*",
    "/cofundadores",
    "/organizacion/:path*",
    "/Tarjetas",
    "/TARJETAS",
  ],
};
