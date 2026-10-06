import { NIVELES_SCORE, type Score } from "@/lib/score";

/**
 * La insignia del score crediticio (A a D): la letra con su color, en chico. Va en
 * tarjetas y listas, donde el globo "i" estorbaría (el panel con la "i" está en
 * ScoreEmpresa.tsx). Archivo aparte y sin imports pesados: Explorar la carga en el
 * navegador y no necesita los catálogos de métricas.
 */

/** "Score crediticio B: riesgo moderado", para lectores de pantalla. */
export function textoScore(score: Pick<Score, "letra">): string {
  return `Score crediticio ${score.letra}: ${NIVELES_SCORE[score.letra].titulo.toLowerCase()}`;
}

export function InsigniaScore({ score, className = "" }: { score: Pick<Score, "letra">; className?: string }) {
  return (
    <span
      title={textoScore(score)}
      className={`ui-fija inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${NIVELES_SCORE[score.letra].clase} ${className}`}
    >
      <span aria-hidden>Score</span>
      <span aria-hidden className="font-display text-sm font-bold">
        {score.letra}
      </span>
      <span className="sr-only">{textoScore(score)}</span>
    </span>
  );
}
