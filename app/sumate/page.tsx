import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import Encabezado from "@/components/Encabezado";
import { IconoCorazon, IconoSubtitulos } from "@/components/Iconos";
import PieLegal from "@/components/PieLegal";
import BotonForm from "@/components/landing/BotonForm";
import FormularioSumate from "@/components/landing/FormularioSumate";
import MaquetaReel, { type EjemploPitch } from "@/components/landing/MaquetaReel";
import Movimiento from "@/components/landing/Movimiento";
import PasosPorRol from "@/components/landing/PasosPorRol";
import Rotador from "@/components/landing/Rotador";
import TarjetaOferta, { type Oferta } from "@/components/landing/TarjetaOferta";
import VideoFondo from "@/components/landing/VideoFondo";
import { FEED_DESDE_LANDING } from "@/lib/landing";

const TITULO = "Subí tu pitch — Pecera";
const DESCRIPCION =
  "Construí tu startup en público: subí tu pitch de 90 segundos y dejá que inversores, mentores y aliados de Latinoamérica te encuentren y te escriban directo.";

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

const ID_SCROLL = "landing";

const INDUSTRIAS = [
  "Fintech",
  "AI Agents",
  "Agtech",
  "Biotech",
  "Climatech",
  "Healthtech",
  "Edtech",
  "Foodtech",
  "Govtech",
  "Proptech",
  "Gaming",
  "IoT",
  "Blockchain",
];

const EJEMPLOS: EjemploPitch[] = [
  {
    poster: "/posters/pitch_1.jpg",
    nombre: "Raíz Verde",
    rol: "emprendedor",
    tipo: "startup",
    subtitulo: "Convertimos la borra de café en sustrato para huertas",
    piques: 128,
    piqueado: true,
  },
  {
    poster: "/posters/pitch_3.jpg",
    nombre: "Nodo Litoral",
    rol: "aliado",
    tipo: "incubadora",
    subtitulo: "Damos espacio y mentoría a proyectos que recién arrancan",
    piques: 64,
  },
];

const FUNCIONES = [
  {
    titulo: "Feed de pitches",
    texto:
      "Pitches de hasta 90 segundos que capturan la esencia de cada proyecto. Scrolleá para descubrir, entrá para profundizar.",
  },
  {
    titulo: "Perfil con contacto directo",
    texto:
      "Tocando un pitch se abre el perfil con WhatsApp, email, LinkedIn, Instagram o web. Sin intermediarios.",
  },
  {
    titulo: "Piques",
    texto:
      "El “me picó” de Pecera: quien se interesa te da un pique y lo invitamos a escribirte en el momento.",
  },
  {
    titulo: "Subtítulos automáticos",
    texto: "Tu pitch se entiende aunque lo miren sin sonido, en el colectivo o en una feria.",
  },
];

const OFERTAS: Oferta[] = [
  {
    titulo: "Innovadores",
    rol: "emprendedor",
    color: "text-arcilla",
    borde: "border-t-pecera",
    foco: "rgb(217 90 34 / 0.09)",
    tilde: "text-arcilla",
    texto:
      "¿Tenés una startup —o una idea— que puede cambiar el juego pero te faltan recursos para construir y escalar?",
    puntos: [
      "Subí tu pitch en video y hacete descubrir por todo el ecosistema",
      "Tu perfil con todos tus canales: WhatsApp, email, LinkedIn y web",
      "Enterate de quién se interesa: cada pique cuenta",
    ],
    cta: "Subir mi pitch",
  },
  {
    titulo: "Inversores",
    rol: "inversor",
    color: "text-inversor",
    borde: "border-t-inversor",
    foco: "rgb(12 106 168 / 0.09)",
    tilde: "text-inversor",
    texto:
      "¿Sos inversor ángel o fondo? La Pecera es tu ventana al deal flow de la región, antes de que sea mainstream.",
    puntos: [
      "Pitches de 90 segundos, uno atrás del otro",
      "Escribile directo al fundador, sin intermediarios",
      "Descubrí y respaldá lo próximo de Latinoamérica, temprano",
    ],
    cta: "Sumarme como inversor",
  },
  {
    titulo: "Aliados",
    rol: "aliado",
    color: "text-aliado",
    borde: "border-t-aliado",
    foco: "rgb(31 122 82 / 0.09)",
    tilde: "text-aliado",
    texto:
      "¿Sos aceleradora, incubadora, coach o mentor? Las startups se construyen con gente: mostrá lo que ofrecés.",
    puntos: [
      "Presentá tu programa o tu experiencia en 90 segundos",
      "Que los proyectos te encuentren y te escriban",
      "Ayudá con tu experiencia donde más suma",
    ],
    cta: "Sumarme como aliado",
  },
];

