"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useProgreso } from "@/components/academy/useProgreso";
import type { Accion } from "@/lib/essentials";
import { plantilla as buscarPlantilla } from "@/lib/plantillas";
import { boton } from "@/lib/ui";

const PRIMARIO = boton("primario", "lg");

/** "Ahora completá el tuyo": la acción de la lección, con su estado si hay sesión. */
export default function AccionLeccion({ accion }: { accion: Accion }) {
  const progreso = useProgreso();

  if (accion.tipo !== "plantilla") {
    const destino = {
      pitch: { href: "/cuenta#mi-pitch", label: "Subir o revisar mi Pitch", texto: "Tu Pitch vive en tu perfil y en el feed." },
      transparencia: { href: "/cuenta/empresa?pestana=metricas", label: "Cargar mis métricas", texto: "Cargalas en Transparencia: nacen privadas y van a tu Dataroom." },
      dataroom: { href: "/cuenta/dataroom", label: "Abrir mi Dataroom", texto: "Revisá qué categorías tienen información y qué falta." },
    }[accion.tipo];
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-tinta/80">{destino.texto}</p>
        <Link href={destino.href} className={`${PRIMARIO} self-start`}>
          {destino.label}
        </Link>
      </div>
    );
  }

  const p = buscarPlantilla(accion.id);
  if (!p) return null;
  const estado = progreso?.plantillas[p.id];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tinta/80">
        Template <strong className="font-semibold text-tinta">{p.nombre}</strong> · {p.pasos.length}{" "}
        {p.pasos.length === 1 ? "paso" : "pasos"} · unos {p.minutos} minutos. Se guarda solo en tu Dataroom.
      </p>
      {progreso?.conEmpresa && (
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
            <span
              className={`barra-progreso block h-full rounded-full ${estado?.completo ? "bg-aliado" : "bg-t-ocre"}`}
              style={{ "--p": estado?.proporcion ?? 0 } as CSSProperties}
            />
          </span>
          <span className="text-xs font-semibold tabular-nums text-tinta">
            {estado?.completo ? "Completo" : `${Math.round((estado?.proporcion ?? 0) * 100)}% completado`}
          </span>
        </div>
      )}
      <Link href={`/cuenta/dataroom/plantilla/${p.id}`} className={`${PRIMARIO} self-start`}>
        {estado?.completo ? "Ver mi template" : estado ? "Seguir completando" : "Completar el template"}
      </Link>
    </div>
  );
}
