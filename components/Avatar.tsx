import Image from "next/image";
import { iniciales, ROLES } from "@/lib/rol";
import type { Perfil } from "@/types/pecera";

type Props = {
  perfil: Pick<Perfil, "nombre" | "rol" | "avatar_url">;
  /** Lado del círculo en px. */
  size?: number;
  /**
   * Pasa por el optimizador (gasta cuota de imágenes): para listas largas con
   * avatares chicos, como la votación, donde bajar 40 JPG de 512 px pesa ~3 MB.
   */
  optimizada?: boolean;
};

export default function Avatar({ perfil, size = 48, optimizada = false }: Props) {
  const estilo = { width: size, height: size };

  if (perfil.avatar_url) {
    return (
      <Image
        src={perfil.avatar_url}
        alt=""
        width={size}
        height={size}
        // Ya viene de 512 px en JPG desde el celular: sin pasar por el optimizador
        // (no depende de remotePatterns ni gasta cuota de imágenes).
        unoptimized={!optimizada}
        style={estilo}
        className="shrink-0 rounded-full bg-tinta/10 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={estilo}
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-marfil ${
        ROLES[perfil.rol].bg
      }`}
    >
      <span style={{ fontSize: size * 0.38 }}>{iniciales(perfil.nombre)}</span>
    </span>
  );
}
