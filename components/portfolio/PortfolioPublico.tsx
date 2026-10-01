import PortfolioMiembros from "@/components/portfolio/PortfolioMiembros";
import TarjetaEntrada from "@/components/portfolio/TarjetaEntrada";
import type { PortfolioPublico as Datos } from "@/lib/datos";
import { ESPECIALIDADES, labelIndustria } from "@/lib/etiquetas";
import { agrupar, labelGeografia, labelModalidad, labelModelo, trackRecord } from "@/lib/portfolio";
import type { Rol } from "@/types/pecera";

const SUBTITULO = "font-display text-sm font-semibold uppercase tracking-wide text-tinta/50";

/**
 * El portfolio en el perfil público. Inversor: tesis, track record (calculado de
 * sus entradas, nunca tipeado) y portfolio con la inversión separada del resto.
 * Aliado: servicios y con quién trabajó, con sus casos. Solo lo cargado.
 */
export default function PortfolioPublico({ rol, perfilId, datos }: { rol: Rol; perfilId: string; datos: Datos }) {
  const { entradas, servicios, tesis } = datos;
  const grupos = agrupar(rol, entradas);
  const tr = trackRecord(entradas);
  const inversor = rol === "inversor";
  const hayTesis = !!(tesis && (tesis.texto || tesis.geografias.length || tesis.modelos.length || tesis.busca));

  return (
    <>
      {inversor && hayTesis && tesis && (
        <section aria-labelledby="tesis-titulo" className="mt-7">
          <h2 id="tesis-titulo" className={SUBTITULO}>Tesis de inversión</h2>
          <div data-revelar className="mt-3 flex flex-col gap-3 rounded-3xl border border-t-azul/20 bg-t-azul-suave/50 px-4 py-4">
            {tesis.texto && <p className="leading-relaxed text-tinta">{tesis.texto}</p>}
            {(tesis.geografias.length > 0 || tesis.modelos.length > 0) && (
              <ul className="flex flex-wrap gap-1.5">
                {tesis.geografias.map((g) => (
                  <li key={g} className="rounded-full bg-marfil px-2.5 py-1 text-xs font-medium text-tinta">{labelGeografia(g)}</li>
                ))}
                {tesis.modelos.map((m) => (
                  <li key={m} className="rounded-full border border-tinta/15 px-2.5 py-1 text-xs font-medium text-tinta">{labelModelo(m)}</li>
                ))}
              </ul>
            )}
            {tesis.busca && (
              <p className="text-sm text-tinta/85">
                <span className="font-semibold text-tinta">Busca:</span> {tesis.busca}
              </p>
            )}
          </div>
        </section>
      )}

      {!inversor && servicios.length > 0 && (
        <section aria-labelledby="servicios-titulo" className="mt-7">
          <h2 id="servicios-titulo" className={SUBTITULO}>Servicios</h2>
          <ul data-revelar className="mt-3 flex flex-col gap-2">
            {servicios.map((s) => (
              <li key={s.id} className="rounded-2xl border border-tinta/10 px-4 py-3">
                <p className="font-semibold text-tinta">{s.nombre}</p>
                <p className="text-xs text-tinta/65">
                  {[ESPECIALIDADES.find((e) => e.valor === s.categoria)?.label, labelModalidad(s.modalidad), s.precio].filter(Boolean).join(" · ")}
                </p>
                {s.descripcion && <p className="mt-1 text-sm leading-snug text-tinta/85">{s.descripcion}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="portfolio-titulo" className="mt-7">
        <h2 id="portfolio-titulo" className={SUBTITULO}>{inversor ? "Portfolio" : "Portfolio y casos"}</h2>
        {entradas.length > 0 ? (
          <>
            {inversor && (
              <div data-revelar className="mt-3 flex flex-col gap-2 rounded-2xl bg-tinta/[0.04] px-4 py-3">
                <p className="text-sm text-tinta">
                  <strong className="font-semibold">{tr.inversiones}</strong> {tr.inversiones === 1 ? "inversión" : "inversiones"}
                  {tr.exits > 0 && <> · <strong className="font-semibold">{tr.exits}</strong> {tr.exits === 1 ? "exit" : "exits"}</>}
                  {tr.apoyos > 0 && <> · <strong className="font-semibold">{tr.apoyos}</strong> {tr.apoyos === 1 ? "apoyo sin inversión" : "apoyos sin inversión"}</>}
                  {tr.confirmadas > 0 && <> · <strong className="font-semibold">{tr.confirmadas}</strong> {tr.confirmadas === 1 ? "confirmada" : "confirmadas"} por la empresa</>}
                </p>
                {tr.industrias.length > 0 && <p className="text-xs text-tinta/65">{tr.industrias.map(labelIndustria).join(" · ")}</p>}
                <p className="text-[0.6875rem] text-tinta/55">Calculado de su portfolio público en Pecera.</p>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-5">
              {grupos.map((g) => (
                <section key={g.id} aria-label={g.titulo} className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">{g.titulo}</h3>
                  <ul data-revelar className="flex flex-col gap-2">
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <TarjetaEntrada e={e} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-tinta/20 px-4 py-3 text-sm text-tinta/70">
            Todavía no hay entradas públicas en su portfolio.
          </p>
        )}
        <PortfolioMiembros perfilId={perfilId} />
      </section>
    </>
  );
}
