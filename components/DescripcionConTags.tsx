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
}: {
  texto: string;
  className?: string;
  claro?: boolean;
}) {
  return (
    <p className={className}>
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