const ROLES_PASOS = [
  {
    nombre: "Innovadores",
    pasos: [
      { titulo: "Grabá tu pitch", texto: "Hasta 90 segundos, en vertical. Con el celular alcanza. Alcanza con una idea." },
      {
        titulo: "Completá el formulario",
        texto: "Video, foto o logo, una descripción de una línea y cómo contactarte. Te lleva unos minutos.",
      },
      {
        titulo: "Aparecés en el feed",
        texto: "En 10 a 15 minutos tu pitch está publicado, con subtítulos automáticos y tu perfil.",
      },
      { titulo: "Recibí piques y mensajes", texto: "Quien se interesa te da un pique y te escribe directo." },
      { titulo: "Lanzá y escalá", texto: "Con el respaldo de inversores y la ayuda de tus aliados." },
    ],
  },
  {
    nombre: "Inversores y aliados",
    pasos: [
      {
        titulo: "Subí tu pitch",
        texto: "Presentate en 90 segundos: quién sos, qué buscás y cómo acompañás a los proyectos.",
      },
      { titulo: "Scrolleá la Pecera", texto: "Pitches de 90 segundos de toda la región, uno atrás del otro." },
      { titulo: "Dá un pique", texto: "Marcá lo que te interesó. Un pique es interés, no compromiso." },
      { titulo: "Escribí directo", texto: "WhatsApp, email o LinkedIn, desde el perfil de cada proyecto." },
      {
        titulo: "Invertí, mentoreá, acelerá",
        texto: "Cerrá entre ustedes, como siempre. Sin comisiones de la plataforma.",
      },
    ],
  },
];

// Espeja los pasos de FormularioSumate: si el form cambia, esto también.
const NECESITAS: { titulo: string; detalle: string; opcional?: boolean }[] = [
  { titulo: "Nombre del proyecto o persona", detalle: "Como querés aparecer en el feed." },
  { titulo: "Una descripción en una línea", detalle: "Máximo 150 caracteres." },
  {
    titulo: "Qué sos y tu rol",
    detalle: "Startup, emprendimiento, aceleradora, incubadora, inversor ángel, fondo o coach / mentor.",
  },
  {
    titulo: "WhatsApp",
    detalle: "10 dígitos con código de área, sin 0 ni 15. Ejemplo: 3516123456.",
    opcional: true,
  },
  { titulo: "Email, LinkedIn, Instagram o web", detalle: "Los que quieras mostrar en tu perfil.", opcional: true },
  {
    titulo: "El video del pitch",
    detalle: "Todavía no se sube acá: cuando enviás el formulario te contactamos para coordinarlo.",
  },
];

const CONSEJOS = [
  "Grabá en vertical, con buena luz y sin ruido de fondo.",
  "Arrancá con tu nombre y el del proyecto.",
  "Problema, solución y qué buscás: en ese orden.",
  "Mirá a cámara. El sonido importa más que la imagen.",
];

