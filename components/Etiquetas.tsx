import {
  ETAPAS,
  cargo,
  especialidad,
  labelEtapa,
  labelIndustria,
  labelRonda,
  labelTicket,
  pasoEtapa,
} from "@/lib/etiquetas";
import type { Perfil } from "@/types/pecera";

/**
 * Etiquetas de perfil y empresa (etapa, ronda, industrias, cargo, especialidades,
 * ticket). Sin estado: se usan en páginas estáticas, en el feed y en el evento.
 */

const PILDORA = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
const NEUTRA = "border border-tinta/20 text-tinta/80";

export function Etiqueta({ children, clase = NEUTRA }: { children: React.ReactNode; clase?: string }) {
  return <span className={`${PILDORA} ${clase}`}>{children}</span>;
}

/** Barrita de 5 tramos con la etapa: se lee de un vistazo sin saber los nombres. */
export function BarraEtapa({ etapa, claro = false }: { etapa?: string | null; claro?: boolean }) {
  const paso = pasoEtapa(etapa);
  const label = labelEtapa(etapa);
  if (!paso || !label) return null;
  return (
    <span className="inline-flex items-center gap-2" title={`Etapa: ${label}`}>
      <span aria-hidden className="flex gap-0.5">
        {ETAPAS.map((e, i) => (
          <span
            key={e.valor}
            className={`h-1.5 w-3 rounded-full ${
              i < paso ? "bg-arcilla" : claro ? "bg-marfil/35" : "bg-tinta/15"
            }`}
          />
        ))}
      </span>
      <span className={`text-xs font-medium ${claro ? "text-marfil" : "text-tinta"}`}>
        <span className="sr-only">Etapa: </span>
        {label}
      </span>
    </span>
  );
}

type ConEtiquetas = Pick<
  Perfil,
  "rol" | "etapa" | "ronda" | "industrias" | "cargo" | "especialidades" | "ticket" | "rondas_interes"
>;

/**
 * Todas las etiquetas del perfil según su rol. `max` recorta las industrias (en el
 * reel entran pocas). Si el perfil no tiene ninguna, no dibuja nada.
 */
export function EtiquetasPerfil({
  perfil,
  maxIndustrias,
  conCargo = true,
}: {
  perfil: ConEtiquetas;
  maxIndustrias?: number;
  conCargo?: boolean;
}) {
  const industrias = perfil.industrias ?? [];
  const visibles = maxIndustrias ? industrias.slice(0, maxIndustrias) : industrias;
  const resto = industrias.length - visibles.length;
  const c = conCargo ? cargo(perfil.cargo) : null;

  const piezas: React.ReactNode[] = [];
  if (c) piezas.push(<Etiqueta key="cargo" clase={c.clase}>{c.label}</Etiqueta>);

  if (perfil.rol === "emprendedor") {
    const ronda = perfil.ronda && perfil.ronda !== "no_busca" ? labelRonda(perfil.ronda) : null;
    if (ronda) {
      piezas.push(
        <Etiqueta key="ronda" clase="bg-t-arcilla-suave text-t-arcilla">
          Busca {ronda}
        </Etiqueta>
      );
    }
  }

  if (perfil.rol === "inversor") {
    const ticket = labelTicket(perfil.ticket);
    if (ticket) {
      piezas.push(
        <Etiqueta key="ticket" clase="bg-t-azul-suave text-t-azul">
          Ticket {ticket}
        </Etiqueta>
      );
    }
    for (const r of perfil.rondas_interes ?? []) {
      const label = labelRonda(r);
      if (label) piezas.push(<Etiqueta key={`ri-${r}`} clase="bg-t-azul-suave text-t-azul">{label}</Etiqueta>);
    }
  }

  if (perfil.rol === "aliado") {
    for (const e of perfil.especialidades ?? []) {
      const esp = especialidad(e);
      piezas.push(
        <Etiqueta key={`es-${e}`} clase={esp.clase}>
          {esp.label}
        </Etiqueta>
      );
    }
  }

  for (const i of visibles) piezas.push(<Etiqueta key={`in-${i}`}>{labelIndustria(i)}</Etiqueta>);
  if (resto > 0) piezas.push(<Etiqueta key="resto">+{resto}</Etiqueta>);

  const etapa = perfil.rol === "emprendedor" ? perfil.etapa : null;
  if (!piezas.length && !etapa) return null;

  return (
    <div className="flex flex-col gap-2">
      {etapa && <BarraEtapa etapa={etapa} />}
      {piezas.length > 0 && <div className="flex flex-wrap gap-1.5">{piezas}</div>}
    </div>
  );
}

/**
 * Versión del reel: una línea corta sobre el video (empresa, etapa y hasta dos
 * etiquetas). Chips de vidrio oscuro con texto marfil: se leen sobre el gradiente.
 */
export function EtiquetasReel({
  perfil,
}: {
  perfil: ConEtiquetas & Pick<Perfil, "empresa">;
}) {
  const chips: Array<{ clave: string; texto: string }> = [];
  if (perfil.rol === "inversor") {
    const ticket = labelTicket(perfil.ticket);
    if (ticket) chips.push({ clave: "ticket", texto: `Ticket ${ticket}` });
  }
  if (perfil.rol === "aliado") {
    for (const e of (perfil.especialidades ?? []).slice(0, 2)) {
      chips.push({ clave: `es-${e}`, texto: especialidad(e).label });
    }
  }
  for (const i of (perfil.industrias ?? []).slice(0, 2 - Math.min(chips.length, 1))) {
    chips.push({ clave: `in-${i}`, texto: labelIndustria(i) });
  }
  const c = cargo(perfil.cargo);
  const etapa = perfil.rol === "emprendedor" ? perfil.etapa : null;
  if (!perfil.empresa && !etapa && !chips.length) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      {perfil.empresa && (
        <span className="texto-sombra font-medium text-marfil">
          {c ? `${c.label} en ` : "En "}
          <span className="font-semibold">{perfil.empresa.nombre}</span>
        </span>
      )}
      {etapa && <BarraEtapa etapa={etapa} claro />}
      {chips.map((chip) => (
        <span
          key={chip.clave}
          className="rounded-full bg-tinta/55 px-2 py-0.5 font-medium text-marfil ring-1 ring-marfil/20"
        >
          {chip.texto}
        </span>
      ))}
    </div>
  );
}
