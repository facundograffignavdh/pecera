import Link from "next/link";
import Info from "@/components/Info";
import { InsigniaScore } from "@/components/InsigniaScore";
import { METRICAS_SCORE } from "@/lib/score-empresa";
import { NIVELES_SCORE, ORDEN_LETRAS, type AreaDef, type Score } from "@/lib/score";

/**
 * Score crediticio de una empresa (A a D): cuánta información suya es transparente en el
 * Dataroom, que para quien invierte es lo que categoriza el riesgo. La fórmula y por qué
 * existe están en lib/score.ts. Acá se dibuja el panel (en la página de la empresa y en
 * el Dataroom del dueño) y la "i" con cómo mejorarlo; la insignia chica, para tarjetas,
 * está en InsigniaScore.tsx.
 *
 * Sin estado y sin nada del servidor: sirve en páginas estáticas y en componentes de cliente.
 */

const LINEA = "mt-2 block";

/** "MRR, ARR, Clientes, Usuarios y 5 más": los primeros y cuántos quedan. */
function lista(items: readonly string[], max = 4): string {
  const vistos = items.slice(0, max).join(", ");
  return items.length > max ? `${vistos} y ${items.length - max} más` : vistos;
}

/** Qué cargar en un área, con las métricas, documentos y templates reales de la app. */
function QueSumar({ area }: { area: AreaDef }) {
  const m = METRICAS_SCORE[area.id];
  const hayCatalogo = m.metricas.length + m.documentos.length + m.templates.length > 0;
  return (
    <span className="mt-1.5 block">
      <span aria-hidden>○ </span>
      <span className="font-semibold">{area.label}</span>
      <span className="text-marfil/80"> · suma {area.peso} puntos</span>
      {m.metricas.length > 0 && (
        <span className="block pl-4 text-marfil/85">
          <span className="font-semibold">Métricas:</span> {lista(m.metricas)}
        </span>
      )}
      {m.documentos.length > 0 && (
        <span className="block pl-4 text-marfil/85">
          <span className="font-semibold">Documentos:</span> {lista(m.documentos)}
        </span>
      )}
      {m.templates.length > 0 && (
        <span className="block pl-4 text-marfil/85">
          <span className="font-semibold">Templates:</span> {lista(m.templates)}
        </span>
      )}
      {!hayCatalogo && <span className="block pl-4 text-marfil/85">Un texto o un link con {area.sumar}.</span>}
    </span>
  );
}

/**
 * Lo que explica la "i": qué es, la escala, y cómo mejorarlo (qué métricas, documentos y
 * templates de la app suben la letra que sigue). Con `propio`, además, avisa si lo que ya
 * subió y está privado subiría la letra, y (con `hrefDataroom`) lleva al Dataroom.
 */
