"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import Avatar from "@/components/Avatar";
import DescripcionConTags from "@/components/DescripcionConTags";
import { EtiquetasReel, detalleEmpresas } from "@/components/Etiquetas";
import { IconoCorazon, IconoSonido, IconoSubtitulos } from "@/components/Iconos";
import InsigniaPitch from "@/components/InsigniaPitch";
import { formatoCompacto } from "@/lib/formato";
import { dejarDeSeguir, seguir, useSigo } from "@/lib/red";
import { ROLES, TIPOS } from "@/lib/rol";
import type { ItemFeed } from "@/types/pecera";

/**
 * Piezas del reel que se dibujan igual en el feed y en la maqueta de la landing
 * (`MaquetaReel`). El estado y los gestos viven en `Reel`; acá solo se dibuja.
 */

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
 * Quién es y qué cuenta: avatar con el "+" de seguir, nombre, rol, etiquetas, hito
 * en curso y la descripción del pitch. El avatar y el nombre llevan al perfil.
 */
export function DatosReel({ item, href, activo }: { item: ItemFeed; href: string; activo: boolean }) {
  const { pitch, perfil } = item;
  const rol = ROLES[perfil.rol];
  return (
    // Margen derecho del ancho de la columna: un texto largo nunca queda debajo.
    <div className="mt-3 pr-14">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <Link href={href} aria-label={`Ver perfil de ${perfil.nombre}`} className="pointer-events-auto block">
            <Avatar perfil={perfil} size={48} />
          </Link>
          <SeguirMini item={item} />
        </span>
        <div className="min-w-0">
          {/* El padding agranda la zona táctil a 45 px y el margen negativo lo descuenta:
              el nombre no se mueve. */}
          <Link
            href={href}
            aria-label={`Ver perfil de ${perfil.nombre}`}
            className="pointer-events-auto -my-2.5 inline-block py-2.5 font-display text-xl font-semibold leading-tight"
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
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rol.bg}`}>{rol.label}</span>
            <span className="text-marfil/70">{TIPOS[perfil.tipo]}</span>
          </div>
        </div>
      </div>

      <EtiquetasReel perfil={perfil} />

      {item.construyendo && <Construyendo hito={item.construyendo} activo={activo} />}

      {/* La insignia va pegada a la descripción: se reconoce el formato al pasar.
          Los #hashtags llevan a su sección. */}
      <DescripcionConTags
        texto={pitch.descripcion || perfil.descripcion}
        claro
        prefijo={<InsigniaPitch grande activa={activo} className="mr-2 align-[0.1em]" />}
        className="mt-3 max-w-prose text-sm leading-relaxed text-marfil/90"
      />
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
    <p className="mt-2.5 flex min-w-0 items-center gap-2 text-xs text-marfil">
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
