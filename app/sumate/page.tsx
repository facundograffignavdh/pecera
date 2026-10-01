import type { Metadata } from "next";
import Encabezado from "@/components/Encabezado";
import AcademyDataroom from "@/components/landing/AcademyDataroom";
import BotonForm from "@/components/landing/BotonForm";
import BuildEnPublico from "@/components/landing/BuildEnPublico";
import CaminoInversion from "@/components/landing/CaminoInversion";
import Cierre from "@/components/landing/Cierre";
import Confianza from "@/components/landing/Confianza";
import Desparramado from "@/components/landing/Desparramado";
import Diferencia from "@/components/landing/Diferencia";
import ElegirRol from "@/components/landing/ElegirRol";
import ExplorarBusqueda from "@/components/landing/ExplorarBusqueda";
import Hero from "@/components/landing/Hero";
import ValuaStartup from "@/components/landing/ValuaStartup";
import MapaEcosistema from "@/components/landing/MapaEcosistema";
import Movimiento from "@/components/landing/Movimiento";
import PieLanding from "@/components/landing/PieLanding";
import Preguntas, { PREGUNTAS } from "@/components/landing/Preguntas";
import { Seccion } from "@/components/landing/Seccion";
import SegunQuienSos from "@/components/landing/SegunQuienSos";
import { getPulsoEcosistema } from "@/lib/datos";
import { LECCIONES } from "@/lib/essentials";
import { PLANTILLAS } from "@/lib/plantillas";

// Los números de "Confianza" y la vitrina de pitches salen de la base.
export const revalidate = 60;

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
    {
      "@type": "FAQPage",
      mainEntity: PREGUNTAS.map((p) => ({
        "@type": "Question",
        name: p.pregunta,
        acceptedAnswer: { "@type": "Answer", text: p.respuesta },
      })),
    },
  ],
};

const ID_SCROLL = "landing";

/**
 * Landing de adquisición. El recorrido: qué es y para quién (hero) → el problema
 * y cómo lo ordena Pecera → cómo se ve → qué cambia según tu rol → el mapa de
 * módulos → Build in Public, inversión, Academy → Dataroom y Explorar → lo que se
 * puede comprobar → por qué Pecera → preguntas → un solo CTA. Todos los "Sumate"
 * abren la misma elección de rol (ElegirRol) y de ahí, el alta con Google.
 */
export default async function SumatePage() {
  const pulso = await getPulsoEcosistema();

  return (
    <main
      id={ID_SCROLL}
      className="tema-fijo h-dvh overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth bg-marfil text-tinta"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATOS_ESTRUCTURADOS).replace(/</g, "\\u003c") }}
      />
      <div id="progreso" aria-hidden className="fixed inset-x-0 top-0 z-30 h-[3px] origin-left scale-x-0 bg-naranja" />
      <Encabezado variante="perfil" />
      <Movimiento scroller={ID_SCROLL} />
      <ElegirRol />

      <Hero />
      <ValuaStartup />
      <Desparramado />

      <Seccion
        id="como-se-ve"
        numero="03"
        etiqueta="Cómo se ve"
        titulo="Así se ve Pecera en 30 segundos."
        bajada="El feed, un pique y el perfil de contacto de un proyecto, recreados desde la app real."
        className="border-t border-tinta/10"
      >
        <div
          data-revelar
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[var(--radius-bloque)] bg-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_24px_56px_rgb(28_27_22/0.18)]"
        >
          <iframe
            src="/demo-video/index.html"
            title="Video demo de Pecera: el feed, un pique y el perfil de contacto"
            loading="lazy"
            className="aspect-video w-full"
            style={{ border: 0 }}
          />
        </div>
      </Seccion>

      <Seccion id="segun-quien-sos" numero="04" etiqueta="Para vos" titulo="Pecera cambia según quién sos." className="bg-superficie">
        <SegunQuienSos />
      </Seccion>

      <Seccion
        id="mapa"
        numero="05"
        etiqueta="El ecosistema"
        titulo="Todo lo que pasa en la Pecera, conectado."
        bajada="Cinco cosas que hacés acá. Elegí una para ver con qué se hace."
      >
        <MapaEcosistema lecciones={LECCIONES.length} templates={PLANTILLAS.length} />
      </Seccion>

      <BuildEnPublico />
      <CaminoInversion />
      <AcademyDataroom />
      <ExplorarBusqueda />
      <Confianza pulso={pulso} />
      <Diferencia />
      <Preguntas />
      <Cierre />
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
  );
}
