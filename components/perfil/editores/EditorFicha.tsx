"use client";

import { useState } from "react";
import EditorFoto from "@/components/EditorFoto";
import { IconoEditar } from "@/components/Iconos";
import TelefonoPais from "@/components/TelefonoPais";
import { CLASE_EDITAR_FICHA } from "@/components/perfil/BotonEditarFicha";
import { useAbrirConAncla } from "@/components/perfil/SeccionEditable";
import FormSeccion from "@/components/perfil/editores/FormSeccion";
import { Campo, MensajeError, claseInput, describir } from "@/components/perfil/editores/campos";
import { DESCRIPCION_MAX, DESCRIPCION_ROL, NOMBRE_MAX, urlPerfil } from "@/lib/cuenta";
import { UBICACION_MAX } from "@/lib/etiquetas";
import { ROLES } from "@/lib/rol";
import type { Perfil, Rol } from "@/types/pecera";

export type PerfilFicha = Pick<
  Perfil,
  "slug" | "nombre" | "rol" | "descripcion" | "avatar_url" | "ubicacion" | "whatsapp" | "email" | "linkedin" | "instagram" | "web"
> & { oculto: boolean };

/**
 * "Editar" de la tarjeta en el perfil propio: abre la hoja con los datos de la
 * persona (foto, nombre, rol, ubicación, bio y contacto) y "Ocultar mi perfil".
 */
export default function EditorFicha({ perfil }: { perfil: PerfilFicha }) {
  const [abierta, setAbierta] = useState(false);
  const [vez, setVez] = useState(0);
  const abrir = () => {
    setVez((v) => v + 1);
    setAbierta(true);
  };
  useAbrirConAncla("ficha", abrir);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={abrir}
        className={CLASE_EDITAR_FICHA}
      >
        <IconoEditar className="size-4" />
        Editar
      </button>
      <FormSeccion
        key={vez}
        seccion="ficha"
        titulo="Tus datos"
        bajada="Tu cuenta es personal: tu emprendimiento lo sumás en Empresas."
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
      >
        {({ errores, marcar }) => <CamposFicha perfil={perfil} errores={errores} marcar={marcar} />}
      </FormSeccion>
    </>
  );
}

