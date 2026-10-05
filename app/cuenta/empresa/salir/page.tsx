import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PieLegal from "@/components/PieLegal";
import FormSalirEmpresa from "@/components/cuenta/FormSalirEmpresa";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { conEmpresa } from "@/lib/cuenta";
import { cuentaConEmpresa, rpcEn } from "@/lib/cuenta-empresa";
import { faltaMigracion } from "@/lib/datos";
import { boton } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Salir de la empresa — Pecera",
  robots: { index: false },
};

type Previa = { empresa_id: string; otros_miembros: number; es_dueno: boolean; se_borra: boolean };
type Miembro = { nombre: string; soy_yo: boolean };

/**
 * Salir de una empresa. Si quedan otras personas, dice quién pasa a administrarla.
 * Si es la última integrante, avisa que la empresa se borra con todo y ofrece
 * exportar el Dataroom antes; la confirmación es escribir ELIMINAR.
 */
export default async function SalirEmpresaPage({ searchParams }: PageProps<"/cuenta/empresa/salir">) {
  const { empresa: pedida } = await searchParams;
  const { supabase, user, empresas, empresa, multi } = await cuentaConEmpresa(pedida);
  if (!user) redirect("/cuenta");
  if (!empresa) redirect("/cuenta#seccion-empresas");

  // Sin multi_empresa, la única empresa se queda (aunque no quede nadie), como siempre.
  const [previaRes, miembrosRes] = await Promise.all([
    multi ? supabase.rpc("antes_de_borrar_v2") : null,
    rpcEn(supabase, "miembros_de_empresa", "miembros_mi_empresa", empresa.id, {}),
  ]);
  if (previaRes?.error && !faltaMigracion(previaRes.error)) {
    console.error(`Supabase (antes_de_borrar_v2): ${previaRes.error.message}`);
  }
  const previa = ((previaRes?.data ?? []) as Previa[]).find((p) => p.empresa_id === empresa.id);
  const miembros = (miembrosRes.data ?? []) as Miembro[];
  const otros = previa?.otros_miembros ?? Math.max(empresa.miembros - 1, 0);
  const seBorra = multi && otros === 0;
  // Quien pasa a administrar: la integrante más antigua que queda (la lista viene así).
  const sigue = empresa.es_dueno ? miembros.find((m) => !m.soy_yo) : undefined;
  const volver = conEmpresa("/cuenta/empresa", empresas.length > 1 ? empresa.slug : null);

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Link href={volver} className="inline-flex items-center gap-2 text-sm text-tinta/70 hover:text-arcilla">
          <span aria-hidden>&larr;</span> {empresa.nombre}
        </Link>

        <header className="mt-6 flex items-center gap-4">
          <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={56} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">Salir de la empresa</p>
            <h1 className="truncate font-display text-3xl font-semibold leading-tight text-tinta">{empresa.nombre}</h1>
          </div>
        </header>

        {seBorra ? (
          <>
            <p className="mt-6 rounded-2xl border-2 border-arcilla px-4 py-3 font-medium leading-relaxed text-tinta">
              Sos la única integrante: si salís, la empresa se borra con todo y no tiene vuelta atrás.
            </p>

            <section aria-labelledby="se-borra" className="mt-6 flex flex-col gap-2">
              <h2 id="se-borra" className="font-display text-xl font-semibold text-tinta">
                Qué se borra
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-tinta">
                <li>Su página pública, su One Pager y su Dataroom público.</li>
                <li>El logo y el producto o servicio, con sus imágenes.</li>
                <li>Build in Public: hitos y avances.</li>
                <li>Transparencia y todos los documentos del Dataroom, también los privados.</li>
                <li>El código para sumar gente.</li>
                <li>
                  Las relaciones que inversores y aliados habían confirmado con la empresa quedan en su perfil como
                  declaradas: ya no hay empresa que las confirme.
                </li>
              </ul>
              <p className="text-sm leading-relaxed text-tinta/80">
                Tu perfil y tus pitches no se tocan. Las imágenes se eliminan de nuestros servidores en la hora
                siguiente.
              </p>
            </section>

            <section
              aria-labelledby="guardar"
              className="mt-6 flex flex-col gap-3 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5"
            >
              <h2 id="guardar" className="font-display text-lg font-semibold text-tinta">
                Antes, guardá tus datos afuera
              </h2>
              <p className="text-sm leading-relaxed text-tinta/80">
                Exportá el Dataroom en PDF: documentos, templates y métricas, también lo privado. Se abre en otra
                pestaña; volvé acá cuando lo tengas.
              </p>
              <Link
                href={conEmpresa("/cuenta/dataroom/exportar", empresa.slug)}
                target="_blank"
                rel="noopener"
                className={`${boton("primario", "md")} self-start`}
              >
                Exportar el Dataroom en PDF <span aria-hidden>↗</span>
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </Link>
            </section>
          </>
        ) : (
          <section aria-labelledby="que-pasa" className="mt-6 flex flex-col gap-2">
            <h2 id="que-pasa" className="font-display text-xl font-semibold text-tinta">
              Qué pasa
            </h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-tinta">
              <li>Salís del equipo: la empresa deja de aparecer en tu perfil y en el reel.</li>
              {empresa.es_dueno && (
                <li>
                  {sigue
                    ? `${sigue.nombre} pasa a administrarla: es quien está hace más tiempo en el equipo.`
                    : "La administración pasa a quien está hace más tiempo en el equipo."}
                </li>
              )}
              <li>Lo que escribiste en la empresa (hitos, avances, documentos) queda.</li>
              <li>Para volver, alguien del equipo te pasa el código.</li>
            </ul>
          </section>
        )}

        <div className="mt-8 border-t border-tinta/15 pt-6">
          <FormSalirEmpresa empresaId={empresa.id} seBorra={seBorra} />
        </div>

        <Link
          href={volver}
          className="mt-4 flex min-h-11 items-center justify-center text-sm font-medium text-tinta underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}
