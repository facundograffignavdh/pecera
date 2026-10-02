"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { detalleImagen, leerImagen } from "@/lib/foto";
import { FALLA_IMAGEN } from "@/lib/limites-imagen";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";
import { supabaseConSesion } from "@/lib/supabase-servidor";

async function conEmpresa() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, empresa: null } as const;
  const { data } = await supabase.rpc("mi_empresa");
  const empresa = (data as Array<{ id: string; slug: string }> | null)?.[0] ?? null;
  return { supabase, user, empresa } as const;
}

function refrescar(slug: string) {
  revalidatePath("/cuenta");
  revalidatePath("/explorar");
  revalidatePath(`/e/${slug}`);
  revalidatePath(`/e/${slug}/one-pager`);
  revalidatePath("/p/[slug]", "page");
}

/** Sube el logo (PNG o JPG) a R2 y lo deja como logo de la empresa. Nunca tira. */
export async function subirLogo(formData: FormData): Promise<Resultado> {
  const archivo = formData.get("logo");
  if (!(archivo instanceof Blob) || archivo.size === 0) return { ok: false, mensaje: "Elegí una imagen." };
  const leida = await leerImagen(archivo, ["jpg", "png"], "Logo");
  if ("falla" in leida) return { ok: false, mensaje: leida.falla };
  const { cuerpo } = leida;
  const png = leida.tipo === "png";

  const { supabase, user, empresa } = await conEmpresa();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };

  let clave: string;
  try {
    clave = `${empresa.id}-${await hash8(cuerpo)}.${png ? "png" : "jpg"}`;
    await subirR2(clave, cuerpo, png ? "image/png" : "image/jpeg");
  } catch (e) {
    console.error(`R2 (logo): ${(e as Error).message} (${detalleImagen(archivo)})`);
    return { ok: false, mensaje: FALLA_IMAGEN.nuestra };
  }
  const { error } = await supabase.rpc("poner_logo_empresa", { p_clave: clave });
  if (error) {
    console.error(`Supabase (poner_logo_empresa): ${error.code} ${error.message} (${clave})`);
    await borrarR2(clave).catch((e) => console.error(`R2 (logo): ${(e as Error).message}`));
    return { ok: false, mensaje: FALLA_IMAGEN.nuestra };
  }
  refrescar(empresa.slug);
  return { ok: true, mensaje: "Logo actualizado." };
}

export async function quitarLogo(): Promise<Resultado> {
  const { supabase, user, empresa } = await conEmpresa();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };
  const { error } = await supabase.rpc("poner_logo_empresa", { p_clave: null });
  if (error) return traducir(error, "poner_logo_empresa");
  refrescar(empresa.slug);
  return { ok: true, mensaje: "Sacamos el logo." };
}
