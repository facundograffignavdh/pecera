"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { participar } from "@/app/cuenta/empresa";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Tarjeta } from "@/components/cuenta/ui";
import AvisoNetworkingFeria, { URL_NETWORKING_FERIA } from "@/components/networking/AvisoNetworkingFeria";
import CasillaUniversidad, { type Consentimiento } from "@/components/networking/CasillaUniversidad";
import type { Resultado } from "@/lib/errores-base";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { avisoCerradoHoy, cerrarAvisoHoy, suscribirAviso } from "@/lib/networking";
import type { Rol } from "@/types/pecera";

const TEXTOS: Record<Rol, { si: string; no: string; accion: string }> = {
  emprendedor: {
    no: "Anotá tu proyecto: aparece en la página del evento y el público lo puede votar.",
    si: "Tu proyecto está en la votación. Compartí tu perfil en el stand para sumar votos.",
    accion: "Anotar mi proyecto",
  },
  inversor: {
    no: "Anotate en la feria: aparecés en la página del evento y el público te puede votar.",
    si: "Estás en la votación de la feria. Compartí tu perfil en la carpa para sumar votos.",
    accion: "Anotarme en la feria",
  },
  aliado: {
    no: "Anotate en la feria: aparecés en la página del evento y el público te puede votar.",
    si: "Estás en la votación de la feria. Compartí tu perfil en la carpa para sumar votos.",
    accion: "Anotarme en la feria",
  },
};

export default function TarjetaEvento({
  participa,
  rol,
  buscaOfreceCompleto,
  consentimiento: consentimientoInicial,
}: {
  participa: boolean;
  rol: Rol;
  /** Ya completó busca y ofrece: el aviso de networking no aparece más. */
  buscaOfreceCompleto: boolean;
  /** null = la base todavía no tiene networking_feria: sin casilla. */
  consentimiento: Consentimiento | null;
}) {
  const [anotado, setAnotado] = useState(participa);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [recienAnotada, setRecienAnotada] = useState(false);
  const [consentimiento, setConsentimiento] = useState(consentimientoInicial);
  // En el servidor (y al hidratar) cuenta como cerrado: el aviso solo se abre en el navegador.
  const cerradoHoy = useSyncExternalStore(suscribirAviso, avisoCerradoHoy, () => true);
  const t = TEXTOS[rol];

  // Anotada desde /admin (o en otra visita) sin busca/ofrece: el aviso aparece al entrar,
  // salvo que ya lo haya cerrado hoy en este dispositivo. Recién anotada: aparece igual.
  const aviso = !buscaOfreceCompleto && anotado && (!cerradoHoy || recienAnotada);

  function cambiar(valor: boolean) {
    iniciar(async () => {
      const r = await participar(valor);
      if (r.ok) setAnotado(valor);
      setResultado(r.ok ? null : r);
      // Recién anotada: el aviso, aunque lo haya cerrado antes.
      if (r.ok && valor) setRecienAnotada(true);
    });
  }

  function cerrarAviso() {
    cerrarAvisoHoy();
    setRecienAnotada(false);
  }

  return (
    <Tarjeta titulo={EVENTO_ACTUAL.nombre} etiqueta="Evento" bajada={EVENTO_ACTUAL.fechas}>
      <p className="text-sm leading-relaxed text-tinta">{anotado ? t.si : t.no}</p>
      <div className="flex flex-wrap items-center gap-3">
        {anotado ? (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => cambiar(false)}
            className={BOTON_SECUNDARIO}
          >
            {pendiente ? "Un momento…" : "Ya no participo"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => cambiar(true)}
            className={BOTON_PRIMARIO}
          >
            {pendiente ? "Anotando…" : t.accion}
          </button>
        )}
        <Link
          href={`/eventos/${EVENTO_ACTUAL.slug}`}
          className="text-sm font-medium text-tinta underline underline-offset-4 hover:text-arcilla"
        >
          Ver el evento
        </Link>
      </div>
      {resultado?.mensaje && <Aviso ok={false}>{resultado.mensaje}</Aviso>}

      {anotado && (
        <p className="text-sm leading-relaxed text-tinta">
          {buscaOfreceCompleto ? "Ya contaste qué buscás y qué ofrecés. " : "Para hacer networking, contá qué buscás y qué ofrecés. "}
          <Link href={URL_NETWORKING_FERIA} className="font-medium underline underline-offset-4 hover:text-arcilla">
            Ir al networking de la feria
          </Link>
        </p>
      )}

      {consentimiento && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-tinta">Compartir con la organización</p>
          <CasillaUniversidad valor={consentimiento} onCambio={setConsentimiento} />
        </div>
      )}

      <AvisoNetworkingFeria
        abierto={aviso}
        onCerrar={cerrarAviso}
        consentimiento={consentimiento}
        onConsentimiento={setConsentimiento}
      />
    </Tarjeta>
  );
}
