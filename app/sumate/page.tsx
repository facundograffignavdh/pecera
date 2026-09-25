import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import HeroEscena from "@/components/landing/HeroEscena";
import MaquetaReel from "@/components/landing/MaquetaReel";
import Revelar from "@/components/landing/Revelar";
import { FEED_DESDE_LANDING, FORM_URL } from "@/lib/landing";
import { ROLES } from "@/lib/rol";

const TITULO = "Subí tu pitch — Pecera";
const DESCRIPCION =
  "Tu proyecto en 90 segundos, frente a quien lo tiene que ver. Subí tu pitch en video, aparecé en el feed de Pecera y que te escriban directo.";

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

const PASOS = [
  {
    titulo: "Grabá tu pitch",
    texto:
      "Hasta 90 segundos, en vertical. Con el celular alcanza. Contá qué hacés, para quién y qué estás buscando.",
  },
  {
    titulo: "Subilo con el formulario",
    texto:
      "Cargás el video, una foto o logo, una descripción de una línea y cómo contactarte. Google te pide iniciar sesión para subir los archivos.",
  },
  {
    titulo: "Aparecés en el feed",
    texto:
      "En 10 a 15 minutos tu pitch está publicado, con subtítulos automáticos y un perfil propio con tus canales de contacto.",
  },
];

const FUNCIONES = [
  {
    titulo: "Feed vertical",
    texto: "Los pitches pasan uno atrás del otro, como en Reels. Arrancan solos y sin sonido.",
  },
  {
    titulo: "Perfil con contacto directo",
    texto:
      "Tocando tu pitch se abre tu perfil con WhatsApp, email, LinkedIn, Instagram o web: los que hayas cargado.",
  },
  {
    titulo: "Piques",
    texto:
      "Quien se interesa te da un pique, el “me picó” de Pecera, y lo invitamos a escribirte en el momento.",
  },
  {
    titulo: "Subtítulos automáticos",
    texto: "Tu pitch se entiende aunque lo miren sin sonido, en el colectivo o en una feria.",
  },
];

const PERFILES = [
  {
    rol: ROLES.emprendedor,
    titulo: "Emprendedores",
    texto: "Startups y emprendimientos que buscan inversión, clientes, socios o visibilidad.",
    tipos: "Startup · Emprendimiento",
  },
  {
    rol: ROLES.inversor,
    titulo: "Inversores",
    texto: "Inversores ángeles y fondos que quieren descubrir proyectos y hablar directo con quienes los hacen.",
    tipos: "Inversor ángel · Fondo de inversión",
  },
  {
    rol: ROLES.aliado,
    titulo: "Aliados",
    texto: "Quienes acompañan al ecosistema y quieren que los proyectos los encuentren.",
    tipos: "Aceleradora · Incubadora · Coach / mentor",
  },
];

// Espeja las preguntas y validaciones del Google Form: si el Form cambia, esto también.
const NECESITAS: { titulo: string; detalle: string; opcional?: boolean }[] = [
  { titulo: "El video del pitch", detalle: "Hasta 90 segundos. Si dura más, se corta." },
  { titulo: "Una foto o el logo", detalle: "Es la imagen de tu perfil." },
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
  {
    titulo: "Email, LinkedIn, Instagram o web",
    detalle: "Los que quieras mostrar en tu perfil.",
    opcional: true,
  },
];

const CONSEJOS = [
  "Grabá en vertical, con buena luz y sin ruido de fondo.",
  "Arrancá con tu nombre y el del proyecto.",
  "Problema, solución y qué buscás: en ese orden.",
  "Mirá a cámara. El sonido importa más que la imagen.",
];

