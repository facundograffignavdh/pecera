import type { Metadata } from "next";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import Link from "next/link";
import BotonCopiar from "@/components/BotonCopiar";
import Encabezado from "@/components/Encabezado";
import BotonAccion from "@/components/admin/BotonAccion";
import {
  autopublicar,
  configurarEvento,
  ocultarEmpresa,
  participante,
  publicarPerfil,
  publicarPitch,
} from "@/app/admin/acciones";
import { entrar } from "@/app/cuenta/acciones";
import type { Canal } from "@/lib/contacto";
import { faltaMigracion } from "@/lib/datos";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { urlMedia } from "@/lib/media";
import { ROLES } from "@/lib/rol";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { Rol } from "@/types/pecera";

export const metadata: Metadata = {
  title: "Panel del equipo — Pecera",
  robots: { index: false, follow: false },
};

type Supabase = Awaited<ReturnType<typeof supabaseConSesion>>;

const VISTAS = [
  { id: "resumen", label: "Resumen" },
  { id: "perfiles", label: "Perfiles" },
  { id: "pitches", label: "Pitches" },
  { id: "envios", label: "Envíos" },
  { id: "empresas", label: "Empresas" },
  { id: "evento", label: EVENTO_ACTUAL.nombre },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

const CAJA = "rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3";
const PILDORA = "rounded-full px-2 py-0.5 text-xs font-medium";

/**
 * Panel del equipo: publicar perfiles y pitches, ver envíos trabados, ocultar
 * empresas y manejar la votación de la feria. Entra quien tenga su email en la
 * tabla `admins` (lo decide la base, no la app). Mobile-first: se usa en la feria.
 */
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { v, f } = await searchParams;
  const vista: Vista = VISTAS.some((x) => x.id === v) ? (v as Vista) : "resumen";
  const filtro = typeof f === "string" ? f : "todos";

  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-marfil">
      <Encabezado variante="cuenta" />
      <div className="mx-auto w-full max-w-2xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)]">
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta">Panel del equipo</h1>
        {!user ? <SinSesion /> : <ConSesion supabase={supabase} email={user.email ?? ""} vista={vista} filtro={filtro} />}
      </div>
    </main>
  );
}

function SinSesion() {
  return (
    <form action={entrar} className="mt-6 flex flex-col gap-3">
      <AvisoNavegadorInterno />
      <input type="hidden" name="next" value="/admin" />
      <p className="text-tinta/80">Entrá con la cuenta de Google del equipo.</p>
      <button
        type="submit"
        className="min-h-12 rounded-full bg-naranja px-6 font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla hover:bg-pecera active:scale-[0.98]"
      >
        Entrar con Google
      </button>
    </form>
  );
}

