import Image from "next/image";
import LogoInicio from "@/components/LogoInicio";
import { ColumnaReel, DatosReel } from "@/components/ReelPartes";
import type { ItemFeed } from "@/types/pecera";

/** Piques que muestra la maqueta (fijo, no se lee de la base). */
const PIQUES_MAQUETA = 120;

/** Un pitch real, con permiso de la persona. El id no es el suyo: el "+" sale siempre sin seguir. */
const EJEMPLO: ItemFeed = {
  pitch: {
    id: "maqueta",
    perfil_id: "maqueta",
    video_url: "",
    poster_url: "/landing/pitch-facundo.webp",
    orden: 0,
    publicado: true,
    descripcion: "Entrá a mi perfil para conocer más",
  },
  perfil: {
    id: "maqueta",
    slug: "facundo-graffigna",
    nombre: "Facundo Graffigna",
    tipo: "profesional",
    rol: "aliado",
    descripcion: "",
    avatar_url: "/landing/avatar-facundo.webp",
    whatsapp: null,
    email: null,
    linkedin: null,
    instagram: null,
    web: null,
    publicado: true,
    especialidades: ["tecnologia", "ia_datos"],
    industrias: ["saas"],
  },
  piques: PIQUES_MAQUETA,
};

/** Ancho de un celular de referencia: la pantalla se dibuja a ese tamaño y se achica. */
const ANCHO_CELULAR = 390;
/** Ancho de la pantalla dentro del marco (250 px menos el borde de 10 px por lado). */
const ANCHO_PANTALLA = 230;

/**
 * Un reel del feed dibujado dentro de un celular, con las piezas reales del reel
 * (`ReelPartes`, `LogoInicio`): si el feed cambia, la maqueta cambia con él. La
 * pantalla se arma a tamaño de celular y se escala, así todo guarda sus medidas.
 * Es una imagen: `inert` deja los links y botones reales fuera del foco y del toque.
 */
export default function MaquetaReel({ className = "" }: { className?: string }) {
  const { perfil } = EJEMPLO;
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={`Así se ve un pitch en el feed de Pecera: ${perfil.nombre}, aliado, con su pitch en video.`}
        className="paleta-original relative mx-auto aspect-[9/19] w-[250px] rounded-[2.6rem] bg-tinta p-2.5 shadow-[0_2px_4px_rgb(28_27_22/0.12),0_28px_60px_rgb(28_27_22/0.28)]"
      >
        <div aria-hidden inert className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-tinta">
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: ANCHO_CELULAR,
              height: `${(100 * ANCHO_CELULAR) / ANCHO_PANTALLA}%`,
              transform: `scale(${ANCHO_PANTALLA / ANCHO_CELULAR})`,
            }}
          >
            <Image
              src={EJEMPLO.pitch.poster_url!}
              alt=""
              fill
              sizes={`${ANCHO_PANTALLA}px`}
              unoptimized
              className="object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-tinta via-tinta/80 to-transparent" />

            <div className="absolute inset-x-0 top-0 flex justify-center pt-3">
              <LogoInicio />
            </div>

            <div className="absolute inset-x-0 bottom-0 pb-8 pl-5 pr-2 text-marfil">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1" />
                <ColumnaReel
                  piques={EJEMPLO.piques}
                  piqueado={false}
                  mostrarCC
                  conSubtitulos={false}
                  silenciado={false}
                />
              </div>
              <DatosReel item={EJEMPLO} href={`/p/${perfil.slug}`} activo />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
