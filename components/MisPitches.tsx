import Image from "next/image";
import type { ReactNode } from "react";
import InsigniaPitch from "@/components/InsigniaPitch";
import { urlMedia } from "@/lib/media";

/** Una fila de `mis_pitches()`: un pitch publicado o un envío que todavía no. */
export type MiPitch = {
  id: string;
  fecha: string;
  /** "oculto" solo viene de mis_pitches_detalle(): publicado pero oculto por su dueño. */
  estado: "publicado" | "oculto" | "procesando" | "en_espera" | "error";
  poster_url: string | null;
  descripcion: string | null;
};

const FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * "Tu Pitch" en /cuenta. El Pitch es obligatorio para completar el perfil: el más
 * nuevo publicado es el del perfil; subir otro lo reemplaza y el anterior queda
 * como anterior. Los envíos del Form que se procesan o esperan se ven con su
 * estado. `acciones` (opcional) dibuja editar/ocultar debajo de cada publicado u
 * oculto (solo si la base ya tiene mis_pitches_detalle).
 */
export default function MisPitches({
  pitches,
  email,
  conPerfil,
  claseBoton,
  acciones,
}: {
  pitches: MiPitch[];
  email: string;
  conPerfil: boolean;
  claseBoton: string;
  acciones?: (pitch: MiPitch, compacto: boolean) => ReactNode;
}) {
  if (!conPerfil && pitches.length === 0) return null;

  // mis_pitches() ya viene del más nuevo al más viejo.
  const principal = pitches.find((p) => p.estado === "publicado") ?? null;
  const resto = pitches.filter((p) => p !== principal);
  const procesando = resto.some((p) => p.estado === "procesando" || p.estado === "en_espera");

  return (
    <section
      id="mi-pitch"
      aria-labelledby="mi-pitch-titulo"
      className="flex scroll-mt-24 flex-col gap-4 rounded-3xl border border-celeste bg-celeste-suave/50 px-4 py-5"
    >
      <div className="flex flex-col gap-2">
        <InsigniaPitch grande className="self-start" />
        <h2 id="mi-pitch-titulo" className="font-display text-2xl font-semibold leading-tight text-tinta">
          Tu Pitch
        </h2>
        {!principal && (
          <p className="text-sm font-semibold text-tinta">Tu Pitch es obligatorio para completar tu perfil.</p>
        )}
        <p className="text-sm leading-relaxed text-tinta/80">
          Un video vertical de hasta 90 segundos. Es lo primero que ve un inversor o un aliado
          cuando llega a tu perfil o te cruza en el feed.
        </p>
      </div>

      {principal ? (
        <article className="flex gap-3 rounded-2xl bg-marfil p-2.5">
          <Poster pitch={principal} className="w-24 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1.5 py-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-tinta">
              <span aria-hidden className="size-2 rounded-full bg-aliado" />
              Publicado
            </span>
            {principal.descripcion ? (
              <p className="line-clamp-3 text-sm leading-snug text-tinta/80">{principal.descripcion}</p>
            ) : (
              <p className="text-sm text-tinta/60">Sin descripción.</p>
            )}
            <p className="text-xs text-tinta/60">Del {FECHA.format(new Date(principal.fecha))}</p>
            {acciones?.(principal, false)}
          </div>
        </article>
      ) : (
        conPerfil &&
        !procesando && (
          <p className="rounded-2xl border border-dashed border-tinta/25 bg-marfil px-4 py-3 text-sm text-tinta/80">
            Todavía no subiste tu Pitch.
          </p>
        )
      )}

      {conPerfil && (
        <div className="flex flex-col gap-2">
          {/* <a> y no <Link>: /subir redirige a Google Forms. */}
          <a id="subir-pitch" href="/subir" className={`resaltable scroll-mt-24 ${claseBoton}`}>
            {principal ? "Reemplazar mi Pitch" : "Subir mi Pitch"}
          </a>
          <p className="break-all text-center text-xs text-tinta/70">
            Se sube con un formulario de Google, con tu cuenta {email}. Aparece acá en unos minutos.
          </p>
          {principal && (
            <p className="text-center text-xs text-tinta/70">
              El nuevo pasa a ser tu Pitch; el actual queda como anterior.
            </p>
          )}
        </div>
      )}

      {!conPerfil && (
        <p className="text-sm leading-relaxed text-tinta/80">
          Creá tu perfil y publicamos tu Pitch solo.
        </p>
      )}

      <details className="group rounded-2xl bg-marfil">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
          Qué contar en 90 segundos
          <span aria-hidden className="text-lg transition-transform duration-300 ease-pecera group-open:rotate-45">
            +
          </span>
        </summary>
        <ol className="flex flex-col gap-2 px-4 pb-4 text-sm leading-relaxed text-tinta/85">
          <li><strong className="font-semibold">1. Quién sos</strong> y qué hacés, en una frase.</li>
          <li><strong className="font-semibold">2. El problema</strong> y a quién le duele.</li>
          <li><strong className="font-semibold">3. Tu solución</strong> y qué lograste hasta hoy.</li>
          <li><strong className="font-semibold">4. Qué buscás</strong>: inversión, clientes, socios o mentoría.</li>
          <li className="text-tinta/70">
            Grabá en vertical, con buena luz y sin música fuerte: así los subtítulos automáticos salen bien.
          </li>
        </ol>
      </details>

      {resto.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Envíos y anteriores</h3>
          <ul className="grid grid-cols-3 gap-2.5">
            {resto.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5">
                {p.poster_url ? (
                  <span className="relative block">
                    <Poster pitch={p} className={`w-full ${p.estado === "oculto" ? "opacity-45" : ""}`} />
                    {p.estado === "oculto" && (
                      <span className="absolute inset-x-1.5 top-1.5 rounded-full bg-marfil px-2 py-0.5 text-center text-xs font-semibold text-tinta">
                        Oculto
                      </span>
                    )}
                  </span>
                ) : (
                  <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1 rounded-xl bg-tinta/10 px-2 text-center text-xs text-tinta">
                    <span className="font-medium">{etiqueta(p, conPerfil)}</span>
                    <span className="text-tinta/60">Enviado el {FECHA.format(new Date(p.fecha))}</span>
                  </div>
                )}
                {(p.estado === "publicado" || p.estado === "oculto") && acciones?.(p, true)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function etiqueta(p: MiPitch, conPerfil: boolean): string {
  if (p.estado === "procesando") return "Procesando…";
  if (p.estado === "error") return "No pudimos procesarlo. Probá subirlo de nuevo.";
  if (p.estado === "en_espera") return conPerfil ? "Lo está revisando el equipo" : "Esperando tu perfil";
  return "Publicado";
}

function Poster({ pitch, className = "w-full" }: { pitch: MiPitch; className?: string }) {
  if (!pitch.poster_url) return null;
  return (
    <Image
      src={urlMedia(pitch.poster_url)}
      alt=""
      width={360}
      height={640}
      className={`aspect-[9/16] rounded-xl bg-tinta object-cover ${className}`}
    />
  );
}