const VALORES = [
  {
    titulo: "Accesibilidad",
    texto:
      "La innovación no puede depender del apellido, la red de contactos ni la geografía. La Pecera está abierta para cualquiera, de cualquier país de la región.",
  },
  {
    titulo: "Transparencia",
    texto: "Comunicación clara y procesos a la vista. La confianza se construye con apertura.",
  },
  {
    titulo: "Construir y fondear en público",
    texto:
      "Construir en público ya demostró que funciona. Lo que viene es fondear en público: que el capital también se mueva a la vista de todos.",
  },
  {
    titulo: "Comunidad",
    texto:
      "Construimos una comunidad, no solo una plataforma: fundadores, inversores y aliados que se encuentran y se escriben.",
  },
  {
    titulo: "Impacto",
    texto:
      "Medimos el éxito por las startups que ayudamos a lanzar, los equipos que ayudamos a armar y las inversiones que ayudamos a concretar.",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Qué es Pecera?",
    respuesta:
      "La plataforma donde el ecosistema emprendedor de Latinoamérica se encuentra: subís tu pitch en video, aparece en un feed público y quien se interesa te escribe directo. Shark Tank, en tu bolsillo.",
  },
  {
    pregunta: "¿Puedo subir mi pitch si solo tengo una idea?",
    respuesta:
      "Sí. Contá la idea, para quién es y qué necesitás. Vale más un pitch claro que un deck perfecto.",
  },
  { pregunta: "¿Cuánto cuesta?", respuesta: "Subir tu pitch es gratis." },
  {
    pregunta: "¿Cuánto equity tengo que ceder?",
    respuesta:
      "Nada. Pecera no toma equity ni cobra comisión por inversión. La negociación y la inversión ocurren directamente entre las partes.",
  },
  {
    pregunta: "¿Quién puede ver mi pitch?",
    respuesta:
      "Cualquiera que entre a Pecera. El feed es público y tu perfil tiene su propio link para compartir.",
  },
  {
    pregunta: "¿Qué datos se publican?",
    respuesta:
      "Tu nombre, la descripción, qué sos, tu rol, la foto o logo y los canales de contacto que cargues. Si no querés mostrar un dato, dejalo vacío.",
  },
  {
    pregunta: "¿Cuánto tarda en aparecer?",
    respuesta:
      "El formulario te toma dos minutos. Después te contactamos para coordinar el video, y una vez que lo mandás, en 10 a 15 minutos ya está publicado.",
  },
  {
    pregunta: "¿Qué es un pique?",
    respuesta:
      "El “me picó” de Pecera: la forma de marcar que un pitch te interesó. Un pique es interés, no compromiso.",
  },
  {
    pregunta: "¿Pecera invierte o maneja plata?",
    respuesta:
      "No. Pecera es una capa de descubrimiento y conexión: no capta fondos, no custodia activos ni hace oferta pública ni asesoramiento financiero. Las conversaciones siguen entre ustedes.",
  },
];

const PEZ = "M2 10c4-5.5 9.5-7.3 14.8-4.7L22.5 2l-1.2 8 1.2 8-5.7-3.3C11.5 17.3 6 16.5 2 10Z";

function Pez({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" aria-hidden className={`h-4 w-[26px] shrink-0 ${className}`}>
      <path d={PEZ} fill="currentColor" />
    </svg>
  );
}

