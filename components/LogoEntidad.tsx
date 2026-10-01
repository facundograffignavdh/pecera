import Image from "next/image";

const TAMANOS = { xs: 24, sm: 32, md: 44, lg: 56, xl: 72 } as const;

/**
 * Logo de una organización (empresa, fondo, aliado). Un solo contenedor para toda
 * la app: cuadrado con esquinas suaves, superficie neutra y borde sutil, el logo
 * entero adentro (nunca estirado ni recortado) con aire alrededor. Sin logo, la
 * inicial en Fraunces sobre naranja suave. Las personas usan Avatar (círculo).
 */
export default function LogoEntidad({
  nombre,
  logoUrl,
  tamano = "md",
  className = "",
}: {
  nombre: string;
  logoUrl?: string | null;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const px = TAMANOS[tamano];
  const radio = Math.round(px * 0.24);
  const inicial = nombre.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border ${
        logoUrl ? "border-tinta/10 bg-marfil" : "border-transparent bg-naranja-suave text-naranja-texto"
      } ${className}`}
      style={{ width: px, height: px, borderRadius: radio }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`Logo de ${nombre}`}
          width={px * 2}
          height={px * 2}
          className="h-full w-full object-contain"
          style={{ padding: Math.round(px * 0.12) }}
        />
      ) : (
        <span aria-hidden className="font-display font-semibold leading-none" style={{ fontSize: Math.round(px * 0.45) }}>
          {inicial}
        </span>
      )}
    </span>
  );
}
