import Link from "next/link";
import AnimacionTarjetas from "@/components/nfc/AnimacionTarjetas";
import { boton } from "@/lib/ui";

/**
 * Promo de las tarjetas NFC al pie del juego del stand (/tarjetas): la animación y un botón a /nfc.
 * Las dos páginas van solo por link o QR, así que este enlace no las muestra dentro de la app.
 * Panel Marfil sobre el fondo Tinta del juego (las etiquetas de la animación son para fondo claro).
 */
export default function PromoTarjetas() {
  return (
    <section aria-labelledby="promo-nfc" className="mt-14 rounded-3xl bg-marfil px-5 py-6 text-tinta">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-tinta/70">Tarjetas NFC de Pecera</p>
      <h2 id="promo-nfc" className="mt-2 font-display text-3xl font-semibold leading-tight">
        ¿Querés tu tarjeta NFC con tu logo?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-tinta/80">
        La acercás a cualquier celular y abre tu perfil de Pecera. Con tus colores y tu marca.
      </p>
      <div className="mt-5">
        <AnimacionTarjetas />
      </div>
      <Link href="/nfc" className={`${boton("primario", "lg")} mt-6 w-full`}>
        Conocé las tarjetas
      </Link>
    </section>
  );
}
