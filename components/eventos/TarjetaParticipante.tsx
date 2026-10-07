import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { BarraEtapa } from "@/components/Etiquetas";
import LogoEntidad from "@/components/LogoEntidad";
import type { Participante } from "@/lib/datos";
import { cargo } from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";

/** Qué muestra el pie de la tarjeta. Lo decide `Votacion`; acá solo se dibuja. */
export type AccionTarjeta =
  | { tipo: "nada" }
  | { tipo: "cargando" }
  /** Sin sesión: envía el form de la franja (`entrar-votar`), o lleva al aviso si es un navegador interno. */
  | { tipo: "entrar"; interno: boolean; alIrAlAviso: () => void }
  | { tipo: "sos-vos" }
  | { tipo: "tu-voto"; pendiente: boolean; alQuitar: () => void }
  | { tipo: "votar"; pendiente: boolean; votando: boolean; cambiar: boolean; alVotar: () => void };

/** Botón principal de la Feria: amarillo con texto #353535 (5,6:1), 48 px de alto. */
export const BOTON_FERIA =
  "boton inline-flex min-h-12 w-full items-center justify-center rounded-full bg-s21-amarillo px-5 text-sm font-bold uppercase tracking-wide text-[#353535] hover:bg-[#f2b02e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-60";

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta";

/**
 * Tarjeta de un participante en la votación. En el celular es horizontal (póster a la
 * izquierda); desde `lg`, vertical con el póster arriba. Sin pitch, sin empresa o sin
 * logo mantiene la misma forma.
 */
export default function TarjetaParticipante({
  p,
  logo,
  accion,
  esMio = false,
  resultado,
  prioridad = false,
}: {
  p: Participante;
  logo: string | null;
  accion: AccionTarjeta;
  esMio?: boolean;
  /** Solo con resultados visibles. */
  resultado?: { puesto: number; votos: number; maximo: number };
  /** La primera fila carga el póster enseguida; el resto, al acercarse. */
  prioridad?: boolean;
}) {
  const c = cargo(p.cargo);
  const quien = p.empresa_nombre ?? p.nombre;
  const etiquetaRol = TIPOS[p.tipo] || ROLES[p.rol].label;

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-3xl border-2 transition-colors duration-200 ease-pecera ${
        esMio ? "border-s21-verde bg-s21-verde/10" : "border-tinta/10 bg-tinta/[0.02]"
      }`}
    >
      <div className="flex gap-3 p-3 lg:flex-col lg:gap-0 lg:p-0">
        <Poster p={p} quien={quien} puesto={resultado?.puesto} prioridad={prioridad} />

        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:px-4 lg:pt-4">
          {p.empresa_nombre ? (
            <>
              <div className="flex items-center gap-2.5">
                <LogoEntidad nombre={p.empresa_nombre} logoUrl={logo} tamano="md" />
                <Link
                  href={`/p/${p.slug}`}
                  className={`line-clamp-2 min-w-0 rounded font-display text-lg font-semibold leading-tight text-tinta hover:underline ${FOCO}`}
                >
                  {p.empresa_nombre}
                </Link>
              </div>
              <p className="flex items-center gap-2 text-sm text-tinta/75">
                <Avatar perfil={p} size={28} optimizada />
                <span className="min-w-0">
                  {p.nombre}
                  {c ? ` · ${c.label}` : ""}
                </span>
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar perfil={p} size={44} optimizada />
              <div className="min-w-0">
                <Link
                  href={`/p/${p.slug}`}
                  className={`line-clamp-2 rounded font-display text-lg font-semibold leading-tight text-tinta hover:underline ${FOCO}`}
                >
                  {p.nombre}
                </Link>
                {etiquetaRol && <p className="text-sm text-tinta/75">{etiquetaRol}</p>}
              </div>
            </div>
          )}

          {p.descripcion && <p className="line-clamp-3 text-sm leading-snug text-tinta/80">{p.descripcion}</p>}

          {(p.rol !== "emprendedor" || p.etapa) && (
            <div className="flex flex-wrap items-center gap-2">
              {p.rol !== "emprendedor" && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-marfil ${ROLES[p.rol].bg}`}>
                  {ROLES[p.rol].label}
                </span>
              )}
              <BarraEtapa etapa={p.etapa} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-3 pb-3 lg:px-4 lg:pb-4 lg:pt-3">
        {resultado && (
          <div className="flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-tinta/10">
              <span
                className="block h-full rounded-full bg-s21-verde transition-[width] duration-700 ease-pecera motion-reduce:transition-none"
                style={{ width: `${(resultado.votos / resultado.maximo) * 100}%` }}
              />
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-tinta">
              {resultado.votos} {resultado.votos === 1 ? "voto" : "votos"}
            </span>
          </div>
        )}
        <Accion accion={accion} quien={quien} />
      </div>
    </li>
  );
}

