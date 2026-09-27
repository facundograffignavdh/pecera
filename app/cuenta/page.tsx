import type { Metadata } from "next";
import Link from "next/link";
import BotonCopiar from "@/components/BotonCopiar";
import BotonSalir from "@/components/BotonSalir";
import Encabezado from "@/components/Encabezado";
import FormPerfil, { type PerfilPropio } from "@/components/FormPerfil";
import MisPitches, { type MiPitch } from "@/components/MisPitches";
import PieLegal from "@/components/PieLegal";
import RecordarCuenta from "@/components/RecordarCuenta";
import { EnlaceVolver } from "@/components/VolverAlFeed";
import { entrar } from "@/app/cuenta/acciones";
import { urlPerfil } from "@/lib/cuenta";
import type { CuentaLocal } from "@/lib/cuenta-local";
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
  const { error, creado } = await searchParams;
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

  // "Mis pitches" es un extra: si falla, se edita el perfil igual.
  let misPitches: MiPitch[] = [];
  if (user) {
    const { data, error: errorPitches } = await supabase.rpc("mis_pitches");
    if (errorPitches) console.error(`Supabase (mis_pitches): ${errorPitches.message}`);
    else misPitches = (data ?? []) as MiPitch[];
  }

  // Dato chico y público para la píldora y el "Editar perfil" de las páginas
  // estáticas. Nada de email ni ids.
  const cuentaLocal: CuentaLocal | null = user
    ? {
        perfil: perfil && {
          slug: perfil.slug,
          nombre: perfil.nombre,
          rol: perfil.rol,
          avatar: perfil.avatar_url,
          visible: perfil.publicado && !perfil.oculto,
        },
      }
    : null;

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <RecordarCuenta cuenta={cuentaLocal} />
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
              <p className="text-center text-sm leading-relaxed text-tinta/70">
                Google te va a pedir que confirmes tu cuenta. Vas a ver una dirección de
                Supabase: es el servicio que usa Pecera para las cuentas.
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

            {perfil && creado === "1" ? (
              <Creado perfil={perfil} />
            ) : (
              perfil && <Estado perfil={perfil} />
            )}

            <MisPitches
              pitches={misPitches}
              email={user.email ?? ""}
              conPerfil={!!perfil}
              claseBoton={BOTON_PRIMARIO}
            />

            <FormPerfil key={perfil?.id ?? "nuevo"} perfil={perfil} />

            <BotonSalir />
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

/** La primera vez: el perfil está creado, su dirección para copiar y su estado. */
function Creado({ perfil }: { perfil: PerfilPropio }) {
  const url = urlPerfil(perfil.slug);
  return (
    <section
      aria-labelledby="creado-titulo"
      className="flex flex-col gap-3 rounded-2xl border border-tinta/15 bg-tinta/5 px-4 py-4 text-tinta"
    >
      <h2 id="creado-titulo" className="font-display text-xl font-semibold leading-tight">
        ¡Listo, tu perfil está creado!
      </h2>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-tinta/70">Tu dirección en Pecera</p>
        <p className="break-all font-semibold">{url}</p>
      </div>
      <BotonCopiar
        texto={url}
        etiqueta="Copiar dirección"
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-tinta px-5 text-sm font-medium text-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
      />
      <Estado perfil={perfil} />
    </section>
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
