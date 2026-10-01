import type { Metadata } from "next";
import Link from "next/link";
import BotonCopiar from "@/components/BotonCopiar";
import BotonSalir from "@/components/BotonSalir";
import Encabezado from "@/components/Encabezado";
import FormPerfil, { type PerfilPropio } from "@/components/FormPerfil";
import MisPitches, { type MiPitch } from "@/components/MisPitches";
import PieLegal from "@/components/PieLegal";
import RecordarCuenta from "@/components/RecordarCuenta";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import AccionesPitch from "@/components/cuenta/AccionesPitch";
import CompletarPerfil from "@/components/cuenta/CompletarPerfil";
import TarjetaBuild from "@/components/cuenta/TarjetaBuild";
import TarjetaEmpresa, { type MiEmpresa } from "@/components/cuenta/TarjetaEmpresa";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import EnVivo from "@/components/EnVivo";
import TarjetaEvento from "@/components/cuenta/TarjetaEvento";
import TarjetaNFC from "@/components/cuenta/TarjetaNFC";
import TarjetaPortafolio from "@/components/cuenta/TarjetaPortafolio";
import RelacionesPendientes, { type RelacionPendiente } from "@/components/cuenta/RelacionesPendientes";
import TarjetaNewsletter from "@/components/cuenta/TarjetaNewsletter";
import TarjetaPortfolio from "@/components/cuenta/TarjetaPortfolio";
import TarjetaServicios from "@/components/cuenta/TarjetaServicios";
import TarjetaTesis from "@/components/cuenta/TarjetaTesis";
import TarjetaProducto, { type ImagenPropia } from "@/components/cuenta/TarjetaProducto";
import { entrar } from "@/app/cuenta/acciones";
import { type Avance, type Hito, calcularRacha } from "@/lib/build";
import { urlPerfil } from "@/lib/cuenta";
import type { CuentaLocal } from "@/lib/cuenta-local";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import type { NewsletterLink } from "@/lib/newsletter";
import { COLUMNAS_PORTFOLIO, type EntradaPortfolio, type Servicio, type Tesis } from "@/lib/portfolio";
import type { Producto } from "@/lib/producto";
import { ROLES } from "@/lib/rol";
import { boton } from "@/lib/ui";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { ItemPortafolio, Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi perfil — Pecera",
  robots: { index: false },
};

const COLUMNAS_BASE =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado, oculto";
const COLUMNAS_LISTA = `${COLUMNAS_BASE}, etapa, ronda, industrias, cargo, especialidades, ticket, rondas_interes, empresa_id`;
const COLUMNAS = `${COLUMNAS_LISTA}, busca_cofundador, cofundador_aporta, cofundador_busca, cofundador_dedicacion, cofundador_nota, ubicacion, experiencia, educacion, skills, busca, ofrece`;

const BOTON_PRIMARIO = boton("primario", "lg");

