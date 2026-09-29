import Image from "next/image";
import { IconoCorazon, IconoSonido, IconoSubtitulos } from "@/components/Iconos";
import { ROLES, TIPOS } from "@/lib/rol";
import type { Rol, TipoPerfil } from "@/types/pecera";

export type EjemploPitch = {
  poster: string;
  nombre: string;
  rol: Rol;
  tipo: TipoPerfil;
  /** El bloque de subtítulos que se ve sobre el video. */
  subtitulo: string;
  piques: number;
  /** El pique propio: corazón lleno o vacío. */
  piqueado?: boolean;
};

/** Un reel del feed dibujado dentro de un celular. */
export default function MaquetaReel({
  pitch,
  className = "",
}: {
  pitch: EjemploPitch;
  className?: string;
}) {
  const rol = ROLES[pitch.rol];
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={`Ejemplo de un pitch en el feed de Pecera: ${pitch.nombre}, ${rol.label.toLowerCase()}, con un botón para ver el perfil.`}
        className="relative mx-auto aspect-[9/19] w-[250px] rounded-[2.6rem] bg-tinta p-2.5 shadow-[0_2px_4px_rgb(28_27_22/0.12),0_28px_60px_rgb(28_27_22/0.28)]"
      >
        <div aria-hidden className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-tinta">
          <Image src={pitch.poster} alt="" fill sizes="230px" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />

          <span className="vidrio absolute left-1/2 top-3 flex -translate-x-1/2 items-center rounded-full px-2.5 py-1">
            <Image src="/brand/isotipo-naranja.png" alt="" width={22} height={14} />
          </span>

          <div className="absolute inset-x-0 bottom-0 p-3.5 text-marfil">
            <div className="flex items-end gap-1.5">
              <p className="min-w-0 flex-1 pb-2 text-center text-[11px] font-medium leading-[1.6]">
                <span className="rounded bg-tinta/75 px-1.5 py-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  {pitch.subtitulo}
                </span>
              </p>
              <div className="flex w-8 shrink-0 flex-col items-center gap-1.5">
                <span className="flex flex-col items-center">
                  <IconoCorazon
                    lleno={pitch.piqueado}
                    className={`icono-sombra h-6 w-6 ${pitch.piqueado ? "text-pecera" : "text-marfil"}`}
                  />
                  <span className="texto-sombra text-[9px] font-semibold">{pitch.piques}</span>
                </span>
                <IconoSubtitulos activo className="icono-sombra h-5 w-5" />
                <IconoSonido silenciado={false} className="icono-sombra h-5 w-5" />
              </div>
            </div>

            <div className="mt-2 pr-9">
              <p className="font-display text-base font-semibold leading-tight">{pitch.nombre}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                <span className={`rounded-full px-1.5 py-0.5 font-medium ${rol.bg}`}>{rol.label}</span>
                <span className="text-marfil/75">{TIPOS[pitch.tipo]}</span>
              </div>
              <span className="mt-2.5 inline-flex rounded-full bg-arcilla px-3 py-1.5 text-[11px] font-medium">
                Ver perfil
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
