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
import TarjetaEmpresa, { type MiEmpresa } from "@/components/cuenta/TarjetaEmpresa";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import TarjetaEvento from "@/components/cuenta/TarjetaEvento";
import TarjetaPortafolio from "@/components/cuenta/TarjetaPortafolio";
import { entrar } from "@/app/cuenta/acciones";
import { urlPerfil } from "@/lib/cuenta";
import type { CuentaLocal } from "@/lib/cuenta-local";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import { ROLES } from "@/lib/rol";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { ItemPortafolio, Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Mi perfil — Pecera",
  robots: { index: false },
};

const COLUMNAS_BASE =
  "id, slug, nombre, tipo, rol, descripcion, avatar_url, whatsapp, email, linkedin, instagram, web, publicado, oculto";
const COLUMNAS_LISTA = `${COLUMNAS_BASE}, etapa, ronda, industrias, cargo, especialidades, ticket, rondas_interes, empresa_id`;
const COLUMNAS = `${COLUMNAS_LISTA}, busca_cofundador, cofundador_aporta, cofundador_busca, cofundador_dedicacion, cofundador_nota, ubicacion, experiencia, educacion, skills, busca, ofrece`;

const BOTON_PRIMARIO =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-tinta px-6 font-medium text-marfil transition-opacity duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

export default async function CuentaPage({ searchParams }: PageProps<"/cuenta">) {
  const { error, creado, foto, rol } = await searchParams;
  const rolInicial = typeof rol === "string" && rol in ROLES ? (rol as Rol) : undefined;
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: PerfilPropio | null = null;
  if (user) {
    const leer = (columnas: string) =>
      supabase
        .from("perfiles")
        .select(columnas)
        .eq("usuario_id", user.id)
        .maybeSingle()
        .overrideTypes<PerfilPropio | null, { merge: false }>();
    // En cascada: feria_pro → feria_lista → lo de siempre.
    let { data, error: errorLectura } = await leer(COLUMNAS);
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_LISTA));
    if (faltaMigracion(errorLectura)) ({ data, error: errorLectura } = await leer(COLUMNAS_BASE));
    if (errorLectura) throw new Error(`Supabase (cuenta): ${errorLectura.message}`);
    perfil = data && { ...data, avatar_url: data.avatar_url && urlMedia(data.avatar_url) };
  }

  // Empresa, transparencia y evento: extras de feria_lista. Si la base todavía no
  // los tiene (o fallan), la cuenta se edita igual.
  const [extras, esAdmin] = await Promise.all([
    user && perfil ? leerExtras(supabase) : null,
    user ? esDelEquipo(supabase) : false,
  ]);

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
            <AvisoNavegadorInterno />
            {error === "login" && (
              <p
                role="alert"
                className="rounded-2xl border-2 border-arcilla px-4 py-3 text-sm font-medium text-tinta"
              >
                No pudimos entrar con tu cuenta de Google. Probá de nuevo.
              </p>
            )}
            {rolInicial && (
              <p className="flex items-center gap-2 rounded-2xl bg-tinta/5 px-4 py-3 text-sm text-tinta">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${ROLES[rolInicial].bg}`} />
                <span>
                  Vas a entrar como <strong className="font-semibold">{ROLES[rolInicial].label}</strong>. Lo
                  podés cambiar después.
                </span>
              </p>
            )}
            <form action={entrar} className="mt-2 flex flex-col gap-2">
              <input
                type="hidden"
                name="next"
                value={rolInicial ? `/cuenta?rol=${rolInicial}` : "/cuenta"}
              />
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
              <Creado perfil={perfil} fotoFallo={foto === "error"} />
            ) : (
              perfil && <Estado perfil={perfil} />
            )}

            <MisPitches
              pitches={misPitches}
              email={user.email ?? ""}
              conPerfil={!!perfil}
              claseBoton={BOTON_PRIMARIO}
            />

            <FormPerfil
              key={perfil?.id ?? "nuevo"}
              perfil={perfil}
              rolInicial={rolInicial}
              empresa={extras?.empresa ? { slug: extras.empresa.slug, nombre: extras.empresa.nombre } : null}
            />

            {perfil && extras?.disponible && (
              <>
                {extras.portafolio && <TarjetaPortafolio items={extras.portafolio} rol={perfil.rol} />}
                <TarjetaEmpresa empresa={extras.empresa} />
                <TarjetaEvento participa={extras.participa} rol={perfil.rol} />
              </>
            )}

            {esAdmin && (
              <Link
                href="/admin"
                className="flex min-h-12 items-center justify-between rounded-2xl bg-tinta px-4 text-marfil"
              >
                <span className="font-medium">Panel del equipo</span>
                <span aria-hidden>&rarr;</span>
              </Link>
            )}

            <BotonSalir />
          </section>
        )}

        <PieLegal tono="claro" className="mt-10 pb-8" />
      </div>
    </main>
  );
}

type Extras = {
  disponible: boolean;
  empresa: MiEmpresa | null;
  participa: boolean;
  /** null si la base todavía no tiene feria_pro: la tarjeta no se muestra. */
  portafolio: ItemPortafolio[] | null;
};

async function leerExtras(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<Extras> {
  const [v2, evento, portafolio] = await Promise.all([
    supabase.rpc("mi_empresa_v2"),
    supabase.rpc("mi_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("mi_portafolio"),
  ]);
  // Sin feria_pro, la empresa sale de mi_empresa (sin logo).
  const empresa = faltaMigracion(v2.error) ? await supabase.rpc("mi_empresa") : v2;
  if (faltaMigracion(empresa.error)) {
    return { disponible: false, empresa: null, participa: false, portafolio: null };
  }
  for (const [donde, r] of [
    ["mi_empresa", empresa],
    ["mi_evento", evento],
  ] as const) {
    if (r.error) console.error(`Supabase (${donde}): ${r.error.message}`);
  }
  if (portafolio.error && !faltaMigracion(portafolio.error)) {
    console.error(`Supabase (mi_portafolio): ${portafolio.error.message}`);
  }
  const fila = ((empresa.data as MiEmpresa[] | null) ?? [])[0] ?? null;
  const filaEvento = (evento.data as Array<{ participa: boolean }> | null)?.[0];
  return {
    disponible: true,
    empresa: fila && { ...fila, logo_url: fila.logo_url ? urlMedia(fila.logo_url) : null },
    participa: !!filaEvento?.participa,
    portafolio: portafolio.error ? null : ((portafolio.data ?? []) as ItemPortafolio[]),
  };
}

/** El link al panel solo se muestra al equipo; el panel igual lo vuelve a chequear. */
async function esDelEquipo(supabase: Awaited<ReturnType<typeof supabaseConSesion>>): Promise<boolean> {
  const { data, error } = await supabase.rpc("es_admin");
  if (error && !faltaMigracion(error)) console.error(`Supabase (es_admin): ${error.message}`);
  return data === true;
}

/** La primera vez: el perfil está creado, su dirección para copiar y su estado. */
function Creado({ perfil, fotoFallo }: { perfil: PerfilPropio; fotoFallo: boolean }) {
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
      {fotoFallo && (
        <p className="text-sm font-medium">
          No pudimos guardar tu foto. Volvé a subirla desde el formulario de abajo.
        </p>
      )}
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
