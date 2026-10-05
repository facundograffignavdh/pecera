"use client";

import { type ReactNode, useActionState, useEffect, useId, useState } from "react";
import { guardarSeccion, type Seccion } from "@/app/cuenta/seccion";
import Hoja from "@/components/ui/Hoja";
import { MensajeError } from "@/components/perfil/editores/campos";
import type { Errores } from "@/lib/cuenta";
import type { EstadoGuardar } from "@/lib/perfil-servidor";
import { boton } from "@/lib/ui";

/** Sin respuesta en este tiempo, se ofrece reintentar. */
const ESPERA_MAXIMA_MS = 20_000;

/**
 * La hoja de una sección del perfil: el form con sus campos, "Guardar" en el pie y
 * los estados (guardando, error general, errores por campo, tarda demasiado). Al
 * guardar bien se cierra; la página se actualiza sola (la action revalida /cuenta).
 * Los campos avisan sus cambios con `marcar` (los chips y tags no disparan onChange).
 */
export default function FormSeccion({
  seccion,
  titulo,
  bajada,
  abierta,
  onCerrar,
  children,
}: {
  seccion: Seccion;
  titulo: string;
  bajada?: string;
  abierta: boolean;
  onCerrar: () => void;
  children: (p: { errores: Errores; marcar: () => void }) => ReactNode;
}) {
  const id = useId();
  const [sucio, setSucio] = useState(false);
  const [tardando, setTardando] = useState(false);
  const [estado, accion, guardando] = useActionState(
    async (previo: EstadoGuardar, datos: FormData): Promise<EstadoGuardar> => {
      setTardando(false);
      try {
        const r = await guardarSeccion(previo, datos);
        if (r.guardado) {
          setSucio(false);
          onCerrar();
        }
        return r;
      } catch {
        return { errores: {}, general: "Sin conexión: tus cambios todavía no se guardaron." };
      }
    },
    { errores: {} }
  );

  useEffect(() => {
    if (!guardando) return;
    const t = setTimeout(() => setTardando(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [guardando]);

  return (
    <Hoja
      abierta={abierta}
      onCerrar={() => {
        setSucio(false);
        onCerrar();
      }}
      titulo={titulo}
      bajada={bajada}
      sucio={sucio}
      pie={
        <div className="flex flex-col gap-2">
          {estado.general && <MensajeError>{estado.general}</MensajeError>}
          {guardando && tardando && (
            <p role="alert" className="text-sm text-tinta">
              Está tardando más de lo normal. Esperá un poco más o cerrá y probá de nuevo.
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" form={id} disabled={guardando} className={`${boton("oscuro", "lg")} flex-1`}>
              {guardando ? (
                <>
                  <span className="girando size-4 rounded-full border-2 border-marfil border-t-transparent" /> Guardando…
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id={id} action={accion} noValidate onChange={() => setSucio(true)} className="flex flex-col gap-5 pt-1">
        <input type="hidden" name="seccion" value={seccion} />
        {children({ errores: estado.errores, marcar: () => setSucio(true) })}
      </form>
    </Hoja>
  );
}
