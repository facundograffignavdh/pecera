import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal, { CLASE_ENLACE, CONTACTO_PRIVACIDAD, Seccion } from "@/components/PaginaLegal";

// BORRADOR para revisión legal: no es un texto aprobado por un abogado. Ver la
// nota en CLAUDE.md antes de darlo por cerrado.

export const metadata: Metadata = {
  title: "Política de privacidad — Pecera",
  description: "Qué datos guarda Pecera, para qué los usa, qué es público y cómo ejercer tus derechos.",
};

const INDICE = [
  { id: "responsable", titulo: "Quién es el responsable" },
  { id: "datos", titulo: "Qué datos guardamos" },
  { id: "para-que", titulo: "Para qué los usamos" },
  { id: "publico", titulo: "Qué es público y qué no" },
  { id: "proveedores", titulo: "Proveedores y dónde se guardan" },
  { id: "conservacion", titulo: "Cuánto tiempo los guardamos" },
  { id: "derechos", titulo: "Tus derechos" },
  { id: "edad", titulo: "Solo para mayores de 18" },
  { id: "cambios", titulo: "Cambios en esta política" },
  { id: "control", titulo: "Órgano de control" },
];

const Email = () => (
  <a href={`mailto:${CONTACTO_PRIVACIDAD}`} className={`${CLASE_ENLACE} break-all`}>
    {CONTACTO_PRIVACIDAD}
  </a>
);

