import type { Metadata, Viewport } from "next";
import { Fraunces, Familjen_Grotesk } from "next/font/google";
import "./globals.css";
import AvisoCuentaEliminada from "@/components/AvisoCuentaEliminada";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#13120f" },
    { color: "#f5f4ec" },
  ],
};

// Tema elegido (luz/noche) antes del primer pintado: sin parpadeo. "Auto" no deja
// marca y sigue al sistema. Mismo nombre de clave que lib/tema.ts.
const SCRIPT_TEMA = `try{var t=localStorage.getItem("pecera:tema");if(t==="luz"||t==="noche")document.documentElement.dataset.tema=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${fraunces.variable} ${grotesk.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="h-dvh overflow-hidden">
        {children}
        <AvisoCuentaEliminada />
      </body>
    </html>
  );
}
