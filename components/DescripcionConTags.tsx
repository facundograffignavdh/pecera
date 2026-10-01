import type { ReactNode } from "react";
import Link from "next/link";
import { fragmentar } from "@/lib/hashtags";

/**
 * Texto con los #hashtags convertidos en links a su sección (/t/tag). Sirve en
 * perfiles, empresas y pitches. `claro` para usarlo sobre video.
 */
export default function DescripcionConTags({
  texto,
  className = "",
  claro = false,
  prefijo,
}: {
  texto: string;
  className?: string;
  claro?: boolean;
  /** Algo antes del texto, en la misma línea (la insignia PITCH del reel). */
  prefijo?: ReactNode;
}) {
  return (
    <p className={className}>
      {prefijo}
      {fragmentar(texto).map((f, i) =>
        f.tipo === "tag" ? (
          <Link
            key={i}
            href={`/t/${f.tag}`}
            className={`font-semibold underline-offset-4 hover:underline ${claro ? "pointer-events-auto text-marfil" : "text-arcilla"}`}
          >
            {f.valor}
          </Link>
        ) : (
          <span key={i}>{f.valor}</span>
        )
      )}
    </p>
  );
}
