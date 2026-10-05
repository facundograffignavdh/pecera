import type { Metadata } from "next";
import Link from "next/link";
import BotonCopiar from "@/components/BotonCopiar";
import BotonSalir from "@/components/BotonSalir";
import Encabezado from "@/components/Encabezado";
import { EtiquetasPerfil } from "@/components/Etiquetas";
import MisPitches, { type MiPitch } from "@/components/MisPitches";
import PieLegal from "@/components/PieLegal";
import AvisoEntrar from "@/components/AvisoEntrar";
import RecordarCuenta from "@/components/RecordarCuenta";
import SelectorTema from "@/components/SelectorTema";
import BuildPublico from "@/components/build/BuildPublico";
import AccionesPitch from "@/components/cuenta/AccionesPitch";
import AltaPerfil from "@/components/cuenta/AltaPerfil";
import AvisoCuentaPersonal from "@/components/cuenta/AvisoCuentaPersonal";
import CompletarPerfil from "@/components/cuenta/CompletarPerfil";
import EmpresasDueno from "@/components/cuenta/EmpresasDueno";
import ResaltarAncla from "@/components/cuenta/ResaltarAncla";
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
import NewsletterPerfil from "@/components/newsletter/NewsletterPerfil";
import { BloqueBuscaOfrece, BloqueCofundador, BloquePortafolio, BloqueTrayectoria, SUBTITULO } from "@/components/perfil/Bloques";
import VistaPerfil, { type DatosVistaPerfil } from "@/components/perfil/VistaPerfil";
import EditorFicha from "@/components/perfil/editores/EditorFicha";
import {
  EditorBuscaOfrece,
  EditorCofundador,
  EditorEtiquetas,
  EditorTrayectoria,
} from "@/components/perfil/editores/EditoresSecciones";
import SeccionConTarjeta from "@/components/perfil/editores/SeccionConTarjeta";
import PortfolioPublico from "@/components/portfolio/PortfolioPublico";
import { entrar } from "@/app/cuenta/acciones";
import { type Avance, type Hito } from "@/lib/build";
import { conEmpresa, urlPerfil } from "@/lib/cuenta";
import { type EmpresaMia, MAX_EMPRESAS, leerMisEmpresas } from "@/lib/cuenta-empresa";
import type { CuentaLocal } from "@/lib/cuenta-local";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import type { NewsletterLink } from "@/lib/newsletter";
import { COLUMNAS_PROPIO, COLUMNAS_PROPIO_BASE, COLUMNAS_PROPIO_LISTA } from "@/lib/perfil-servidor";
import { COLUMNAS_PORTFOLIO, type EntradaPortfolio, type Servicio, type Tesis } from "@/lib/portfolio";
import { calcularRacha } from "@/lib/racha";
import { ROLES } from "@/lib/rol";
import { boton } from "@/lib/ui";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { ItemPortafolio, PerfilPropio, Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi perfil — Pecera",
  robots: { index: false },
};

const BOTON_PRIMARIO = boton("primario", "lg");

