import Image from "next/image";

/**
 * Píldora de vidrio fija arriba. El contenedor deja pasar los toques
 * (mute del feed, "Volver" del perfil); solo la píldora los captura.
 */
export default function Encabezado({
  variante,
}: {
  variante: "feed" | "perfil";
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="vidrio pointer-events-auto flex items-center rounded-full px-4 py-2">
        {variante === "feed" ? (
          <Image
            src="/brand/isotipo-naranja.png"
            alt="Pecera"
            width={43}
            height={28}
            preload
          />
        ) : (
          <Image
            src="/brand/logo-combinado-tinta.png"
            alt="Pecera"
            width={112}
            height={24}
            preload
          />
        )}
      </div>
    </header>
  );
}