function Poster({
  p,
  quien,
  puesto,
  prioridad,
}: {
  p: Participante;
  quien: string;
  puesto?: number;
  prioridad: boolean;
}) {
  const caja =
    "relative aspect-[9/16] w-[42%] shrink-0 overflow-hidden rounded-2xl lg:w-full lg:rounded-none";
  const insignia = puesto !== undefined && (
    <span className="absolute left-2 top-2 flex size-10 items-center justify-center rounded-full bg-s21-amarillo font-sans text-lg font-bold tabular-nums text-[#353535] shadow-md">
      <span className="sr-only">Puesto </span>
      {puesto}
    </span>
  );

  if (!p.pitch_id || !p.poster_url) {
    return (
      <div className={`${caja} flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-s21-verde/25 to-s21-verde/5 ring-1 ring-inset ring-s21-verde/20`}>
        {insignia}
        <Avatar perfil={p} size={64} optimizada />
        <span className="absolute inset-x-0 bottom-0 px-2 pb-3 text-center text-xs font-semibold text-tinta/75">
          Sin pitch todavía
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/#${p.pitch_id}`}
      aria-label={`Ver el pitch de ${quien}`}
      className={`group ${caja} block bg-tinta/10 ${FOCO}`}
    >
      <Image
        src={p.poster_url}
        alt=""
        fill
        sizes="(min-width: 1280px) 260px, (min-width: 1024px) 310px, 170px"
        loading={prioridad ? "eager" : "lazy"}
        className="object-cover transition-transform duration-500 ease-pecera group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {insignia}
      <span
        aria-hidden
        className="absolute bottom-2 left-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/65 px-3 text-sm font-semibold text-white backdrop-blur-sm"
      >
        <span className="text-xs">▶</span> Ver pitch
      </span>
    </Link>
  );
}

function Accion({ accion, quien }: { accion: AccionTarjeta; quien: string }) {
  switch (accion.tipo) {
    case "nada":
      return null;
    case "cargando":
      return <span aria-hidden className="block min-h-12 rounded-full bg-tinta/5" />;
    case "entrar":
      return accion.interno ? (
        <button type="button" onClick={accion.alIrAlAviso} className={BOTON_FERIA}>
          Entrar para votar
        </button>
      ) : (
        <button type="submit" form="entrar-votar" className={BOTON_FERIA}>
          Entrar para votar
        </button>
      );
    case "sos-vos":
      return (
        <span className="flex min-h-12 items-center justify-center rounded-full bg-tinta/5 text-sm font-medium text-tinta/75">
          Sos vos
        </span>
      );
    case "tu-voto":
      return (
        <div className="flex min-h-12 items-center gap-2">
          <span className="mr-auto flex items-center gap-2 text-sm font-semibold text-tinta">
            <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-s21-verde-oscuro text-xs text-white">
              ✓
            </span>
            Tu voto
          </span>
          <button
            type="button"
            disabled={accion.pendiente}
            onClick={accion.alQuitar}
            className={`boton min-h-12 rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta disabled:opacity-60 ${FOCO}`}
          >
            Quitar voto
          </button>
        </div>
      );
    case "votar":
      return (
        <button
          type="button"
          disabled={accion.pendiente}
          onClick={accion.alVotar}
          aria-label={accion.votando ? undefined : `${accion.cambiar ? "Cambiar mi voto a" : "Votar a"} ${quien}`}
          className={BOTON_FERIA}
        >
          {accion.votando ? "Votando…" : accion.cambiar ? "Cambiar mi voto acá" : "Votar"}
        </button>
      );
  }
}

/** Mismo alto que una tarjeta: se ve mientras se arma el orden al azar en el navegador. */
export function TarjetaEsqueleto() {
  return (
    <li aria-hidden className="flex flex-col overflow-hidden rounded-3xl border-2 border-tinta/10 bg-tinta/[0.02]">
      <div className="flex gap-3 p-3 lg:flex-col lg:gap-0 lg:p-0">
        <span className="aspect-[9/16] w-[42%] shrink-0 rounded-2xl bg-tinta/10 lg:w-full lg:rounded-none" />
        <div className="flex flex-1 flex-col gap-2 lg:px-4 lg:pt-4">
          <span className="h-11 rounded-xl bg-tinta/10" />
          <span className="h-4 w-3/4 rounded bg-tinta/10" />
          <span className="h-12 rounded bg-tinta/5" />
        </div>
      </div>
      <div className="mt-auto px-3 pb-3 lg:px-4 lg:pb-4 lg:pt-3">
        <span className="block min-h-12 rounded-full bg-tinta/5" />
      </div>
    </li>
  );
}
