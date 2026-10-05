"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { convertirEnEmpresa } from "@/app/cuenta/empresa";
import { ChipsUnico } from "@/components/Chips";
import { Campo, MensajeError, claseInput } from "@/components/perfil/editores/campos";
import Hoja from "@/components/ui/Hoja";
import type { Resultado } from "@/lib/errores-base";
import { CARGOS, conTono } from "@/lib/etiquetas";
import { TIPOS } from "@/lib/rol";
import { boton } from "@/lib/ui";
import type { TipoPerfil } from "@/types/pecera";

const CLAVE_POSPUESTO = "pecera:convertir-pospuesto";
const OPCIONES_CARGOS = conTono(CARGOS);
const INICIAL: Resultado = { ok: false };

const sinCambios = () => () => {};
function pospuesto(): boolean {
  try {
    return localStorage.getItem(CLAVE_POSPUESTO) === "1";
  } catch {
    return false;
  }
}

/**
 * Perfiles de antes creados a nombre del emprendimiento ("Startup", "Aceleradora"…):
 * ofrece pasar esos datos a una empresa vinculada y dejar el perfil como persona,
 * como en LinkedIn. Lo decide la persona; se puede posponer (queda en el celular).
 */
export default function ConvertirEnEmpresa({ nombre, tipo, conFoto }: { nombre: string; tipo: TipoPerfil; conFoto: boolean }) {
  const yaPospuesto = useSyncExternalStore(sinCambios, pospuesto, () => true);
  const [oculto, setOculto] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [esMiNombre, setEsMiNombre] = useState(false);
  const [cargo, setCargo] = useState("");
  const [estado, accion, guardando] = useActionState(async (previo: Resultado, datos: FormData) => {
    try {
      const r = await convertirEnEmpresa(previo, datos);
      if (r.ok) setAbierta(false);
      return r;
    } catch {
      return { ok: false, mensaje: "Sin conexión. Probá de nuevo." };
    }
  }, INICIAL);

  if (estado.ok) {
    return (
      <p role="status" className="rounded-2xl bg-t-verde-suave px-4 py-3 text-sm text-tinta">
        {estado.mensaje}
      </p>
    );
  }
  if (yaPospuesto || oculto) return null;

  const tipoLabel = TIPOS[tipo] || "un emprendimiento";

  return (
    <section aria-labelledby="convertir-titulo" className="aparecer flex flex-col gap-3 rounded-3xl border-2 border-dashed border-arcilla/50 bg-t-arcilla-suave/40 px-4 py-4">
      <h2 id="convertir-titulo" className="font-display text-lg font-semibold leading-tight text-tinta">
        ¿Este perfil es de tu emprendimiento?
      </h2>
      <p className="text-sm leading-relaxed text-tinta">
        Tu perfil está como «{tipoLabel}». En Pecera la cuenta es tuya, como en LinkedIn, y el emprendimiento va aparte,
        con tu rol. Lo pasamos en un paso: tu dirección y tus pitches no cambian.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAbierta(true)} className={boton("oscuro", "md")}>
          Pasarlo a una empresa
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(CLAVE_POSPUESTO, "1");
            } catch {}
            setOculto(true);
          }}
          className={boton("fantasma", "md")}
        >
          Ahora no
        </button>
      </div>

      <Hoja
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        titulo={`Crear la empresa «${nombre}»`}
        bajada="Con el nombre, el tipo y la descripción de tu perfil. Después la completás en Administrar."
        pie={
          <div className="flex flex-col gap-2">
            {!estado.ok && estado.mensaje && <MensajeError>{estado.mensaje}</MensajeError>}
            <button type="submit" form="form-convertir" disabled={guardando} className={`${boton("oscuro", "lg")} w-full`}>
              {guardando ? "Creando…" : "Crear la empresa"}
            </button>
          </div>
        }
      >
        <form id="form-convertir" action={accion} noValidate className="flex flex-col gap-5">
          <label className="flex items-start gap-3 text-sm text-tinta">
            <input type="checkbox" checked={esMiNombre} onChange={(e) => setEsMiNombre(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-tinta" />
            <span>
              «{nombre}» ya es mi nombre
              <span className="block text-tinta/70">Solo creamos la empresa con ese nombre; tu perfil queda igual.</span>
            </span>
          </label>
          {!esMiNombre && (
            <Campo id="convertir-nombre" label="Tu nombre y apellido" ayuda="Así se va a ver tu perfil personal.">
              <input id="convertir-nombre" name="nombre_persona" type="text" required maxLength={80} autoComplete="name" placeholder="Ana Pérez" className={claseInput()} />
            </Campo>
          )}
          <ChipsUnico
            id="convertir-cargo"
            nombre="cargo"
            legend="Tu rol en la empresa"
            opciones={OPCIONES_CARGOS}
            valor={cargo}
            onCambiar={setCargo}
            permitirNinguno
            ayuda="Opcional."
          />
          {conFoto && (
            <label className="flex items-start gap-3 text-sm text-tinta">
              <input type="checkbox" name="usar_foto" defaultChecked className="mt-0.5 size-5 shrink-0 accent-tinta" />
              <span>
                Usar la imagen de mi perfil como logo de la empresa
                <span className="block text-tinta/70">Tu perfil queda sin foto: después subís una tuya con Editar.</span>
              </span>
            </label>
          )}
        </form>
      </Hoja>
    </section>
  );
}
