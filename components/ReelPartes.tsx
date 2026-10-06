"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import Avatar from "@/components/Avatar";
import DescripcionConTags from "@/components/DescripcionConTags";
import { EtiquetasReel, detalleEmpresas } from "@/components/Etiquetas";
import { IconoCorazon, IconoSonido, IconoSubtitulos } from "@/components/Iconos";
import { formatoCompacto } from "@/lib/formato";
import { dejarDeSeguir, seguir, useSigo } from "@/lib/red";
import { ROLES, TIPOS } from "@/lib/rol";
import type { ItemFeed } from "@/types/pecera";

/**
 * Piezas del reel que se dibujan igual en el feed y en la maqueta de la landing
 * (`MaquetaReel`). El estado y los gestos viven en `Reel`; acá solo se dibuja.
 */

/** Degradado de abajo, para que el texto se lea sobre cualquier frame: oscuro donde
 *  está el texto y corto, para que el video se vea. */
export const DEGRADADO_REEL =
  "pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-tinta via-tinta/80 via-35% to-transparent";

/** Columna de acciones, como la de TikTok: termina justo arriba del nombre. */
export function ColumnaReel({
  piques,
  piqueado,
  latidos = 0,
  mostrarCC,
  conSubtitulos,
  silenciado,
  onAlternarPique,
  onAlternarSubtitulos,
  onAlternarSonido,
  compartir,
}: {
  piques: number;
  piqueado: boolean;
  /** Cada latido nuevo remonta el ícono para que la animación vuelva a correr. */
  latidos?: number;
  mostrarCC: boolean;
  conSubtitulos: boolean;
  silenciado: boolean;
  onAlternarPique?: () => void;
  onAlternarSubtitulos?: () => void;
  onAlternarSonido?: () => void;
  /** Botón de compartir (BotonCompartirReel): va entre el corazón y los subtítulos. */
  compartir?: ReactNode;
}) {
  return (
    <div className="pointer-events-auto flex w-12 shrink-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={onAlternarPique}
        aria-pressed={piqueado}
        aria-label={`${piqueado ? "Quitar pique" : "Dar pique"} (${piques} ${piques === 1 ? "pique" : "piques"})`}
        className="flex w-12 flex-col items-center"
      >
        <span className="flex h-12 w-12 items-center justify-center">
          <IconoCorazon
            key={latidos}
            lleno={piqueado}
            className={`icono-sombra h-8 w-8 transition-colors duration-200 ease-pecera ${
              piqueado ? "text-pecera" : "text-marfil"
            } ${latidos > 0 ? "latido" : ""}`}
          />
        </span>
        <span aria-hidden className="texto-sombra -mt-1 text-xs font-semibold tabular-nums">
          {formatoPiques(piques)}
        </span>
      </button>

      {compartir}

      {mostrarCC && (
        <button
          type="button"
          onClick={onAlternarSubtitulos}
          aria-label="Subtítulos"
          aria-pressed={conSubtitulos}
          className="flex h-12 w-12 items-center justify-center"
        >
          <IconoSubtitulos activo={conSubtitulos} className="icono-sombra h-7 w-7" />
        </button>
      )}

      <button
        type="button"
        onClick={onAlternarSonido}
        aria-label="Sonido"
        aria-pressed={!silenciado}
        className="flex h-12 w-12 items-center justify-center"
      >
        <IconoSonido silenciado={silenciado} className="icono-sombra h-7 w-7" />
      </button>
    </div>
  );
}

/**
 * Quién es y qué cuenta: avatar con el "+" de seguir, nombre con rol y tipo abajo, una
 * línea desplegable con empresa, etapa y etiquetas, hito en curso y la descripción del pitch en una línea. El avatar y el nombre llevan al perfil.
 */
