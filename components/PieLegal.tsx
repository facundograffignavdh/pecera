import Image from "next/image";

const LEGAL =
  "Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza oferta pública de valores o asesoramiento financiero.";

const TONOS = {
  claro: { src: "/brand/wordmark-tinta.png", texto: "text-tinta/55" },
  oscuro: { src: "/brand/wordmark-marfil.png", texto: "text-marfil/60" },
};

/** Wordmark sobre la leyenda legal obligatoria. `tono` es el del fondo. */
export default function PieLegal({
  tono,
  className = "",
}: {
  tono: keyof typeof TONOS;
  className?: string;
}) {
  const { src, texto } = TONOS[tono];
  return (
    <footer className={`flex flex-col items-center gap-3 ${className}`}>
      <Image src={src} alt="Pecera" width={147} height={32} />
      <p className={`max-w-md text-center text-xs leading-relaxed ${texto}`}>
        {LEGAL}
      </p>
    </footer>
  );
}
