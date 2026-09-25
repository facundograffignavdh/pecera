import type { Metadata, Viewport } from "next";
import { Fraunces, Familjen_Grotesk } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

// Absoluta para que la imagen OG resuelva bien al compartir el link.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Pecera",
  description:
    "Los pitches de la feria en 90 segundos. Mirá quién está construyendo qué y escribile.",
};

// "cover" para que env(safe-area-inset-*) tenga valor en iOS: el feed va de borde
// a borde y los controles se corren solos de la barra de inicio y la muesca.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${fraunces.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