const PREGUNTAS = [
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
    respuesta: "Entre 10 y 15 minutos después de enviar el formulario.",
  },
  {
    pregunta: "¿Por qué el formulario me pide iniciar sesión con Google?",
    respuesta:
      "Porque tiene carga de archivos y Google lo exige para eso. Si se traba dentro de Instagram o WhatsApp, abrí el link en el navegador del celular.",
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

function Flecha({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M6 14 14 6m0 0H7.5M14 6v6.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** CTA principal. Pestaña nueva: el Form con archivos pide login de Google y falla en iframes. */
function BotonForm({ className = "" }: { className?: string }) {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-arcilla px-7 py-3.5 text-[19px] font-bold text-marfil shadow-[0_1px_2px_rgb(28_27_22/0.15),0_8px_20px_rgb(217_90_34/0.28)] transition-[transform,box-shadow] duration-200 ease-pecera hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(28_27_22/0.15),0_12px_28px_rgb(217_90_34/0.36)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta ${className}`}
    >
      Subí tu pitch
      <Flecha className="h-5 w-5" />
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </a>
  );
}

function EnlaceFeed({ children }: { children: ReactNode }) {
  return (
    <Link
      href={FEED_DESDE_LANDING}
      className="inline-flex items-center justify-center rounded-full border border-tinta/25 px-6 py-3.5 font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta/60 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-tinta"
    >
      {children}
    </Link>
  );
}

function Seccion({
  id,
  etiqueta,
  titulo,
  children,
  className = "",
}: {
  id?: string;
  etiqueta: string;
  titulo: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const idTitulo = `${id ?? etiqueta.toLowerCase().replace(/\s+/g, "-")}-titulo`;
  return (
    <section id={id} aria-labelledby={idTitulo} className={`scroll-mt-24 px-5 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">
        <div data-revelar>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] text-tinta/70">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-pecera" />
            {etiqueta}
          </p>
          <h2
            id={idTitulo}
            className="mt-3 max-w-2xl font-display text-[2rem] font-semibold leading-[1.1] text-tinta sm:text-5xl"
          >
            {titulo}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function SumatePage() {
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain scroll-smooth bg-marfil text-tinta">
      <Encabezado variante="perfil" />
      <Revelar />

      {/* Hero: todo el contenido es HTML y aparece al instante; la escena es decoración. */}
      <section
        aria-labelledby="hero-titulo"
        className="relative px-5 pb-16 pt-[calc(max(0.75rem,env(safe-area-inset-top))+5.5rem)] sm:pb-24 lg:pt-36"
      >
        <div className="mx-auto grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="entrada">
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] text-tinta/70">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-pecera" />
              Pitches en video para el ecosistema
            </p>
            <h1
              id="hero-titulo"
              className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.01em] sm:text-6xl lg:text-[4.1rem]"
            >
              Tu proyecto en 90&nbsp;segundos, frente a quien lo tiene que ver.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta/80">
              Pecera es un feed de pitches en video, como Reels, para emprendedores, inversores y
              aliados. Subís tu pitch, aparece en el feed y quien se interesa te escribe directo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BotonForm />
              <EnlaceFeed>Mirá el feed</EnlaceFeed>
            </div>
            <p className="mt-4 text-sm text-tinta/70">
              Se abre un formulario de Google. Te lleva unos minutos.
            </p>
          </div>

          <HeroEscena className="h-72 w-full sm:h-96 lg:h-[30rem]" />
        </div>
      </section>

      {/* Números, no promesas. */}
      <section aria-label="Pecera en números" className="border-y border-tinta/10 px-5 py-10">
        <dl className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {[
            { valor: "90 s", texto: "máximo por pitch" },
            { valor: "3 pasos", texto: "para publicarlo" },
            { valor: "10–15 min", texto: "hasta que aparece en el feed" },
            { valor: "Directo", texto: "por WhatsApp, email o LinkedIn, sin intermediarios" },
          ].map((n, i) => (
            <div key={n.valor} data-revelar style={{ transitionDelay: `${i * 70}ms` }}>
              <dt className="sr-only">{n.texto}</dt>
              <dd>
                <span className="block font-display text-3xl font-semibold sm:text-4xl">{n.valor}</span>
                <span className="mt-1 block text-sm leading-snug text-tinta/70">{n.texto}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Seccion id="como-funciona" etiqueta="Cómo funciona" titulo="Del celular al feed en tres pasos.">
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li
              key={paso.titulo}
              data-revelar
              style={{ transitionDelay: `${i * 90}ms` }}
              className="rounded-3xl border border-tinta/10 bg-[#FBFAF4] p-7"
            >
              <span aria-hidden className="font-display text-5xl font-semibold text-arcilla">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold">{paso.titulo}</h3>
              <p className="mt-2 leading-relaxed text-tinta/80">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion
        etiqueta="Así se ve"
        titulo="Tu pitch, donde la gente ya está mirando."
        className="bg-[#EFEDE2]"
      >
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          <div data-revelar>
            <MaquetaReel />
          </div>
          <ul className="grid gap-8 sm:grid-cols-2">
            {FUNCIONES.map((f, i) => (
              <li key={f.titulo} data-revelar style={{ transitionDelay: `${i * 80}ms` }}>
                <h3 className="font-display text-xl font-semibold">{f.titulo}</h3>
                <p className="mt-2 leading-relaxed text-tinta/80">{f.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </Seccion>

      <Seccion etiqueta="Para quién" titulo="Un lugar para los tres lados del ecosistema.">
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {PERFILES.map((p, i) => (
            <li
              key={p.titulo}
              data-revelar
              style={{ transitionDelay: `${i * 90}ms` }}
              className="flex flex-col rounded-3xl border border-tinta/10 bg-[#FBFAF4] p-7"
            >
              <span aria-hidden className={`h-1.5 w-10 rounded-full ${p.rol.bg}`} />
              <h3 className="mt-5 font-display text-2xl font-semibold">{p.titulo}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-tinta/80">{p.texto}</p>
              <p className="mt-5 text-sm text-tinta/70">{p.tipos}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion
        id="antes-de-empezar"
        etiqueta="Antes de empezar"
        titulo="Tené esto a mano y lo cargás de una."
        className="bg-[#EFEDE2]"
      >
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <ul className="divide-y divide-tinta/10 rounded-3xl border border-tinta/10 bg-marfil px-6">
            {NECESITAS.map((n) => (
              <li key={n.titulo} data-revelar className="flex gap-4 py-5">
                <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-aliado">
                  <path
                    d="m4.5 10.5 3.5 3.5 7.5-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="font-medium">
                    {n.titulo}
                    {n.opcional && <span className="ml-2 text-sm font-normal text-tinta/70">(opcional)</span>}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-snug text-tinta/75">{n.detalle}</p>
                </div>
              </li>
            ))}
          </ul>

          <div data-revelar className="self-start rounded-3xl bg-tinta p-7 text-marfil">
            <h3 className="font-display text-2xl font-semibold">Consejos para el video</h3>
            <ul className="mt-5 space-y-4">
              {CONSEJOS.map((c) => (
                <li key={c} className="flex gap-3 leading-relaxed text-marfil/90">
                  <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pecera" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-marfil/15 pt-5 text-[15px] leading-relaxed text-marfil/80">
              Al final del formulario marcás el consentimiento. Sin eso, el pitch no se publica.
            </p>
          </div>
        </div>
      </Seccion>

      <Seccion etiqueta="Preguntas" titulo="Lo que nos suelen preguntar.">
        <div className="mt-10 max-w-3xl divide-y divide-tinta/10 border-y border-tinta/10">
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta} data-revelar className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium [&::-webkit-details-marker]:hidden">
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

      {/* Cierre */}
      <section aria-labelledby="cierre-titulo" className="px-5 pb-16">
        <div
          data-revelar
          className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] bg-tinta px-7 py-14 text-center text-marfil sm:px-12 sm:py-20"
        >
          <h2
            id="cierre-titulo"
            className="mx-auto max-w-2xl font-display text-[2rem] font-semibold leading-[1.1] sm:text-5xl"
          >
            Que tu proyecto no se quede en el celular.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-marfil/80">
            Grabalo, subilo y en unos minutos está en el feed, listo para que te escriban.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotonForm />
            <Link
              href={FEED_DESDE_LANDING}
              className="inline-flex items-center justify-center rounded-full border border-marfil/30 px-6 py-3.5 font-medium text-marfil transition-colors duration-200 ease-pecera hover:border-marfil/70 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-marfil"
            >
              Mirá el feed
            </Link>
          </div>
        </div>
      </section>

      <PieLegal tono="claro" className="px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]" />
    </main>
  );
}
