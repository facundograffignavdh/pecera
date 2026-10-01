"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";
import { supabaseConSesion } from "@/lib/supabase-servidor";

/** El celular ya lo achicó a 512 px en PNG: sobra margen. */
const MAX_BYTES_LOGO = 400 * 1024;

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
  if (!(archivo instanceof Blob) || archivo.size === 0 || archivo.size > MAX_BYTES_LOGO) {
    return { ok: false, mensaje: "El logo no es válido o pesa demasiado." };
  }
  const cuerpo = await archivo.arrayBuffer();
  const b = new Uint8Array(cuerpo.slice(0, 4));
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (!png && !jpg) return { ok: false, mensaje: "El logo tiene que ser una imagen PNG o JPG." };

  const { supabase, user, empresa } = await conEmpresa();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };

  let clave: string;
  try {
    clave = `${empresa.id}-${await hash8(cuerpo)}.${png ? "png" : "jpg"}`;
    await subirR2(clave, cuerpo, png ? "image/png" : "image/jpeg");
  } catch (e) {
    console.error(`R2 (logo): ${(e as Error).message}`);
    return { ok: false, mensaje: "No pudimos subir el logo. Probá de nuevo." };
  }
  const { error } = await supabase.rpc("poner_logo_empresa", { p_clave: clave });
  if (error) {
    await borrarR2(clave).catch((e) => console.error(`R2 (logo): ${(e as Error).message}`));
    return traducir(error, "poner_logo_empresa");
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
