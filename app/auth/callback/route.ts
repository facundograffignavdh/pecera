import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/cuenta";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * Vuelta de Google (PKCE): cambia el `code` por la sesión, que queda en cookies,
 * y vuelve a la página de origen (`next`). Si algo falla, a /cuenta con aviso.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destino = destinoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await supabaseConSesion();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, origin));
    console.error(`Supabase (callback): ${error.code ?? ""} ${error.message}`);
  }

  return NextResponse.redirect(new URL("/cuenta?error=login", origin));
}
