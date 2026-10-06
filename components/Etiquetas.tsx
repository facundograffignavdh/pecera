import {
  ETAPAS,
  cargo,
  especialidad,
  industria,
  labelEtapa,
  labelIndustria,
  labelRonda,
  labelTicket,
  pasoEtapa,
} from "@/lib/etiquetas";
import FilaRecortada from "@/components/FilaRecortada";
import type { EmpresaDePerfil, Perfil } from "@/types/pecera";

/**
 * Etiquetas de perfil y empresa (etapa, ronda, industrias, cargo, especialidades,
 * ticket). Sin estado: se usan en páginas estáticas, en el feed y en el evento.
 */

const PILDORA = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
const NEUTRA = "border border-tinta/20 text-tinta/80";

/**
 * Las empresas de la persona, la principal primero. Si la consulta no trajo la lista
 * (sin multi_empresa), la principal sola con el cargo del perfil.
 */
export function empresasDe(perfil: Pick<Perfil, "empresa" | "empresas" | "empresa_id" | "cargo">): EmpresaDePerfil[] {
  if (perfil.empresas) return perfil.empresas;
  return perfil.empresa
    ? [{ ...perfil.empresa, id: perfil.empresa_id ?? null, cargo: perfil.cargo ?? null, principal: true }]
    : [];
}

/** "Acme", "Acme y Beta", "Acme, Beta y Gamma". */
export function listaNombres(nombres: string[]): string {
  return nombres.length < 2 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** "CEO en Acme" o "CEO en Acme y 2 más", para una línea corta (seguidos, vCard). */
export function detalleEmpresas(perfil: Pick<Perfil, "empresa" | "empresas" | "empresa_id" | "cargo">): string | null {
  const [primera, ...resto] = empresasDe(perfil);
  if (!primera) return null;
  const c = cargo(primera.cargo);
  return `${c?.label ?? "Equipo"} en ${primera.nombre}${resto.length ? ` y ${resto.length} más` : ""}`;
}

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
        <Etiqueta key="ticket" clase="bg-t-verde-suave text-t-verde">
          Ticket {ticket}
        </Etiqueta>
      );
    }
    for (const r of perfil.rondas_interes ?? []) {
      const label = labelRonda(r);
      if (label) piezas.push(<Etiqueta key={`ri-${r}`} clase="bg-t-verde-suave text-t-verde">{label}</Etiqueta>);
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

  for (const i of visibles) piezas.push(<Etiqueta key={`in-${i}`} clase={industria(i).clase}>{industria(i).label}</Etiqueta>);
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
 * Versión del reel: cargo en la empresa, etapa (con su barrita) y etiquetas en una sola
 * línea sobre el video; lo que no entra se resume en un "+N" que despliega la fila (`FilaRecortada`).
 * Chips de vidrio oscuro con texto marfil: se leen sobre el gradiente. Con varias
 * empresas va la principal y un chip "+N" propio; la lista completa está en el perfil.
 */
export function EtiquetasReel({
  perfil,
  id,
  activo,
}: {
  perfil: ConEtiquetas & Pick<Perfil, "empresa" | "empresas" | "empresa_id">;
  id: string;
  activo: boolean;
}) {
  const chips: Array<{ clave: string; texto: string }> = [];
  if (perfil.rol === "inversor") {
    const ticket = labelTicket(perfil.ticket);
    if (ticket) chips.push({ clave: "ticket", texto: `Ticket ${ticket}` });
  }
  if (perfil.rol === "aliado") {
    for (const e of perfil.especialidades ?? []) {
      chips.push({ clave: `es-${e}`, texto: especialidad(e).label });
    }
  }
  for (const i of perfil.industrias ?? []) {
    chips.push({ clave: `in-${i}`, texto: labelIndustria(i) });
  }
  const [primera, ...resto] = empresasDe(perfil);
  const c = cargo(primera?.cargo);
  const etapa = perfil.rol === "emprendedor" ? perfil.etapa : null;
  if (!primera && !etapa && !chips.length) return null;

  const piezas: React.ReactNode[] = [];
  if (primera) {
    piezas.push(
      <span key="empresa" className="flex min-w-0 max-w-full items-center gap-1.5">
        <span className="texto-sombra truncate font-medium text-marfil">
          {c ? `${c.label} en ` : "En "}
          <span className="font-semibold">{primera.nombre}</span>
        </span>
        {resto.length > 0 && (
          <>
            <span aria-hidden className={`shrink-0 px-1.5 font-semibold ${CHIP_REEL}`}>
              +{resto.length}
            </span>
            <span className="sr-only">, y también en {listaNombres(resto.map((e) => e.nombre))}</span>
          </>
        )}
      </span>
    );
  }
  if (etapa) piezas.push(<BarraEtapa key="etapa" etapa={etapa} claro />);
  for (const chip of chips) {
    piezas.push(
      <span key={chip.clave} className={`px-2 font-medium ${CHIP_REEL}`}>
        {chip.texto}
      </span>
    );
  }

  return (
    <FilaRecortada
      piezas={piezas}
      id={id}
      activo={activo}
      className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs"
      claseMas={`px-2 font-semibold ${CHIP_REEL}`}
    />
  );
}

/** Pastilla de vidrio oscuro del reel: texto marfil sobre el gradiente. */
const CHIP_REEL = "rounded-full bg-tinta/55 py-0.5 text-marfil ring-1 ring-marfil/20";
