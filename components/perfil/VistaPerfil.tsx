import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import CanalesPerfil from "@/components/CanalesPerfil";
import DescripcionConTags from "@/components/DescripcionConTags";
import { EtiquetasPerfil, detalleEmpresas } from "@/components/Etiquetas";
import GrillaPitches from "@/components/GrillaPitches";
import BuildPublico from "@/components/build/BuildPublico";
import NewsletterPerfil from "@/components/newsletter/NewsletterPerfil";
import AccionesPerfil from "@/components/perfil/AccionesPerfil";
import BarraDueno from "@/components/perfil/BarraDueno";
import {
  BloqueBuscaOfrece,
  BloqueCofundador,
  BloquePortafolio,
  BloqueRacha,
  BloqueTrayectoria,
  SUBTITULO,
  TarjetaEmpresaPerfil,
} from "@/components/perfil/Bloques";
import { IconoUbicacion } from "@/components/perfil/IconosMarca";
import PortfolioPublico from "@/components/portfolio/PortfolioPublico";
import { urlPerfil } from "@/lib/cuenta";
import type { BuildEmpresa, PortfolioPublico as DatosPortfolio } from "@/lib/datos";
import { cargo } from "@/lib/etiquetas";
import type { NewsletterLink } from "@/lib/newsletter";
import type { Racha } from "@/lib/racha";
import { ROLES, TIPOS } from "@/lib/rol";
import type { Score } from "@/lib/score";
import type { EmpresaDePerfil, ItemPortafolio, Metricas, Perfil, Pitch } from "@/types/pecera";

/** Degradé de la franja de arriba según el rol: se reconoce de un vistazo. */
const FRANJA: Record<string, string> = {
  emprendedor: "from-arcilla via-pecera to-t-ocre-suave",
  inversor: "from-inversor via-t-azul to-t-azul-suave",
  aliado: "from-aliado via-t-verde to-t-verde-suave",
};

export type DatosVistaPerfil = {
  /** Con sus empresas ya armadas (la principal primero, logos resueltos). */
  perfil: Perfil & { empresas: EmpresaDePerfil[] };
  pitches: Pitch[];
  portafolio: ItemPortafolio[];
  racha: Racha;
  metricas: Metricas;
  seguidores: number;
  build: BuildEmpresa | null;
  newsletter: NewsletterLink | null;
  portfolio: DatosPortfolio | null;
  logos: Map<string, string>;
  /** Score crediticio de cada empresa, por id (lib/datos getScoresEmpresas). Una que falte no muestra insignia. */
  scores?: Map<string, Score>;
};

/**
 * Lo que el perfil propio (/cuenta) pone en lugar de cada parte. Una clave presente
 * reemplaza a la parte (con `null`, no se dibuja nada); una ausente deja la pública.
 * `editar` va arriba a la derecha de la franja y `ficha`, al final de la tarjeta.
 */
export type SlotsPerfil = Partial<
  Record<
    | "editar"
    | "ficha"
    | "etiquetas"
    | "acciones"
    | "empresas"
    | "canales"
    | "barra"
    | "pitches"
    | "buscaOfrece"
    | "trayectoria"
    | "cofundador"
    | "portfolio"
    | "build"
    | "newsletter"
    | "portafolio",
    ReactNode
  >
>;

/**
 * El perfil tal como lo ve cualquiera: la tarjeta (a la izquierda y fija en PC) y el
 * contenido. Lo usan /p/[slug] (sin slots: el visitante ve siempre lo mismo) y
 * /cuenta (con los botones de editar de cada sección).
 */
