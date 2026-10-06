import { faltaMigracion } from "@/lib/datos";
import { urlMedia } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import { armarPitchesLanding, leerN, type FilaLanding } from "./forma";

/**
 * Pitches públicos para la landing (otro dominio): las mismas condiciones que el feed
 * (pitch publicado, perfil publicado y no oculto; los ocultos por su dueño los saca la RLS),
 * sin perfiles de prueba ni el oficial de Pecera, solo con poster. Campos en `forma.ts`.
 * Nunca falla: ante un error, 200 con lista vacía y la landing queda como siempre.
 */

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const NIVELES = ["slug, nombre, rol, descripcion, empresa:empresas(nombre)", "slug, nombre, rol, descripcion"];

/** Del seed vienen rutas `/...`: desde otro dominio necesitan el sitio adelante. */
function urlAbsoluta(clave: string): string {
  const url = urlMedia(clave);
  return url.startsWith("/") ? `${SITIO}${url}` : url;
}

async function leer(n: number) {
  const consulta = (columnas: string) =>
    supabase
      .from("pitches")
      .select(`id, poster_url, descripcion, perfil:perfiles!inner(${columnas})`)
      .eq("publicado", true)
      .eq("perfil.publicado", true)
      .eq("perfil.oculto", false)
      .not("perfil.slug", "like", "test-%")
      .neq("perfil.slug", "pecera")
      .not("poster_url", "is", null)
      .order("orden")
      .order("id")
      .limit(n)
      .overrideTypes<FilaLanding[], { merge: false }>();

  let resultado = await consulta(NIVELES[0]);
  if (faltaMigracion(resultado.error)) resultado = await consulta(NIVELES[1]);
  return resultado;
}

export async function GET(request: Request) {
  const n = leerN(new URL(request.url).searchParams.get("n"));
  let pitches: ReturnType<typeof armarPitchesLanding> = [];
  try {
    const { data, error } = await leer(n);
    if (error) console.error(`landing/pitches: ${error.code ?? ""} ${error.message}`);
    else pitches = armarPitchesLanding(data, urlAbsoluta);
  } catch (e) {
    console.error(`landing/pitches: ${e instanceof Error ? e.message : "error"}`);
  }

  return Response.json(
    { pitches },
    {
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
