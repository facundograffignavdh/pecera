"use server";

import { revalidatePath } from "next/cache";
import { type Resultado, SIN_SESION, traducir } from "@/lib/errores-base";
import { LIMITES_PRODUCTO, MAX_BYTES_IMAGEN_PRODUCTO, esTipoProducto } from "@/lib/producto";
import { borrarR2, hash8, subirR2 } from "@/lib/r2";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import { esUrlSegura } from "@/lib/transparencia";

/**
 * Producto / Servicio de la empresa desde /cuenta. Lo edita cualquier miembro. Las
 * imágenes van a R2 con clave `<empresaId>-<hash8>.jpg` (mismas reglas que la foto
 * del perfil) y solo la base decide cuáles quedan. Ninguna tira.
 */

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;

async function conSesion() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function miEmpresa(supabase: Supa): Promise<{ id: string; slug: string } | null> {
  const { data } = await supabase.rpc("mi_empresa");
  const fila = (data as Array<{ id: string; slug: string }> | null)?.[0];
  return fila ?? null;
}

function refrescar(slug: string) {
  revalidatePath("/cuenta");
  revalidatePath(`/e/${slug}`);
  revalidatePath(`/e/${slug}/one-pager`);
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function guardarProducto(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const tipo = texto(formData, "tipo");
  const campos = {
    nombre: texto(formData, "nombre"),
    propuesta: texto(formData, "propuesta"),
    problema: texto(formData, "problema"),
    solucion: texto(formData, "solucion"),
    para_quien: texto(formData, "para_quien"),
    como_usar: texto(formData, "como_usar"),
    demo_url: texto(formData, "demo_url"),
  };
  const caracteristicas = formData
    .getAll("caracteristicas")
    .map((c) => String(c).trim())
    .filter(Boolean);

  if (!esTipoProducto(tipo)) return { ok: false, mensaje: "Elegí si es un producto o un servicio." };
  if (!campos.nombre) return { ok: false, mensaje: "Poné el nombre del producto o servicio." };
  if (!campos.propuesta) return { ok: false, mensaje: "Contá en una línea qué es y para quién." };
  for (const [campo, valor] of Object.entries(campos)) {
    const max = LIMITES_PRODUCTO[campo as keyof typeof campos];
    if (valor.length > max) return { ok: false, mensaje: `Revisá el largo: hasta ${max} caracteres.` };
  }
  if (caracteristicas.length > LIMITES_PRODUCTO.caracteristicas) {
    return { ok: false, mensaje: `Hasta ${LIMITES_PRODUCTO.caracteristicas} características.` };
  }
  if (caracteristicas.some((c) => c.length > LIMITES_PRODUCTO.caracteristica)) {
    return { ok: false, mensaje: `Cada característica va hasta ${LIMITES_PRODUCTO.caracteristica} caracteres.` };
  }
  if (campos.demo_url && !esUrlSegura(campos.demo_url)) {
    return { ok: false, mensaje: "El link de la demo tiene que empezar con https://" };
  }

  const empresa = await miEmpresa(supabase);
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };

  const { error } = await supabase.rpc("guardar_producto", {
    p_tipo: tipo,
    p_nombre: campos.nombre,
    p_propuesta: campos.propuesta,
    p_problema: campos.problema || null,
    p_solucion: campos.solucion || null,
    p_para_quien: campos.para_quien || null,
    p_caracteristicas: caracteristicas,
    p_como_usar: campos.como_usar || null,
    p_demo_url: campos.demo_url || null,
  });
  if (error) return traducir(error, "guardar_producto");
  refrescar(empresa.slug);
  return { ok: true, mensaje: "Producto guardado." };
}

async function imagenesActuales(supabase: Supa, empresaId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("empresa_productos")
    .select("imagenes")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (error || !data) return null;
  return data.imagenes as string[];
}

/** Sube una imagen (ya achicada en el celular) y la suma al final de la lista. */
export async function subirImagenProducto(formData: FormData): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };

  const archivo = formData.get("imagen");
  if (!(archivo instanceof Blob) || archivo.size === 0 || archivo.size > MAX_BYTES_IMAGEN_PRODUCTO) {
    return { ok: false, mensaje: "La imagen no es válida o pesa demasiado." };
  }
  const cuerpo = await archivo.arrayBuffer();
  const inicio = new Uint8Array(cuerpo.slice(0, 3));
  if (archivo.type !== "image/jpeg" || inicio[0] !== 0xff || inicio[1] !== 0xd8 || inicio[2] !== 0xff) {
    return { ok: false, mensaje: "La imagen no es válida." };
  }

  const empresa = await miEmpresa(supabase);
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };
  const actuales = await imagenesActuales(supabase, empresa.id);
  if (!actuales) return { ok: false, mensaje: "Primero guardá el producto; después sumá las imágenes." };
  if (actuales.length >= LIMITES_PRODUCTO.imagenes) {
    return { ok: false, mensaje: `Hasta ${LIMITES_PRODUCTO.imagenes} imágenes. Quitá una para sumar otra.` };
  }

  let clave: string;
  try {
    clave = `${empresa.id}-${await hash8(cuerpo)}.jpg`;
    if (actuales.includes(clave)) return { ok: true, mensaje: "Esa imagen ya está." };
    await subirR2(clave, cuerpo, "image/jpeg");
  } catch (e) {
    console.error(`R2 (producto): ${(e as Error).message}`);
    return { ok: false, mensaje: "No pudimos subir la imagen. Probá de nuevo." };
  }

  const { error } = await supabase.rpc("poner_imagenes_producto", { p_imagenes: [...actuales, clave] });
  if (error) {
    // La clave nueva no quedó en ninguna fila: se borra ya.
    await borrarR2(clave).catch((e) => console.error(`R2 (producto): ${(e as Error).message}`));
    return traducir(error, "poner_imagenes_producto");
  }
  refrescar(empresa.slug);
  return { ok: true, mensaje: "Imagen subida." };
}

/** Quita una imagen; la base la anota para borrarla de R2 en una hora. */
export async function quitarImagenProducto(clave: string): Promise<Resultado> {
  const { supabase, user } = await conSesion();
  if (!user) return { ok: false, mensaje: SIN_SESION };
  const empresa = await miEmpresa(supabase);
  if (!empresa) return { ok: false, mensaje: "Primero creá o sumate a una empresa." };
  const actuales = await imagenesActuales(supabase, empresa.id);
  if (!actuales) return { ok: false, mensaje: "No encontramos el producto." };

  const { error } = await supabase.rpc("poner_imagenes_producto", {
    p_imagenes: actuales.filter((k) => k !== clave),
  });
  if (error) return traducir(error, "poner_imagenes_producto");
  refrescar(empresa.slug);
  return { ok: true, mensaje: "Imagen quitada." };
}
