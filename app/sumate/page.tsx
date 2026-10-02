import type { Metadata } from "next";
import Encabezado from "@/components/Encabezado";
import BotonForm from "@/components/landing/BotonForm";
import BuildEnPublico from "@/components/landing/BuildEnPublico";
import Desparramado from "@/components/landing/Desparramado";
import ElegirRol from "@/components/landing/ElegirRol";
import Hero from "@/components/landing/Hero";
import ValuaStartup from "@/components/landing/ValuaStartup";
import Movimiento from "@/components/landing/Movimiento";
import PezCinematico from "@/components/landing/PezCinematico";
import PieLanding from "@/components/landing/PieLanding";
import { Seccion } from "@/components/landing/Seccion";
import SegunQuienSos from "@/components/landing/SegunQuienSos";

// La página es estática: no lee la base.
export const revalidate = 3600;

const TITULO = "Pecera — Startups, inversores y aliados de Latinoamérica";
const DESCRIPCION =
  "El ecosistema emprendedor en un solo lugar: pitches de 90 segundos, Build in Public, portfolios, Academy y Dataroom. Gratis y sin comisiones.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/sumate" },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "/sumate",
    siteName: "Pecera",
    locale: "es_AR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION },
};

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const DATOS_ESTRUCTURADOS = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITIO}/#organizacion`,
      name: "Pecera",
      url: SITIO,
      logo: `${SITIO}/brand/isotipo-naranja.png`,
      description: DESCRIPCION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITIO}/#sitio`,
      url: SITIO,
      name: "Pecera",
      inLanguage: "es-AR",
      publisher: { "@id": `${SITIO}/#organizacion` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITIO}/explorar?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const ID_SCROLL = "landing";

/** Una franja de la landing: fondo y letras de su tono (los tokens, en globals.css). */
function Banda({ tono, children }: { tono: "blanca" | "naranja"; children: React.ReactNode }) {
  return <div className={`${tono === "naranja" ? "banda-naranja" : "banda-blanca"} bg-marfil text-tinta`}>{children}</div>;
}

/**
 * Landing de adquisición, contada como una historia: qué es y para quién (hero) → el
 * problema y cómo lo ordena Pecera → qué cambia según tu rol → el pez y el lema ("Las
 * bocas cerradas no se alimentan.") → Build in Public, que cierra con un solo llamado.
 * Todos los "Sumate" abren la misma elección de rol (ElegirRol) y de ahí, el alta con
 * Google.
 */
export default function SumatePage() {
  return (
    <>
      {/* Fuera del .tema-fijo: las píldoras de vidrio siguen al tema de la app (de noche,
          oscuras con texto claro), como en el resto de las páginas. Es fixed: no se mueve. */}
      <Encabezado variante="perfil" />
      <main
        id={ID_SCROLL}
        className="tema-fijo landing-base h-dvh overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth bg-marfil text-tinta"
      >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATOS_ESTRUCTURADOS).replace(/</g, "\\u003c") }}
      />
      <div id="progreso" aria-hidden className="fixed inset-x-0 top-0 z-30 h-[3px] origin-left scale-x-0 bg-naranja" />
      <Movimiento scroller={ID_SCROLL} />
      <ElegirRol />

      <Hero />
      {/* La primera parte (hero, "Valuá tu startup" y 01-02) no se toca. Después, una historia:
          para quién es → el pez y el lema → Build in Public → un solo llamado. */}
      <Banda tono="blanca">
        <ValuaStartup />
      </Banda>
      <Banda tono="naranja">
        <Desparramado />
      </Banda>

      <Banda tono="blanca">
        <Seccion id="segun-quien-sos" numero="03" etiqueta="Para vos" titulo="Pecera cambia según quién sos.">
          <SegunQuienSos />
        </Seccion>
      </Banda>

      <PezCinematico />

      <Banda tono="naranja">
        <BuildEnPublico />
      </Banda>
      <PieLanding />

      <div
        id="cta-fijo"
        data-oculto
        inert
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 w-max -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0"
      >
        <BotonForm tamano="md" className="shadow-[0_10px_30px_rgb(28_27_22/0.25)]" />
      </div>
      </main>
    </>
  );
}
