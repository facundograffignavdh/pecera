import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import FormEliminarCuenta from "@/components/cuenta/FormEliminarCuenta";
import { conEmpresa } from "@/lib/cuenta";
import { faltaMigracion } from "@/lib/datos";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export const metadata: Metadata = {
  title: "Eliminar mi cuenta — Pecera",
  robots: { index: false },
};

type Previa = {
  empresa_slug: string | null;
  empresa_nombre: string | null;
  otros_miembros: number;
  pitches: number;
};

/** Una fila por empresa (multi_empresa). */
type PreviaEmpresa = { empresa_slug: string; empresa_nombre: string; otros_miembros: number; se_borra: boolean };

/** Qué se borra, qué pasa con la empresa y la confirmación. */
export default async function EliminarCuentaPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta");

  const [{ data, error }, porEmpresa] = await Promise.all([
    supabase.rpc("antes_de_borrar"),
    supabase.rpc("antes_de_borrar_v2"),
  ]);
  const sinMigracion = faltaMigracion(error);
  if (error && !sinMigracion) console.error(`Supabase (antes_de_borrar): ${error.message}`);
  if (porEmpresa.error && !faltaMigracion(porEmpresa.error)) {
    console.error(`Supabase (antes_de_borrar_v2): ${porEmpresa.error.message}`);
  }
  const previa = ((data ?? []) as Previa[])[0] ?? null;
  // Todas sus empresas; sin multi_empresa, la única (de antes_de_borrar).
  const empresas: PreviaEmpresa[] = porEmpresa.error
    ? previa?.empresa_slug && previa.empresa_nombre
      ? [{ empresa_slug: previa.empresa_slug, empresa_nombre: previa.empresa_nombre, otros_miembros: previa.otros_miembros, se_borra: previa.otros_miembros === 0 }]
      : []
    : ((porEmpresa.data ?? []) as PreviaEmpresa[]);
  const seBorran = empresas.filter((e) => e.se_borra);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Link href="/cuenta" className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> Mi perfil
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-tinta">Eliminar mi cuenta</h1>
        <p className="mt-2 break-all text-sm text-tinta/70">Cuenta: {user.email}</p>

        {sinMigracion ? (
          <p className="mt-6 rounded-2xl bg-tinta/5 px-4 py-3 text-sm leading-relaxed text-tinta">
            Todavía no se puede eliminar la cuenta desde acá. Escribinos desde la página de{" "}
            <Link href="/privacidad#derechos" className="font-medium underline underline-offset-4 hover:text-arcilla">
              privacidad
            </Link>{" "}
            y la borramos nosotros.
          </p>
        ) : (
          <>
            <p className="mt-6 rounded-2xl border-2 border-arcilla px-4 py-3 font-medium leading-relaxed text-tinta">
              No tiene vuelta atrás: lo que se borra no se puede recuperar.
            </p>

            <section aria-labelledby="se-borra" className="mt-6 flex flex-col gap-2">
              <h2 id="se-borra" className="font-display text-xl font-semibold text-tinta">
                Qué se borra
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-tinta">
                <li>Tu perfil y tu foto.</li>
                <li>
                  {previa && previa.pitches > 0
                    ? `Tus pitches (${previa.pitches}), con sus videos, subtítulos, piques y vistas.`
                    : "Tus pitches, con sus videos, subtítulos, piques y vistas."}{" "}
                  También los que mandaste por el formulario y todavía no se publicaron.
                </li>
                <li>Tu newsletter, tus links y documentos, tu portfolio, tus servicios y tu tesis.</li>
                <li>Tus votos, tu participación en eventos y quiénes te siguen.</li>
                <li>Los piques, vistas y perfiles que seguiste desde este navegador.</li>
                <li>
                  Tu cuenta de Pecera. Tu email queda libre: si después volvés, empezás con una cuenta nueva y
                  vacía.
                </li>
              </ul>
            </section>

            {empresas.length > 0 && (
              <section aria-labelledby="tus-empresas" className="mt-6 flex flex-col gap-3">
                <h2 id="tus-empresas" className="font-display text-xl font-semibold text-tinta">
                  {empresas.length === 1 ? `Tu empresa: ${empresas[0].empresa_nombre}` : "Tus empresas"}
                </h2>
                <ul className="flex flex-col gap-2">
                  {empresas.map((e) => (
                    <li key={e.empresa_slug} className="flex flex-col gap-1 rounded-2xl border border-tinta/10 px-4 py-3">
                      {empresas.length > 1 && <p className="font-medium text-tinta">{e.empresa_nombre}</p>}
                      {e.se_borra ? (
                        <p className="text-sm leading-relaxed text-tinta">
                          Sos la única persona del equipo, así que la empresa se borra con todo: su página, logo,
                          producto, hitos, avances, transparencia y documentos del Dataroom.
                        </p>
                      ) : (
                        <p className="text-sm leading-relaxed text-tinta">
                          Tiene {e.otros_miembros === 1 ? "1 integrante más" : `${e.otros_miembros} integrantes más`}, así
                          que se queda: salís del equipo y, si la administrabas, pasa a quien está hace más tiempo. Lo
                          que escribiste en la empresa queda, sin tu nombre.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {seBorran.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-tinta/5 px-4 py-3">
                    <p className="text-sm font-medium text-tinta">
                      Antes, guardá sus datos afuera: exportá el Dataroom en PDF (se abre en otra pestaña).
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {seBorran.map((e) => (
                        <li key={e.empresa_slug}>
                          <Link
                            href={conEmpresa("/cuenta/dataroom/exportar", e.empresa_slug)}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex min-h-11 items-center rounded-full border border-tinta/30 px-4 text-sm font-medium text-tinta hover:border-tinta"
                          >
                            Exportar {e.empresa_nombre} <span aria-hidden>&nbsp;↗</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="despues" className="mt-6 flex flex-col gap-2">
              <h2 id="despues" className="font-display text-xl font-semibold text-tinta">
                Después
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-tinta">
                <li>Tus videos, fotos y logos se eliminan de nuestros servidores en la hora siguiente.</li>
                <li>
                  Los videos originales que subiste por el formulario quedan en Google Drive hasta que el equipo los
                  borra a mano. Nunca se vuelven a publicar.
                </li>
              </ul>
            </section>

            <div className="mt-8 border-t border-tinta/15 pt-6">
              <FormEliminarCuenta />
            </div>

            <Link
              href="/cuenta"
              className="mt-4 flex min-h-11 items-center justify-center text-sm font-medium text-tinta underline-offset-4 hover:underline"
            >
              Cancelar y volver a mi perfil
            </Link>
          </>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