export default async function CuentaPage({ searchParams }: PageProps<"/cuenta">) {
  const { error, creado, foto, rol } = await searchParams;
  const rolInicial = typeof rol === "string" && rol in ROLES ? (rol as Rol) : undefined;
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: PerfilPropio | null = null;
  if (user) {
    const leer = (columnas: string) =>
      supabase
        .from("perfiles")
        .select(columnas)
        .eq("usuario_id", user.id)
        .maybeSingle()
        .overrideTypes<PerfilPropio | null, { merge: false }>();
    // En cascada: feria_pro → feria_lista → lo de siempre.
    let { data, error: errorLectura } = await leer(COLUMNAS);
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_LISTA));
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_BASE));
    if (errorLectura) throw new Error(`Supabase (cuenta): ${errorLectura.message}`);
    perfil = data && { ...data, avatar_url: data.avatar_url && urlMedia(data.avatar_url) };
  }

  // Empresa, transparencia y evento: extras de feria_lista. Si la base todavía no
  // los tiene (o fallan), la cuenta se edita igual.
  const [extras, esAdmin] = await Promise.all([
    user && perfil ? leerExtras(supabase) : null,
    user ? esDelEquipo(supabase) : false,
  ]);

  // "Mis pitches" es un extra: si falla, se edita el perfil igual.
  // Con la migración pitch_build_producto_newsletter, la versión con ocultos y las
  // acciones de editar/ocultar; si no, la de siempre.
  let misPitches: MiPitch[] = [];
  let pitchesEditables = false;
  if (user) {
    const detalle = await supabase.rpc("mis_pitches_detalle");
    if (!detalle.error) {
      misPitches = (detalle.data ?? []) as MiPitch[];
      pitchesEditables = true;
    } else {
      if (!faltaMigracion(detalle.error)) {
        console.error(`Supabase (mis_pitches_detalle): ${detalle.error.message}`);
      }
      const { data, error: errorPitches } = await supabase.rpc("mis_pitches");
      if (errorPitches) console.error(`Supabase (mis_pitches): ${errorPitches.message}`);
      else misPitches = (data ?? []) as MiPitch[];
    }
  }

  const conPortfolio = perfil?.rol === "inversor" || perfil?.rol === "aliado";
  const [news, portfolio, pendientes] = await Promise.all([
    perfil ? leerNewsletter(supabase, perfil.id) : null,
    perfil && conPortfolio ? leerPortfolio(supabase, perfil.id) : null,
    perfil?.empresa_id ? leerPendientes(supabase) : [],
  ]);

  // Dato chico y público para la píldora y el "Editar perfil" de las páginas
  // estáticas. Nada de email ni ids.
  const cuentaLocal: CuentaLocal | null = user
    ? {
        perfil: perfil && {
          slug: perfil.slug,
          nombre: perfil.nombre,
          rol: perfil.rol,
          avatar: perfil.avatar_url,
          visible: perfil.publicado && !perfil.oculto,
        },
      }
    : null;

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <RecordarCuenta cuenta={cuentaLocal} />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] md:max-w-2xl lg:max-w-6xl lg:px-8">
        <EnlaceVolver href="/" />

        {!user ? (
          <section className="mx-auto mt-8 flex max-w-md flex-col gap-4">
            <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
              Tu perfil en Pecera
            </h1>
            <p className="leading-relaxed text-tinta/80">
              Entrá con tu cuenta de Google para crear tu perfil o editarlo.
            </p>
            <AvisoNavegadorInterno />
            {error === "login" && (
              <p
                role="alert"
                className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta"
              >
                No pudimos entrar con tu cuenta de Google. Probá de nuevo.
              </p>
            )}
            {rolInicial && (
              <p className="flex items-center gap-2 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${ROLES[rolInicial].bg}`} />
                <span>
                  Vas a entrar como <strong className="font-semibold">{ROLES[rolInicial].label}</strong>. Lo
                  podés cambiar después.
                </span>
              </p>
            )}
            <form action={entrar} className="mt-2 flex flex-col gap-2">
              <input
                type="hidden"
                name="next"
                value={rolInicial ? `/cuenta?rol=${rolInicial}` : "/cuenta"}
              />
              <button type="submit" className={BOTON_PRIMARIO}>
                Entrar con Google
              </button>
              <p className="text-center text-sm leading-relaxed text-tinta/70">
                Google te va a pedir que confirmes tu cuenta. Vas a ver una dirección de
                Supabase: es el servicio que usa Pecera para las cuentas.
              </p>
            </form>
          </section>
        ) : (
          <section className="mt-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="no-scrollbar flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pb-2">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
                {perfil ? "Mi perfil" : "Creá tu perfil"}
              </h1>
              <p className="break-all text-sm text-tinta/70">Entraste como {user.email}</p>
            </div>

            {perfil && creado === "1" ? (
              <Creado perfil={perfil} fotoFallo={foto === "error"} />
            ) : (
              perfil && <Estado perfil={perfil} />
            )}

            <EnVivo canal={`perfil-${user.id}`} filtro={`usuario_id=eq.${user.id}`} />
            {perfil && (
              <CompletarPerfil
                perfil={perfil}
                pitches={misPitches}
                conEmpresa={extras?.disponible ? !!extras.empresa : null}
                portfolio={
                  portfolio && {
                    entradas: portfolio.entradas.length,
                    servicios: portfolio.servicios.length,
                    tesis: !!portfolio.tesis?.texto,
                  }
                }
              />
            )}
            {perfil && <TarjetaNFC slug={perfil.slug} completo={null} />}
            </div>

            <div className="flex min-w-0 flex-col gap-6">
            <MisPitches
              pitches={misPitches}
              email={user.email ?? ""}
              conPerfil={!!perfil}
              claseBoton={BOTON_PRIMARIO}
              acciones={
                pitchesEditables
                  ? (p, compacto) => (
                      <AccionesPitch
                        id={p.id}
                        descripcion={p.descripcion}
                        oculto={p.estado === "oculto"}
                        compacto={compacto}
                      />
                    )
                  : undefined
              }
            />

            <FormPerfil
              key={perfil?.id ?? "nuevo"}
              perfil={perfil}
              rolInicial={rolInicial}
              empresa={extras?.empresa ? { slug: extras.empresa.slug, nombre: extras.empresa.nombre } : null}
            />

            {perfil && extras?.disponible && (
              <>
                {extras.portafolio && <TarjetaPortafolio items={extras.portafolio} rol={perfil.rol} />}
                <TarjetaEmpresa empresa={extras.empresa} logo={extras.logo} />
                {extras.empresa && extras.producto && (
                  <TarjetaProducto
                    producto={extras.producto.producto}
                    imagenes={extras.producto.imagenes}
                    slugEmpresa={extras.empresa.slug}
                  />
                )}
                {extras.empresa && extras.build && (
                  <TarjetaBuild
                    hitos={extras.build.hitos}
                    avances={extras.build.avances.slice(0, 20)}
                    racha={calcularRacha(
                      extras.build.avances.map((a) => a.created_at),
                      new Date()
                    )}
                  />
                )}
                {extras.empresa && extras.build && (
                  <Link
                    href="/cuenta/dataroom"
                    className="flex min-h-16 items-center justify-between gap-3 rounded-3xl bg-tinta px-5 py-4 text-marfil transition-opacity duration-200 ease-pecera hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                  >
                    <span>
                      <span className="block font-display text-xl font-semibold">Dataroom</span>
                      <span className="block text-sm text-marfil/75">
                        Templates, documentos y métricas, ordenados para un inversor. Exportalo en PDF.
                      </span>
                    </span>
                    <span aria-hidden>&rarr;</span>
                  </Link>
                )}
                <TarjetaEvento participa={extras.participa} rol={perfil.rol} />
              </>
            )}

            <RelacionesPendientes relaciones={pendientes} />

            {perfil && portfolio && (
              <>
                {perfil.rol === "inversor" && <TarjetaTesis tesis={portfolio.tesis} />}
                {perfil.rol === "aliado" && <TarjetaServicios servicios={portfolio.servicios} />}
                <TarjetaPortfolio rol={perfil.rol} entradas={portfolio.entradas} />
              </>
            )}

            {news?.disponible && <TarjetaNewsletter newsletter={news.newsletter} />}

            {esAdmin && (
              <Link
                href="/admin"
                className="flex min-h-12 items-center justify-between rounded-2xl bg-tinta px-4 text-marfil"
              >
                <span className="font-medium">Panel del equipo</span>
                <span aria-hidden>&rarr;</span>
              </Link>
            )}

            <BotonSalir />
            </div>
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

type Extras = {
  disponible: boolean;
  empresa: MiEmpresa | null;
  participa: boolean;
  /** null si la base todavía no tiene feria_pro: la tarjeta no se muestra. */
  portafolio: ItemPortafolio[] | null;
  /** null: la base todavía no tiene Build in Public (o falló la lectura). */
  build: { hitos: Hito[]; avances: Avance[] } | null;
  /** null: la base todavía no tiene productos. `producto` null: no lo cargaron. */
  producto: { producto: Producto | null; imagenes: ImagenPropia[] } | null;
  /** undefined: la base no tiene logos; null: sin logo. */
  logo?: string | null;
};

async function leerLogo(
  supabase: Awaited<ReturnType<typeof supabaseConSesion>>,
  empresaId: string
): Promise<string | null | undefined> {
  const { data, error } = await supabase.from("empresa_logos").select("clave").eq("empresa_id", empresaId).maybeSingle();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (leerLogo): ${error.message}`);
    return undefined;
  }
  return data?.clave ? urlMedia(data.clave as string) : null;
}

async function leerProducto(
  supabase: Awaited<ReturnType<typeof supabaseConSesion>>,
  empresaId: string
): Promise<Extras["producto"]> {
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

/** Build in Public de la empresa propia (los miembros lo leen aunque no sea visible). */
async function leerBuild(
  supabase: Awaited<ReturnType<typeof supabaseConSesion>>,
  empresaId: string
): Promise<Extras["build"]> {
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

async function leerExtras(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<Extras> {
  const [v2, evento, portafolio] = await Promise.all([
    supabase.rpc("mi_empresa_v2"),
    supabase.rpc("mi_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("mi_portafolio"),
  ]);
  // Sin feria_pro, la empresa sale de mi_empresa (sin logo).
  const empresa = faltaMigracion(v2.error) ? await supabase.rpc("mi_empresa") : v2;
  if (faltaMigracion(empresa.error)) {
    return { disponible: false, empresa: null, participa: false, build: null, producto: null, portafolio: null };
  }
  for (const [donde, r] of [
    ["mi_empresa", empresa],
    ["mi_evento", evento],
  ] as const) {
    if (r.error) console.error(`Supabase (${donde}): ${r.error.message}`);
  }
  if (portafolio.error && !faltaMigracion(portafolio.error)) {
    console.error(`Supabase (mi_portafolio): ${portafolio.error.message}`);
  }
  const fila = ((empresa.data as MiEmpresa[] | null) ?? [])[0] ?? null;
  const filaEvento = (evento.data as Array<{ participa: boolean }> | null)?.[0];
  // logo_url (feria_pro) llega como clave: se arma la URL.
  const miEmpresa = fila && { ...fila, logo_url: fila.logo_url ? urlMedia(fila.logo_url) : null };
  return {
    disponible: true,
    ...(miEmpresa
      ? await Promise.all([
          leerBuild(supabase, miEmpresa.id),
          leerProducto(supabase, miEmpresa.id),
          leerLogo(supabase, miEmpresa.id),
        ]).then(([build, producto, logo]) => ({ build, producto, logo: logo === undefined ? undefined : (logo ?? miEmpresa.logo_url ?? null) }))
      : { build: null, producto: null }),
    empresa: miEmpresa,
    participa: !!filaEvento?.participa,
    portafolio: portafolio.error ? null : ((portafolio.data ?? []) as ItemPortafolio[]),
  };
}

type DatosPortfolio = {
  entradas: EntradaPortfolio[];
  servicios: Servicio[];
  tesis: Tesis | null;
};

/** Portfolio, servicios y tesis propios (inversores y aliados). null sin la migración. */
async function leerPortfolio(
  supabase: Awaited<ReturnType<typeof supabaseConSesion>>,
  perfilId: string
): Promise<DatosPortfolio | null> {
  const [entradas, servicios, tesis] = await Promise.all([
    supabase
      .from("portfolio")
      .select(`${COLUMNAS_PORTFOLIO}, empresa:empresas(slug, nombre)`)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .overrideTypes<EntradaPortfolio[], { merge: false }>(),
    supabase
      .from("perfil_servicios")
      .select("id, nombre, categoria, descripcion, modalidad, precio")
      .eq("perfil_id", perfilId)
      .order("orden")
      .overrideTypes<Servicio[], { merge: false }>(),
    supabase
      .from("perfil_tesis")
      .select("texto, geografias, modelos, busca")
      .eq("perfil_id", perfilId)
      .maybeSingle()
      .overrideTypes<Tesis | null, { merge: false }>(),
  ]);
  const error = entradas.error ?? servicios.error ?? tesis.error;
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (leerPortfolio): ${error.message}`);
    return null;
  }
  return { entradas: entradas.data ?? [], servicios: servicios.data ?? [], tesis: tesis.data };
}

