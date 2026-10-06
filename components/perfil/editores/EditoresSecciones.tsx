"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChipsMultiple, ChipsUnico, SelectorEtapa } from "@/components/Chips";
import EntradaTags from "@/components/EntradaTags";
import Info from "@/components/Info";
import SelectorBuscaOfrece from "@/components/networking/SelectorBuscaOfrece";
import SeccionEditable from "@/components/perfil/SeccionEditable";
import FormSeccion from "@/components/perfil/editores/FormSeccion";
import { Campo, claseInput } from "@/components/perfil/editores/campos";
import type { Errores } from "@/lib/cuenta";
import {
  APORTES,
  DEDICACIONES,
  EDUCACION_MAX,
  ESPECIALIDADES,
  ETAPAS,
  EXPERIENCIA_MAX,
  INDUSTRIAS,
  MAX_ESPECIALIDADES,
  MAX_INDUSTRIAS_INTERES,
  MAX_INDUSTRIAS_PROYECTO,
  MAX_SKILLS,
  NOTA_COFUNDADOR_MAX,
  RONDAS,
  RONDAS_INTERES,
  SKILL_MAX,
  TICKETS,
  conTono,
} from "@/lib/etiquetas";
import type { Perfil } from "@/types/pecera";

/**
 * Las secciones editables del perfil propio (además de la tarjeta, EditorFicha).
 * Cada una envuelve el bloque público (children, tal como lo ve un visitante) y
 * abre su hoja con solo sus campos; se guarda por separado (guardarSeccion).
 */

const OPCIONES_INDUSTRIAS = conTono(INDUSTRIAS);
const OPCIONES_ESPECIALIDADES = conTono(ESPECIALIDADES);
const OPCIONES_APORTES = conTono(APORTES);
const SUGERENCIAS_SKILLS = ["Ventas B2B", "Producto", "Marketing digital", "Finanzas", "Desarrollo web", "IA", "Diseño UX", "Liderazgo"];

type Props = { perfil: Perfil; children?: ReactNode };
type CamposProps = { perfil: Perfil; errores: Errores; marcar: () => void };

// ---------------------------------------------------------------------------
// Etiquetas del rol
// ---------------------------------------------------------------------------

const TITULO_ETIQUETAS = { emprendedor: "Tu proyecto", inversor: "Tu tesis de inversión", aliado: "Tu especialidad" } as const;

export function EditorEtiquetas({ perfil, children }: Props) {
  const vacia =
    !perfil.etapa &&
    !perfil.ronda &&
    !perfil.ticket &&
    !(perfil.industrias ?? []).length &&
    !(perfil.especialidades ?? []).length &&
    !(perfil.rondas_interes ?? []).length;
  const titulo = TITULO_ETIQUETAS[perfil.rol];
  return (
    <SeccionEditable
      clave="etiquetas"
      titulo="etiquetas"
      vacia={vacia}
      agregar={perfil.rol === "aliado" ? "Agregar tus especialidades" : perfil.rol === "inversor" ? "Agregar tu tesis" : "Agregar etapa e industria"}
      editor={({ abierta, cerrar, vez }) => (
        <FormSeccion
          key={vez}
          seccion="etiquetas"
          titulo={titulo}
          bajada="Con esto te encuentran en Explorar. Todo es opcional."
          abierta={abierta}
          onCerrar={cerrar}
        >
          {(p) => <CamposEtiquetas perfil={perfil} {...p} />}
        </FormSeccion>
      )}
    >
      {/* Etiquetas en la tarjeta: el lápiz va a la derecha, sin taparlas. */}
      <div className="pr-12">{children}</div>
    </SeccionEditable>
  );
}