export default function PrivacidadPage() {
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      actualizado="28 de septiembre de 2026"
      actualizadoIso="2026-09-28"
      intro={
        <p>
          Pecera muestra pitches en video de emprendedores, inversores y aliados para que se
          conozcan y se contacten. Acá te contamos qué datos guardamos, para qué, quién más los
          procesa y cómo pedir que los corrijamos o los borremos. Aplica la Ley 25.326 de
          Protección de los Datos Personales.
        </p>
      }
      indice={INDICE}
    >
      <Seccion id="responsable" titulo="Quién es el responsable">
        <p>
          El responsable de los datos es Facundo Graffigna. Para cualquier consulta sobre tus
          datos escribí a <Email />.
        </p>
      </Seccion>

      <Seccion id="datos" titulo="Qué datos guardamos">
        <ul>
          <li>
            <strong className="font-semibold text-tinta">Tu cuenta.</strong> Cuando entrás con
            Google, recibimos tu email, tu nombre y tu foto de Google. Los guarda Supabase, el
            servicio de cuentas que usamos. No recibimos tu contraseña.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Tu perfil.</strong> Lo que cargás en
            &quot;Mi perfil&quot;: nombre, tipo (startup, fondo, coach, etc.), rol, descripción,
            tus canales de contacto (WhatsApp, email, LinkedIn, Instagram y web), tu foto y la
            dirección de tu perfil (por ejemplo, /p/tu-nombre). También guardamos la fecha
            en que aceptaste publicarlo. La foto se achica y se recorta en tu celular antes de
            subirla; en ese paso se borran sus datos internos, incluida la ubicación.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Tus pitches.</strong> El video
            comprimido, una imagen de portada sacada del video, la descripción y los subtítulos.
            Al comprimir el video le borramos los datos internos (fecha, equipo, ubicación). Los
            subtítulos se generan automáticamente a partir del audio.
          </li>
          <li>
            <strong className="font-semibold text-tinta">El formulario de carga.</strong> Los
            pitches se suben con un formulario de Google Forms. De cada envío guardamos el email
            verificado de la cuenta de Google que lo mandó, el email que se escribió en el
            formulario (puede ser el de otra persona, por ejemplo si alguien del equipo sube el
            video por vos) y la fecha. El video original queda guardado en Google Drive.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Los piques.</strong> Para contar los
            &quot;me picó&quot;, tu celular crea un identificador al azar. En nuestra base
            guardamos ese identificador, el pitch y la fecha, más un contador para frenar abusos.
            No está atado a tu nombre ni a tu cuenta.
          </li>
          <li>
            <strong className="font-semibold text-tinta">En tu navegador.</strong> Si entrás a tu
            cuenta, usamos cookies de sesión para saber que sos vos. Además guardamos en tu
            navegador (no en nuestros servidores) si querés ver subtítulos, qué piques diste, el
            identificador de los piques y un resumen público de tu perfil (nombre, foto y
            dirección) para mostrar tu foto arriba de la pantalla. No usamos cookies de
            publicidad ni de seguimiento.
          </li>
        </ul>
        <p>
          Como cualquier sitio, los proveedores que alojan Pecera registran datos técnicos de cada
          visita (dirección IP, navegador, fecha) por seguridad y para que el servicio funcione.
        </p>
      </Seccion>

      <Seccion id="para-que" titulo="Para qué los usamos">
        <ul>
          <li>Mostrar tu perfil y tus pitches en Pecera para que otras personas te conozcan.</li>
          <li>Que te puedan contactar por los canales que elegiste publicar.</li>
          <li>Saber a qué perfil corresponde cada video que llega por el formulario.</li>
          <li>Contar los piques de cada pitch.</li>
          <li>Mantener tu sesión abierta y cuidar el servicio de abusos.</li>
        </ul>
        <p>No vendemos tus datos, no los usamos para publicidad y no los compartimos con nadie
          más que los proveedores de la sección de abajo.</p>
      </Seccion>

      <Seccion id="publico" titulo="Qué es público y qué no">
        <p>
          Mientras tu perfil esté publicado y no lo ocultes, <strong className="font-semibold text-tinta">cualquier
          persona puede ver</strong> tu nombre, tipo, rol, descripción, foto, los canales de contacto
          que cargaste y tus pitches (video, portada, descripción y subtítulos), sin necesidad de
          tener cuenta. Tené en cuenta que quien lo vea puede copiar esos datos o guardarse el
          video, y eso queda fuera de nuestro control.
        </p>
        <p>
          <strong className="font-semibold text-tinta">Nunca publicamos</strong> el email de tu
          cuenta ni los emails del formulario. Tampoco mostramos quién dio cada pique: solo el
          total.
        </p>
      </Seccion>

      <Seccion id="proveedores" titulo="Proveedores y dónde se guardan">
        <p>Usamos estos servicios para que Pecera funcione:</p>
        <ul>
          <li><strong className="font-semibold text-tinta">Supabase</strong>: la base de datos y las cuentas.</li>
          <li><strong className="font-semibold text-tinta">Cloudflare R2</strong>: los videos, las portadas y las fotos.</li>
          <li><strong className="font-semibold text-tinta">Vercel</strong>: aloja el sitio.</li>
          <li><strong className="font-semibold text-tinta">Google</strong>: el login, el formulario de carga (Forms) y los videos originales (Drive).</li>
          <li>
            <strong className="font-semibold text-tinta">GitHub</strong>: corre el proceso
            automático que comprime los videos y genera los subtítulos. Los subtítulos se hacen
            con un programa que corre dentro de ese proceso: el audio no se manda a ningún
            servicio de inteligencia artificial de terceros.
          </li>
        </ul>
        <p>
          Los servidores de estos proveedores pueden estar fuera de Argentina, por ejemplo en
          Estados Unidos o Europa. Al usar Pecera, tus datos se transfieren a esos países para
          los fines de esta política.
        </p>
      </Seccion>

      <Seccion id="conservacion" titulo="Cuánto tiempo los guardamos">
        <p>
          Guardamos tus datos mientras tu cuenta exista o hasta que nos pidas borrarlos. Cuando
          cambiás tu foto o se reemplaza un video, la versión anterior se borra sola en
          aproximadamente una hora. Los identificadores de piques se quedan en tu navegador hasta
          que borres los datos del sitio.
        </p>
      </Seccion>

      <Seccion id="derechos" titulo="Tus derechos">
        <p>
          Tenés derecho a saber qué datos tuyos tenemos (acceso), a corregirlos (rectificación) y
          a que los borremos (supresión).
        </p>
        <ul>
          <li>
            <strong className="font-semibold text-tinta">Editar u ocultar:</strong> desde{" "}
            <Link href="/cuenta" className={CLASE_ENLACE}>Mi perfil</Link> podés cambiar tus datos
            y tu foto, o tildar &quot;Ocultar mi perfil&quot; para que nadie lo vea hasta que lo
            vuelvas a mostrar.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Pedir tus datos o borrar todo:</strong>{" "}
            escribinos a <Email /> desde el email de tu cuenta. Podés pedir una copia de tus datos
            o que borremos tu cuenta y todo lo asociado: perfil, foto, pitches, subtítulos,
            registros del formulario y los videos originales.
          </li>
        </ul>
        <p>
          Respondemos los pedidos de acceso en hasta 10 días corridos, y los de corrección o
          borrado en hasta 5 días hábiles, como indica la ley. Pedir acceso es gratis.
        </p>
      </Seccion>

      <Seccion id="edad" titulo="Solo para mayores de 18">
        <p>
          Pecera está pensada para mayores de 18 años. Si sos menor, no crees una cuenta ni subas
          pitches. Si nos enteramos de que un perfil es de un menor, lo ocultamos y borramos sus
          datos.
        </p>
      </Seccion>

      <Seccion id="cambios" titulo="Cambios en esta política">
        <p>
          Si cambiamos esta política, actualizamos la fecha de arriba. Si el cambio es importante,
          te avisamos en Pecera o por email antes de que empiece a regir.
        </p>
      </Seccion>

      <Seccion id="control" titulo="Órgano de control">
        <p className="text-sm">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a
          los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se
          acredite un interés legítimo al efecto conforme lo establecido en el artículo 14,
          inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su
          carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las
          denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
          incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </Seccion>

      <p className="mt-8 text-sm text-tinta/80">
        Ver también las{" "}
        <Link href="/terminos" className={CLASE_ENLACE}>condiciones de uso</Link>.
      </p>
    </PaginaLegal>
  );
}
