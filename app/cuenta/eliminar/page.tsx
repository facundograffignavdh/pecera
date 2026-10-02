import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import FormEliminarCuenta from "@/components/cuenta/FormEliminarCuenta";
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

/** Qué se borra, qué pasa con la empresa y la confirmación. */
export default async function EliminarCuentaPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta");

  const { data, error } = await supabase.rpc("antes_de_borrar");
  const sinMigracion = faltaMigracion(error);
  if (error && !sinMigracion) console.error(`Supabase (antes_de_borrar): ${error.message}`);
  const previa = ((data ?? []) as Previa[])[0] ?? null;

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

            {previa?.empresa_nombre && (
              <section aria-labelledby="tu-empresa" className="mt-6 flex flex-col gap-2">
                <h2 id="tu-empresa" className="font-display text-xl font-semibold text-tinta">
                  Tu empresa: {previa.empresa_nombre}
                </h2>
                {previa.otros_miembros === 0 ? (
                  <p className="text-sm leading-relaxed text-tinta">
                    Sos la única persona del equipo, así que la empresa se borra con todo: su página, logo,
                    producto, hitos, avances, transparencia y documentos del Dataroom.
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-tinta">
                    La empresa tiene {previa.otros_miembros === 1 ? "1 integrante más" : `${previa.otros_miembros} integrantes más`}
                    , así que se queda: salís del equipo y, si eras la persona titular, la titularidad pasa a otra
                    persona del equipo. Lo que escribiste en la empresa queda, sin tu nombre.
                  </p>
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
