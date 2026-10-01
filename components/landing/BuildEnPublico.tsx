import Link from "next/link";
import type { CSSProperties } from "react";
import BotonForm from "@/components/landing/BotonForm";
import { Seccion, Tilde } from "@/components/landing/Seccion";

/**
 * Build in Public: el proceso de construir a la vista. Sigue al lema ("Las bocas cerradas
 * no se alimentan.") y cuenta el recorrido: mostrás → te ven → conectan → aparecen
 * oportunidades. No es el Pitch (quién sos) ni el feed (lo que opinás): es el avance.
 *
 * A la izquierda, los cuatro pasos unidos por una línea que se dibuja; a la derecha, una
 * tarjeta de producto con hitos que se completan, una barra que se llena, un registro de
 * actividad que va rotando y la racha semanal. Todo es de ejemplo y así se rotula: nunca
 * parece tracción real. El movimiento es solo CSS (globals.css) y se apaga con "reducir
 * movimiento".
 */

const PASOS = [
  ["Mostrás", "Marcás hitos y sumás avances cortos. Una línea por novedad, sin producir contenido."],
  ["Te ven", "Tu equipo, inversores y aliados siguen el recorrido y ven que hay movimiento."],
  ["Conectan", "Te escriben desde tu perfil, con el contexto de lo que ya hiciste."],
  ["Oportunidades", "Clientes, talento, alianzas, una ronda: aparecen cuando se te ve avanzar."],
] as const;

const HITOS = [
  { titulo: "MVP en 3 huertas piloto", estado: "logrado", fecha: "Agosto" },
  { titulo: "Primeras 1.000 bolsas vendidas", estado: "logrado", fecha: "Septiembre" },
  { titulo: "Beta pública", estado: "en_curso", progreso: 75 },
  { titulo: "100 clientes recurrentes", estado: "proximo", fecha: "Diciembre" },
] as const;

/** Registro de actividad: una novedad por vez, rotando (4 × 3 s). */
const ACTIVIDAD = [
  { tipo: "avance", texto: "Día 42 · Lanzamos el nuevo onboarding.", cuando: "hoy" },
  { tipo: "numero", texto: "Sumamos 50 usuarios a la beta.", cuando: "hace 1 día" },
  { tipo: "hito", texto: "Cerramos con dos viveros de Paraná.", cuando: "hace 2 días" },
  { tipo: "avance", texto: "Tienda online en beta cerrada.", cuando: "hace 1 semana" },
] as const;

const SEMANAS = 12;
const RACHA = 6;

function IconoActividad({ tipo }: { tipo: (typeof ACTIVIDAD)[number]["tipo"] }) {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      {tipo === "hito" && <path {...trazo} d="M5 21V4m0 0h11l-2 4 2 4H5" />}
      {tipo === "numero" && <path {...trazo} d="M4 19V9m6 10V5m6 14v-7m4 7H2" />}
      {tipo === "avance" && <path {...trazo} d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Zm10-13 3 3" />}
    </svg>
  );
}

