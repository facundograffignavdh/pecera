import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PaginaLegal, { CLASE_ENLACE, CONTACTO_PRIVACIDAD, Seccion } from "@/components/PaginaLegal";

// BORRADOR para revisión legal: no es un texto aprobado por un abogado. Ver la
// nota en CLAUDE.md antes de darlo por cerrado.

export const metadata: Metadata = {
  title: "Condiciones de uso — Pecera",
  description: "Qué es Pecera, qué podés publicar, qué permiso nos das y cómo dar de baja tu cuenta.",
};

const INDICE = [
  { id: "que-es", titulo: "Qué es Pecera (y qué no)" },
  { id: "interes", titulo: "Piques y contactos" },
  { id: "cuenta", titulo: "Tu cuenta" },
  { id: "contenido", titulo: "Tu contenido" },
  { id: "no-permitido", titulo: "Qué no se puede publicar" },
  { id: "permiso", titulo: "El permiso que nos das" },
  { id: "baja", titulo: "Cómo dar de baja tu cuenta" },
  { id: "tal-cual", titulo: "El servicio, tal cual" },
  { id: "cambios", titulo: "Cambios, ley aplicable y contacto" },
];

const Fuerte = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-tinta">{children}</strong>
);

export default function TerminosPage() {
  return (
    <PaginaLegal
      titulo="Condiciones de uso"
      actualizado="28 de septiembre de 2026"
      actualizadoIso="2026-09-28"
      intro={
        <p>
          Estas condiciones explican cómo funciona Pecera y qué acordamos cuando la usás. Al crear
          tu perfil o subir un pitch, las aceptás junto con la{" "}
          <Link href="/privacidad" className={CLASE_ENLACE}>política de privacidad</Link>. Mirar
          el feed no requiere cuenta.
        </p>
      }
      indice={INDICE}
    >
      <Seccion id="que-es" titulo="Qué es Pecera (y qué no)">
        <p>
          Pecera es una capa de descubrimiento y conexión: un feed de pitches en video para que
          emprendedores, inversores y aliados se conozcan y se contacten por su cuenta.
        </p>
        <p>
          <Fuerte>Pecera no capta fondos del público, no custodia activos ni realiza oferta
          pública de valores o asesoramiento financiero.</Fuerte> No es una plataforma de
          financiamiento colectivo (Ley 27.349) ni un agente del mercado de capitales (Ley
          26.831). Adentro de Pecera no se invierte, no se paga y no se cobra nada.
        </p>
        <p>
          Lo que cada persona dice en su pitch o en su perfil es responsabilidad suya. No
          verificamos los proyectos, las cifras ni a los inversores: antes de tomar cualquier
          decisión, hacé tu propia evaluación.
        </p>
      </Seccion>

      <Seccion id="interes" titulo="Piques y contactos">
        <p>
          Un pique (&quot;me picó&quot;) o un mensaje por los canales de un perfil son solo
          muestras de interés. No obligan a nadie a nada: no son una oferta, un compromiso de
          inversión ni un acuerdo. Lo que se converse o se acuerde fuera de Pecera queda entre
          las partes.
        </p>
      </Seccion>

      <Seccion id="cuenta" titulo="Tu cuenta">
        <ul>
          <li>Tenés que ser mayor de 18 años.</li>
          <li>Entrás con tu cuenta de Google y tenés un solo perfil por cuenta.</li>
          <li>
            Los datos de tu perfil tienen que ser reales y tuyos (o de tu proyecto u
            organización). No te hagas pasar por otra persona.
          </li>
          <li>Cuidá el acceso a tu cuenta de Google: lo que se haga con ella cuenta como hecho por vos.</li>
        </ul>
      </Seccion>

      <Seccion id="contenido" titulo="Tu contenido">
        <p>
          Sos responsable de lo que subís: tu perfil, tu foto y tus pitches. Al subirlo, nos
          confirmás que:
        </p>
        <ul>
          <li>el video es tuyo o tenés permiso para usarlo;</li>
          <li>
            tenés los derechos de la música, las imágenes y las marcas que aparecen, o son de uso
            libre;
          </li>
          <li>las personas que aparecen en el video están de acuerdo con que se publique;</li>
          <li>lo que decís es cierto y no engaña a quien lo mira.</li>
        </ul>
        <p>
          Si alguien del equipo de Pecera sube un video por vos, lo hace a tu pedido y valen las
          mismas reglas.
        </p>
      </Seccion>

      <Seccion id="no-permitido" titulo="Qué no se puede publicar">
        <ul>
          <li>Contenido ilegal, violento, sexual o que discrimine o acose a alguien.</li>
          <li>Datos personales de terceros sin su permiso.</li>
          <li>Contenido que infrinja derechos de autor, marcas o la imagen de otra persona.</li>
          <li>
            Promesas de rentabilidad, pedidos de dinero al público u ofertas de valores o de
            participación en una empresa.
          </li>
          <li>Estafas, información falsa o engañosa, spam o publicidad que no tenga que ver con tu proyecto.</li>
          <li>Virus, enlaces maliciosos o cualquier intento de dañar el servicio.</li>
        </ul>
        <p>
          El equipo de Pecera puede, sin aviso previo, no publicar, ocultar o borrar contenido y
          bloquear cuentas o emails que no cumplan estas condiciones o que pongan en riesgo a
          otras personas o al servicio. Si creés que algo no debería estar, escribinos a{" "}
          <a href={`mailto:${CONTACTO_PRIVACIDAD}`} className={`${CLASE_ENLACE} break-all`}>
            {CONTACTO_PRIVACIDAD}
          </a>
          .
        </p>
      </Seccion>

      <Seccion id="permiso" titulo="El permiso que nos das">
        <p>
          Tu contenido sigue siendo tuyo. Para poder mostrarlo, nos das un permiso gratuito y no
          exclusivo para guardarlo, adaptarlo (comprimir el video, sacarle una imagen de portada,
          generar subtítulos y achicar la foto) y mostrarlo públicamente en Pecera, incluidos los
          adelantos que aparecen cuando alguien comparte un link.
        </p>
        <p>
          Ese permiso dura mientras el contenido esté publicado. Cuando ocultás tu perfil o nos
          pedís que borremos algo, dejamos de mostrarlo; puede tardar unos minutos en
          desaparecer de todas las pantallas. No usamos tu contenido para publicidad ni se lo
          damos a terceros.
        </p>
      </Seccion>

      <Seccion id="baja" titulo="Cómo dar de baja tu cuenta">
        <ul>
          <li>
            <Fuerte>Ocultar:</Fuerte> en <Link href="/cuenta" className={CLASE_ENLACE}>Mi
            perfil</Link> tildá &quot;Ocultar mi perfil&quot;. Deja de verse enseguida y lo podés
            volver a mostrar cuando quieras.
          </li>
          <li>
            <Fuerte>Borrar todo:</Fuerte> escribinos a{" "}
            <a href={`mailto:${CONTACTO_PRIVACIDAD}`} className={`${CLASE_ENLACE} break-all`}>
              {CONTACTO_PRIVACIDAD}
            </a>{" "}
            desde el email de tu cuenta. Borramos tu cuenta, tu perfil, tus pitches y los videos
            originales, como explica la{" "}
            <Link href="/privacidad#derechos" className={CLASE_ENLACE}>política de privacidad</Link>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="tal-cual" titulo="El servicio, tal cual">
        <p>
          Pecera se ofrece tal cual está, sin garantías de que funcione siempre, sin cortes ni
          errores. Podemos cambiar, pausar o dejar de ofrecer el servicio, o partes de él, en
          cualquier momento.
        </p>
        <p>
          No respondemos por lo que publican otras personas, por lo que se acuerde entre quienes
          se contactan a través de Pecera ni por las decisiones que se tomen a partir de lo que
          se vio acá, en la medida en que lo permita la ley.
        </p>
      </Seccion>

      <Seccion id="cambios" titulo="Cambios, ley aplicable y contacto">
        <p>
          Si cambiamos estas condiciones, actualizamos la fecha de arriba. Si el cambio es
          importante, te avisamos en Pecera antes de que empiece a regir. Si seguís usando
          Pecera después, quiere decir que aceptás la versión nueva.
        </p>
        <p>
          Estas condiciones se rigen por las leyes de la República Argentina. Cualquier
          conflicto se resuelve ante los tribunales ordinarios de la ciudad de Córdoba,
          Argentina, salvo que la ley disponga otra cosa.
        </p>
        <p>
          Responsable: Facundo Graffigna. Contacto:{" "}
          <a href={`mailto:${CONTACTO_PRIVACIDAD}`} className={`${CLASE_ENLACE} break-all`}>
            {CONTACTO_PRIVACIDAD}
          </a>
          .
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
