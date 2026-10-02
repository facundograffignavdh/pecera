"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import DescripcionConTags from "@/components/DescripcionConTags";
import FormPerfil, { type PerfilPropio } from "@/components/FormPerfil";
import { BloqueBuscaOfrece, BloqueCofundador, BloqueTrayectoria, SUBTITULO } from "@/components/perfil/Bloques";
import { IconoUbicacion } from "@/components/perfil/IconosMarca";
import { cargo as cargoDe, industria } from "@/lib/etiquetas";
import { ROLES, TIPOS } from "@/lib/rol";
import type { EmpresaResumen, Rol } from "@/types/pecera";

/**
 * "Mi perfil": se VE como un perfil terminado y solo se edita al tocar "Editar perfil".
 * Antes el formulario estaba siempre abierto y la cuenta parecía una pantalla de ajustes.
 *  - Sin perfil todavía: el alta por pasos (FormPerfil), como siempre.
 *  - Con perfil: la vista (foto, nombre, rol, bio, canales, qué busca y qué ofrece); "Editar
 *    perfil" abre el formulario por pasos, que guarda solo. "Listo" guarda lo pendiente (aunque
 *    no haya pasado la pausa del autoguardado) y vuelve a la vista con los datos nuevos.
 */
const ESPERA_GUARDADO_MS = 9000;

type Resultado = { ok: boolean; mensaje?: string };

/** Pide al formulario que guarde ya y espera su respuesta (o falla con un aviso si tarda). */
function guardarPendiente(): Promise<Resultado> {
  return new Promise((resolver) => {
    const fin = window.setTimeout(() => {
      window.removeEventListener("pecera:perfil-guardado", alResponder);
      resolver({ ok: false, mensaje: "El guardado está tardando. Revisá tu conexión y probá de nuevo." });
    }, ESPERA_GUARDADO_MS);
    function alResponder(e: Event) {
      window.clearTimeout(fin);
      window.removeEventListener("pecera:perfil-guardado", alResponder);
      resolver((e as CustomEvent<Resultado>).detail);
    }
    window.addEventListener("pecera:perfil-guardado", alResponder);
    window.dispatchEvent(new Event("pecera:guardar-perfil"));
  });
}