function CamposFicha({
  perfil,
  errores,
  marcar,
}: {
  perfil: PerfilFicha;
  errores: Record<string, string | undefined>;
  marcar: () => void;
}) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [rol, setRol] = useState<Rol>(perfil.rol);
  const [descripcion, setDescripcion] = useState(perfil.descripcion);
  const [foto, setFoto] = useState<string | null>(perfil.avatar_url);

  return (
    <>
      {/* La foto se guarda en el acto, aparte del resto. */}
      <EditorFoto nombre={nombre} rol={rol} foto={foto} guardarEnElActo onCambio={(f) => setFoto(f?.url ?? null)} />

      <Campo id="ficha-nombre" label="Tu nombre y apellido" error={errores.nombre}>
        <input
          id="ficha-nombre"
          name="nombre"
          type="text"
          maxLength={NOMBRE_MAX}
          autoComplete="name"
          placeholder="Ana Pérez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={!!errores.nombre}
          aria-describedby={describir("ficha-nombre", errores.nombre)}
          className={claseInput(errores.nombre)}
        />
      </Campo>

      <fieldset className="flex flex-col gap-2" aria-describedby={errores.rol ? "ficha-rol-error" : undefined}>
        <legend className="mb-2 text-sm font-medium text-tinta">¿Cómo participás en Pecera?</legend>
        <div className="grid gap-2">
          {(Object.keys(ROLES) as Rol[]).map((r) => {
            const elegido = rol === r;
            return (
              <label
                key={r}
                className={`tarjeta-opcion flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-marfil px-3.5 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla ${
                  elegido ? "border-tinta" : "border-tinta/15 hover:border-tinta/40"
                }`}
              >
                <input type="radio" name="rol" value={r} checked={elegido} onChange={() => setRol(r)} className="sr-only" />
                <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full ${ROLES[r].bg}`} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold leading-tight text-tinta">{ROLES[r].label}</span>
                  <span className="text-xs leading-snug text-tinta/70">{DESCRIPCION_ROL[r]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {rol !== perfil.rol && (
          <p className="text-sm text-tinta/75">Al cambiar de rol, las etiquetas del rol anterior se borran.</p>
        )}
        {errores.rol && <MensajeError id="ficha-rol-error">{errores.rol}</MensajeError>}
      </fieldset>

      <Campo id="ficha-ubicacion" label="Ubicación" opcional error={errores.ubicacion}>
        <input
          id="ficha-ubicacion"
          name="ubicacion"
          type="text"
          maxLength={UBICACION_MAX}
          autoComplete="address-level2"
          placeholder="Córdoba, Argentina"
          defaultValue={perfil.ubicacion ?? ""}
          className={claseInput(errores.ubicacion)}
        />
      </Campo>

      <Campo
        id="ficha-descripcion"
        label="Una línea sobre vos"
        error={errores.descripcion}
        info="Qué hacés y qué te interesa, en una frase. Es lo primero que se lee debajo de tu nombre. Podés sumar hashtags como #feria21."
        ayuda={`${descripcion.length}/${DESCRIPCION_MAX}`}
      >
        <textarea
          id="ficha-descripcion"
          name="descripcion"
          rows={3}
          maxLength={DESCRIPCION_MAX}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={
            rol === "inversor"
              ? "Invierto en fintech y agtech en etapa temprana."
              : rol === "aliado"
                ? "Hago marketing para startups B2B: de 0 a los primeros 100 clientes."
                : "Fundadora, ingeniera agrónoma. Me interesa el agro sustentable."
          }
          aria-invalid={!!errores.descripcion}
          aria-describedby={describir("ficha-descripcion", errores.descripcion, true)}
          className={`${claseInput(errores.descripcion)} resize-none`}
        />
      </Campo>

      <fieldset className="flex flex-col gap-5 border-t border-tinta/10 pt-5">
        <legend className="sr-only">Contacto</legend>
        <p className="text-sm font-semibold text-tinta">
          Contacto <span className="font-normal text-tinta/65">· todo opcional</span>
        </p>
        <Campo id="ficha-whatsapp" label="WhatsApp" opcional error={errores.whatsapp}>
          <TelefonoPais
            id="ficha-whatsapp"
            nombre="whatsapp"
            valorInicial={perfil.whatsapp ?? ""}
            onCambiar={(v) => {
              if (v !== (perfil.whatsapp ?? "")) marcar();
            }}
            invalido={!!errores.whatsapp}
            describedBy={describir("ficha-whatsapp", errores.whatsapp)}
          />
        </Campo>
        <Campo id="ficha-email" label="Email de contacto" opcional error={errores.email} ayuda="Puede ser distinto al de tu cuenta de Google.">
          <input
            id="ficha-email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            maxLength={200}
            defaultValue={perfil.email ?? ""}
            aria-invalid={!!errores.email}
            aria-describedby={describir("ficha-email", errores.email, true)}
            className={claseInput(errores.email)}
          />
        </Campo>
        <Campo id="ficha-linkedin" label="LinkedIn" opcional error={errores.linkedin}>
          <input
            id="ficha-linkedin"
            name="linkedin"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            maxLength={200}
            placeholder="linkedin.com/in/tuusuario"
            defaultValue={perfil.linkedin ?? ""}
            aria-invalid={!!errores.linkedin}
            className={claseInput(errores.linkedin)}
          />
        </Campo>
        <Campo id="ficha-instagram" label="Instagram" opcional error={errores.instagram}>
          <input
            id="ficha-instagram"
            name="instagram"
            type="text"
            autoCapitalize="none"
            maxLength={100}
            placeholder="@tuusuario"
            defaultValue={perfil.instagram ?? ""}
            aria-invalid={!!errores.instagram}
            className={claseInput(errores.instagram)}
          />
        </Campo>
        <Campo id="ficha-web" label="Web" opcional error={errores.web}>
          <input
            id="ficha-web"
            name="web"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            maxLength={200}
            placeholder="tuweb.com.ar"
            defaultValue={perfil.web ?? ""}
            aria-invalid={!!errores.web}
            className={claseInput(errores.web)}
          />
        </Campo>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-tinta/10 pt-5">
        <p className="text-sm text-tinta/75">
          Tu dirección en Pecera: <span className="break-all font-medium text-tinta">{urlPerfil(perfil.slug)}</span>
        </p>
        <label className="flex items-start gap-3 text-sm text-tinta">
          <input name="oculto" type="checkbox" defaultChecked={perfil.oculto} className="mt-0.5 size-5 shrink-0 accent-tinta" />
          <span>
            Ocultar mi perfil
            <span className="block text-tinta/70">Mientras esté tildado, nadie lo ve en Pecera.</span>
          </span>
        </label>
      </div>
    </>
  );
}
