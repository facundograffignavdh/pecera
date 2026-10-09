import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PieLegal from "@/components/PieLegal";
import AnimacionTarjetas from "@/components/nfc/AnimacionTarjetas";
import { boton } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Tarjetas NFC con tu marca — Pecera",
  description: "Tu tarjeta NFC con tu logo: la acercás a un celular y abre tu perfil de Pecera.",
  robots: { index: false, follow: false },
};

const BENEFICIOS = [
  { titulo: "Un toque y listo", texto: "Sin apps: funciona con el NFC del celular o con el QR del dorso." },
  { titulo: "Con tu identidad", texto: "Tu logo, tus colores y tu terminación." },
  { titulo: "Siempre al día", texto: "Cambiás tu perfil en Pecera y la tarjeta lleva a lo nuevo." },
];

/**
 * Landing de las tarjetas NFC personalizadas. Se entra SOLO por link o QR: ninguna pantalla de la app
 * la enlaza, no va en el sitemap y no se indexa. No es el juego del stand (/tarjetas). Estática, clara
 * siempre (`tema-fijo`) y sin barra inferior ni avisos del layout.
 */
export default function NfcPage() {
  return (
    <main className="tema-fijo h-dvh overflow-y-auto overscroll-y-contain bg-marfil text-tinta">
      <div className="mx-auto w-full max-w-md px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-2">
          <Link href="/" aria-label="Pecera, ir al inicio" className="flex items-center gap-2">
            <Image src="/brand/isotipo-naranja.png" alt="" width={600} height={388} className="h-7 w-auto" />
            <Image src="/brand/wordmark-tinta.png" alt="Pecera" width={1200} height={261} className="h-[1.1rem] w-auto" />
          </Link>
          <span className="ml-auto text-xs font-semibold uppercase tracking-[0.12em] text-tinta/70">Tarjetas NFC</span>
        </header>

        <h1 className="mt-7 font-display text-4xl font-semibold leading-[1.05]">Tu tarjeta NFC, con tu marca</h1>
        <p className="mt-3 text-base leading-relaxed text-tinta/80">
          La acercás a cualquier celular y abre tu perfil de Pecera: tu pitch, tu empresa y cómo contactarte.
        </p>

        <div className="mt-6">
          <AnimacionTarjetas />
        </div>

        <ul className="mt-7 flex flex-col gap-3">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex gap-3 text-[0.95rem] leading-snug">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-naranja" />
              <span>
                <b className="block font-semibold">{b.titulo}</b>
                <span className="text-tinta/80">{b.texto}</span>
              </span>
            </li>
          ))}
        </ul>

        <Link href="/cuenta" className={`${boton("primario", "lg")} mt-7 w-full`}>
          Armá tu perfil gratis
        </Link>
        <p className="mt-3 text-center text-sm text-tinta/70">La tarjeta lleva a tu perfil: primero armalo en Pecera.</p>

        <PieLegal tono="claro" className="mt-12" />
      </div>
    </main>
  );
}
