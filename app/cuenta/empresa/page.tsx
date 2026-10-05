import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import EnVivo from "@/components/EnVivo";
import PieLegal from "@/components/PieLegal";
import { EmpresaActual } from "@/components/cuenta/EmpresaActual";
import PanelEmpresa, { type Miembro, type Pestana } from "@/components/cuenta/PanelEmpresa";
import SelectorEmpresa from "@/components/cuenta/SelectorEmpresa";
import TarjetaBuild from "@/components/cuenta/TarjetaBuild";
import TarjetaProducto, { type ImagenPropia } from "@/components/cuenta/TarjetaProducto";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { type Avance, type Hito, calcularRacha } from "@/lib/build";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa, rpcEn } from "@/lib/cuenta-empresa";
import { faltaMigracion } from "@/lib/datos";
import { labelTipoEmpresa } from "@/lib/etiquetas";
import { urlMedia } from "@/lib/media";
import type { Producto } from "@/lib/producto";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { DatoEmpresa } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Administrar empresa — Pecera",
  robots: { index: false },
};

const PESTANAS: Pestana[] = ["info", "logo", "contacto", "equipo", "producto", "build", "metricas"];

type Supa = Awaited<ReturnType<typeof supabaseConSesion>>;

/**
 * Administrar una empresa (desde "Administrar" en Mi perfil): pestañas de
 * Información, Logo y marca, Contacto, Equipo, Producto, Build in Public y Métricas
 * y documentos. Con varias empresas, la de `?empresa=` (o la principal) y el
 * selector para cambiar; `?pestana=` abre una pestaña.
 */
export default async function EmpresaCuentaPage({ searchParams }: PageProps<"/cuenta/empresa">) {
  const { empresa: pedida, pestana } = await searchParams;
  const { supabase, user, empresas, empresa, multi } = await cuentaConEmpresa(pedida);
  if (!user) redirect("/cuenta");
  // Sin empresas: se crean (o se suma con código) desde Mi perfil.
  if (!empresa) redirect("/cuenta#seccion-empresas");

  const [m, d, producto, build] = await Promise.all([
    rpcEn(supabase, "miembros_de_empresa", "miembros_mi_empresa", empresa.id, {}),
    rpcEn(supabase, "mis_datos_en", "mis_datos_empresa", empresa.id, {}),
    leerProducto(supabase, empresa.id),
    leerBuild(supabase, empresa.id),
  ]);
  if (m.error && !faltaMigracion(m.error)) console.error(`Supabase (miembros_de_empresa): ${m.error.message}`);
  if (d.error && !faltaMigracion(d.error)) console.error(`Supabase (mis_datos_en): ${d.error.message}`);
  const miembros = ((m.data ?? []) as Miembro[]).map((x) => ({ ...x, avatar_url: x.avatar_url && urlMedia(x.avatar_url) }));
  const datos = (d.data ?? []) as DatoEmpresa[];
  const inicial = PESTANAS.find((p) => p === pestana) ?? "info";
  const tipo = labelTipoEmpresa(empresa.tipo);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-4xl">
        <Link href="/cuenta" className="inline-flex min-h-11 items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Mi perfil
        </Link>

        <EmpresaActual empresa={{ id: empresa.id, slug: empresa.slug }}>
          {empresas.length > 1 && (
            <div className="mt-4">
              <SelectorEmpresa empresas={empresas} actual={empresa.id} ruta="/cuenta/empresa" />
            </div>
          )}
          <header className="aparecer mt-6 flex items-center gap-4">
            <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={64} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">
                Administrar{tipo ? ` · ${tipo}` : ""}
              </p>
              <h1 className="truncate font-display text-3xl font-semibold leading-tight text-tinta">{empresa.nombre}</h1>
            </div>
          </header>
          {multi ? (
            <EnVivo canal={`equipo-${empresa.id}`} filtro={`empresa_id=eq.${empresa.id}`} tabla="empresa_miembros" />
          ) : (
            <EnVivo canal={`empresa-${empresa.id}`} filtro={`empresa_id=eq.${empresa.id}`} />
          )}
          <div className="mt-6">
            {/* key: al cambiar de empresa, los formularios arrancan de cero. */}
            <PanelEmpresa
              key={empresa.id}
              empresa={empresa}
              miembros={miembros}
              datos={datos}
              multi={multi}
              inicial={inicial}
              producto={
                producto && (
                  <TarjetaProducto producto={producto.producto} imagenes={producto.imagenes} slugEmpresa={empresa.slug} />
                )
              }
              build={
                build && (
                  <TarjetaBuild
                    hitos={build.hitos}
                    avances={build.avances.slice(0, 20)}
                    racha={calcularRacha(
                      build.avances.map((a) => a.created_at),
                      new Date()
                    )}
                  />
                )
              }
              dataroomHref={build ? conEmpresa("/cuenta/dataroom", empresas.length > 1 ? empresa.slug : null) : null}
            />
          </div>
        </EmpresaActual>

        <PieLegal tono="claro" className="mt-12 pb-8" />
      </div>
    </main>
  );
}

/** Producto de la empresa con las URLs de las imágenes. null sin la migración. */
async function leerProducto(
  supabase: Supa,
  empresaId: string
): Promise<{ producto: Producto | null; imagenes: ImagenPropia[] } | null> {
  const { data, error } = await supabase
    .from("empresa_productos")
    .select("tipo, nombre, propuesta, problema, solucion, para_quien, caracteristicas, como_usar, demo_url, imagenes")
    .eq("empresa_id", empresaId)
    .maybeSingle()
    .overrideTypes<Producto | null, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (leerProducto): ${error.message}`);
    return null;
  }
  return {
    producto: data,
    imagenes: (data?.imagenes ?? []).map((clave) => ({ clave, url: urlMedia(clave) })),
  };
}

/** Build in Public de la empresa (los miembros lo leen aunque no sea visible). null sin la migración. */
async function leerBuild(supabase: Supa, empresaId: string): Promise<{ hitos: Hito[]; avances: Avance[] } | null> {
  const [hitos, avances] = await Promise.all([
    supabase
      .from("empresa_hitos")
      .select("id, titulo, detalle, etapa, estado, progreso, fecha, created_at")
      .eq("empresa_id", empresaId)
      .overrideTypes<Hito[], { merge: false }>(),
    supabase
      .from("empresa_avances")
      .select("id, texto, hito_id, created_at")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(120)
      .overrideTypes<Avance[], { merge: false }>(),
  ]);
  const error = hitos.error ?? avances.error;
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (leerBuild): ${error.message}`);
    return null;
  }
  return { hitos: hitos.data ?? [], avances: avances.data ?? [] };
}
