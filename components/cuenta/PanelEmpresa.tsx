"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { editarEmpresa, renovarCodigo, salirEmpresa, subirLogo } from "@/app/cuenta/empresa";
import Avatar from "@/components/Avatar";
import BotonCopiar from "@/components/BotonCopiar";
import { Etiqueta } from "@/components/Etiquetas";
import TarjetaTransparencia from "@/components/cuenta/TarjetaTransparencia";
import { CamposEmpresa, type MiEmpresa, formatoCodigo } from "@/components/cuenta/TarjetaEmpresa";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { urlSitio } from "@/lib/cuenta";
import type { Resultado } from "@/lib/errores-base";
import { cargo } from "@/lib/etiquetas";
import { prepararImagen } from "@/lib/imagen";
import type { DatoEmpresa, Rol } from "@/types/pecera";

export type Miembro = {
  slug: string;
  nombre: string;
  cargo: string | null;
  avatar_url: string | null;
  rol: Rol;
  visible: boolean;
  es_dueno: boolean;
  soy_yo: boolean;
};

type Seccion = "perfil" | "equipo" | "transparencia";

const INICIAL: Resultado = { ok: false };

/**
 * Cuenta de la empresa: logo y datos, equipo con su código, y métricas y
 * documentos (con cada concepto explicado). Todo por funciones de la base.
 */
