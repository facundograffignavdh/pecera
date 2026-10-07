import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PieLegal from "@/components/PieLegal";
import { SelloFeria21 } from "@/components/eventos/MarcaFeria21";
import JuegoStand from "@/components/stand/JuegoStand";

export const metadata: Metadata = {
  title: "Juego del stand — Pecera",
  description: "Adiviná el número de 3 cifras en el stand de Pecera en la Feria 21 y ganate una tarjeta NFC.",
  robots: { index: false, follow: false },
};

/**
 * Juego del stand de la Feria 21 (QR / link desde la página de la Feria). Estática: el estado
 * y el juego los pide `JuegoStand` en el navegador. Sin barra inferior (NavInferior).
 */
export default function StandPage() {
  return (
    <main className="tema-fijo h-dvh overflow-y-auto overscroll-y-contain bg-tinta text-marfil">
      <div className="mx-auto w-full max-w-md px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Pecera, ir al inicio" className="flex items-center gap-2">
            <Image src="/brand/isotipo-blanco.png" alt="" width={600} height={388} className="h-8 w-auto" />
            <Image src="/brand/wordmark-marfil.png" alt="Pecera" width={1200} height={261} className="h-5 w-auto" />
          </Link>
          <SelloFeria21 chico />
        </header>

        <div aria-hidden className="mt-10 flex justify-center gap-3">
          {[-8, 0, 8].map((giro) => (
            <span
              key={giro}
              style={{ transform: `rotate(${giro}deg) translateY(${giro === 0 ? -6 : 0}px)` }}
              className="carton flex h-20 w-14 items-center justify-center rounded-xl font-display text-4xl font-semibold text-tinta"
            >
              ?
            </span>
          ))}
        </div>
        <p className="mt-8 text-center text-xs font-bold uppercase tracking-[0.14em] text-marfil/75">Juego del stand</p>
        <h1 className="mt-2 text-center font-display text-4xl font-semibold leading-tight">
          Adiviná el número y ganate una tarjeta NFC
        </h1>

        <JuegoStand />

        <PieLegal tono="oscuro" className="mt-14" />
      </div>
    </main>
  );
}
