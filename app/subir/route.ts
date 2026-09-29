import { NextResponse, type NextRequest } from "next/server";
import { urlFormularioPitch } from "@/lib/cuenta";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/**
 * "Subí tu pitch": al Form de pitches con el email de la sesión precargado y esa
 * cuenta de Google elegida. Sin sesión, a /cuenta para entrar.
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.redirect(new URL("/cuenta", request.nextUrl.origin));
  return NextResponse.redirect(urlFormularioPitch(user.email));
}
