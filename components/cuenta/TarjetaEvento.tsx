"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { participar } from "@/app/cuenta/empresa";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import type { Rol } from "@/types/pecera";

const TEXTOS: Record<Rol, { si: string; no: string; accion: string }> = {
  emprendedor: {
    no: "Anotá tu proyecto: aparece en la página del evento y el público lo puede votar.",
    si: "Tu proyecto está en la votación. Compartí tu perfil en el stand para sumar votos.",
    accion: "Anotar mi proyecto",
  },
  inversor: {
    no: "Anotate como inversor presente: los proyectos te ven en la página del evento.",
    si: "Figurás como inversor presente en la feria.",
    accion: "Voy a la feria",
  },
  aliado: {
    no: "Anotate como aliado presente: los proyectos saben que pueden buscarte.",
    si: "Figurás como aliado presente en la feria.",
    accion: "Voy a la feria",
  },
};

export default function TarjetaEvento({ participa, rol }: { participa: boolean; rol: Rol }) {
  const [anotado, setAnotado] = useState(participa);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const t = TEXTOS[rol];

  function cambiar(valor: boolean) {
    iniciar(async () => {
      const r = await participar(valor);
      if (r.ok) setAnotado(valor);
      setResultado(r.ok ? null : r);
    });
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
    </Tarjeta>
  );
}