function CamposEtiquetas({ perfil, errores, marcar }: CamposProps) {
  const [etapa, setEtapa] = useState(perfil.etapa ?? "");
  const [ronda, setRonda] = useState(perfil.ronda ?? "");
  const [ticket, setTicket] = useState(perfil.ticket ?? "");
  const [industrias, setIndustrias] = useState(perfil.industrias ?? []);
  const [rondas, setRondas] = useState(perfil.rondas_interes ?? []);
  const [especialidades, setEspecialidades] = useState(perfil.especialidades ?? []);
  const con =
    <T,>(poner: (v: T) => void) =>
    (v: T) => {
      poner(v);
      marcar();
    };

  if (perfil.rol === "emprendedor") {
    return (
      <>
        <SelectorEtapa id="etapa" nombre="etapa" legend="¿En qué etapa está tu proyecto?" etapas={ETAPAS} valor={etapa} onCambiar={con(setEtapa)} error={errores.etapa} />
        <ChipsMultiple
          id="industrias"
          nombre="industrias"
          legend="Industria"
          opciones={OPCIONES_INDUSTRIAS}
          valores={industrias}
          onCambiar={con(setIndustrias)}
          max={MAX_INDUSTRIAS_PROYECTO}
          error={errores.industrias}
        />
        <ChipsUnico
          id="ronda"
          nombre="ronda"
          legend="¿Qué ronda estás buscando?"
          opciones={RONDAS}
          valor={ronda}
          onCambiar={con(setRonda)}
          permitirNinguno
          ayuda="Opcional."
          error={errores.ronda}
        />
      </>
    );
  }
  if (perfil.rol === "inversor") {
    return (
      <>
        <ChipsMultiple
          id="rondas_interes"
          nombre="rondas_interes"
          legend="¿En qué rondas invertís?"
          opciones={RONDAS_INTERES}
          valores={rondas}
          onCambiar={con(setRondas)}
          error={errores.rondas_interes}
        />
        <ChipsUnico
          id="ticket"
          nombre="ticket"
          legend="Ticket típico"
          opciones={TICKETS}
          valor={ticket}
          onCambiar={con(setTicket)}
          permitirNinguno
          ayuda="Opcional. Se muestra en tu perfil."
          error={errores.ticket}
        />
        <ChipsMultiple
          id="industrias"
          nombre="industrias"
          legend="Industrias que mirás"
          opciones={OPCIONES_INDUSTRIAS}
          valores={industrias}
          onCambiar={con(setIndustrias)}
          max={MAX_INDUSTRIAS_INTERES}
          error={errores.industrias}
        />
      </>
    );
  }
  return (
    <>
      <ChipsMultiple
        id="especialidades"
        nombre="especialidades"
        legend="Tus especialidades"
        opciones={OPCIONES_ESPECIALIDADES}
        valores={especialidades}
        onCambiar={con(setEspecialidades)}
        max={MAX_ESPECIALIDADES}
        error={errores.especialidades}
      />
      <ChipsMultiple
        id="industrias"
        nombre="industrias"
        legend="Industrias donde más aportás"
        opciones={OPCIONES_INDUSTRIAS}
        valores={industrias}
        onCambiar={con(setIndustrias)}
        max={MAX_INDUSTRIAS_INTERES}
        ayuda="Opcional."
        error={errores.industrias}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Trayectoria
// ---------------------------------------------------------------------------

export function EditorTrayectoria({ perfil, children }: Props) {
  const vacia = !perfil.experiencia && !perfil.educacion && !(perfil.skills ?? []).length;
  return (
    <SeccionEditable
      clave="trayectoria"
      titulo="Trayectoria"
      vacia={vacia}
      agregar="Agregar experiencia"
      bajadaVacia="Experiencia, educación y skills"
      editor={({ abierta, cerrar, vez }) => (
        <FormSeccion key={vez} seccion="trayectoria" titulo="Trayectoria" bajada="Todo es opcional." abierta={abierta} onCerrar={cerrar}>
          {(p) => <CamposTrayectoria perfil={perfil} {...p} />}
        </FormSeccion>
      )}
    >
      {children}
    </SeccionEditable>
  );
}

function CamposTrayectoria({ perfil, errores, marcar }: CamposProps) {
  const [experiencia, setExperiencia] = useState(perfil.experiencia ?? "");
  const [skills, setSkills] = useState(perfil.skills ?? []);
  return (
    <>
      <Campo id="experiencia" label="Experiencia" opcional error={errores.experiencia} ayuda={`${experiencia.length}/${EXPERIENCIA_MAX}`}>
        <textarea
          id="experiencia"
          name="experiencia"
          rows={4}
          maxLength={EXPERIENCIA_MAX}
          placeholder="8 años en ventas B2B. Antes, cofundé una agtech que llegó a 40 clientes."
          value={experiencia}
          onChange={(e) => setExperiencia(e.target.value)}
          className={`${claseInput(errores.experiencia)} resize-none`}
        />
      </Campo>
      <Campo id="educacion" label="Educación" opcional error={errores.educacion}>
        <input
          id="educacion"
          name="educacion"
          type="text"
          maxLength={EDUCACION_MAX}
          placeholder="Lic. en Administración, Universidad Siglo 21"
          defaultValue={perfil.educacion ?? ""}
          className={claseInput(errores.educacion)}
        />
      </Campo>
      <Campo id="skills" label="Skills" opcional error={errores.skills} info="Escribí y tocá Enter (o coma) para sumar cada una.">
        <EntradaTags
          id="skills"
          nombre="skills"
          valores={skills}
          onCambiar={(v) => {
            setSkills(v);
            marcar();
          }}
          max={MAX_SKILLS}
          largoMax={SKILL_MAX}
          placeholder="Ventas, Python, Diseño…"
          sugerencias={SUGERENCIAS_SKILLS}
        />
      </Campo>
    </>
  );
}

// ---------------------------------------------------------------------------
// Busca y ofrece
// ---------------------------------------------------------------------------

export function EditorBuscaOfrece({ perfil, children }: Props) {
  const vacia = !(perfil.busca ?? []).length && !(perfil.ofrece ?? []).length;
  return (
    <SeccionEditable
      clave="busca-ofrece"
      titulo="Qué buscás y qué ofrecés"
      vacia={vacia}
      agregar="Agregar qué buscás y qué ofrecés"
      bajadaVacia="Sirve para conectarte con quien te sirve"
      editor={({ abierta, cerrar, vez }) => (
        <FormSeccion
          key={vez}
          seccion="buscaOfrece"
          titulo="Qué buscás y qué ofrecés"
          bajada="Con esto te encuentran en el Networking. Hasta 10 de cada lado."
          abierta={abierta}
          onCerrar={cerrar}
        >
          {(p) => <CamposBuscaOfrece perfil={perfil} {...p} />}
        </FormSeccion>
      )}
    >
      {children}
    </SeccionEditable>
  );
}

function CamposBuscaOfrece({ perfil, errores, marcar }: CamposProps) {
  return <SelectorBuscaOfrece inicial={perfil} errores={errores} marcar={marcar} />;
}

// ---------------------------------------------------------------------------
// Cofundador/a
// ---------------------------------------------------------------------------

export function EditorCofundador({ perfil, children }: Props) {
  return (
    <SeccionEditable
      clave="cofundador"
      titulo="Busco cofundador/a"
      vacia={!perfil.busca_cofundador}
      agregar="Busco cofundador/a"
      bajadaVacia="Aparecés en la sección Cofundadores"
      editor={({ abierta, cerrar, vez }) => (
        <FormSeccion
          key={vez}
          seccion="cofundador"
          titulo="Cofounder match"
          bajada="Como el de Y Combinator: aparecés en Cofundadores con lo que aportás y lo que buscás."
          abierta={abierta}
          onCerrar={cerrar}
        >
          {(p) => <CamposCofundador perfil={perfil} {...p} />}
        </FormSeccion>
      )}
    >
      {children}
    </SeccionEditable>
  );
}

function CamposCofundador({ perfil, errores, marcar }: CamposProps) {
  // Se abre desde "+ Busco cofundador/a" o para editarlo: arranca prendido.
  const [activo, setActivo] = useState(true);
  const [aporta, setAporta] = useState(perfil.cofundador_aporta ?? "");
  const [busca, setBusca] = useState(perfil.cofundador_busca ?? []);
  const [dedicacion, setDedicacion] = useState(perfil.cofundador_dedicacion ?? "");
  const [nota, setNota] = useState(perfil.cofundador_nota ?? "");
  return (
    <>
      <label className="relative flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-tinta/15 px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 font-medium text-tinta">
            Busco cofundador/a
            <Info titulo="Qué es el cofounder match">
              Aparecés en la sección Cofundadores con lo que aportás y lo que buscás, y quien encaje te escribe.
            </Info>
          </span>
          <span className="text-sm text-tinta/65">Apagalo cuando ya no busques.</span>
        </span>
        <input type="checkbox" name="busca_cofundador" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden
          className="relative mt-1 h-6 w-10 shrink-0 rounded-full bg-tinta/20 transition-colors duration-300 ease-pecera peer-checked:bg-arcilla peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-arcilla after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-marfil after:shadow after:transition-transform after:duration-300 after:ease-pecera peer-checked:after:translate-x-4"
        />
      </label>
      <div hidden={!activo} className="flex flex-col gap-5">
        <ChipsUnico
          id="cofundador_aporta"
          nombre="cofundador_aporta"
          legend="¿Qué aportás vos?"
          opciones={OPCIONES_APORTES}
          valor={aporta}
          onCambiar={(v) => {
            setAporta(v);
            marcar();
          }}
          info={APORTES.map((a) => `${a.label}: ${a.ayuda}`).join(" ")}
          error={errores.cofundador_aporta}
        />
        <ChipsMultiple
          id="cofundador_busca"
          nombre="cofundador_busca"
          legend="¿A quién buscás?"
          opciones={OPCIONES_APORTES}
          valores={busca}
          onCambiar={(v) => {
            setBusca(v);
            marcar();
          }}
          error={errores.cofundador_busca}
        />
        <ChipsUnico
          id="cofundador_dedicacion"
          nombre="cofundador_dedicacion"
          legend="Tu dedicación"
          opciones={DEDICACIONES}
          valor={dedicacion}
          onCambiar={(v) => {
            setDedicacion(v);
            marcar();
          }}
          permitirNinguno
          ayuda="Opcional."
        />
        <Campo
          id="cofundador_nota"
          label="En una frase, qué socio/a buscás"
          opcional
          error={errores.cofundador_nota}
          ayuda={`${nota.length}/${NOTA_COFUNDADOR_MAX}`}
        >
          <textarea
            id="cofundador_nota"
            name="cofundador_nota"
            rows={2}
            maxLength={NOTA_COFUNDADOR_MAX}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Busco un CTO que quiera construir la infraestructura de pagos del agro."
            className={`${claseInput(errores.cofundador_nota)} resize-none`}
          />
        </Campo>
      </div>
    </>
  );
}
