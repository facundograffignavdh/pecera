import Image from "next/image";
import { iniciales, ROLES } from "@/lib/rol";
import type { Perfil } from "@/types/pecera";

type Props = {
  perfil: Perfil;
  /** Lado del círculo en px. */
  size?: number;
};

export default function Avatar({ perfil, size = 48 }: Props) {
  const estilo = { width: size, height: size };

  if (perfil.avatar_url) {
    return (
      <Image
        src={perfil.avatar_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
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
