"use client";

import { useEffect, useState } from "react";
import { portfolioMiembros } from "@/app/cuenta/portfolio";
import TarjetaEntrada from "@/components/portfolio/TarjetaEntrada";
import type { EntradaPortfolio } from "@/lib/portfolio";

/**
 * Las entradas que el perfil comparte solo con cuentas de Pecera. La página es
 * estática: se piden con la sesión al montar; sin sesión no aparece nada.
 */
export default function PortfolioMiembros({ perfilId }: { perfilId: string }) {
  const [entradas, setEntradas] = useState<EntradaPortfolio[]>([]);
  useEffect(() => {
    let cancelado = false;
    portfolioMiembros(perfilId)
      .then((e) => {
        if (!cancelado) setEntradas(e);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [perfilId]);
  if (entradas.length === 0) return null;
  return (
    <section aria-label="Para cuentas de Pecera" className="mt-4 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta/60">Visible para cuentas de Pecera</h3>
      <ul className="flex flex-col gap-2">
        {entradas.map((e) => (
          <li key={e.id} className="aparecer-pop">
            <TarjetaEntrada e={e} />
          </li>
        ))}
      </ul>
    </section>
  );
}