export function DatosReel({ item, href, activo }: { item: ItemFeed; href: string; activo: boolean }) {
  const { pitch, perfil } = item;
  const rol = ROLES[perfil.rol];
  return (
    // Margen derecho del ancho de la columna: un texto largo nunca queda debajo.
    <div className="mt-2 pr-14">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <Link
            href={href}
            aria-label={`Ver perfil de ${perfil.nombre}`}
            // El ::after lleva la zona táctil a 44 px sin agrandar el avatar.
            className="pointer-events-auto relative block after:absolute after:-inset-0.5"
          >
            <Avatar perfil={perfil} size={40} />
          </Link>
          <SeguirMini item={item} />
        </span>
        <div className="min-w-0">
          {/* El padding agranda la zona táctil a 46 px y el margen negativo lo descuenta:
              el nombre no se mueve. */}
          <Link
            href={href}
            aria-label={`Ver perfil de ${perfil.nombre}`}
            className="pointer-events-auto -my-3 inline-block py-3 font-display text-lg font-semibold leading-tight"
          >
            {perfil.nombre}
          </Link>
          {(item.racha ?? 0) > 1 && (
            <span
              title={`Racha de ${item.racha} días subiendo pitches`}
              className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-tinta/55 px-1.5 py-0.5 align-middle text-xs font-semibold ring-1 ring-marfil/20"
            >
              <span aria-hidden className="llama">
                🔥
              </span>
              {item.racha}
              <span className="sr-only"> días de racha</span>
            </span>
          )}
          {/* Rol y tipo siempre abajo del nombre, fuera de la fila desplegable. */}
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${rol.bg}`}>{rol.label}</span>
            <span className="truncate text-marfil/85">{TIPOS[perfil.tipo]}</span>
          </div>
        </div>
      </div>

      {/* Cargo en la empresa, etapa y etiquetas en una línea; "+N" la despliega. */}
      <EtiquetasReel perfil={perfil} id={`etiquetas-${pitch.id}`} activo={activo} />

      {item.construyendo && <Construyendo hito={item.construyendo} activo={activo} />}

      <DescripcionReel texto={pitch.descripcion || perfil.descripcion} id={`desc-${pitch.id}`} activo={activo} />
    </div>
  );
}

/**
 * La descripción en una línea con "…" y, si no entra, un "más" que la despliega
 * (tocar el texto también). Desplegada tiene un alto máximo con scroll propio.
 * Los toques no llegan al video (es hermano, no ancestro): ni pausa ni pique.
 * Al dejar de ser el reel activo vuelve a quedar plegada.
 */
function DescripcionReel({ texto, id, activo }: { texto: string; id: string; activo: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [noEntra, setNoEntra] = useState(false);

  // Ajuste en render, no en efecto (como en Reel y Subtitulos).
  const [erasActivo, setErasActivo] = useState(activo);
  if (erasActivo !== activo) {
    setErasActivo(activo);
    if (!activo) setAbierta(false);
  }

  // Plegada se mide si el texto pasa de una línea; desplegada no se remide.
  useLayoutEffect(() => {
    const p = ref.current?.querySelector("p");
    if (!p || abierta) return;
    const observador = new ResizeObserver(() => setNoEntra(p.scrollWidth > p.clientWidth + 1));
    observador.observe(p);
    return () => observador.disconnect();
  }, [abierta, texto]);

  if (!texto) return null;

  function alTocarTexto(e: MouseEvent) {
    e.stopPropagation();
    // Un #hashtag navega; no pliega ni despliega.
    if ((e.target as HTMLElement).closest("a")) return;
    if (noEntra || abierta) setAbierta((a) => !a);
  }

  return (
    <div ref={ref} className="mt-1.5 flex max-w-prose items-baseline gap-1 text-sm leading-relaxed text-marfil/90">
      {/* El botón es el control accesible; tocar el texto es el atajo del dedo. */}
      {/* Si entra entera, deja pasar los toques al video como el resto del bloque. */}
      <div
        id={id}
        onClick={alTocarTexto}
        className={`min-w-0 flex-1 ${noEntra || abierta ? "pointer-events-auto" : ""}`}
      >
        <DescripcionConTags
          texto={texto}
          claro
          className={
            abierta
              ? "max-h-[30dvh] overflow-y-auto overscroll-contain whitespace-pre-line"
              : "truncate"
          }
        />
      </div>
      {(noEntra || abierta) && (
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={(e) => {
            e.stopPropagation();
            setAbierta((a) => !a);
          }}
          // El padding lleva la zona táctil a 44 px; el margen negativo lo descuenta.
          className="pointer-events-auto -my-3 shrink-0 self-end px-2 py-3 font-semibold text-marfil"
        >
          {abierta ? "menos" : "más"}
        </button>
      )}
    </div>
  );
}

/** "+" sobre el avatar, como en TikTok: seguir sin salir del feed. */
function SeguirMini({ item }: { item: ItemFeed }) {
  const { perfil } = item;
  const sigo = useSigo(perfil.id);
  return (
    <button
      type="button"
      aria-pressed={sigo}
      aria-label={sigo ? `Dejar de seguir a ${perfil.nombre}` : `Seguir a ${perfil.nombre}`}
      onClick={() => {
        if (sigo) {
          dejarDeSeguir(perfil.id);
          return;
        }
        seguir({
          id: perfil.id,
          slug: perfil.slug,
          nombre: perfil.nombre,
          rol: perfil.rol,
          avatar_url: perfil.avatar_url,
          descripcion: perfil.descripcion,
          detalle: detalleEmpresas(perfil),
        });
        navigator.vibrate?.(10);
      }}
      className={`boton pointer-events-auto absolute -bottom-1.5 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full text-sm font-bold ring-2 ring-tinta after:absolute after:-inset-2 ${
        sigo ? "bg-marfil text-tinta" : "bg-arcilla text-marfil"
      }`}
    >
      {sigo ? "✓" : "+"}
    </button>
  );
}

/**
 * Build in Public en el reel: el hito en curso de su empresa, con la barra del
 * progreso que cargó el equipo. Ámbar, para no confundirse con la insignia del Pitch.
 */
function Construyendo({ hito, activo }: { hito: NonNullable<ItemFeed["construyendo"]>; activo: boolean }) {
  return (
    <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-marfil">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tinta/60 px-2 py-1 font-semibold uppercase tracking-wide">
        <span aria-hidden className={`size-1.5 rounded-full bg-obra ${activo ? "punto-vivo" : ""}`} />
        Construyendo
      </span>
      <span className="truncate font-medium">{hito.titulo}</span>
      {hito.progreso !== null && (
        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
          <span aria-hidden className="h-1 w-10 overflow-hidden rounded-full bg-marfil/25">
            {activo && (
              <span
                className="barra-progreso block h-full rounded-full bg-obra"
                style={{ "--p": hito.progreso / 100 } as CSSProperties}
              />
            )}
          </span>
          {hito.progreso}%
        </span>
      )}
    </p>
  );
}

/** 0 muestra el nombre del gesto; desde 1000, "1,2 mil". */
function formatoPiques(n: number): string {
  return n === 0 ? "Pique" : formatoCompacto(n);
}