export default function PanelEmpresa({
  empresa,
  miembros,
  datos,
}: {
  empresa: MiEmpresa;
  miembros: Miembro[];
  datos: DatoEmpresa[];
}) {
  const [seccion, setSeccion] = useState<Seccion>("perfil");

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Secciones de la empresa" className="grid grid-cols-3 gap-1 rounded-full bg-tinta/[0.06] p-1">
        {(
          [
            ["perfil", "Perfil"],
            ["equipo", `Equipo · ${empresa.miembros}`],
            ["transparencia", "Métricas y docs"],
          ] as const
        ).map(([valor, label]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={seccion === valor}
            onClick={() => setSeccion(valor)}
            className={`boton min-h-11 rounded-full px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              seccion === valor ? "bg-marfil text-tinta shadow-[0_2px_10px_rgb(28_27_22/0.12)]" : "text-tinta/65 hover:text-tinta"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div key={seccion} className="paso-entra flex flex-col gap-6">
        {seccion === "perfil" && (
          <>
            <EditorLogo empresa={empresa} />
            <DatosEmpresa empresa={empresa} />
          </>
        )}
        {seccion === "equipo" && <Equipo empresa={empresa} miembros={miembros} />}
        {seccion === "transparencia" && <TarjetaTransparencia datos={datos} slugEmpresa={empresa.slug} />}
      </div>
    </div>
  );
}

function EditorLogo({ empresa }: { empresa: MiEmpresa }) {
  const [logo, setLogo] = useState(empresa.logo_url ?? null);
  const [estado, setEstado] = useState<{ subiendo: boolean; r?: Resultado }>({ subiendo: false });

  async function enviar(datos: FormData) {
    setEstado({ subiendo: true });
    try {
      const r = await subirLogo(datos);
      if (r.ok) setLogo(r.url ?? null);
      setEstado({ subiendo: false, r });
    } catch {
      setEstado({ subiendo: false, r: { ok: false, mensaje: "No pudimos subir el logo. Revisá tu conexión." } });
    }
  }

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    let blob: Blob;
    try {
      // "contener": un logo ancho entra entero, con margen, sobre Marfil.
      blob = await prepararImagen(archivo, "contener");
    } catch {
      setEstado({ subiendo: false, r: { ok: false, mensaje: "No pudimos leer esa imagen. Probá con un PNG o JPG." } });
      return;
    }
    setLogo(URL.createObjectURL(blob));
    const datos = new FormData();
    datos.set("logo", blob, "logo.jpg");
    await enviar(datos);
  }

  return (
    <Tarjeta titulo="Logo" bajada="Se ve en la página de la empresa, en el perfil de cada miembro y en Explorar.">
      <div className="flex items-center gap-4">
        <span className="relative">
          <LogoEmpresa nombre={empresa.nombre} logo={logo} size={88} />
          {estado.subiendo && (
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-tinta/55">
              <span className="girando size-6 rounded-full border-2 border-marfil border-t-transparent" />
            </span>
          )}
        </span>
        <div className="flex flex-col gap-2">
          <label className="boton inline-flex min-h-11 cursor-pointer items-center self-start rounded-full bg-tinta px-5 text-sm font-medium text-marfil focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-arcilla">
            {logo ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/*" onChange={elegir} className="sr-only" />
          </label>
          {logo && !estado.subiendo && (
            <button
              type="button"
              onClick={() => {
                const datos = new FormData();
                datos.set("quitar", "1");
                enviar(datos);
              }}
              className="self-start text-sm text-tinta/60 underline underline-offset-4 hover:text-tinta"
            >
              Sacar el logo
            </button>
          )}
          <p className="text-xs text-tinta/60">PNG o JPG. Si es ancho, entra entero.</p>
        </div>
      </div>
      {estado.r?.mensaje && <Aviso ok={estado.r.ok}>{estado.r.mensaje}</Aviso>}
    </Tarjeta>
  );
}

function DatosEmpresa({ empresa }: { empresa: MiEmpresa }) {
  const [estado, accion, guardando] = useActionState(editarEmpresa, INICIAL);

  if (!empresa.es_dueno) {
    return (
      <Tarjeta titulo="Datos de la empresa">
        <p className="text-sm text-tinta/70">Solo quien creó la empresa puede editar nombre, descripción, etapa y redes.</p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="Datos de la empresa" bajada="Lo que se ve en la página pública.">
      <form action={accion} className="flex flex-col gap-5">
        <input type="hidden" name="slug_actual" value={empresa.slug} />
        <CamposEmpresa inicial={empresa} conSlug={false} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          <span>
            Web <span className="font-normal text-tinta/55">(opcional)</span>
          </span>
          <input name="web" defaultValue={empresa.web ?? ""} placeholder="tuempresa.com.ar" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          <span>
            LinkedIn de la empresa <span className="font-normal text-tinta/55">(opcional)</span>
          </span>
          <input name="linkedin" defaultValue={empresa.linkedin ?? ""} placeholder="linkedin.com/company/…" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
          <span>
            Instagram <span className="font-normal text-tinta/55">(opcional)</span>
          </span>
          <input name="instagram" defaultValue={empresa.instagram ?? ""} placeholder="@tuempresa" className={INPUT} />
        </label>
        {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
        <button type="submit" disabled={guardando} className={`${BOTON_PRIMARIO} boton`}>
          {guardando ? "Guardando…" : "Guardar la empresa"}
        </button>
      </form>
    </Tarjeta>
  );
}

function Equipo({ empresa, miembros }: { empresa: MiEmpresa; miembros: Miembro[] }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(empresa.codigo);
  const [mensaje, setMensaje] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();

  const invitacion = codigo
    ? `Sumate a ${empresa.nombre} en Pecera: entrá a ${urlSitio("/cuenta")}, en "Tu empresa" tocá "Tengo un código" y poné ${formatoCodigo(codigo)}`
    : "";

  return (
    <>
      {codigo && (
        <section className="flex flex-col gap-3 rounded-3xl bg-tinta px-5 py-5 text-marfil">
          <p className="text-sm text-marfil/80">Código para invitar a tu equipo</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.2em]">{formatoCodigo(codigo)}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar
              texto={formatoCodigo(codigo)}
              etiqueta="Copiar código"
              className="boton inline-flex min-h-11 items-center rounded-full bg-marfil px-4 text-sm font-medium text-tinta"
            />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(invitacion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="boton inline-flex min-h-11 items-center rounded-full border border-marfil/40 px-4 text-sm font-medium text-marfil hover:border-marfil"
            >
              Mandar por WhatsApp
            </a>
          </div>
          {empresa.es_dueno && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  if (!window.confirm("¿Generar un código nuevo? El actual deja de servir.")) return;
                  const r = await renovarCodigo();
                  if (r.ok && r.codigo) setCodigo(r.codigo);
                  setMensaje(r);
                })
              }
              className="self-start text-sm text-marfil/75 underline underline-offset-4 hover:text-marfil"
            >
              Generar un código nuevo
            </button>
          )}
        </section>
      )}
      {mensaje?.mensaje && <Aviso ok={mensaje.ok}>{mensaje.mensaje}</Aviso>}

      <Tarjeta titulo="El equipo" bajada="Cada uno elige su cargo desde su perfil.">
        <ul className="flex flex-col gap-2">
          {miembros.map((m) => {
            const c = cargo(m.cargo);
            return (
              <li key={m.slug} className="flex items-center gap-3 rounded-2xl border border-tinta/10 bg-marfil px-3 py-2.5">
                <Avatar perfil={m} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-tinta">
                    {m.nombre}
                    {m.soy_yo && <span className="ml-1.5 text-xs font-normal text-tinta/55">(vos)</span>}
                  </span>
                  <span className="block text-xs text-tinta/60">
                    {m.es_dueno ? "Administra la empresa" : "Miembro"}
                    {!m.visible && " · perfil sin publicar"}
                  </span>
                </span>
                {c && <Etiqueta clase={c.clase}>{c.label}</Etiqueta>}
              </li>
            );
          })}
        </ul>
        {miembros.length === 0 && <p className="text-sm text-tinta/65">No pudimos cargar el equipo. Probá recargar.</p>}
      </Tarjeta>

      <div className="flex flex-wrap items-center gap-3">
        {empresa.visible ? (
          <Link href={`/e/${empresa.slug}`} className={`${BOTON_SECUNDARIO} boton`}>
            Ver la página pública
          </Link>
        ) : (
          <p className="text-sm text-tinta/65">La página pública se ve cuando al menos un perfil del equipo está publicado.</p>
        )}
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            const texto = empresa.es_dueno
              ? "¿Salir de la empresa? Si queda alguien del equipo, pasa a ser quien la administra."
              : "¿Salir de la empresa?";
            if (!window.confirm(texto)) return;
            iniciar(async () => {
              const r = await salirEmpresa();
              if (r.ok) router.push("/cuenta");
              else setMensaje(r);
            });
          }}
          className={`${BOTON_SECUNDARIO} boton`}
        >
          Salir de la empresa
        </button>
      </div>
    </>
  );
}
