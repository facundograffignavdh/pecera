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
      actualizado="4 de octubre de 2026"
      actualizadoIso="2026-10-04"
      intro={
        <p>
          Pecera muestra pitches en video y perfiles de emprendedores, empresas, inversores y
          aliados para que se conozcan y se contacten. Acá te contamos qué datos guardamos, para qué, quién más los
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
            dirección de tu perfil (por ejemplo, /p/tu-nombre). Según tu rol, también las
            etiquetas que elijas: etapa, industrias, ronda y cargo; rondas, ticket e industrias
            de interés; o tus especialidades. También guardamos la fecha
            en que aceptaste publicarlo y, si lo cargás, el link a tu newsletter (por ejemplo, de
            Substack) con su título. La foto se achica y se recorta en tu celular antes de
            subirla; en ese paso se borran sus datos internos, incluida la ubicación.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Portfolio, servicios y tesis.</strong> Si
            sos inversor o aliado: las relaciones que cargues con empresas (inversión, mentoría,
            aceleración, directorio, clientes y otras), con su estado, año, ronda, tu rol, una
            descripción y, si querés, el caso de éxito (desafío, qué hicieron y resultados), y
            quién puede ver cada una (cualquiera, solo personas con cuenta o solo vos). También
            tus servicios y tu tesis de inversión. Si la relación nombra a una empresa que está en
            Pecera, su equipo la ve y puede confirmarla o rechazarla; guardamos esa respuesta.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Tus pitches.</strong> El video
            comprimido, una imagen de portada sacada del video, la descripción, los subtítulos y
            si lo ocultaste.
            Al comprimir el video le borramos los datos internos (fecha, equipo, ubicación). Los
            subtítulos se generan automáticamente a partir del audio.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Tus empresas.</strong> Si creás empresas
            o te sumás a ellas (hasta cinco): de cada una, su nombre, descripción, redes, etapa,
            industrias y ronda, quiénes son parte del equipo, el cargo de cada uno en esa empresa y
            desde cuándo, y su logo. También cuál elegiste como tu empresa principal (la que va
            primero en tu perfil). El código de invitación es privado del equipo.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Producto y Build in Public.</strong> Lo
            que el equipo cargue de su producto o servicio (nombre, propuesta, problema, solución,
            para quién es, características, cómo se usa, link de demo e imágenes), sus hitos (con
            etapa, estado, progreso y fecha) y los avances que publique, con su fecha. La racha
            semanal se calcula de esas fechas.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Dataroom.</strong> Los templates que el
            equipo complete, los documentos que escriba y los links a documentos que agregue, con
            su categoría y si están archivados. Nacen privados: solo los ve el equipo hasta que
            alguien marca cada uno como transparente. El PDF para inversores se arma en tu
            navegador con lo que elegís; no lo guardamos.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Transparencia.</strong> Las métricas y
            los links a documentos que el equipo cargue (por ejemplo MRR, churn o el pitch
            deck). Nacen privados: solo los ve el equipo hasta que alguien marca cada uno como
            compartido.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Eventos y votos.</strong> Si anotás tu
            perfil en un evento, y a qué proyecto votaste (uno por cuenta). El voto se guarda
            atado a tu cuenta para que no se repita, pero no lo mostramos: solo el total de cada
            proyecto, cuando el equipo publica los resultados.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Búsqueda de cofundador/a.</strong> Si
            activás «Busco cofundador/a»: qué aportás, qué buscás y cuánto tiempo le podés dedicar.
            Cuando le mostrás interés a alguien, guardamos a quién, el mensaje que le escribís (hasta
            280 caracteres), en qué quedó (pendiente, match, pasó o lo retiraste) y las fechas.
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
            <strong className="font-semibold text-tinta">Las vistas y los contactos.</strong> Con
            el mismo identificador al azar contamos las vistas (cuando un video se reproduce al
            menos 3 segundos, una por celular y pitch cada 12 horas) y los toques en los canales
            de contacto de un perfil (WhatsApp, email, LinkedIn, Instagram o web), desde el
            perfil o desde el aviso del pique. Guardamos el identificador, el pitch o el perfil,
            el canal y la fecha, más un contador para frenar abusos. No está atado a tu nombre;
            si entrás con tu cuenta, se une a ella (ver más abajo).
          </li>
          <li id="medicion">
            <strong className="font-semibold text-tinta">La actividad y de dónde llegaste.</strong>{" "}
            Con el mismo identificador al azar registramos algunas acciones: cuando empieza una
            visita (una &quot;sesión&quot;, otro identificador al azar que cambia después de 30
            minutos sin uso), cuando abrís un perfil, cuando ves al menos el 75 % de un pitch,
            cuando compartís un perfil y cuando llegás con la tarjeta NFC de un stand. Si el link
            lo dice, guardamos de dónde llegaste (por ejemplo, la tarjeta del stand o una campaña),
            si fue en el horario de la feria y si usás celular o compu.{" "}
            <strong className="font-semibold text-tinta">No guardamos</strong> tu dirección IP, tu
            ubicación, el modelo de tu navegador ni nada que sirva para reconocerte por fuera del
            identificador al azar.
          </li>
          <li>
            <strong className="font-semibold text-tinta">La unión de tu navegador con tu cuenta.</strong>{" "}
            Cuando entrás con Google, unimos el identificador al azar de ese navegador con tu
            cuenta. Sirve para saber qué tipo de perfil (emprendedor, inversor o aliado) inicia las
            conexiones y solo se usa en números agregados: nunca mostramos quién contactó a quién.
            Si sos del equipo de Pecera, tu navegador no cuenta en las métricas.
          </li>
          <li>
            <strong className="font-semibold text-tinta">En tu navegador.</strong> Si entrás a tu
            cuenta, usamos cookies de sesión para saber que sos vos. Además guardamos en tu
            navegador (no en nuestros servidores) si querés ver subtítulos, qué piques diste, qué
            pitches viste en las últimas 12 horas, el identificador al azar, la sesión de medición y
            de dónde llegaste en esta visita, y un resumen público de tu perfil (nombre, foto y
            dirección) para mostrar tu foto arriba de la pantalla. Mientras completás tu perfil o
            un template, guardamos un borrador en tu navegador para que no se pierda si se corta
            la conexión. No usamos cookies de
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
          <li>Contar los piques y las vistas de cada pitch.</li>
          <li>Medir cuántas veces se toca cada canal de contacto, para saber si Pecera sirve para conectar.</li>
          <li>Medir, en números agregados, cuántas conexiones se inician y entre qué tipos de
            perfil, para mostrar si Pecera funciona (por ejemplo, en el Demo Day de la feria).</li>
          <li>Armar la página de cada empresa con su equipo, su producto, su recorrido (Build in
            Public) y lo que decida compartir.</li>
          <li>Mostrar el portfolio, los servicios y la tesis de inversores y aliados, y pedirle a
            cada empresa que confirme las relaciones que la nombran.</li>
          <li>Que encuentres perfiles y empresas en Explorar.</li>
          <li>Conectar a quienes buscan cofundador/a cuando el interés es mutuo.</li>
          <li>Organizar los eventos y contar los votos del público.</li>
          <li>Mantener tu sesión abierta y cuidar el servicio de abusos.</li>
        </ul>
        <p>No vendemos tus datos, no los usamos para publicidad y no los compartimos con nadie
          más que los proveedores de la sección de abajo.</p>
      </Seccion>

      <Seccion id="publico" titulo="Qué es público y qué no">
        <p>
          Mientras tu perfil esté publicado y no lo ocultes, <strong className="font-semibold text-tinta">cualquier
          persona puede ver</strong> tu nombre, tipo, rol, descripción, foto, los canales de contacto
          que cargaste, tus etiquetas y tus pitches (video, portada, descripción y subtítulos), sin
          necesidad de tener cuenta. Si sos parte de una o más empresas, tu perfil las muestra a
          todas, con tu cargo en cada una, y cada empresa tiene su página, con su equipo, los
          pitches de quienes la integran y lo que el equipo publicó o compartió: logo, producto e
          imágenes, hitos y avances, y los datos y documentos marcados como transparentes. También tu link de newsletter, tus
          servicios, tu tesis y las relaciones de tu portfolio que marcaste como visibles para
          cualquiera (las marcadas &quot;solo con cuenta&quot; las ve quien entra con su
          cuenta). Tené en cuenta que quien lo vea puede copiar esos datos o guardarse el
          video, y eso queda fuera de nuestro control.
        </p>
        <p>
          <strong className="font-semibold text-tinta">Nunca publicamos</strong> el email de tu
          cuenta ni los emails del formulario. Tampoco mostramos quién dio cada pique ni a quién
          votó cada persona: solo los totales. En cada pitch mostramos cuántas vistas y
          cuántos piques tiene; los contactos no se muestran: los ve solo el equipo de Pecera,
          contados por perfil. La actividad y la unión de tu navegador con tu cuenta tampoco se
          publican: el equipo ve solo números agregados. Los datos de transparencia y los documentos del Dataroom que no
          se comparten los ve solo el equipo de la empresa, y las relaciones de portfolio
          privadas, solo vos.
        </p>
        <p>
          Si buscás cofundador/a, lo que cargaste para eso se muestra en tu perfil y en
          Cofundadores. Los intereses y sus mensajes <strong className="font-semibold text-tinta">no
          se publican</strong>: los ven solo quien lo manda y quien lo recibe. Si la otra persona
          pasa, no se lo avisamos a quien lo mandó.
        </p>
      </Seccion>

      <Seccion id="proveedores" titulo="Proveedores y dónde se guardan">
        <p>Usamos estos servicios para que Pecera funcione:</p>
        <ul>
          <li><strong className="font-semibold text-tinta">Supabase</strong>: la base de datos y las cuentas.</li>
          <li><strong className="font-semibold text-tinta">Cloudflare R2</strong>: los videos, las portadas, las fotos, los logos y las imágenes de productos.</li>
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
          cambiás tu foto, el logo o las imágenes de un producto, o se reemplaza un video, la
          versión anterior se borra sola en aproximadamente una hora. Los documentos archivados
          del Dataroom quedan guardados, sin mostrarse, hasta que nos pidas borrarlos. Si salís de
          una empresa y eras la última integrante, la empresa se borra con todo (su página, logo,
          producto, Build in Public, transparencia y Dataroom) y sus imágenes se borran de
          nuestros servidores en la hora siguiente; antes de confirmar te ofrecemos exportar el
          Dataroom. La actividad (visitas, perfiles abiertos, pitches vistos, tarjetas y lo demás
          de la medición) se borra a los 90 días; después quedan solo totales por hora, sin
          identificadores. Los piques, las vistas y los contactos se guardan mientras
          exista el pitch o el perfil al que corresponden. El identificador al azar se queda en
          tu navegador hasta que borres los datos del sitio.
        </p>
        <p>
          El mensaje de un interés de cofundador/a se guarda mientras esté pendiente o haya match.
          Si la otra persona pasa o lo retirás, borramos el mensaje y queda solo el registro (quién,
          a quién, en qué quedó y la fecha) para que no se vuelva a mandar. Todo eso se borra
          cuando cualquiera de los dos elimina su cuenta.
        </p>
        <p>
          Cuando eliminás tu cuenta, los videos, fotos, logos e imágenes se borran de nuestros
          servidores en la hora siguiente. Los videos originales del formulario se quedan en
          Google Drive hasta que el equipo los borra a mano, y tus respuestas al formulario siguen
          en la planilla de Google del equipo. Después del borrado solo guardamos lo justo para que
          tus pitches no vuelvan a publicarse: el identificador de cada video en Drive, el registro
          del envío sin ningún email y una huella de tu email (un hash: no guardamos el email en
          sí) con la fecha del borrado. Si tu email estaba bloqueado por abuso, el bloqueo se
          mantiene.
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
            <strong className="font-semibold text-tinta">Eliminar tu cuenta:</strong> desde{" "}
            <Link href="/cuenta" className={CLASE_ENLACE}>Mi perfil</Link>, en &quot;Eliminar mi
            cuenta&quot;. Se borra al instante y no tiene vuelta atrás: tu perfil y tu foto, tus
            pitches (con sus videos, subtítulos, piques y vistas, y los que mandaste por el
            formulario y todavía no se publicaron), tu newsletter, links y documentos, portfolio,
            servicios, tesis, votos, participación en eventos y seguidores, tus intereses de
            cofundador/a con sus mensajes (los que mandaste y los que recibiste), y los emails de tus
            envíos del formulario. También lo que hiciste desde ese navegador y desde los otros
            navegadores unidos a tu cuenta (piques, vistas, contactos, actividad y a quién
            seguís; si otra cuenta también usa ese navegador, lo anónimo queda), esa unión, y lo
            que Pecera guardó en el navegador. Tu email queda libre: si volvés, empezás
            con una cuenta nueva y vacía. Con cada una de tus empresas: si sos la única persona del
            equipo, la empresa se borra con todo; si hay más integrantes, se queda, la
            administración pasa a quien está hace más tiempo en el equipo y lo que escribiste en
            ella queda sin tu nombre. Qué guardamos
            después y por cuánto, en{" "}
            <a href="#conservacion" className={CLASE_ENLACE}>Cuánto tiempo los guardamos</a>.
          </li>
          <li>
            <strong className="font-semibold text-tinta">Pedir tus datos:</strong> escribinos a{" "}
            <Email /> desde el email de tu cuenta y te mandamos una copia. Si no podés entrar a tu
            cuenta, también podés pedirnos por ahí que la borremos. Lo que es de una empresa
            (producto, hitos, avances, documentos) lo maneja su equipo. Salir de una empresa lo
            podés hacer vos desde la cuenta de esa empresa; si sos la última integrante, la empresa
            se borra (te avisamos antes y podés exportar su Dataroom).
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
