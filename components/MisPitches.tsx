import Image from "next/image";
import { urlMedia } from "@/lib/media";

/** Una fila de `mis_pitches()`: un pitch publicado o un envío que todavía no. */
export type MiPitch = {
  id: string;
  fecha: string;
  estado: "publicado" | "procesando" | "en_espera" | "error";
  poster_url: string | null;
  descripcion: string | null;
};

const FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * "Mis pitches" en /cuenta: los publicados y los envíos del Form que se están
 * procesando o esperan. Con perfil, el botón para subir uno (va a /subir, que
 * abre el Form con el email de la sesión).
 */
export default function MisPitches({
  pitches,
  email,
  conPerfil,
  claseBoton,
}: {
  pitches: MiPitch[];
  email: string;
  conPerfil: boolean;
  claseBoton: string;
}) {
  if (!conPerfil && pitches.length === 0) return null;

  const etiqueta = (p: MiPitch): string => {
    if (p.estado === "procesando") return "Procesando";
    if (p.estado === "error") return "No pudimos procesarlo. Probá subirlo de nuevo.";
    if (p.estado === "en_espera") {
      return conPerfil ? "Lo está revisando el equipo" : "Esperando tu perfil";
    }
    return "Publicado";
  };

  return (
    <section aria-labelledby="mis-pitches-titulo" className="flex flex-col gap-4">
      <h2 id="mis-pitches-titulo" className="font-display text-2xl font-semibold leading-tight text-tinta">
        Mis pitches
      </h2>

      {conPerfil && (
        <div className="flex flex-col gap-2">
          {/* <a> y no <Link>: /subir redirige a Google Forms. */}
          <a href="/subir" className={claseBoton}>
            Subí tu pitch
          </a>
          <p className="break-all text-center text-sm text-tinta/70">Subilo con tu cuenta {email}</p>
        </div>
      )}

      <p className="text-sm leading-relaxed text-tinta/80">
        ¿Ya subiste tu pitch? Aparece acá en unos minutos.
        {!conPerfil && " Creá tu perfil y lo publicamos solo."}
      </p>

      {pitches.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {pitches.map((p) => {
            const texto = etiqueta(p);
            return (
              <li key={p.id} className="flex flex-col gap-2">
                {p.poster_url ? (
                  <Image
                    src={urlMedia(p.poster_url)}
                    alt=""
                    width={360}
                    height={640}
                    className="aspect-[9/16] w-full rounded-xl bg-tinta object-cover"
                  />
                ) : (
                  <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1 rounded-xl bg-tinta/10 px-3 text-center text-sm text-tinta">
                    <span className="font-medium">{texto}</span>
                    <span className="text-tinta/60">Enviado el {FECHA.format(new Date(p.fecha))}</span>
                  </div>
                )}
                {p.descripcion && (
                  <p className="line-clamp-3 text-sm leading-snug text-tinta/80">{p.descripcion}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