export default function VistaPerfil({ datos, slots = {} }: { datos: DatosVistaPerfil; slots?: SlotsPerfil }) {
  const { perfil, pitches, portafolio, racha, metricas, seguidores, build, newsletter, portfolio, logos, scores } = datos;
  const parte = (clave: keyof SlotsPerfil, publica: ReactNode) => (clave in slots ? slots[clave] : publica);

  const rol = ROLES[perfil.rol];
  const empresas = perfil.empresas;
  const principal = empresas[0] ?? null;
  const c = cargo(principal?.cargo);
  const detalle = detalleEmpresas(perfil);

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* ---- La tarjeta (a la izquierda y fija en PC) ---- */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        <article className="aparecer overflow-hidden rounded-[2rem] border border-tinta/10 bg-marfil shadow-[0_18px_50px_rgb(28_27_22/0.10)]">
          <div className={`relative h-24 bg-gradient-to-br ${FRANJA[perfil.rol]}`}>
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(255_255_255/0.35),transparent_45%)]" />
            {/* Absoluto: si aparece "Editar" (el dueño, al hidratar) no corre nada. */}
            <div className="absolute right-3 top-3 flex items-center gap-2">
              {racha.actual > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-tinta/70 px-2.5 py-1 text-xs font-semibold text-marfil backdrop-blur">
                  <span className="llama" aria-hidden>
                    🔥
                  </span>
                  {racha.actual} días
                </span>
              )}
              {slots.editar}
            </div>
          </div>
          <div className="relative -mt-12 flex flex-col gap-4 px-5 pb-5">
            <span className="self-start rounded-full ring-4 ring-marfil">
              <Avatar perfil={perfil} size={96} />
            </span>
            <header className="flex flex-col gap-1.5">
              <h1 className="font-display text-3xl font-semibold leading-[1.05] text-tinta">{perfil.nombre}</h1>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-marfil ${rol.bg}`}>{rol.label}</span>
                {TIPOS[perfil.tipo] && <span className="text-tinta/65">{TIPOS[perfil.tipo]}</span>}
              </p>
              {perfil.ubicacion && (
                <p className="flex items-center gap-1.5 text-sm text-tinta/65">
                  <IconoUbicacion />
                  {perfil.ubicacion}
                </p>
              )}
            </header>
            {parte("etiquetas", <EtiquetasPerfil perfil={perfil} conCargo={!principal} />)}
            <DescripcionConTags texto={perfil.descripcion} className="leading-relaxed text-tinta/90" />
            {parte(
              "acciones",
              <AccionesPerfil
                perfil={perfil}
                url={urlPerfil(perfil.slug)}
                seguidores={seguidores}
                detalle={detalle}
                empresa={principal?.nombre ?? null}
                cargo={c?.label ?? null}
              />
            )}
            {slots.ficha}
          </div>
        </article>

        {parte(
          "empresas",
          empresas.length > 0 && (
            <div className="flex flex-col gap-2">
              {empresas.map((e) => (
                <TarjetaEmpresaPerfil key={e.slug} empresa={e} cargo={cargo(e.cargo)?.label ?? null} score={e.id ? scores?.get(e.id) : undefined} />
              ))}
            </div>
          )
        )}
        {parte("canales", <CanalesPerfil perfil={perfil} />)}
      </div>

      {/* ---- El contenido ---- */}
      <div className="flex flex-col gap-7">
        {parte("barra", <BarraDueno slug={perfil.slug} sinPitch={pitches.length === 0} />)}

        {parte(
          "pitches",
          pitches.length > 0 ? (
            <section aria-label={pitches.length === 1 ? "Su pitch" : "Sus pitches"}>
              <h2 className={SUBTITULO}>{pitches.length === 1 ? "Su pitch" : `Sus pitches · ${pitches.length}`}</h2>
              <GrillaPitches slug={perfil.slug} nombre={perfil.nombre} pitches={pitches} metricas={metricas} />
            </section>
          ) : (
            <section className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-tinta/20 px-6 py-10 text-center">
              <span aria-hidden className="text-3xl">
                🎬
              </span>
              <p className="font-display text-xl font-semibold text-tinta">Todavía no subió su pitch</p>
              <p className="max-w-sm text-sm leading-relaxed text-tinta/65">
                Tocá <strong className="font-semibold">Seguir</strong>: cuando suba uno, lo vas a ver en la pestaña
                Stakeholding del feed.
              </p>
            </section>
          )
        )}

        {parte("buscaOfrece", <BloqueBuscaOfrece perfil={perfil} />)}
        <BloqueRacha racha={racha} />
        {parte("trayectoria", <BloqueTrayectoria perfil={perfil} />)}
        {parte("cofundador", <BloqueCofundador perfil={perfil} />)}
        {parte(
          "portfolio",
          portfolio && <PortfolioPublico rol={perfil.rol} perfilId={perfil.id} datos={portfolio} logos={logos} />
        )}
        {parte(
          "build",
          build && principal && (build.hitos.length > 0 || build.avances.length > 0) && (
            <section aria-labelledby="build-titulo">
              <h2 id="build-titulo" className={SUBTITULO}>
                Build in Public
              </h2>
              <BuildPublico
                hitos={build.hitos}
                avances={build.avances}
                ahora={new Date()}
                completo={false}
                hrefEmpresa={`/e/${principal.slug}`}
              />
            </section>
          )
        )}
        {parte(
          "newsletter",
          newsletter && (
            <section aria-labelledby="newsletter-titulo">
              <h2 id="newsletter-titulo" className={SUBTITULO}>
                Newsletter
              </h2>
              <NewsletterPerfil newsletter={newsletter} />
            </section>
          )
        )}
        {parte("portafolio", <BloquePortafolio items={portafolio} />)}
      </div>
    </div>
  );
}