export default function BuildEnPublico() {
  return (
    <Seccion
      id="build-in-public"
      numero="04"
      etiqueta="Build in Public"
      titulo="Mostrá lo que construís. Que te encuentren."
      bajada="Build in Public es el recorrido de tu startup, semana a semana: hitos, avances y números reales. No es el pitch, que cuenta quién sos, ni el feed, que cuenta lo que pensás. Es el proceso."
    >
      <div className="mt-14 grid items-start gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* El recorrido en cuatro pasos. */}
        <ol data-revelar className="relative flex flex-col gap-9">
          <span aria-hidden className="linea-tiempo absolute bottom-6 left-5 top-6 w-px bg-tinta/35" />
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="hito-bip relative flex gap-5" style={{ "--i": i } as CSSProperties}>
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-tinta font-display text-lg font-semibold text-marfil">
                {i + 1}
              </span>
              <div className="pt-1.5">
                <p className="font-display text-2xl font-semibold leading-none">{titulo}</p>
                <p className="mt-2 max-w-sm text-[17px] leading-snug">{texto}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Cómo se ve adentro de Pecera (ejemplo). */}
        <div
          data-revelar
          role="img"
          aria-label="Ejemplo de Build in Public: cuatro hitos, un registro de actividad y una racha de seis semanas."
          className="paleta-original relative rounded-[var(--radius-bloque)] bg-marfil p-6 text-tinta shadow-[0_2px_4px_rgb(0_0_0/0.12),0_30px_70px_rgb(0_0_0/0.28)] sm:p-8"
        >
          <span className="absolute right-5 top-5 rounded-full bg-tinta/10 px-2.5 py-1 text-xs font-semibold text-tinta/75">
            Ejemplo
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-naranja-texto">Raíz Verde · Recorrido</p>

          <ol aria-hidden className="relative mt-6">
            <span className="linea-tiempo absolute bottom-3 left-[0.6875rem] top-3 w-px bg-tinta/20" />
            {HITOS.map((h, i) => (
              <li key={h.titulo} className="hito-bip relative flex gap-4 pb-6 last:pb-0" style={{ "--i": i } as CSSProperties}>
                <span
                  className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                    h.estado === "logrado"
                      ? "bg-naranja-texto text-white"
                      : h.estado === "en_curso"
                        ? "border-2 border-naranja-texto bg-marfil"
                        : "border border-dashed border-tinta/40 bg-marfil"
                  }`}
                >
                  {h.estado === "logrado" && <Tilde tamano="size-3.5" />}
                  {h.estado === "en_curso" && <span className="punto-vivo size-2 rounded-full bg-naranja-texto" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${h.estado === "proximo" ? "text-tinta/60" : ""}`}>{h.titulo}</p>
                  {h.estado === "en_curso" ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10">
                        <div
                          className="barra-progreso h-full rounded-full bg-naranja-texto"
                          style={{ "--p": h.progreso / 100, "--retraso": "900ms" } as CSSProperties}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-naranja-texto">{h.progreso}%</span>
                    </div>
                  ) : (
                    <p className="text-sm text-tinta/65">
                      {h.estado === "logrado" ? `Logrado · ${h.fecha}` : `Próximo · ${h.fecha}`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Actividad reciente: una novedad por vez. */}
          <div aria-hidden className="mt-7 border-t border-tinta/10 pt-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta/65">
              <span className="punto-vivo size-2 rounded-full bg-naranja-texto" />
              Actividad reciente
            </p>
            <div className="actividad-bip mt-3">
              {ACTIVIDAD.map((a, i) => (
                <p
                  key={a.texto}
                  className="flex items-center gap-3 rounded-xl bg-superficie px-4 py-3 text-[15px]"
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="text-naranja-texto">
                    <IconoActividad tipo={a.tipo} />
                  </span>
                  <span className="min-w-0 flex-1">{a.texto}</span>
                  <span className="shrink-0 text-xs text-tinta/60">{a.cuando}</span>
                </p>
              ))}
            </div>
          </div>

          <div aria-hidden className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-semibold">
              <svg viewBox="0 0 32 40" className="h-6 w-5">
                <path
                  className="llama"
                  d="M16 2c1.2 6.4 9.5 10.6 9.5 20.2C25.5 30.4 21.2 37 16 37S6.5 30.4 6.5 22.6c0-5 2.4-8.4 5.1-10.8.3 3.4 1.6 5.6 3.6 6.6C14.6 12.2 15.2 6.4 16 2Z"
                  fill="#f2a53a"
                />
              </svg>
              {RACHA} semanas seguidas
            </p>
            <span className="flex gap-1.5">
              {Array.from({ length: SEMANAS }, (_, i) => (
                <span
                  key={i}
                  data-lleno={i >= SEMANAS - RACHA || undefined}
                  className="racha-punto size-2.5 rounded-full bg-tinta/15"
                  style={{ "--i": i } as CSSProperties}
                />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* Cierre de la página: un solo llamado. */}
      <div data-cta-zona className="mt-20 flex flex-col items-center gap-4 text-center sm:mt-24">
        <p className="font-display text-[2rem] font-semibold leading-tight text-balance sm:text-5xl">
          Empezá a construir a la vista.
        </p>
        <p className="max-w-md text-lg leading-relaxed">Es gratis y tu perfil está listo en 2 minutos.</p>
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <BotonForm />
          <Link
            href="/explorar"
            className="font-semibold underline decoration-2 underline-offset-4 transition-opacity duration-[var(--duracion)] ease-pecera hover:opacity-80 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-tinta"
          >
            Explorá el ecosistema
          </Link>
        </div>
      </div>
    </Seccion>
  );
}