/** Título que entra palabra por palabra al revelarse su bloque. */
function Palabras({ texto }: { texto: string }) {
  const palabras = texto.split(" ");
  return (
    <>
      {palabras.map((p, i) => (
        <span key={i}>
          <span className="palabra" style={{ "--i": i } as CSSProperties}>
            {p}
          </span>
          {i < palabras.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

function Etiqueta({ children, clara = false }: { children: ReactNode; clara?: boolean }) {
  return (
    <p
      className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] ${
        clara ? "justify-center text-marfil/75" : "text-tinta/70"
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-pecera" />
      {children}
    </p>
  );
}

function Seccion({
  id,
  etiqueta,
  titulo,
  bajada,
  children,
  className = "",
}: {
  id: string;
  etiqueta: string;
  titulo: string;
  bajada?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={`scroll-mt-20 px-5 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">
        <div data-revelar>
          <Etiqueta>{etiqueta}</Etiqueta>
          <h2
            id={`${id}-titulo`}
            className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.08] sm:text-5xl"
          >
            <Palabras texto={titulo} />
          </h2>
          {bajada && (
            <p className="mt-5 max-w-2xl border-l-[3px] border-pecera pl-4 text-lg leading-relaxed text-tinta/80">
              {bajada}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function Tilde({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`mt-1 h-[18px] w-[18px] shrink-0 ${className}`}>
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SumatePage() {
  return (
    <main
      id={ID_SCROLL}
      className="h-dvh overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth bg-marfil text-tinta"
    >
      <div
        id="progreso"
        aria-hidden
        className="fixed inset-x-0 top-0 z-30 h-[3px] origin-left scale-x-0 bg-arcilla"
      />
      <Encabezado variante="perfil" />
      <Movimiento scroller={ID_SCROLL} />
      <FormularioSumate />

      {/* ===== HERO: acuario de fondo, cardumen 3D, velo y burbujas ===== */}
      <section
        aria-labelledby="hero-titulo"
        className="relative isolate flex min-h-[clamp(600px,94dvh,920px)] flex-col overflow-hidden"
      >
        <VideoFondo
          src="/landing/pecera-hero.mp4"
          poster="/landing/pecera-hero-poster.jpg"
          className="hero-video absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div aria-hidden className="hero-velo absolute inset-0 -z-10" />
        <div aria-hidden className="burbujas pointer-events-none absolute inset-0 -z-10">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="flex flex-1 items-center px-5 pb-24 pt-[calc(max(0.75rem,env(safe-area-inset-top))+5.5rem)]">
          <div data-parallax className="hero-texto mx-auto w-full max-w-3xl text-center">
            <p className="entrada mx-auto inline-flex items-center gap-2 rounded-full border border-tinta/15 bg-marfil/70 px-4 py-1.5 text-sm font-medium text-tinta/80">
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-aliado" />
              Beta abierta · Latinoamérica · Gratis
            </p>
            <h1
              id="hero-titulo"
              className="entrada mt-6 font-display text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.015em] sm:text-7xl lg:text-[5.25rem]"
              style={{ animationDelay: "90ms" }}
            >
              <span className="sr-only">
                Construí tu startup en público: subí tu pitch de 90 segundos y que el ecosistema te encuentre.
              </span>
              <Rotador />
            </h1>
            <p className="marea mt-4 font-display text-2xl italic sm:text-3xl">
              Construí en público y en comunidad: las bocas cerradas no se alimentan.
            </p>
            <p
              className="entrada mx-auto mt-6 max-w-xl text-lg leading-relaxed text-tinta/85"
              style={{ animationDelay: "260ms" }}
            >
              La plataforma donde las startups de <strong className="font-semibold text-tinta">Latinoamérica</strong>{" "}
              se muestran en pitches de 90 segundos. Inversores, mentores y aliados: todo el que quiera ayudar,
              tiene lugar.
            </p>
            <div
              className="entrada mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "340ms" }}
            >
              <BotonForm />
              <Link
                href={FEED_DESDE_LANDING}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-tinta/30 bg-marfil/60 px-7 font-semibold text-tinta transition-colors duration-200 ease-pecera hover:border-tinta hover:bg-marfil focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta"
              >
                Mirá el feed
              </Link>
            </div>
            <p className="entrada mt-5 text-sm font-medium text-tinta/75" style={{ animationDelay: "430ms" }}>
              Gratis · Te toma 2 minutos · Coordinamos tu video después
            </p>
          </div>
        </div>

        <svg
          aria-hidden
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 -z-10 block h-[70px] w-full"
        >
          <path d="M0 40 C 240 70 480 8 720 32 C 960 56 1200 18 1440 42 L 1440 70 L 0 70 Z" fill="#F5F4EC" />
        </svg>
      </section>

      {/* ===== LA PECERA ===== */}
      <Seccion id="la-pecera" etiqueta="La Pecera" titulo="Shark Tank, en tu bolsillo.">
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            {
              titulo: "Fundadores",
              color: "text-arcilla",
              borde: "border-t-pecera",
              foco: "rgb(217 90 34 / 0.09)",
              texto:
                "Subí tu pitch. Hacete descubrir. Sin cámaras de TV, sin gatekeepers: solo tu proyecto y quienes quieren respaldarlo. Desde una idea sin validar hasta una startup que ya escala.",
            },
            {
              titulo: "Inversores y aliados",
              color: "text-inversor",
              borde: "border-t-inversor",
              foco: "rgb(12 106 168 / 0.09)",
              texto:
                "Descubrí lo próximo de Latinoamérica antes de que sea mainstream. Ángeles, fondos, mentores y aceleradoras: scrolleá pitches de 90 segundos y escribí directo.",
            },
          ].map((t, i) => (
            <div key={t.titulo} data-revelar style={{ transitionDelay: `${i * 80}ms` }}>
              <article
                data-tilt
                style={{ "--foco": t.foco } as CSSProperties}
                className={`h-full rounded-3xl border border-t-[3px] border-tinta/10 bg-[#FBFAF4] p-8 shadow-[0_1px_2px_rgb(28_27_22/0.06),0_10px_30px_rgb(28_27_22/0.06)] ${t.borde}`}
              >
                <h3 className={`font-display text-3xl font-semibold ${t.color}`}>{t.titulo}</h3>
                <p className="mt-3 text-lg leading-relaxed text-tinta/80">{t.texto}</p>
              </article>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ===== CARDUMEN DE INDUSTRIAS ===== */}
      <div aria-hidden className="cardumen overflow-hidden border-y border-tinta/10 bg-[#FBFAF4] py-5">
        <div className="cardumen-pista">
          {[0, 1].map((copia) => (
            <span
              key={copia}
              className="inline-flex items-center gap-9 whitespace-nowrap pr-9 font-display text-2xl italic text-tinta/75"
            >
              {INDUSTRIAS.map((ind, i) => (
                <span key={ind} className="inline-flex items-center gap-9">
                  <Pez className={i % 2 ? "-scale-x-100 text-inversor/70" : "text-pecera"} />
                  {ind}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ===== ASÍ SE VE ===== */}
      <Seccion
        id="funciones"
        etiqueta="Las funciones"
        titulo="Lo que vive adentro de la Pecera."
        bajada="Así se ve tu pitch en el feed: vertical, como los Reels, con tu perfil a un toque."
        className="bg-[#EFEDE2]"
      >
        <div className="mt-14 grid items-center gap-16 lg:grid-cols-[auto_1fr] lg:gap-20">
          <div data-revelar className="mx-auto">
            {/* En celular entran los dos achicados: zoom escala también el layout. */}
            <div className="relative flex items-start gap-6 [zoom:0.62] sm:[zoom:1]">
              {EJEMPLOS.map((pitch, i) => (
                <div
                  key={pitch.nombre}
                  className={`flotar ${i === 1 ? "mt-16" : ""}`}
                  style={{ animationDelay: `${i * -3}s` }}
                >
                  <MaquetaReel pitch={pitch} />
                </div>
              ))}
              <span
                aria-hidden
                className="vidrio flotar absolute -left-20 top-28 hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_8px_24px_rgb(28_27_22/0.12)] xl:inline-flex"
                style={{ animationDelay: "-2s" }}
              >
                <IconoCorazon lleno className="h-5 w-5 text-pecera" />
                Te dieron un pique
              </span>
              <span
                aria-hidden
                className="vidrio flotar absolute -right-20 bottom-24 hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_8px_24px_rgb(28_27_22/0.12)] xl:inline-flex"
                style={{ animationDelay: "-4s" }}
              >
                <IconoSubtitulos activo className="h-5 w-5" />
                Subtítulos automáticos
              </span>
            </div>
            <p className="mt-6 text-center text-sm text-tinta/70">Pitches de ejemplo</p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {FUNCIONES.map((f, i) => (
              <li key={f.titulo} data-revelar style={{ transitionDelay: `${i * 80}ms` }}>
                <article
                  data-tilt
                  className="h-full rounded-3xl border border-tinta/10 bg-marfil p-7 shadow-[0_1px_2px_rgb(28_27_22/0.05)]"
                >
                  <h3 className="font-display text-2xl font-semibold">{f.titulo}</h3>
                  <p className="mt-2 leading-relaxed text-tinta/80">{f.texto}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </Seccion>

      {/* ===== TODO EL ECOSISTEMA ===== */}
      <Seccion
        id="ecosistema"
        etiqueta="Todo el ecosistema"
        titulo="Una sola plataforma."
        bajada="Una startup no se construye sola. Acá hay lugar para los que la fundan, los que la fondean y los que la ayudan a crecer."
      >
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {OFERTAS.map((o, i) => (
            <li key={o.titulo} data-revelar style={{ transitionDelay: `${i * 90}ms` }}>
              <TarjetaOferta o={o} />
            </li>
          ))}
        </ul>
      </Seccion>

      {/* ===== FRANJA ===== */}
      <section aria-labelledby="franja-titulo" data-revelar className="haz bg-tinta px-5 py-20 text-center text-marfil">
        <div className="relative mx-auto max-w-4xl">
          <h2 id="franja-titulo" className="font-display text-[2.1rem] font-semibold leading-[1.12] sm:text-5xl">
            ¿Listo para fondear al próximo{" "}
            <span className="destello whitespace-nowrap italic">[&nbsp;unicornio&nbsp;]</span>?
          </h2>
          <BotonForm className="mt-10">Subí tu pitch</BotonForm>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <Seccion
        id="como-funciona"
        etiqueta="Cómo funciona"
        titulo="Grabá, subí y hacete descubrir."
        bajada="Del celular al feed, sin vueltas. Elegí tu rol:"
        className="bg-[#EFEDE2]"
      >
        <PasosPorRol roles={ROLES_PASOS} />
      </Seccion>

      {/* ===== ANTES DE EMPEZAR ===== */}
      <Seccion id="antes-de-empezar" etiqueta="Antes de empezar" titulo="Tené esto a mano y lo cargás de una.">
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <ul className="divide-y divide-tinta/10 rounded-3xl border border-tinta/10 bg-[#FBFAF4] px-6">
            {NECESITAS.map((n) => (
              <li key={n.titulo} data-revelar className="flex gap-4 py-5">
                <Tilde className="text-aliado" />
                <div>
                  <p className="font-semibold">
                    {n.titulo}
                    {n.opcional && <span className="ml-2 text-sm font-normal text-tinta/70">(opcional)</span>}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-snug text-tinta/75">{n.detalle}</p>
                </div>
              </li>
            ))}
          </ul>

          <div data-revelar className="haz self-start rounded-3xl bg-tinta p-8 text-marfil">
            <div className="relative">
              <h3 className="font-display text-2xl font-semibold">Consejos para el video</h3>
              <ul className="mt-5 space-y-4">
                {CONSEJOS.map((c) => (
                  <li key={c} className="flex gap-3 leading-relaxed text-marfil/90">
                    <Pez className="mt-1 text-pecera" />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-marfil/15 pt-5 text-[15px] leading-relaxed text-marfil/80">
                Al final del formulario marcás el consentimiento. Sin eso no guardamos tu postulación.
              </p>
            </div>
          </div>
        </div>
      </Seccion>

      {/* ===== VALORES ===== */}
      <section aria-labelledby="valores-titulo" data-carrusel-raiz className="bg-[#EFEDE2] px-5 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl">
          <div data-revelar className="flex items-end justify-between gap-6">
            <div>
              <Etiqueta>Nuestros valores</Etiqueta>
              <h2 id="valores-titulo" className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] sm:text-5xl">
                <Palabras texto="En qué creemos" />
              </h2>
            </div>
            <div className="hidden gap-2 sm:flex">
              {[
                { attr: { "data-carrusel-prev": "" }, label: "Valor anterior", texto: "←" },
                { attr: { "data-carrusel-next": "" }, label: "Valor siguiente", texto: "→" },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  {...b.attr}
                  aria-label={b.label}
                  className="grid h-12 w-12 place-items-center rounded-full border border-tinta/25 text-xl transition-colors duration-200 ease-pecera hover:border-tinta hover:bg-tinta hover:text-marfil disabled:pointer-events-none disabled:opacity-35"
                >
                  {b.texto}
                </button>
              ))}
            </div>
          </div>
          <ul
            data-carrusel
            className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 [scroll-padding-inline:1.25rem]"
          >
            {VALORES.map((v, i) => (
              <li
                key={v.titulo}
                data-revelar
                style={{ transitionDelay: `${i * 70}ms` }}
                className="w-[min(82vw,340px)] shrink-0 snap-start"
              >
                <article className="h-full rounded-3xl border border-tinta/10 bg-marfil p-7">
                  <span aria-hidden className="font-display text-sm font-semibold text-tinta/60">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-semibold">{v.titulo}</h3>
                  <p className="mt-2 leading-relaxed text-tinta/80">{v.texto}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== PREGUNTAS ===== */}
      <Seccion id="preguntas" etiqueta="Preguntas frecuentes" titulo="Antes de que preguntes.">
        <div className="preguntas mt-10 max-w-3xl divide-y divide-tinta/10 border-y border-tinta/10">
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta} data-revelar className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {p.pregunta}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-tinta/20 text-xl leading-none transition-transform duration-300 ease-pecera group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-12 leading-relaxed text-tinta/80">{p.respuesta}</p>
            </details>
          ))}
        </div>
      </Seccion>

      {/* ===== CIERRE ===== */}
      <section aria-labelledby="cierre-titulo" className="px-5 pb-16">
        <div
          data-revelar
          className="haz relative isolate mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-tinta px-7 py-16 text-center text-marfil sm:px-12 sm:py-24"
        >
          <div
            aria-hidden
            className="burbujas pointer-events-none absolute inset-0 -z-10"
            style={{ "--color-burbuja": "rgb(245 244 236 / 0.3)" } as CSSProperties}
          >
            <span />
            <span />
            <span />
            <span />
          </div>
          <Etiqueta clara>Las bocas cerradas no se alimentan</Etiqueta>
          <h2
            id="cierre-titulo"
            className="mx-auto mt-4 max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.1] sm:text-6xl"
          >
            El próximo unicornio latinoamericano ya está nadando por acá.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-marfil/80">
            Que no te lo cuenten. Subí tu pitch y en unos minutos estás en el feed.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotonForm />
            <Link
              href={FEED_DESDE_LANDING}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-marfil/30 px-7 font-semibold text-marfil transition-colors duration-200 ease-pecera hover:border-marfil/70 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-marfil"
            >
              Mirá el feed
            </Link>
          </div>
        </div>
      </section>

      <div className="px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <PieLegal tono="claro" />
        <p className="mt-4 text-center text-xs text-tinta/70">
          © {new Date().getFullYear()} Pecera · Nacida en Córdoba, para toda Latinoamérica
        </p>
      </div>

      <button
        id="arriba"
        type="button"
        data-oculto
        aria-label="Volver arriba"
        className="vidrio fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-20 grid h-12 w-12 place-items-center rounded-full shadow-[0_6px_20px_rgb(28_27_22/0.18)]"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
          <path
            d="M12 19V5m0 0-6 6m6-6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </main>
  );
}
