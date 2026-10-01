import Link from "next/link";
import LogoEntidad from "@/components/LogoEntidad";
import type { ReactNode } from "react";
import { conProtocolo } from "@/lib/contacto";
import { labelIndustria } from "@/lib/etiquetas";
import { type EntradaPortfolio, defTipo, esCaso, labelEstado, labelRondaPortfolio } from "@/lib/portfolio";

/** Color por tipo de relación: la inversión se distingue de un vistazo del resto. */
const TONO_TIPO: Record<string, string> = {
  inversion: "bg-t-azul-suave text-t-azul",
  cliente: "bg-t-verde-suave text-t-verde",
  alianza: "bg-t-verde-suave text-t-verde",
};

/**
 * Una entrada del portfolio: con quién, qué relación (inversión ≠ asesoría ≠
 * cliente), en qué estado y qué tan confirmada está. Compacta para escanear; el
 * caso de éxito se abre a un toque. `acciones` suma editar/borrar en /cuenta.
 */
export default function TarjetaEntrada({
  e,
  acciones,
  mostrarVisibilidad = false,
  logoUrl,
}: {
  e: EntradaPortfolio;
  logoUrl?: string | null;
  acciones?: ReactNode;
  mostrarVisibilidad?: boolean;
}) {
  const tipo = defTipo(e.tipo);
  const detalles = [
    e.industria && labelIndustria(e.industria),
    e.tipo === "inversion" && labelRondaPortfolio(e.ronda),
    e.tipo === "inversion" && e.lider === true && "Lideró la ronda",
    e.tipo === "inversion" && e.lider === false && "Co-inversor",
    e.anio && String(e.anio),
    e.ubicacion,
  ].filter(Boolean) as string[];

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-tinta/10 bg-marfil px-4 py-3.5">
      <div className="flex items-start gap-3">
        <LogoEntidad nombre={e.nombre} logoUrl={logoUrl} tamano="md" />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold leading-tight text-tinta">
            {e.empresa ? (
              <Link href={`/e/${e.empresa.slug}`} className="underline-offset-4 hover:underline">
                {e.nombre}
              </Link>
            ) : e.web ? (
              <a href={conProtocolo(e.web)} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-4 hover:underline">
                {e.nombre}
              </a>
            ) : (
              e.nombre
            )}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${TONO_TIPO[e.tipo] ?? "bg-tinta/[0.07] text-tinta"}`}>
              {tipo?.label}
            </span>
            {(e.estado !== "actual" || e.tipo === "inversion") && (
              <span className="rounded-full border border-tinta/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-tinta">
                {labelEstado(e.estado)}
              </span>
            )}
            {mostrarVisibilidad && e.visibilidad !== "publico" && (
              <span className="rounded-full bg-tinta/[0.07] px-2 py-0.5 text-[0.6875rem] font-semibold text-tinta/80">
                {e.visibilidad === "privado" ? "Privada" : "Solo cuentas"}
              </span>
            )}
          </div>
          {detalles.length > 0 && <p className="mt-1 text-xs text-tinta/65">{detalles.join(" · ")}</p>}
        </div>
      </div>

      {e.rol && (
        <p className="text-sm text-tinta">
          <span className="text-tinta/60">{e.tipo === "cliente" ? "Servicios: " : "Rol: "}</span>
          {e.rol}
        </p>
      )}
      {e.descripcion && <p className="line-clamp-3 text-sm leading-snug text-tinta/85">{e.descripcion}</p>}

      {esCaso(e) && (
        <details className="group rounded-xl bg-tinta/[0.04]">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="transition-transform duration-300 ease-pecera group-open:rotate-90">›</span>
            Caso de éxito
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3 text-sm leading-relaxed text-tinta">
            {e.desafio && (
              <p>
                <span className="block text-xs font-semibold uppercase tracking-wide text-tinta/55">Desafío</span>
                {e.desafio}
              </p>
            )}
            {e.solucion && (
              <p>
                <span className="block text-xs font-semibold uppercase tracking-wide text-tinta/55">Qué hicieron</span>
                {e.solucion}
              </p>
            )}
            {e.resultados.length > 0 && (
              <ul className="flex flex-col gap-1">
                {e.resultados.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-aliado" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            {e.enlace && (
              <a href={e.enlace} target="_blank" rel="noopener noreferrer nofollow" className="self-start font-medium underline underline-offset-4">
                Ver más ↗
              </a>
            )}
          </div>
        </details>
      )}

      <Confirmacion e={e} />
      {acciones}
    </article>
  );
}

/** Qué tan respaldada está la relación. Nunca se muestra como verificada sin serlo. */
function Confirmacion({ e }: { e: EntradaPortfolio }) {
  if (e.confirmacion === "confirmada") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-t-verde">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3.5">
          <circle cx="6" cy="6" r="6" fill="currentColor" />
          <path d="M3.3 6.2 5.2 8l3.5-3.9" fill="none" stroke="#f5f4ec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Confirmado por la empresa en Pecera
      </p>
    );
  }
  return (
    <p className="text-xs text-tinta/55">
      {e.empresa_id ? "Vinculado a una empresa de Pecera · " : ""}
      {e.confirmacion === "pendiente" ? "esperando confirmación" : "declarado por el perfil"}
    </p>
  );
}
