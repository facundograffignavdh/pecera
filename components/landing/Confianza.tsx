import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Seccion } from "@/components/landing/Seccion";
import type { PulsoEcosistema } from "@/lib/datos";
import { EVENTO_ACTUAL, momentoEvento } from "@/lib/eventos";
import { ROLES, TIPOS } from "@/lib/rol";

// Un número chico no prueba nada: por debajo de esto, ese dato no se muestra.
const MINIMO = 5;

const PRINCIPIOS = [
  ["Gratis y sin comisiones", "Pecera no toma equity ni cobra por inversión."],
  ["Tus datos, tu decisión", "Métricas y documentos son privados hasta que los compartís, uno por uno."],
  ["Relaciones confirmadas", "Una inversión figura como confirmada solo si la empresa la acepta."],
  ["Con tu consentimiento", "Sin tu OK no guardamos tus datos, y podés ocultar tu perfil cuando quieras."],
];

/**
 * Confianza sin humo: números en vivo de la base (solo si son reales y no
 * triviales), los pitches más recientes de verdad, el evento real y cómo funciona
 * Pecera. Nada de testimonios, logos ni métricas inventadas: si no hay datos, se
 * ven solo los principios.
 */
export default function Confianza({ pulso }: { pulso: PulsoEcosistema | null }) {
  const numeros = pulso
    ? [
        { n: pulso.pitches, label: "pitches publicados" },
        { n: pulso.emprendedores, label: "emprendedores" },
        { n: pulso.empresas, label: "empresas" },
        { n: pulso.inversores, label: "inversores" },
        { n: pulso.aliados, label: "aliados" },
      ].filter((x) => x.n >= MINIMO)
    : [];
  const vitrina = pulso && pulso.vitrina.length >= 4 ? pulso.vitrina : [];
  const momento = momentoEvento(EVENTO_ACTUAL);

  return (
    <Seccion
      id="confianza"
      numero="10"
      etiqueta="Confianza"
      titulo="Lo que podés comprobar."
      bajada="Sin testimonios armados ni logos prestados. Esto es lo que hay hoy en la Pecera y cómo funciona."
    >
      {numeros.length > 0 && (
        <div data-revelar className="mt-12">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-tinta/12 py-8 sm:grid-cols-3 lg:grid-cols-5">
            {numeros.map((x, i) => (
              <div key={x.label} className="flex flex-col-reverse gap-1">
                <dt className="text-sm text-tinta/65">{x.label}</dt>
                <dd className="font-display text-5xl font-semibold leading-none tracking-[-0.02em]">
                  <span aria-hidden className="contador" style={{ "--valor": x.n, "--retraso": `${150 + i * 90}ms` } as CSSProperties} />
                  <span className="sr-only">{x.n}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-center gap-2 text-xs text-tinta/65">
            <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-aliado" />
            En vivo, de la plataforma. Se actualiza cada minuto.
          </p>
        </div>
      )}

      {vitrina.length > 0 && (
        <div data-revelar className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-tinta/65">Pitches recientes</h3>
          <ul className="no-scrollbar -mx-5 mt-4 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
            {vitrina.map((p) => (
              <li key={p.slug} className="w-32 shrink-0 snap-start sm:w-auto">
                <Link
                  href={`/p/${p.slug}`}
                  className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                >
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl bg-tinta">
                    <Image
                      src={p.poster}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 140px, 128px"
                      className="object-cover transition-transform duration-[var(--duracion-enfasis)] ease-pecera group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="mt-2 block truncate text-sm font-semibold text-tinta">{p.nombre}</span>
                  <span className="block truncate text-xs text-tinta/65">
                    {ROLES[p.rol].label} · {TIPOS[p.tipo]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Link
          href={`/eventos/${EVENTO_ACTUAL.slug}`}
          data-revelar
          className="group flex flex-col justify-between gap-6 rounded-[var(--radius-bloque)] bg-tinta p-7 text-marfil transition-transform duration-[var(--duracion)] ease-pecera hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
        >
          <span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-marfil/10 px-2.5 py-1 text-xs font-semibold">
              {momento !== "terminado" && <span aria-hidden className="punto-vivo size-1.5 rounded-full bg-pecera" />}
              {momento === "proximo" ? "Se viene" : momento === "en_curso" ? "Ahora" : "Evento"}
            </span>
            <span className="mt-4 block font-display text-4xl font-semibold leading-none">{EVENTO_ACTUAL.nombre}</span>
            <span className="mt-2 block text-sm text-marfil/70">{EVENTO_ACTUAL.lugar}</span>
            <span className="mt-4 block leading-relaxed text-marfil/85">
              Los proyectos muestran su pitch en Pecera y el público vota acá. {EVENTO_ACTUAL.fechas}.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 font-semibold">
            Programa y votación
            <span aria-hidden className="transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-1">
              &rarr;
            </span>
          </span>
        </Link>

        <ul className="grid gap-4 sm:grid-cols-2">
          {PRINCIPIOS.map(([t, d], i) => (
            <li
              key={t}
              data-revelar
              style={{ transitionDelay: `${i * 70}ms` }}
              className="rounded-[var(--radius-bloque)] border border-tinta/10 bg-superficie p-6"
            >
              <p className="font-display text-xl font-semibold">{t}</p>
              <p className="mt-1.5 leading-relaxed text-tinta/75">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </Seccion>
  );
}