/** Relaciones que nombran a la empresa propia y esperan respuesta. Vacío si no hay. */
async function leerPendientes(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<RelacionPendiente[]> {
  const { data, error } = await supabase.rpc("relaciones_pendientes");
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (relaciones_pendientes): ${error.message}`);
    return [];
  }
  return (data as RelacionPendiente[] | null) ?? [];
}

/** Link a la newsletter propia. `disponible` es false si la base no tiene la migración. */
async function leerNewsletter(
  supabase: Awaited<ReturnType<typeof supabaseConSesion>>,
  perfilId: string
): Promise<{ disponible: boolean; newsletter: NewsletterLink | null }> {
  const { data, error } = await supabase
    .from("perfil_newsletter")
    .select("url, titulo")
    .eq("perfil_id", perfilId)
    .maybeSingle()
    .overrideTypes<NewsletterLink | null, { merge: false }>();
  if (error) {
    if (!faltaMigracion(error)) console.error(`Supabase (perfil_newsletter): ${error.message}`);
    return { disponible: false, newsletter: null };
  }
  return { disponible: true, newsletter: data };
}

/** El link al panel solo se muestra al equipo; el panel igual lo vuelve a chequear. */
async function esDelEquipo(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<boolean> {
  const { data, error } = await supabase.rpc("es_admin");
  if (error && !faltaMigracion(error)) console.error(`Supabase (es_admin): ${error.message}`);
  return data === true;
}

/** La primera vez: el perfil está creado, su dirección para copiar y su estado. */
function Creado({ perfil, fotoFallo }: { perfil: PerfilPropio; fotoFallo: boolean }) {
  const url = urlPerfil(perfil.slug);
  return (
    <section
      aria-labelledby="creado-titulo"
      className="flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-tinta/5 px-4 py-4 text-tinta"
    >
      <h2 id="creado-titulo" className="font-display text-xl font-semibold leading-tight">
        ¡Listo, tu perfil está creado!
      </h2>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-tinta/70">Tu dirección en Pecera</p>
        <p className="break-all font-semibold">{url}</p>
      </div>
      <BotonCopiar
        texto={url}
        etiqueta="Copiar dirección"
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-naranja px-5 text-sm font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
      />
      {fotoFallo && (
        <p className="text-sm font-medium">
          No pudimos guardar tu foto. Volvé a subirla desde el formulario de abajo.
        </p>
      )}
      <Estado perfil={perfil} />
    </section>
  );
}

/** Estado de publicación, en tono neutro: que no esté publicado no es un error. */
function Estado({ perfil }: { perfil: PerfilPropio }) {
  let texto: string;
  if (!perfil.publicado) {
    texto = "Tu perfil se va a publicar pronto. Mientras, podés dejarlo listo.";
  } else if (perfil.oculto) {
    texto = "Tu perfil está oculto: nadie lo ve hasta que lo vuelvas a mostrar.";
  } else {
    texto = "Tu perfil está publicado.";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
      <p>{texto}</p>
      {perfil.publicado && !perfil.oculto && (
        <Link
          href={`/p/${perfil.slug}`}
          className="self-start font-medium underline underline-offset-4 hover:text-arcilla"
        >
          Ver mi perfil
        </Link>
      )}
    </div>
  );
}
