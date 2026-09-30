import Image from "next/image";
import AccesoCuenta from "@/components/AccesoCuenta";
import MenuPrincipal from "@/components/MenuPrincipal";

/**
 * Píldora de vidrio fija arriba, con el menú a la izquierda y el acceso a la cuenta
 * a la derecha. El contenedor deja pasar los toques (mute del feed, "Volver" del
 * perfil); solo las píldoras los capturan. En /cuenta no va el acceso: ya estás ahí.
 */
export default function Encabezado({
  variante,
}: {
  variante: "feed" | "perfil" | "cuenta";
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
      <MenuPrincipal />
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
      {variante !== "cuenta" && <AccesoCuenta compacto={variante === "perfil"} />}
    </header>
  );
}
