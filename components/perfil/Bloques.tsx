import Image from "next/image";
import Link from "next/link";
import { Etiqueta } from "@/components/Etiquetas";
import { canalesDe } from "@/lib/contacto";
import { aporte, labelDedicacion, tipoPortafolio } from "@/lib/etiquetas";
import type { Racha } from "@/lib/racha";
import type { EmpresaResumen, ItemPortafolio, Perfil } from "@/types/pecera";

/**
 * Bloques de la tarjeta pública (sin estado: se renderizan en el ISR). Cada uno se
 * esconde solo si no tiene nada que mostrar, así un perfil nuevo no se ve vacío.
 */

export const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50";

/** Racha de progreso: días seguidos subiendo un video, con los últimos 14 días. */
export function BloqueRacha({ racha }: { racha: Racha }) {
  if (racha.total === 0) return null;
  const viva = racha.actual > 0;
  return (
    <section aria-label="Racha de progreso" className="rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`text-3xl ${viva ? "llama" : "grayscale"}`}>
            🔥
          </span>
          <div>
            <p className="font-display text-2xl font-semibold leading-none text-tinta tabular-nums">
              {racha.actual} {racha.actual === 1 ? "día" : "días"}
            </p>
            <p className="mt-1 text-sm text-tinta/65">
              {viva
                ? racha.hoy
                  ? "Subió un video hoy. Racha a salvo."
                  : "Racha activa: si sube hoy, suma un día."
                : "Racha de progreso en pausa."}
            </p>
          </div>
        </div>
        <p className="text-right text-xs text-tinta/60">
          Mejor racha
          <span className="block font-display text-lg font-semibold text-tinta tabular-nums">{racha.mejor}</span>
        </p>
      </div>
      <ol aria-label="Últimos 14 días" className="mt-3 grid grid-cols-14 gap-1">
        {racha.ultimos.map((subio, i) => (
          <li
            key={i}
            title={subio ? "Subió un video" : "Sin video"}
            className={`h-2.5 rounded-full ${subio ? "bg-arcilla" : "bg-tinta/12"} ${i === 13 ? "ring-2 ring-arcilla/30" : ""}`}
          />
        ))}
      </ol>
    </section>
  );
}

/** "Busca cofundador/a": qué aporta, qué busca y un botón para proponerse. */
export function BloqueCofundador({ perfil }: { perfil: Perfil }) {
  if (!perfil.busca_cofundador) return null;
  const propio = aporte(perfil.cofundador_aporta);
  const whatsapp = canalesDe(perfil, "¡Hola! Vi en Pecera que buscás cofundador/a y me gustaría charlar.").find(
    (c) => c.clave === "whatsapp" || c.clave === "email"
  );
  return (
    <section
      aria-label="Busca cofundador/a"
      className="relative overflow-hidden rounded-3xl bg-tinta px-5 py-5 text-marfil"
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-pecera/30 blur-2xl" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-marfil/70">Cofounder match</p>
      <p className="relative mt-1 font-display text-2xl font-semibold leading-tight">Busca cofundador/a</p>
      <dl className="relative mt-3 flex flex-col gap-2 text-sm">
        {propio && (
          <div className="flex flex-wrap items-center gap-2">
            <dt className="text-marfil/70">Aporta</dt>
            <dd>
              <Etiqueta clase={propio.clase}>{propio.label}</Etiqueta>
            </dd>
          </div>
        )}
        {(perfil.cofundador_busca ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <dt className="text-marfil/70">Busca</dt>
            {(perfil.cofundador_busca ?? []).map((b) => {
              const a = aporte(b);
              return a ? (
                <dd key={b}>
                  <Etiqueta clase={a.clase}>{a.label}</Etiqueta>
                </dd>
              ) : null;
            })}
          </div>
        )}
        {labelDedicacion(perfil.cofundador_dedicacion) && (
          <div className="flex items-center gap-2">
            <dt className="text-marfil/70">Dedicación</dt>
            <dd className="font-medium">{labelDedicacion(perfil.cofundador_dedicacion)}</dd>
          </div>
        )}
      </dl>
      {perfil.cofundador_nota && <p className="relative mt-3 leading-relaxed text-marfil/90">“{perfil.cofundador_nota}”</p>}
      {whatsapp && (
        <a
          href={whatsapp.href}
          {...(whatsapp.externo && { target: "_blank", rel: "noopener noreferrer" })}
          className="boton relative mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-marfil px-5 font-semibold text-tinta"
        >
          Proponerme como socio/a
        </a>
      )}
    </section>
  );
}

/** Portafolio: inversiones, casos, servicios, logros, prensa y documentos. */
export function BloquePortafolio({ items, rol }: { items: ItemPortafolio[]; rol: Perfil["rol"] }) {
  if (items.length === 0) return null;
  const titulo = rol === "inversor" ? "Portafolio" : rol === "aliado" ? "Casos y servicios" : "Logros y documentos";
  return (
    <section aria-label={titulo}>
      <h2 className={SUBTITULO}>{titulo}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => {
          const t = tipoPortafolio(item.tipo);
          const contenido = (
            <>
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium leading-snug text-tinta">{item.titulo}</span>
                <Etiqueta clase={t.clase}>{t.label}</Etiqueta>
              </span>
              {item.descripcion && <span className="mt-1 block text-sm leading-snug text-tinta/70">{item.descripcion}</span>}
              {item.url && (
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-tinta underline decoration-tinta/30 underline-offset-4">
                  Ver <span aria-hidden>↗</span>
                </span>
              )}
            </>
          );
          const clase =
            "aparecer block h-full rounded-2xl border border-tinta/10 bg-tinta/[0.02] px-4 py-3 transition-colors duration-200 ease-pecera";
          return (
            <li key={item.id} style={{ "--i": i } as React.CSSProperties}>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className={`${clase} hover:border-arcilla`}>
                  {contenido}
                </a>
              ) : (
                <div className={clase}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** La empresa del perfil, con su logo. */
export function TarjetaEmpresaPerfil({ empresa, cargo }: { empresa: EmpresaResumen; cargo: string | null }) {
  return (
    <Link
      href={`/e/${empresa.slug}`}
      className="boton flex min-h-16 items-center gap-3 rounded-2xl border border-tinta/12 bg-marfil px-3 py-2.5 hover:border-arcilla"
    >
      <LogoEmpresa nombre={empresa.nombre} logo={empresa.logo_url ?? null} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-tinta/60">{cargo ?? "Equipo"} en</span>
        <span className="block truncate font-display text-lg font-semibold leading-tight text-tinta">{empresa.nombre}</span>
      </span>
      <span aria-hidden className="text-tinta/50">
        &rarr;
      </span>
    </Link>
  );
}

/** Logo cuadrado redondeado; sin logo, la inicial sobre Tinta. */
export function LogoEmpresa({ nombre, logo, size }: { nombre: string; logo: string | null; size: number }) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-xl border border-tinta/10 bg-marfil object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-tinta font-display font-semibold text-marfil"
    >
      {nombre.trim()[0]?.toUpperCase() ?? "·"}
    </span>
  );
}