/**
 * Mi perfil. Sin sesión: entrar con Google. Sin perfil: el alta mínima (persona).
 * Con perfil: el mismo perfil que ve un visitante en /p/[slug] (VistaPerfil), con
 * "Editar" en la tarjeta y "+ Agregar" o un lápiz en cada sección, que abren su
 * hoja. Abajo, lo que no es del perfil: progreso, feria, tarjeta NFC y la cuenta.
 */
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
    let { data, error: errorLectura } = await leer(COLUMNAS_PROPIO);
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_PROPIO_LISTA));
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_PROPIO_BASE));
    if (errorLectura) throw new Error(`Supabase (cuenta): ${errorLectura.message}`);
    perfil = data && { ...data, avatar_url: data.avatar_url && urlMedia(data.avatar_url) };
  }

  // Empresas, evento, links y Build in Public: extras. Si la base todavía no los
  // tiene (o fallan), el perfil se edita igual.
  const [extras, esAdmin] = await Promise.all([
    user && perfil ? leerExtras(supabase) : null,
    user ? esDelEquipo(supabase) : false,
  ]);

  // "Mis pitches" es un extra: si falla, se edita el perfil igual. Con
  // mis_pitches_detalle, también los ocultos y las acciones de editar/ocultar.
  let misPitches: MiPitch[] = [];
  let pitchesEditables = false;
  if (user && perfil) {
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

  // Dato chico y público para la píldora y el "Editar" de las páginas estáticas.
  // Nada de email ni ids.
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
        {!user ? (
          <section className="mx-auto mt-8 flex max-w-md flex-col gap-4">
            <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Tu perfil en Pecera</h1>
            <p className="leading-relaxed text-tinta/80">
              Entrá con tu cuenta de Google para crear tu perfil personal o editarlo.
            </p>
            <AvisoCuentaPersonal />
            <AvisoNavegadorInterno />
            {error === "login" && (
              <p role="alert" className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta">
                No pudimos entrar con tu cuenta de Google. Probá de nuevo.
              </p>
            )}
            {rolInicial && (
              <p className="flex items-center gap-2 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${ROLES[rolInicial].bg}`} />
                <span>
                  Vas a entrar como <strong className="font-semibold">{ROLES[rolInicial].label}</strong>. Lo podés
                  cambiar después.
                </span>
              </p>
            )}
            <form action={entrar} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="next" value={rolInicial ? `/cuenta?rol=${rolInicial}` : "/cuenta"} />
              <button type="submit" className={BOTON_PRIMARIO}>
                Entrar con Google
              </button>
              <p className="text-center text-sm leading-relaxed text-tinta/70">
                Google te va a pedir que confirmes tu cuenta. Vas a ver una dirección de Supabase: es el servicio que
                usa Pecera para las cuentas.
              </p>
              <AvisoEntrar />
            </form>
          </section>
        ) : !perfil ? (
          <section className="mx-auto mt-8 max-w-md">
            <AltaPerfil rolInicial={rolInicial} />
          </section>
        ) : (
          <>
            <EnVivo canal={`perfil-${user.id}`} filtro={`usuario_id=eq.${user.id}`} />
            <div className="mt-2 flex flex-col gap-3">
              {creado === "1" && <Creado perfil={perfil} fotoFallo={foto === "error"} />}
              <RelacionesPendientes relaciones={pendientes} />
            </div>

            <PerfilEditable
              perfil={perfil}
              extras={extras}
              misPitches={misPitches}
              pitchesEditables={pitchesEditables}
              email={user.email ?? ""}
              news={news}
              portfolio={portfolio}
            />

            {/* ---- Lo que no es del perfil ---- */}
            <section aria-label="Tu cuenta" className="mx-auto mt-12 flex max-w-2xl flex-col gap-6">
              <CompletarPerfil
                perfil={perfil}
                pitches={misPitches}
                conEmpresa={extras?.disponible ? extras.empresas.length > 0 : null}
                portfolio={
                  portfolio && {
                    entradas: portfolio.entradas.length,
                    servicios: portfolio.servicios.length,
                    tesis: !!portfolio.tesis?.texto,
                  }
                }
              />
              {extras?.disponible && <TarjetaEvento participa={extras.participa} rol={perfil.rol} />}
              <TarjetaNFC slug={perfil.slug} completo={null} />

              {esAdmin && (
                <Link href="/admin" className="flex min-h-12 items-center justify-between rounded-2xl bg-tinta px-4 text-marfil">
                  <span className="font-medium">Panel del equipo</span>
                  <span aria-hidden>&rarr;</span>
                </Link>
              )}

              <div className="flex flex-col gap-2">
                <p className="break-all text-sm text-tinta/70">Entraste como {user.email}</p>
                <BotonSalir />
              </div>

              <section aria-labelledby="eliminar-titulo" className="flex flex-col gap-2 rounded-3xl border border-tinta/15 px-5 py-5">
                <h2 id="eliminar-titulo" className="font-display text-lg font-semibold text-tinta">
                  Eliminar mi cuenta
                </h2>
                <p className="text-sm leading-relaxed text-tinta/70">
                  Borra tu perfil, tus pitches y todo lo tuyo en Pecera. No tiene vuelta atrás.
                </p>
                <Link href="/cuenta/eliminar" className={`${boton("peligro", "md")} mt-1 self-start`}>
                  Eliminar mi cuenta
                </Link>
              </section>
            </section>
          </>
        )}

        {/* Abajo de todo: luz, noche o lo que diga el sistema. */}
        <section aria-labelledby="tema-titulo" className="mx-auto mt-10 flex max-w-md flex-col gap-2">
          <h2 id="tema-titulo" className="text-sm font-semibold text-tinta">
            Apariencia
          </h2>
          <SelectorTema />
        </section>

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

/**
 * El perfil propio: VistaPerfil (igual que /p/[slug]) con los botones de editar.
 * Las partes que el visitante no ve si están vacías acá aparecen con "+ Agregar".
 */
function PerfilEditable({
  perfil,
  extras,
  misPitches,
  pitchesEditables,
  email,
  news,
  portfolio,
}: {
  perfil: PerfilPropio;
  extras: Extras | null;
  misPitches: MiPitch[];
  pitchesEditables: boolean;
  email: string;
  news: { disponible: boolean; newsletter: NewsletterLink | null } | null;
  portfolio: DatosPortfolio | null;
}) {
  const empresas = (extras?.empresas ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    nombre: e.nombre,
    logo_url: e.logo_url ?? null,
    cargo: e.cargo,
    principal: e.es_principal,
  }));
  const principal = extras?.empresas[0] ?? null;
  const portafolio = (extras?.portafolio ?? []).filter((i) => i.visible).sort((a, b) => a.orden - b.orden);
  const publicados = misPitches.filter((p) => p.estado === "publicado");
  const conCofundador = perfil.rol === "emprendedor" || perfil.rol === "aliado";
  const visible = perfil.publicado && !perfil.oculto;
  const sinCanales = ![perfil.whatsapp, perfil.email, perfil.linkedin, perfil.instagram, perfil.web].some(Boolean);

  const datos: DatosVistaPerfil = {
    perfil: { ...perfil, empresas },
    pitches: [],
    portafolio,
    racha: calcularRacha(publicados.map((p) => p.fecha)),
    metricas: {},
    seguidores: 0,
    build: extras?.build ?? null,
    newsletter: news?.newsletter ?? null,
    portfolio,
    logos: new Map(),
  };

  const vacioPortfolio =
    !portfolio || (portfolio.entradas.length === 0 && portfolio.servicios.length === 0 && !portfolio.tesis?.texto);
  const build = extras?.build;

  return (
    <VistaPerfil
      datos={datos}
      slots={{
        editar: <EditorFicha perfil={perfil} />,
        etiquetas: (
          <EditorEtiquetas perfil={perfil}>
            <EtiquetasPerfil perfil={datos.perfil} conCargo={!principal} />
          </EditorEtiquetas>
        ),
        acciones: null,
        ficha: (
          <div className="flex flex-col gap-3">
            <Estado perfil={perfil} />
            {sinCanales && (
              <p className="text-sm text-tinta/75">
                Sumá cómo contactarte (WhatsApp, email, LinkedIn): tocá <strong className="font-semibold">Editar</strong>.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href="/red" className={boton("secundario", "sm")}>
                Mi red
              </Link>
              {visible && (
                <Link href={`/p/${perfil.slug}`} className={boton("fantasma", "sm")}>
                  Ver como visitante
                </Link>
              )}
              <BotonCopiar texto={urlPerfil(perfil.slug)} etiqueta="Copiar mi link" className={boton("fantasma", "sm")} />
            </div>
          </div>
        ),
        empresas: extras?.disponible ? <EmpresasDueno empresas={extras.empresas} max={MAX_EMPRESAS} /> : null,
        barra: null,
        pitches: (
          <>
            <ResaltarAncla id="subir-pitch" />
            <MisPitches
              pitches={misPitches}
              email={email}
              conPerfil
              claseBoton={BOTON_PRIMARIO}
              acciones={
                pitchesEditables
                  ? (p, compacto) => (
                      <AccionesPitch id={p.id} descripcion={p.descripcion} oculto={p.estado === "oculto"} compacto={compacto} />
                    )
                  : undefined
              }
            />
          </>
        ),
        buscaOfrece: (
          <EditorBuscaOfrece perfil={perfil}>
            <BloqueBuscaOfrece perfil={perfil} />
          </EditorBuscaOfrece>
        ),
        trayectoria: (
          <EditorTrayectoria perfil={perfil}>
            <BloqueTrayectoria perfil={perfil} />
          </EditorTrayectoria>
        ),
        cofundador: conCofundador ? (
          <EditorCofundador perfil={perfil}>
            <BloqueCofundador perfil={perfil} />
          </EditorCofundador>
        ) : null,
        portfolio: portfolio ? (
          <SeccionConTarjeta
            clave="portfolio"
            titulo={perfil.rol === "inversor" ? "Tesis y portfolio" : "Servicios y portfolio"}
            vacia={vacioPortfolio}
            agregar={perfil.rol === "inversor" ? "Agregar tu tesis y portfolio" : "Agregar tus servicios y portfolio"}
            bajadaVacia={perfil.rol === "inversor" ? "Qué buscás y en qué invertiste" : "Qué ofrecés y con quién trabajaste"}
            tarjeta={
              <div className="flex flex-col gap-4">
                {perfil.rol === "inversor" ? <TarjetaTesis tesis={portfolio.tesis} /> : <TarjetaServicios servicios={portfolio.servicios} />}
                <TarjetaPortfolio rol={perfil.rol} entradas={portfolio.entradas} />
              </div>
            }
          >
            <PortfolioPublico rol={perfil.rol} perfilId={perfil.id} datos={portfolio} logos={datos.logos} />
          </SeccionConTarjeta>
        ) : null,
        build:
          principal && build ? (
            build.hitos.length > 0 || build.avances.length > 0 ? (
              <section aria-labelledby="build-titulo" className="relative">
                <h2 id="build-titulo" className={SUBTITULO}>
                  Build in Public
                </h2>
                <Link
                  href={conEmpresa("/cuenta/empresa?pestana=build", principal.slug)}
                  className={`${boton("secundario", "sm")} absolute right-0 top-0`}
                >
                  Editar en {principal.nombre}
                </Link>
                <BuildPublico hitos={build.hitos} avances={build.avances} ahora={new Date()} completo={false} hrefEmpresa={`/e/${principal.slug}`} />
              </section>
            ) : (
              <Link
                href={conEmpresa("/cuenta/empresa?pestana=build", principal.slug)}
                className="boton flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-3xl border-2 border-dashed border-tinta/25 px-5 py-4 text-center text-tinta hover:border-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <span className="font-semibold">+ Contá en qué estás trabajando</span>
                <span className="text-sm text-tinta/70">Build in Public de {principal.nombre}</span>
              </Link>
            )
          ) : null,
        newsletter: news?.disponible ? (
          <SeccionConTarjeta
            clave="newsletter"
            titulo="Newsletter"
            vacia={!news.newsletter}
            agregar="Agregar tu newsletter"
            bajadaVacia="Un link a tu Substack u otra plataforma"
            tarjeta={<TarjetaNewsletter newsletter={news.newsletter} />}
          >
            {news.newsletter && (
              <section aria-labelledby="newsletter-titulo">
                <h2 id="newsletter-titulo" className={SUBTITULO}>
                  Newsletter
                </h2>
                <NewsletterPerfil newsletter={news.newsletter} />
              </section>
            )}
          </SeccionConTarjeta>
        ) : null,
        portafolio: extras?.portafolio ? (
          <SeccionConTarjeta
            clave="links"
            titulo="Links y documentos"
            vacia={portafolio.length === 0}
            agregar="Agregar links y documentos"
            bajadaVacia="Tu web, un deck, una nota de prensa…"
            tarjeta={<TarjetaPortafolio items={extras.portafolio} rol={perfil.rol} />}
          >
            <BloquePortafolio items={portafolio} />
          </SeccionConTarjeta>
        ) : null,
      }}
    />
  );
}

type Extras = {
  disponible: boolean;
  /** Todas sus empresas, la principal primero. */
  empresas: EmpresaMia[];
  participa: boolean;
  /** null si la base todavía no tiene feria_pro: la sección no se muestra. */
  portafolio: ItemPortafolio[] | null;
  /** Build in Public de la principal; null si la base no lo tiene (o falló la lectura). */
  build: { hitos: Hito[]; avances: Avance[] } | null;
};

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
  const [mias, evento, portafolio] = await Promise.all([
    leerMisEmpresas(supabase),
    supabase.rpc("mi_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("mi_portafolio"),
  ]);
  if (!mias.disponible) {
    return { disponible: false, empresas: [], participa: false, build: null, portafolio: null };
  }
  if (evento.error) console.error(`Supabase (mi_evento): ${evento.error.message}`);
  if (portafolio.error && !faltaMigracion(portafolio.error)) {
    console.error(`Supabase (mi_portafolio): ${portafolio.error.message}`);
  }
  const filaEvento = (evento.data as Array<{ participa: boolean }> | null)?.[0];
  const principal = mias.empresas[0];
  return {
    disponible: true,
    empresas: mias.empresas,
    build: principal ? await leerBuild(supabase, principal.id) : null,
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

/**
 * Relaciones que nombran a alguna de sus empresas y esperan respuesta (con
 * multi_empresa, dicen cuál). Vacío si no hay.
 */
async function leerPendientes(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<RelacionPendiente[]> {
  let { data, error } = await supabase.rpc("relaciones_pendientes_v2");
  if (faltaMigracion(error)) ({ data, error } = await supabase.rpc("relaciones_pendientes"));
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

/** La primera vez: el perfil está creado, su dirección para copiar y lo que sigue. */
function Creado({ perfil, fotoFallo }: { perfil: PerfilPropio; fotoFallo: boolean }) {
  const url = urlPerfil(perfil.slug);
  return (
    <section
      aria-labelledby="creado-titulo"
      className="aparecer flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-tinta/5 px-4 py-4 text-tinta"
    >
      <h2 id="creado-titulo" className="font-display text-xl font-semibold leading-tight">
        ¡Listo, tu perfil está creado!
      </h2>
      <p className="text-sm leading-relaxed">
        Este es tu perfil, tal como lo ven los demás. Ahora sumá tu pitch y, si tenés, tu emprendimiento: tocá{" "}
        <strong className="font-semibold">+ Agregar</strong> en cada parte.
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-tinta/70">Tu dirección en Pecera</p>
        <p className="break-all font-semibold">{url}</p>
      </div>
      <BotonCopiar texto={url} etiqueta="Copiar dirección" className={`${boton("primario", "md")} self-start`} />
      {fotoFallo && <p className="text-sm font-medium">No pudimos guardar tu foto. Volvé a subirla con Editar.</p>}
    </section>
  );
}

/** Estado de publicación, en tono neutro: que no esté publicado no es un error. */
function Estado({ perfil }: { perfil: PerfilPropio }) {
  const texto = !perfil.publicado
    ? "Tu perfil se va a publicar pronto. Mientras, podés dejarlo listo."
    : perfil.oculto
      ? "Tu perfil está oculto: nadie lo ve hasta que lo vuelvas a mostrar (Editar)."
      : null;
  if (!texto) return null;
  return <p className="rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">{texto}</p>;
}
