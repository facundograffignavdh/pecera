"use client";

import Link from "next/link";
import CasillaUniversidad, { type Consentimiento } from "@/components/networking/CasillaUniversidad";
import Hoja from "@/components/ui/Hoja";
import { boton } from "@/lib/ui";

/** A dónde lleva «Completar»: la pestaña Networking, filtrada por la feria, con la hoja abierta. */
export const URL_NETWORKING_FERIA = "/cofundadores?ver=networking&alcance=feria&editar=1";

/**
 * Pop-up al anotarse en la Feria 21 (o la próxima vez que entra a /cuenta, si la anotó el
 * equipo desde /admin): invita a contar qué busca y qué ofrece. Se cierra y no vuelve ese día;
 * con busca y ofrece completos no aparece más (lo decide quien lo monta). Adentro, la casilla
 * OPCIONAL de la universidad, separada del botón. Solo interfaz: nunca traba nada.
 */
export default function AvisoNetworkingFeria({
  abierto,
  onCerrar,
  consentimiento,
  onConsentimiento,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** null = la base todavía no tiene la migración: sin casilla. */
  consentimiento: Consentimiento | null;
  onConsentimiento: (c: Consentimiento) => void;
}) {
  return (
    <Hoja
      abierta={abierto}
      onCerrar={onCerrar}
      titulo="Networking en la Feria 21"
      pie={
        <div className="flex flex-col gap-2">
          <Link href={URL_NETWORKING_FERIA} onClick={onCerrar} className={`${boton("primario", "lg")} w-full`}>
            Completar qué busco y qué ofrezco
          </Link>
          <button type="button" onClick={onCerrar} className={`${boton("fantasma", "md")} w-full`}>
            Ahora no
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-base leading-relaxed text-tinta">
          Para hacer networking en la Feria 21, contanos qué buscás y qué ofrecés. Con eso te mostramos con quién encajás en la
          carpa, y podés mostrar interés y hacer match.
        </p>
        {consentimiento && <CasillaUniversidad valor={consentimiento} onCambio={onConsentimiento} />}
      </div>
    </Hoja>
  );
}
