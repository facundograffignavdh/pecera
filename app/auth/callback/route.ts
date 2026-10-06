import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/cuenta";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { COOKIE_TRASPASO, acreditarSinFallar } from "@/lib/traspaso";
import { AVISO_VISITAS } from "@/lib/visitas-dia";
import { COOKIE_VINCULO, vincularSinFallar } from "@/lib/vinculo";

/**
 * Vuelta de Google (PKCE): cambia el `code` por la sesión, que queda en cookies,
 * y vuelve a la página de origen (`next`). Si algo falla, a /cuenta con aviso.
 * Con la sesión ya hecha, vincula el dispositivo de la cookie de `entrar` (para las
 * métricas por rol): a prueba de fallas y con tope de 2 s, nunca cambia a dónde se va.
 * Igual con el traspaso de la sesión (cookie de `entrar` desde la pared): la base guarda el aviso
 * y recién ahí acredita.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destino = destinoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await supabaseConSesion();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // En paralelo: cada uno con su tope de 2 s y sin poder fallar.
      await Promise.all([vincularDesdeCookie(supabase), acreditarDesdeCookie(supabase)]);
      const respuesta = NextResponse.redirect(new URL(destino, origin));
      respuesta.cookies.set(COOKIE_VINCULO, "", { path: "/auth", maxAge: 0 });
      respuesta.cookies.set(COOKIE_TRASPASO, "", { path: "/auth", maxAge: 0 });
      return respuesta;
    }
    console.error(`Supabase (callback): ${error.code ?? ""} ${error.message}`);
  }

  return NextResponse.redirect(new URL("/cuenta?error=login", origin));
}

async function vincularDesdeCookie(supabase: Awaited<ReturnType<typeof supabaseConSesion>>) {
  try {
    await vincularSinFallar(supabase, (await cookies()).get(COOKIE_VINCULO)?.value);
  } catch {
    // El login sigue igual.
  }
}

async function acreditarDesdeCookie(supabase: Awaited<ReturnType<typeof supabaseConSesion>>) {
  try {
    await acreditarSinFallar(supabase, (await cookies()).get(COOKIE_TRASPASO)?.value, AVISO_VISITAS.version);
  } catch {
    // El login sigue igual.
  }
}
