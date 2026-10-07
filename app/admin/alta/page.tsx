import type { Metadata } from "next";
import Link from "next/link";
import { deshacerAlta } from "@/app/admin/alta/acciones";
import { entrar } from "@/app/cuenta/acciones";
import AvisoEntrar from "@/components/AvisoEntrar";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import Encabezado from "@/components/Encabezado";
import { CONTACTO_PRIVACIDAD } from "@/components/PaginaLegal";
import AltaRapida from "@/components/admin/AltaRapida";
import BotonAccion from "@/components/admin/BotonAccion";
import type { AltaReciente } from "@/lib/alta-rapida";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { boton } from "@/lib/ui";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export const metadata: Metadata = {
  title: "Alta rápida — Pecera",
  robots: { index: false, follow: false },
};

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";

/**
 * Alta rápida en el stand (solo equipo): crea el perfil de una persona sin cuenta, con su
 * consentimiento. Abajo, las últimas 5 altas propias con Editar y Deshacer (10 minutos).
 */
export default async function AltaPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <Link href="/admin?v=perfiles" className="text-sm font-medium text-tinta underline underline-offset-4">
          ← Panel del equipo
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-tinta">Alta rápida</h1>
        {!user ? <SinSesion /> : <ConSesion supabase={supabase} />}
      </div>
    </main>
  );
}

function SinSesion() {
  return (
    <form action={entrar} className="mt-6 flex flex-col gap-3">
      <AvisoNavegadorInterno />
      <input type="hidden" name="next" value="/admin/alta" />
      <p className="text-tinta/80">Entrá con la cuenta de Google del equipo.</p>
      <button type="submit" className={boton("primario", "lg")}>
        Entrar con Google
      </button>
      <AvisoEntrar />
    </form>
  );
}

async function ConSesion({ supabase }: { supabase: Awaited<ReturnType<typeof supabaseConSesion>> }) {
  const { data: esAdmin, error } = await supabase.rpc("es_admin");
  if (error && !faltaMigracion(error)) throw new Error(`Supabase (es_admin): ${error.message}`);
  if (!esAdmin) {
    return <p className={`mt-6 ${CAJA} text-tinta`}>Esta pantalla es solo para el equipo de Pecera.</p>;
  }

  const recientes = await supabase.rpc("admin_altas_recientes");
  if (faltaMigracion(recientes.error)) {
    return (
      <p className={`mt-6 ${CAJA} text-sm text-tinta`}>
        Falta correr la migración <code>20261019120000_alta_rapida.sql</code> en Supabase.
      </p>
    );
  }
  if (recientes.error) console.error(`Supabase (admin_altas_recientes): ${recientes.error.code} ${recientes.error.message}`);
  const lista = (recientes.data ?? []) as AltaReciente[];

  return (
    <>
      <AltaRapida contacto={CONTACTO_PRIVACIDAD} eventoNombre={EVENTO_ACTUAL.nombre} />
      {lista.length > 0 && (
        <section aria-labelledby="recientes" className="mt-10 flex flex-col gap-2">
          <h2 id="recientes" className="font-display text-xl font-semibold text-tinta">
            Tus últimas altas
          </h2>
          <ul className="flex flex-col gap-2">
            {lista.map((p) => (
              <li key={p.id} className={`${CAJA} flex flex-wrap items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="font-medium text-tinta">{p.nombre}</p>
                  <p className="text-sm text-tinta/65">
                    /{p.slug}
                    {p.empresa ? ` · ${p.empresa}` : ""}
                    {!p.publicado ? " · sin publicar" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/perfil/${p.id}`} className={boton("secundario", "sm")}>
                    Editar
                  </Link>
                  {p.puede_deshacer && (
                    <BotonAccion
                      accion={deshacerAlta.bind(null, p.id)}
                      estilo="peligro"
                      confirmar={`¿Deshacer el alta de ${p.nombre}? Se borra el perfil (y su empresa, si era la única integrante).`}
                    >
                      Deshacer
                    </BotonAccion>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
