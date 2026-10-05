import type { CSSProperties } from "react";
import InsigniaPitch from "@/components/InsigniaPitch";
import type { MiPitch } from "@/components/MisPitches";
import type { PerfilPropio } from "@/types/pecera";

type Paso = {
  clave: string;
  label: string;
  hecho: boolean;
  /** Ancla de la sección de /cuenta donde se completa. */
  href: string;
  /** Texto cuando está a medias (ej.: el pitch se está procesando). */
  enCurso?: string;
};

/**
 * Progreso del perfil en /cuenta: lo que falta, en orden y con un link a donde se
 * completa. El Pitch es obligatorio y se marca como tal. Todo sale de datos reales
 * del perfil; nada se estima. `conEmpresa` es null si la base no tiene empresas.
 */
export default function CompletarPerfil({
  perfil,
  pitches,
  conEmpresa,
  portfolio,
}: {
  perfil: PerfilPropio;
  pitches: MiPitch[];
  conEmpresa: boolean | null;
  /** Inversores y aliados, si la base tiene el Portfolio. */
  portfolio?: { entradas: number; servicios: number; tesis: boolean } | null;
}) {
  const pitchPublicado = pitches.some((p) => p.estado === "publicado");
  const pitchEnCamino = pitches.some((p) => p.estado === "procesando" || p.estado === "en_espera");

  const pasos: Paso[] = [
    { clave: "datos", label: "Rol, nombre y descripción", hecho: true, href: "#editar-ficha" },
    { clave: "foto", label: "Tu foto", hecho: !!perfil.avatar_url, href: "#editar-ficha" },
    { clave: "etiquetas", label: etiquetaPorRol(perfil.rol), hecho: tieneEtiquetas(perfil), href: "#editar-etiquetas" },
    {
      clave: "contacto",
      label: "Un canal de contacto",
      hecho: [perfil.whatsapp, perfil.email, perfil.linkedin, perfil.instagram, perfil.web].some(Boolean),
      href: "#editar-ficha",
    },
  ];
  if (perfil.rol === "emprendedor" && conEmpresa !== null) {
    pasos.push({ clave: "empresa", label: "Tu empresa", hecho: conEmpresa, href: "#seccion-empresas" });
  }
  if (portfolio && perfil.rol === "inversor") {
    pasos.push({ clave: "tesis", label: "Tu tesis de inversión", hecho: portfolio.tesis, href: "#editar-portfolio" });
  }
  if (portfolio && perfil.rol === "aliado") {
    pasos.push({ clave: "servicios", label: "Tus servicios", hecho: portfolio.servicios > 0, href: "#editar-portfolio" });
  }
  if (portfolio) {
    pasos.push({ clave: "portfolio", label: "Tu portfolio", hecho: portfolio.entradas > 0, href: "#editar-portfolio" });
  }
  pasos.push({
    clave: "pitch",
    label: "Tu Pitch",
    hecho: pitchPublicado,
    href: "#mi-pitch",
    enCurso: pitchEnCamino ? "Se está procesando" : undefined,
  });

  const hechos = pasos.filter((p) => p.hecho).length;
  const completo = hechos === pasos.length;
  const proporcion = hechos / pasos.length;

  return (
    <section
      aria-labelledby="completar-titulo"
      className="flex flex-col gap-4 rounded-3xl border border-tinta/10 bg-tinta/[0.03] px-4 py-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="completar-titulo" className="font-display text-xl font-semibold leading-tight text-tinta">
          {completo ? "Tu perfil está completo" : "Completá tu perfil"}
        </h2>
        <span className="text-sm font-semibold tabular-nums text-tinta">
          {hechos}/{pasos.length}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Perfil completo"
        aria-valuemin={0}
        aria-valuemax={pasos.length}
        aria-valuenow={hechos}
        className="h-2 overflow-hidden rounded-full bg-tinta/10"
      >
        <div
          className={`barra-progreso h-full rounded-full ${completo ? "bg-aliado" : "bg-naranja"}`}
          style={{ "--p": proporcion } as CSSProperties}
        />
      </div>

      {completo ? (
        <p className="text-sm text-tinta/80">
          Tenés todo lo que un inversor o un aliado mira primero. Mantenelo al día.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pasos.map((p) => (
            <li key={p.clave}>
              <a
                href={p.href}
                className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm text-tinta transition-colors duration-200 ease-pecera hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
              >
                <Marca hecho={p.hecho} />
                <span className={`flex-1 ${p.hecho ? "text-tinta/60 line-through decoration-tinta/30" : "font-medium"}`}>
                  {p.label}
                  {!p.hecho && p.enCurso && <span className="ml-1 font-normal text-tinta/60">· {p.enCurso}</span>}
                </span>
                {p.clave === "pitch" && !p.hecho && (
                  <span className="flex items-center gap-1.5">
                    <InsigniaPitch />
                    <span className="text-xs font-semibold text-tinta">Obligatorio</span>
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Marca({ hecho }: { hecho: boolean }) {
  return hecho ? (
    <span aria-label="Hecho" className="aparecer-pop flex size-5 shrink-0 items-center justify-center rounded-full bg-aliado text-marfil">
      <svg aria-hidden viewBox="0 0 12 12" className="size-3">
        <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span aria-label="Pendiente" className="size-5 shrink-0 rounded-full border-2 border-tinta/30" />
  );
}

function etiquetaPorRol(rol: PerfilPropio["rol"]): string {
  if (rol === "inversor") return "Ticket o rondas que mirás";
  if (rol === "aliado") return "Tus especialidades";
  return "Etapa e industria";
}

function tieneEtiquetas(perfil: PerfilPropio): boolean {
  if (perfil.rol === "inversor") return !!perfil.ticket || (perfil.rondas_interes?.length ?? 0) > 0;
  if (perfil.rol === "aliado") return (perfil.especialidades?.length ?? 0) > 0;
  return !!perfil.etapa && (perfil.industrias?.length ?? 0) > 0;
}