export function GuiaScore({
  score,
  propio,
}: {
  score: Score;
  propio?: { potencial: Score; hrefDataroom?: string };
}) {
  const sig = score.siguiente;
  const cubiertas = score.areas.filter((a) => a.cubierta);
  const aAgregar = new Set(sig?.agregar.map((a) => a.id));
  const tambien = score.areas.filter((a) => !a.cubierta && !aAgregar.has(a.id));
  const soloPrivadas = propio
    ? propio.potencial.areas.filter((a) => a.cubierta && !score.areas.find((s) => s.id === a.id)?.cubierta)
    : [];
  const subiria = propio && propio.potencial.letra !== score.letra && soloPrivadas.length > 0 ? propio.potencial.letra : null;

  return (
    <span className="block">
      <span className="block font-semibold">Score crediticio: de A a D</span>
      <span className={LINEA}>
        Categoriza el riesgo de inversión según cuánta información de la empresa es transparente en su Dataroom. A es el
        riesgo más bajo y D el más alto: todas las empresas empiezan en D y suben sumando información.
      </span>
      <span className={`${LINEA} grid grid-cols-4 gap-1 text-center text-xs`} role="list" aria-label="Escala del score">
        {[...ORDEN_LETRAS].reverse().map((l) => (
          <span key={l} role="listitem" className={`rounded-lg px-1 py-1 ${score.letra === l ? "bg-marfil font-bold text-tinta" : "bg-marfil/15"}`}>
            <span className="font-display text-sm font-bold">{l}</span>
            <span className="block">{NIVELES_SCORE[l].titulo.replace("Riesgo ", "")}</span>
          </span>
        ))}
      </span>

      {sig ? (
        <span className={`${LINEA} rounded-xl bg-marfil/15 px-3 py-2`}>
          <span className="block font-semibold">Para pasar a {sig.letra}, cargá en tu Dataroom:</span>
          {sig.agregar.map((a) => (
            <QueSumar key={a.id} area={a} />
          ))}
          <span className="mt-2 block text-marfil/85">
            Hoy sumás {score.puntos} de 100{sig.faltan > 0 ? `: te faltan ${sig.faltan}` : ""}. Cada métrica o documento tiene que
            quedar en <strong>Transparente</strong>: lo privado no cuenta.
          </span>
        </span>
      ) : (
        <span className={`${LINEA} rounded-xl bg-marfil/15 px-3 py-2 font-semibold`}>Tenés la A, el máximo. Mantené tu Dataroom al día.</span>
      )}

      {subiria && (
        <span className={LINEA}>
          Ya subiste {soloPrivadas.map((a) => a.label).join(", ")}, pero está privado y no cuenta. Si lo hacés transparente, tu
          score sería <strong>{subiria}</strong>.
        </span>
      )}

      {cubiertas.length > 0 && (
        <span className={LINEA}>
          <span aria-hidden>✓ </span>
          <span className="font-semibold">Ya suman:</span> {cubiertas.map((a) => a.label).join(", ")}.
        </span>
      )}
      {tambien.length > 0 && (
        <span className={`${LINEA} text-marfil/80`}>
          <span className="font-semibold">{sig ? "También suman:" : "Faltan:"}</span>{" "}
          {tambien.map((a) => `${a.label} (+${a.peso})`).join(", ")}.
        </span>
      )}

      {propio?.hrefDataroom && (
        <Link href={propio.hrefDataroom} className="mt-2 inline-block font-semibold underline underline-offset-4">
          Ir a mi Dataroom
        </Link>
      )}

      <span className={`${LINEA} text-xs text-marfil/75`}>
        Mide cuánta información hay disponible, no si es verdadera ni la solvencia de la empresa. No es una calificación de
        riesgo regulada ni asesoramiento financiero.
      </span>
    </span>
  );
}

/**
 * El score con su "i": la letra, qué nivel de riesgo es y el globo con cómo mejorarlo. La
 * "i" abre el globo debajo del contenedor, así que el que lo rodea tiene que ser `relative`
 * (lo es el panel; en una tarjeta propia, ponele `relative`).
 */
export function ScoreConGuia({
  score,
  propio,
  className = "",
}: {
  score: Score;
  propio?: { potencial: Score; hrefDataroom?: string };
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <InsigniaScore score={score} />
      <Info titulo="Cómo funciona el score y cómo mejorarlo">
        <GuiaScore score={score} propio={propio} />
      </Info>
    </span>
  );
}

/** El panel de la página de la empresa y del Dataroom: letra grande, nivel, escala y la "i". */
export function PanelScore({
  score,
  nombre,
  propio,
  className = "",
}: {
  score: Score;
  nombre?: string;
  propio?: { potencial: Score; hrefDataroom?: string };
  className?: string;
}) {
  const nivel = NIVELES_SCORE[score.letra];
  return (
    <section
      aria-label={nombre ? `Score crediticio de ${nombre}` : "Score crediticio"}
      className={`relative rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-4 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`ui-fija grid size-14 shrink-0 place-items-center rounded-2xl font-display text-4xl font-semibold leading-none ${nivel.clase}`}
        >
          {score.letra}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/65">
            Score crediticio
            <Info titulo="Cómo funciona el score y cómo mejorarlo">
              <GuiaScore score={score} propio={propio} />
            </Info>
          </h2>
          <p className="font-display text-lg font-semibold leading-tight text-tinta">{nivel.titulo}</p>
          <p className="text-sm leading-snug text-tinta/70">
            {score.puntos === 0 ? "Todavía no hay información transparente." : `${nivel.resumen}.`} {score.cubiertas} de{" "}
            {score.areas.length} áreas del Dataroom.
          </p>
        </div>
      </div>
      <div aria-hidden className="mt-3.5 grid grid-cols-4 gap-1">
        {[...ORDEN_LETRAS].reverse().map((l) => {
          const alcanzada = ORDEN_LETRAS.indexOf(l) <= ORDEN_LETRAS.indexOf(score.letra);
          return (
            <span
              key={l}
              className={`ui-fija flex h-6 items-center justify-center rounded-md text-xs font-bold ${
                score.letra === l ? NIVELES_SCORE[l].clase : alcanzada ? "bg-tinta/10 text-tinta/70" : "bg-tinta/[0.05] text-tinta/50"
              }`}
            >
              {l}
            </span>
          );
        })}
      </div>
    </section>
  );
}