export default function PerfilCuenta({
  perfil,
  rolInicial,
  empresa,
  editarInicial = false,
}: {
  perfil: PerfilPropio | null;
  rolInicial?: Rol;
  empresa?: EmpresaResumen | null;
  /** `/cuenta?editar=1`: entra directo al formulario (por ejemplo, desde "Completar perfil"). */
  editarInicial?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(editarInicial);
  const [saliendo, setSaliendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const arriba = useRef<HTMLDivElement>(null);

  // Al abrir o cerrar la edición, la persona vuelve al principio del bloque.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    arriba.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [editando]);

  // Sin perfil: alta por pasos.
  if (!perfil) return <FormPerfil key="nuevo" perfil={null} rolInicial={rolInicial} empresa={empresa} />;

  async function listo() {
    setSaliendo(true);
    setAviso(null);
    const r = await guardarPendiente();
    setSaliendo(false);
    if (!r.ok) {
      setAviso(r.mensaje ?? "Todavía hay algo para revisar.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  function salirSinGuardar() {
    setAviso(null);
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <div ref={arriba} className="flex scroll-mt-24 flex-col gap-4">
        <div
          role="status"
          className="sticky top-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tinta/10 bg-marfil/95 px-4 py-3 shadow-[0_8px_24px_rgb(28_27_22/0.08)] backdrop-blur"
        >
          <p className="text-sm text-tinta">
            <strong className="font-semibold">Editando tu perfil.</strong> Se guarda solo.
          </p>
          <button
            type="button"
            onClick={listo}
            disabled={saliendo}
            className="boton inline-flex min-h-11 items-center justify-center rounded-full bg-naranja px-5 text-sm font-semibold text-tinta hover:bg-pecera disabled:opacity-60"
          >
            {saliendo ? "Guardando…" : "Listo"}
          </button>
        </div>
        {aviso && (
          <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-t-arcilla-suave px-4 py-3 text-sm text-t-arcilla">
            <p>{aviso}</p>
            <button type="button" onClick={salirSinGuardar} className="self-start font-medium underline underline-offset-4">
              Salir sin guardar lo último
            </button>
          </div>
        )}
        <FormPerfil key={perfil.id} perfil={perfil} rolInicial={rolInicial} empresa={empresa} />
      </div>
    );
  }

  const rol = ROLES[perfil.rol];
  const c = cargoDe(perfil.cargo);
  const visible = perfil.publicado && !perfil.oculto;
  const contactos = [
    perfil.whatsapp && { clave: "WhatsApp", valor: perfil.whatsapp },
    perfil.email && { clave: "Email", valor: perfil.email },
    perfil.linkedin && { clave: "LinkedIn", valor: perfil.linkedin.replace(/^https?:\/\/(www\.)?/, "") },
    perfil.instagram && { clave: "Instagram", valor: perfil.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@") },
    perfil.web && { clave: "Web", valor: perfil.web.replace(/^https?:\/\/(www\.)?/, "") },
  ].filter((x): x is { clave: string; valor: string } => !!x);

  return (
    <div ref={arriba} className="flex scroll-mt-24 flex-col gap-6">
      <article className="overflow-hidden rounded-[2rem] border border-tinta/10 bg-marfil shadow-[0_18px_50px_rgb(28_27_22/0.1)]">
        <div className={`relative h-20 ${rol.bg}`}>
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(255_255_255/0.35),transparent_50%)]" />
        </div>
        <div className="relative -mt-10 flex flex-col gap-4 px-5 pb-6">
          <div className="flex items-end justify-between gap-3">
            <span className="rounded-full ring-4 ring-marfil">
              <Avatar perfil={perfil} size={84} />
            </span>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="boton inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-tinta px-5 text-sm font-semibold text-marfil"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Zm10-13 3 3" />
              </svg>
              Editar perfil
            </button>
          </div>

          <header className="flex flex-col gap-1.5">
            <h2 className="font-display text-3xl font-semibold leading-[1.05] text-tinta">{perfil.nombre}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-marfil ${rol.bg}`}>{rol.label}</span>
              <span className="text-tinta/70">{TIPOS[perfil.tipo]}</span>
              {c && <span className="text-tinta/70">· {c.label}</span>}
            </p>
            {perfil.ubicacion && (
              <p className="flex items-center gap-1.5 text-sm text-tinta/70">
                <IconoUbicacion />
                {perfil.ubicacion}
              </p>
            )}
          </header>

          {(perfil.industrias ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {(perfil.industrias ?? []).map((i) => (
                <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${industria(i).clase}`}>
                  {industria(i).label}
                </li>
              ))}
            </ul>
          )}

          {perfil.descripcion ? (
            <DescripcionConTags texto={perfil.descripcion} className="leading-relaxed text-tinta/90" />
          ) : (
            <p className="rounded-2xl border border-dashed border-tinta/25 px-4 py-3 text-sm text-tinta/70">
              Todavía no contaste de qué se trata lo tuyo.{" "}
              <button type="button" onClick={() => setEditando(true)} className="font-medium underline underline-offset-4">
                Escribilo
              </button>
              .
            </p>
          )}

          <p className="text-xs text-tinta/65">
            {visible ? (
              <>
                Tu perfil está publicado.{" "}
                <Link href={`/p/${perfil.slug}`} className="font-medium text-tinta underline underline-offset-4">
                  Ver cómo lo ve el resto
                </Link>
              </>
            ) : perfil.oculto ? (
              "Tu perfil está oculto: nadie lo ve hasta que lo vuelvas a mostrar."
            ) : (
              "Tu perfil se va a publicar pronto."
            )}
          </p>
        </div>
      </article>

      <section aria-label="Tus datos de contacto" className="flex flex-col gap-2">
        <h3 className={SUBTITULO}>Contacto y redes</h3>
        {contactos.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {contactos.map((x) => (
              <li key={x.clave} className="flex items-baseline justify-between gap-3 rounded-2xl border border-tinta/10 px-4 py-3 text-sm">
                <span className="font-semibold text-tinta">{x.clave}</span>
                <span className="min-w-0 truncate text-tinta/75">{x.valor}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-tinta/25 px-4 py-3 text-sm text-tinta/70">
            Sumá un WhatsApp o un email para que puedan escribirte (todo es opcional).{" "}
            <button type="button" onClick={() => setEditando(true)} className="font-medium underline underline-offset-4">
              Agregar
            </button>
          </p>
        )}
      </section>

      <BloqueBuscaOfrece perfil={perfil} />
      <BloqueTrayectoria perfil={perfil} />
      <BloqueCofundador perfil={perfil} />
    </div>
  );
}
