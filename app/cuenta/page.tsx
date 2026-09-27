import type { Metadata } from "next";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import FormPerfil, { type PerfilPropio } from "@/components/FormPerfil";
import PieLegal from "@/components/PieLegal";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { entrar, salir } from "@/app/cuenta/acciones";
import { urlMedia } from "@/lib/media";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export const metadata: Metadata = {
  title: "Mi perfil — Pecera",
  robots: { index: false },
};

const COLUMNAS =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado, oculto";

const BOTON_PRIMARIO =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-tinta px-6 font-medium text-marfil transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

export default async function CuentaPage({ searchParams }: PageProps<"/cuenta">) {
  const { error } = await searchParams;
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: PerfilPropio | null = null;
  if (user) {
    const { data, error: errorLectura } = await supabase
      .from("perfiles")
      .select(COLUMNAS)
      .eq("usuario_id", user.id)
      .maybeSingle()
      .overrideTypes<PerfilPropio | null, { merge: false }>();
    if (errorLectura) throw new Error(`Supabase (cuenta): ${errorLectura.message}`);
    perfil = data && { ...data, avatar_url: data.avatar_url && urlMedia(data.avatar_url) };
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <EnlaceVolver href="/" />

        {!user ? (
          <section className="mt-8 flex flex-col gap-4">
            <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
              Tu perfil en Pecera
            </h1>
            <p className="leading-relaxed text-tinta/80">
              Entrá con tu cuenta de Google para crear tu perfil o editarlo.
            </p>
            {error === "login" && (
              <p
                role="alert"
                className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta"
              >
                No pudimos entrar con tu cuenta de Google. Probá de nuevo.
              </p>
            )}
            <form action={entrar} className="mt-2 flex flex-col gap-2">
              <button type="submit" className={BOTON_PRIMARIO}>
                Entrar con Google
              </button>
              <p className="text-center text-sm text-tinta/70">
                Te va a aparecer una pantalla de Google para confirmar tu cuenta.
              </p>
            </form>
          </section>
        ) : (
          <section className="mt-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">
                {perfil ? "Mi perfil" : "Creá tu perfil"}
              </h1>
              <p className="break-all text-sm text-tinta/70">Entraste como {user.email}</p>
            </div>

            {perfil && <Estado perfil={perfil} />}

            <FormPerfil key={perfil?.id ?? "nuevo"} perfil={perfil} />

            <form action={salir} className="border-t border-tinta/15 pt-6">
              <button
                type="submit"
                className="min-h-11 w-full rounded-full border border-tinta/55 px-5 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                Cerrar sesión
              </button>
            </form>
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

/** Estado de publicación, en tono neutro: que no esté publicado no es un error. */
function Estado({ perfil }: { perfil: PerfilPropio }) {
  let texto: string;
  if (!perfil.publicado) {
    texto = "Tu perfil se va a publicar pronto. Mientras, podés dejarlo listo.";
  } else if (perfil.oculto) {
    texto = "Tu perfil está oculto: nadie lo ve hasta que lo vuelvas a mostrar.";
  } else {
    texto = "Tu perfil está publicado.";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
      <p>{texto}</p>
      {perfil.publicado && !perfil.oculto && (
        <Link
          href={`/p/${perfil.slug}`}
          className="self-start font-medium underline underline-offset-4 hover:text-arcilla"
        >
          Ver mi perfil
        </Link>
      )}
    </div>
  );
}