async function ConSesion({
  supabase,
  email,
  vista,
  filtro,
}: {
  supabase: Supabase;
  email: string;
  vista: Vista;
  filtro: string;
}) {
  const { data: esAdmin, error } = await supabase.rpc("es_admin");
  if (faltaMigracion(error)) {
    return (
      <p className={`mt-6 ${CAJA} text-sm text-tinta`}>
        Falta correr la migración <code>20261001120000_feria_lista.sql</code> en Supabase. Ver
        docs/GUIA-FERIA.md, paso 1.
      </p>
    );
  }
  if (error) throw new Error(`Supabase (es_admin): ${error.message}`);
  if (!esAdmin) {
    return (
      <div className={`mt-6 ${CAJA} flex flex-col gap-2 text-sm text-tinta`}>
        <p>
          <strong className="font-semibold">{email}</strong> no está en el equipo.
        </p>
        <p className="text-tinta/70">
          Para sumarlo, alguien con acceso a Supabase corre en el SQL editor:
        </p>
        <code className="block break-all rounded-xl bg-tinta px-3 py-2 text-xs text-marfil">
          insert into public.admins (email) values (&apos;{email.toLowerCase()}&apos;);
        </code>
      </div>
    );
  }

  return (
    <>
      <p className="mt-1 break-all text-sm text-tinta/60">{email}</p>
      <nav aria-label="Secciones del panel" className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {VISTAS.map((x) => (
          <Link
            key={x.id}
            href={`/admin?v=${x.id}`}
            aria-current={vista === x.id ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium ${
              vista === x.id ? "border-tinta bg-tinta text-marfil" : "border-tinta/25 text-tinta hover:border-tinta/60"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {vista === "resumen" && <Resumen supabase={supabase} />}
        {vista === "perfiles" && <Perfiles supabase={supabase} filtro={filtro} />}
        {vista === "pitches" && <Pitches supabase={supabase} filtro={filtro} />}
        {vista === "envios" && <Envios supabase={supabase} />}
        {vista === "empresas" && <Empresas supabase={supabase} />}
        {vista === "evento" && <Evento supabase={supabase} />}
      </div>
    </>
  );
}

function fallo(donde: string, error: { message: string } | null): void {
  if (error) throw new Error(`Supabase (${donde}): ${error.message}`);
}

function Filtros({ vista, actual, opciones }: { vista: Vista; actual: string; opciones: [string, string][] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {opciones.map(([id, label]) => (
        <Link
          key={id}
          href={`/admin?v=${vista}&f=${id}`}
          aria-current={actual === id ? "true" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm ${
            actual === id ? "bg-tinta/10 font-semibold text-tinta" : "text-tinta/70 hover:bg-tinta/5"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

type ResumenDatos = {
  perfiles: number;
  perfiles_visibles: number;
  perfiles_pendientes: number;
  perfiles_ocultos: number;
  por_rol: Partial<Record<Rol, number>>;
  pitches_publicados: number;
  piques: number;
  envios_en_espera: number;
  envios_con_error: number;
  ingestas_con_error: number;
  empresas: number;
  participantes: number;
  votos: number;
  autopublicar: boolean;
};

type MetricaPerfil = {
  perfil_id: string;
  slug: string;
  nombre: string;
  vistas: number;
  contactos: number;
  por_canal: Partial<Record<Canal["clave"], number>>;
};

const CANALES: [Canal["clave"], string][] = [
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
  ["web", "Web"],
];

async function Resumen({ supabase }: { supabase: Supabase }) {
  const [resumen, medicion] = await Promise.all([
    supabase.rpc("admin_resumen"),
    supabase.rpc("admin_metricas"),
  ]);
  fallo("admin_resumen", resumen.error);
  const r = resumen.data as ResumenDatos;
  // Sin la migración de medición, la parte de vistas y contactos no aparece.
  if (medicion.error && !faltaMigracion(medicion.error)) fallo("admin_metricas", medicion.error);
  const metricas = medicion.error ? null : ((medicion.data ?? []) as MetricaPerfil[]);

  const alertas = [
    r.perfiles_pendientes > 0 && {
      texto: `${r.perfiles_pendientes} perfiles esperan que los publiquen`,
      href: "/admin?v=perfiles&f=pendientes",
    },
    r.envios_en_espera > 0 && { texto: `${r.envios_en_espera} videos en espera de asignar`, href: "/admin?v=envios" },
    r.envios_con_error + r.ingestas_con_error > 0 && {
      texto: `${r.envios_con_error + r.ingestas_con_error} videos con error en la ingesta`,
      href: "/admin?v=envios",
    },
  ].filter((a): a is { texto: string; href: string } => !!a);

  const numeros: [string, number][] = [
    ["Perfiles visibles", r.perfiles_visibles],
    ["Pitches publicados", r.pitches_publicados],
    ["Piques", r.piques],
    ...(metricas
      ? ([
          ["Vistas", metricas.reduce((t, m) => t + m.vistas, 0)],
          ["Contactos", metricas.reduce((t, m) => t + m.contactos, 0)],
        ] as [string, number][])
      : []),
    ["Empresas", r.empresas],
    [`En ${EVENTO_ACTUAL.nombre}`, r.participantes],
    ["Votos", r.votos],
  ];

  return (
    <div className="flex flex-col gap-5">
      {alertas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {alertas.map((a) => (
            <li key={a.href + a.texto}>
              <Link
                href={a.href}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 border-arcilla px-4 py-2 text-sm font-medium text-tinta"
              >
                {a.texto}
                <span aria-hidden>&rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-t-verde-suave px-4 py-3 text-sm text-t-verde">Nada pendiente. Todo en orden.</p>
      )}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {numeros.map(([label, n]) => (
          <div key={label} className={CAJA}>
            <dt className="text-xs text-tinta/60">{label}</dt>
            <dd className="font-display text-3xl font-semibold tabular-nums text-tinta">{n}</dd>
          </div>
        ))}
      </dl>

      <div className={CAJA}>
        <p className="text-xs text-tinta/60">Perfiles visibles por rol</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(ROLES) as Rol[]).map((rol) => (
            <li key={rol} className={`${PILDORA} text-marfil ${ROLES[rol].bg}`}>
              {ROLES[rol].label}: {r.por_rol[rol] ?? 0}
            </li>
          ))}
        </ul>
      </div>

      {metricas && (
        <section className={CAJA}>
          <h2 className="font-medium text-tinta">Vistas y contactos por perfil</h2>
          <p className="text-sm text-tinta/70">
            Anónimos. Una vista = 3 s de video (una por celular cada 12 h). Los contactos son
            toques en los canales del perfil o del pop-up del pique, y no se muestran en público.
          </p>
          {metricas.length === 0 ? (
            <p className="mt-3 text-sm text-tinta/70">Todavía no hay datos.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-tinta/10">
              {metricas.map((m) => (
                <li key={m.perfil_id} className="flex flex-col gap-1 py-2.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <Link href={`/p/${m.slug}`} className="min-w-0 truncate font-medium text-tinta underline-offset-4 hover:underline">
                      {m.nombre}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-tinta">
                      {m.vistas} {m.vistas === 1 ? "vista" : "vistas"} · {m.contactos}{" "}
                      {m.contactos === 1 ? "contacto" : "contactos"}
                    </span>
                  </span>
                  {m.contactos > 0 && (
                    <span className="flex flex-wrap gap-x-3 text-xs tabular-nums text-tinta/70">
                      {CANALES.filter(([c]) => m.por_canal[c]).map(([c, label]) => (
                        <span key={c}>
                          {label}: {m.por_canal[c]}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={`${CAJA} flex items-center justify-between gap-4`}>
        <div>
          <p className="font-medium text-tinta">Autopublicar perfiles nuevos</p>
          <p className="text-sm text-tinta/70">
            {r.autopublicar
              ? "Prendido: los perfiles de /cuenta nacen publicados."
              : "Apagado: cada perfil nuevo espera que lo publiques."}
          </p>
        </div>
        <BotonAccion
          accion={autopublicar.bind(null, !r.autopublicar)}
          estilo={r.autopublicar ? "secundario" : "primario"}
          confirmar={r.autopublicar ? undefined : "¿Prender autopublicar? Los perfiles nuevos se ven enseguida."}
        >
          {r.autopublicar ? "Apagar" : "Prender"}
        </BotonAccion>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perfiles
// ---------------------------------------------------------------------------

type PerfilAdmin = {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  tipo: string;
  publicado: boolean;
  oculto: boolean;
  con_cuenta: boolean;
  empresa: string | null;
  pitches: number;
  piques: number;
  participa: boolean;
  created_at: string;
};

async function Perfiles({ supabase, filtro }: { supabase: Supabase; filtro: string }) {
  const { data, error } = await supabase.rpc("admin_perfiles");
  fallo("admin_perfiles", error);
  const todos = (data ?? []) as PerfilAdmin[];
  const lista = todos.filter((p) =>
    filtro === "pendientes"
      ? !p.publicado
      : filtro === "publicados"
        ? p.publicado && !p.oculto
        : filtro === "ocultos"
          ? p.oculto
          : true
  );

  return (
    <>
      <Filtros
        vista="perfiles"
        actual={filtro}
        opciones={[
          ["todos", `Todos (${todos.length})`],
          ["pendientes", `Pendientes (${todos.filter((p) => !p.publicado).length})`],
          ["publicados", "Publicados"],
          ["ocultos", "Ocultos por la persona"],
        ]}
      />
      <ul className="flex flex-col gap-2">
        {lista.map((p) => (
          <li key={p.id} className={`${CAJA} flex flex-wrap items-center justify-between gap-3`}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-tinta">{p.nombre}</span>
                <span className={`${PILDORA} text-marfil ${ROLES[p.rol].bg}`}>{ROLES[p.rol].label}</span>
                {!p.publicado && <span className={`${PILDORA} bg-t-ocre-suave text-t-ocre`}>Pendiente</span>}
                {p.oculto && <span className={`${PILDORA} bg-tinta/10 text-tinta`}>Oculto</span>}
                {p.participa && <span className={`${PILDORA} bg-t-arcilla-suave text-t-arcilla`}>Feria</span>}
              </p>
              <p className="mt-0.5 text-xs text-tinta/60">
                /{p.slug} · {p.pitches} pitches · {p.piques} piques
                {p.empresa ? ` · ${p.empresa}` : ""}
                {!p.con_cuenta ? " · sin cuenta" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {p.publicado && !p.oculto && (
                <Link href={`/p/${p.slug}`} className="text-sm text-tinta/70 underline underline-offset-4">
                  Ver
                </Link>
              )}
              <BotonAccion
                accion={publicarPerfil.bind(null, p.id, !p.publicado)}
                estilo={p.publicado ? "secundario" : "primario"}
                confirmar={p.publicado ? `¿Despublicar a ${p.nombre}? Deja de verse en el feed.` : undefined}
              >
                {p.publicado ? "Despublicar" : "Publicar"}
              </BotonAccion>
            </div>
          </li>
        ))}
        {lista.length === 0 && <li className="text-sm text-tinta/60">No hay perfiles con este filtro.</li>}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pitches
// ---------------------------------------------------------------------------

type PitchAdmin = {
  id: string;
  perfil_slug: string;
  perfil: string;
  descripcion: string | null;
  poster_url: string | null;
  publicado: boolean;
  piques: number;
  created_at: string;
};

async function Pitches({ supabase, filtro }: { supabase: Supabase; filtro: string }) {
  const { data, error } = await supabase.rpc("admin_pitches");
  fallo("admin_pitches", error);
  const todos = (data ?? []) as PitchAdmin[];
  const lista = todos.filter((p) =>
    filtro === "ocultos" ? !p.publicado : filtro === "publicados" ? p.publicado : true
  );

  return (
    <>
      <Filtros
        vista="pitches"
        actual={filtro}
        opciones={[
          ["todos", `Todos (${todos.length})`],
          ["publicados", "Publicados"],
          ["ocultos", `Sin publicar (${todos.filter((p) => !p.publicado).length})`],
        ]}
      />
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {lista.map((p) => (
          <li key={p.id} className={`${CAJA} flex gap-3`}>
            {p.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar
              <img
                src={urlMedia(p.poster_url)}
                alt=""
                className="aspect-[9/16] w-14 shrink-0 rounded-lg bg-tinta object-cover"
                loading="lazy"
              />
            ) : (
              <span className="aspect-[9/16] w-14 shrink-0 rounded-lg bg-tinta" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate font-medium text-tinta">{p.perfil}</p>
              <p className="line-clamp-2 text-xs text-tinta/70">{p.descripcion ?? "Sin descripción"}</p>
              <p className="text-xs text-tinta/60">{p.piques} piques</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                {p.publicado ? (
                  <Link href={`/#${p.id}`} className="text-sm text-tinta/70 underline underline-offset-4">
                    Ver en el feed
                  </Link>
                ) : (
                  <span className={`${PILDORA} bg-t-ocre-suave text-t-ocre`}>Sin publicar</span>
                )}
                <BotonAccion
                  accion={publicarPitch.bind(null, p.id, !p.publicado)}
                  estilo={p.publicado ? "secundario" : "primario"}
                  confirmar={p.publicado ? "¿Sacar este pitch del feed?" : undefined}
                >
                  {p.publicado ? "Sacar" : "Publicar"}
                </BotonAccion>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Envíos (ingesta)
// ---------------------------------------------------------------------------

type EnvioAdmin = {
  origen_id: string;
  email_escrito: string | null;
  email_verificado: string | null;
  estado: string;
  regla: string | null;
  fecha: string;
  perfil_slug: string | null;
  error: string | null;
  intentos: number;
};

const ESTADO_ENVIO: Record<string, string> = {
  recibido: "bg-tinta/10 text-tinta",
  en_espera: "bg-t-ocre-suave text-t-ocre",
  error: "bg-t-arcilla-suave text-t-arcilla",
  rechazado: "bg-tinta/10 text-tinta/70",
};

async function Envios({ supabase }: { supabase: Supabase }) {
  const { data, error } = await supabase.rpc("admin_envios");
  fallo("admin_envios", error);
  const lista = (data ?? []) as EnvioAdmin[];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-tinta/70">
        Videos del Form de pitches que no llegaron a publicarse. Los emails se ven solo acá. Para asignar uno
        a mano, copiá el comando, cambiá <code>SLUG</code> por el perfil y correlo en una terminal con{" "}
        <code>gh</code> (ver docs/GUIA-FERIA.md).
      </p>
      <ul className="flex flex-col gap-2">
        {lista.map((e) => {
          const comando = `gh workflow run ingesta.yml -f asignar="${e.origen_id} ${e.perfil_slug ?? "SLUG"}"`;
          return (
            <li key={e.origen_id} className={`${CAJA} flex flex-col gap-2`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${PILDORA} ${ESTADO_ENVIO[e.estado] ?? "bg-tinta/10"}`}>{e.estado.replace("_", " ")}</span>
                <span className="text-xs text-tinta/60">
                  {new Date(e.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                {e.intentos > 0 && <span className="text-xs text-tinta/60">{e.intentos} intentos</span>}
              </div>
              <p className="break-all text-sm text-tinta">
                Escrito: {e.email_escrito ?? "—"}
                {e.email_verificado && e.email_verificado !== e.email_escrito && (
                  <span className="text-tinta/60"> · verificado: {e.email_verificado}</span>
                )}
              </p>
              {e.regla && <p className="text-xs text-tinta/70">Regla: {e.regla}</p>}
              {e.error && <p className="break-all text-xs text-t-arcilla">Error: {e.error}</p>}
              {e.estado !== "rechazado" && (
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-tinta px-2.5 py-1.5 text-xs text-marfil">
                    {comando}
                  </code>
                  <BotonCopiar
                    texto={comando}
                    etiqueta="Copiar"
                    className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-tinta/30 px-3 text-xs font-medium text-tinta"
                  />
                </div>
              )}
            </li>
          );
        })}
        {lista.length === 0 && <li className="text-sm text-tinta/60">No hay envíos trabados.</li>}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

type EmpresaAdmin = {
  id: string;
  slug: string;
  nombre: string;
  oculta: boolean;
  visible: boolean;
  miembros: number;
  created_at: string;
};

async function Empresas({ supabase }: { supabase: Supabase }) {
  const { data, error } = await supabase.rpc("admin_empresas");
  fallo("admin_empresas", error);
  const lista = (data ?? []) as EmpresaAdmin[];

  return (
    <ul className="flex flex-col gap-2">
      {lista.map((e) => (
        <li key={e.id} className={`${CAJA} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-tinta">{e.nombre}</span>
              {e.oculta && <span className={`${PILDORA} bg-t-arcilla-suave text-t-arcilla`}>Oculta</span>}
              {!e.oculta && !e.visible && (
                <span className={`${PILDORA} bg-tinta/10 text-tinta`}>Sin perfiles publicados</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-tinta/60">
              /e/{e.slug} · {e.miembros} {e.miembros === 1 ? "miembro" : "miembros"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {e.visible && (
              <Link href={`/e/${e.slug}`} className="text-sm text-tinta/70 underline underline-offset-4">
                Ver
              </Link>
            )}
            <BotonAccion
              accion={ocultarEmpresa.bind(null, e.id, !e.oculta)}
              estilo={e.oculta ? "primario" : "peligro"}
              confirmar={e.oculta ? undefined : `¿Ocultar ${e.nombre}? Su página deja de verse.`}
            >
              {e.oculta ? "Mostrar" : "Ocultar"}
            </BotonAccion>
          </div>
        </li>
      ))}
      {lista.length === 0 && <li className="text-sm text-tinta/60">Todavía no hay empresas.</li>}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Evento
// ---------------------------------------------------------------------------

type ParticipanteAdmin = { perfil_id: string; slug: string; nombre: string; rol: Rol; empresa_nombre: string | null };

async function Evento({ supabase }: { supabase: Supabase }) {
  const [estado, participantes, resultados, perfiles] = await Promise.all([
    supabase.rpc("admin_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("participantes_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("resultados_evento", { p_evento: EVENTO_ACTUAL.slug }),
    supabase.rpc("admin_perfiles"),
  ]);
  fallo("admin_evento", estado.error);
  fallo("participantes_evento", participantes.error);
  fallo("resultados_evento", resultados.error);
  fallo("admin_perfiles", perfiles.error);

  const e = (estado.data as Array<{
    votacion_abierta: boolean;
    resultados_visibles: boolean;
    participantes: number;
    votos: number;
  }>)[0];
  if (!e) return <p className="text-sm text-tinta">El evento {EVENTO_ACTUAL.slug} no existe o no está activo.</p>;

  const votos = new Map(
    ((resultados.data ?? []) as Array<{ perfil_id: string; votos: number }>).map((r) => [r.perfil_id, Number(r.votos)])
  );
  const lista = ((participantes.data ?? []) as ParticipanteAdmin[]).sort(
    (a, b) => (votos.get(b.perfil_id) ?? 0) - (votos.get(a.perfil_id) ?? 0)
  );
  const anotados = new Set(lista.map((p) => p.perfil_id));
  const candidatos = ((perfiles.data ?? []) as PerfilAdmin[]).filter(
    (p) => p.publicado && !p.oculto && !anotados.has(p.id)
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        <div className={CAJA}>
          <p className="text-xs text-tinta/60">Participantes</p>
          <p className="font-display text-3xl font-semibold tabular-nums text-tinta">{e.participantes}</p>
        </div>
        <div className={CAJA}>
          <p className="text-xs text-tinta/60">Votos</p>
          <p className="font-display text-3xl font-semibold tabular-nums text-tinta">{e.votos}</p>
        </div>
      </div>

      <div className={`${CAJA} flex flex-col gap-3`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-tinta">Votación</p>
            <p className="text-sm text-tinta/70">{e.votacion_abierta ? "Abierta: el público puede votar." : "Cerrada."}</p>
          </div>
          <BotonAccion
            accion={configurarEvento.bind(null, !e.votacion_abierta, e.resultados_visibles)}
            estilo={e.votacion_abierta ? "peligro" : "primario"}
            confirmar={e.votacion_abierta ? "¿Cerrar la votación?" : "¿Abrir la votación al público?"}
          >
            {e.votacion_abierta ? "Cerrar" : "Abrir"}
          </BotonAccion>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-tinta/10 pt-3">
          <div>
            <p className="font-medium text-tinta">Resultados</p>
            <p className="text-sm text-tinta/70">
              {e.resultados_visibles ? "Visibles para todos en la página del evento." : "Solo los ve el equipo."}
            </p>
          </div>
          <BotonAccion
            accion={configurarEvento.bind(null, e.votacion_abierta, !e.resultados_visibles)}
            estilo={e.resultados_visibles ? "secundario" : "primario"}
            confirmar={e.resultados_visibles ? undefined : "¿Mostrar los resultados a todo el público?"}
          >
            {e.resultados_visibles ? "Ocultar" : "Mostrar"}
          </BotonAccion>
        </div>
        <p className="border-t border-tinta/10 pt-3 text-sm text-tinta/70">
          Cronograma: abrir el {EVENTO_ACTUAL.votacion.abre}; cerrar el {EVENTO_ACTUAL.votacion.cierra}. Los
          resultados {EVENTO_ACTUAL.votacion.resultados}: mostralos en el momento del anuncio.
        </p>
        <Link href={`/eventos/${EVENTO_ACTUAL.slug}`} className="self-start text-sm text-tinta/70 underline underline-offset-4">
          Ver la página del evento
        </Link>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold text-tinta">Ranking</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {lista.map((p, i) => (
            <li key={p.perfil_id} className={`${CAJA} flex items-center justify-between gap-3`}>
              <span className="min-w-0">
                <span className="mr-2 font-display font-semibold tabular-nums text-tinta/60">{i + 1}</span>
                <span className="font-medium text-tinta">{p.empresa_nombre ?? p.nombre}</span>
                <span className={`ml-2 ${PILDORA} text-marfil ${ROLES[p.rol].bg}`}>{ROLES[p.rol].label}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-tinta">
                  {p.rol === "emprendedor" ? `${votos.get(p.perfil_id) ?? 0} votos` : "no compite"}
                </span>
                <BotonAccion
                  accion={participante.bind(null, p.perfil_id, false)}
                  estilo="peligro"
                  confirmar={`¿Sacar a ${p.nombre} del evento? Deja de aparecer en la votación.`}
                >
                  Sacar
                </BotonAccion>
              </span>
            </li>
          ))}
          {lista.length === 0 && <li className="text-sm text-tinta/60">Nadie se anotó todavía.</li>}
        </ol>
      </section>

      {candidatos.length > 0 && (
        <details className={CAJA}>
          <summary className="min-h-10 cursor-pointer font-medium text-tinta">
            Anotar a mano ({candidatos.length} perfiles publicados)
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {candidatos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-tinta">
                  {p.nombre} <span className="text-tinta/60">· {ROLES[p.rol].label}</span>
                </span>
                <BotonAccion accion={participante.bind(null, p.id, true)}>Anotar</BotonAccion>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
