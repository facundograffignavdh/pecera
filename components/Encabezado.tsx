import AccesoCuenta from "@/components/AccesoCuenta";
import LogoInicio from "@/components/LogoInicio";

/**
 * Píldora de vidrio fija arriba (el logo, que lleva al feed) con el acceso a la
 * cuenta a la derecha; la navegación va en la barra de abajo (NavInferior). El
 * contenedor deja pasar los toques (mute del feed, "Volver" del perfil); solo las
 * píldoras los capturan. En /cuenta no va el acceso: ya estás ahí.
 */
export default function Encabezado({
  variante,
}: {
  variante: "feed" | "perfil" | "cuenta";
}) {
  return (
    <header className="no-imprimir pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
      <LogoInicio variante={variante} />
      {variante !== "cuenta" && <AccesoCuenta compacto={variante === "perfil"} />}
    </header>
  );
}
