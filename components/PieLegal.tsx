import Image from "next/image";
import Link from "next/link";

const LEGAL =
  "Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza oferta pública de valores o asesoramiento financiero.";

// Los links van más fuertes que la leyenda para pasar AA.
const TONOS = {
  claro: { src: "/brand/wordmark-tinta.png", texto: "text-tinta/55", enlace: "text-tinta/80" },
  oscuro: { src: "/brand/wordmark-marfil.png", texto: "text-marfil/60", enlace: "text-marfil/85" },
};

const CLASE_ENLACE =
  "inline-flex min-h-11 items-center px-2 underline underline-offset-4 transition-colors duration-200 ease-pecera hover:text-arcilla";

/** Wordmark sobre la leyenda legal obligatoria y los links legales. `tono` es el del fondo. */
export default function PieLegal({
  tono,
  className = "",
}: {
  tono: keyof typeof TONOS;
  className?: string;
}) {
  const { src, texto, enlace } = TONOS[tono];
  return (
    <footer className={`flex flex-col items-center gap-3 ${className}`}>
      <Image src={src} alt="Pecera" width={147} height={32} />
      <p className={`max-w-md text-center text-xs leading-relaxed ${texto}`}>{LEGAL}</p>
      <nav aria-label="Legales" className={`-mt-2 flex items-center text-xs ${enlace}`}>
        <Link href="/privacidad" className={CLASE_ENLACE}>
          Privacidad
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terminos" className={CLASE_ENLACE}>
          Condiciones
        </Link>
      </nav>
    </footer>
  );
}
