"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import MaquetaReel from "@/components/landing/MaquetaReel";
import { Flecha, Tilde } from "@/components/landing/Seccion";
import { boton } from "@/lib/ui";
import type { Rol } from "@/types/pecera";

type Vista = {
  rol: Rol;
  pestana: string;
  titulo: string;
  puntos: string[];
  cta: string;
  punto: string;
  visual: ReactNode;
};

function Fila({ izquierda, derecha }: { izquierda: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-tinta/10 py-2.5 first:border-t-0">
      {izquierda}
      {derecha}
    </div>
  );
}

function Inicial({ texto, color }: { texto: string; color: string }) {
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-lg font-display text-xs font-semibold ${color}`}>
      {texto}
    </span>
  );
}

/** Perfil de inversora de ejemplo: tesis, portfolio confirmado y track record calculado. */
function VisualInversor() {
  return (
    <div className="w-full max-w-sm rounded-[var(--radius-bloque)] border border-tinta/10 bg-marfil p-5 shadow-[0_1px_2px_rgb(28_27_22/0.06),0_18px_44px_rgb(28_27_22/0.1)]">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-inversor font-display font-semibold text-marfil">CR</span>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">Inversora ángel</p>
          <p className="text-xs text-tinta/65">Pre-seed y seed · Ticket USD 10–50 mil</p>
        </div>
      </div>
      <p className="mt-4 font-editorial text-[15px] leading-relaxed text-tinta/85">
        “Agtech y fintech con tracción temprana, equipos técnicos que ya venden.”
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["2", "inversiones"],
          ["1", "exit"],
          ["2", "industrias"],
        ].map(([n, t]) => (
          <div key={t} className="rounded-xl bg-superficie px-2 py-2">
            <p className="font-display text-xl font-semibold leading-none">{n}</p>
            <p className="mt-1 text-[11px] text-tinta/65">{t}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-tinta/65">Portfolio</p>
      <div className="mt-1">
        <Fila
          izquierda={
            <span className="flex items-center gap-2.5">
              <Inicial texto="RV" color="bg-naranja-suave text-naranja-texto" />
              <span className="text-sm font-semibold">Raíz Verde</span>
            </span>
          }
          derecha={<span className="rounded-full bg-t-verde-suave px-2 py-0.5 text-[11px] font-semibold text-t-verde">✓ Confirmada</span>}
        />
        <Fila
          izquierda={
            <span className="flex items-center gap-2.5">
              <Inicial texto="PS" color="bg-t-violeta-suave text-t-violeta" />
              <span className="text-sm font-semibold">Pagos Simples</span>
            </span>
          }
          derecha={<span className="rounded-full bg-tinta px-2 py-0.5 text-[11px] font-semibold text-marfil">Exit</span>}
        />
      </div>
    </div>
  );
}

/** Perfil de aliado de ejemplo: servicios y un caso de éxito. */
function VisualAliado() {
  return (
    <div className="w-full max-w-sm rounded-[var(--radius-bloque)] border border-tinta/10 bg-marfil p-5 shadow-[0_1px_2px_rgb(28_27_22/0.06),0_18px_44px_rgb(28_27_22/0.1)]">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-aliado font-display font-semibold text-marfil">NL</span>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">Nodo Litoral</p>
          <p className="text-xs text-tinta/65">Incubadora · Aliado</p>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-tinta/65">Servicios</p>
      <ul className="mt-2 flex flex-col gap-2">
        {[
          ["Mentoría de go-to-market", "Para startups en MVP"],
          ["Programa de incubación", "12 semanas, con espacio de trabajo"],
        ].map(([s, d]) => (
          <li key={s} className="rounded-xl bg-superficie px-3 py-2.5">
            <p className="text-sm font-semibold">{s}</p>
            <p className="text-xs text-tinta/65">{d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-tinta/65">Caso de éxito</p>
      <dl className="mt-2 grid gap-1.5 border-l-2 border-aliado pl-3 text-[13px] leading-snug">
        <div>
          <dt className="inline font-semibold">Desafío: </dt>
          <dd className="inline text-tinta/75">vender fuera de su ciudad.</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Qué hicimos: </dt>
          <dd className="inline text-tinta/75">canal mayorista con viveros.</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Resultado: </dt>
          <dd className="inline text-tinta/75">primer cliente mayorista.</dd>
        </div>
      </dl>
    </div>
  );
}

const VISTAS: Vista[] = [
  {
    rol: "emprendedor",
    pestana: "Emprendo",
    titulo: "Mostrá lo que construís y llegá preparado a la ronda.",
    punto: "bg-arcilla",
    puntos: [
      "Tu pitch de 90 segundos en el feed, con subtítulos automáticos.",
      "La página de tu empresa: equipo, producto, One Pager y pitches de todos.",
      "Build in Public: hitos, avances y una racha por cada semana que contás algo.",
      "Tu ronda y tus métricas, privadas hasta que decidís compartirlas.",
      "Templates guiados y un Dataroom para cuando un inversor te pida más.",
    ],
    cta: "Entrar como emprendedor",
    visual: (
      <div className="relative">
        <MaquetaReel />
        <span className="vidrio absolute -right-3 top-24 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold shadow-[0_8px_24px_rgb(28_27_22/0.14)] sm:-right-16">
          <span className="punto-vivo size-2 rounded-full bg-obra" />
          Beta pública · 75%
        </span>
      </div>
    ),
  },
  {
    rol: "inversor",
    pestana: "Invierto",
    titulo: "Descubrí temprano y mostrá lo que ya hiciste.",
    punto: "bg-inversor",
    puntos: [
      "Pitches de 90 segundos de startups de la región, uno atrás del otro.",
      "Tu tesis: rondas, ticket, industrias y geografías.",
      "Tu portfolio, con inversiones que confirma cada empresa.",
      "Un track record calculado de tu portfolio, no declarado.",
      "Escribile directo al fundador: WhatsApp, email o LinkedIn.",
    ],
    cta: "Entrar como inversor",
    visual: <VisualInversor />,
  },
  {
    rol: "aliado",
    pestana: "Acompaño",
    titulo: "Mostrá cómo ayudás y que te encuentren cuando te necesitan.",
    punto: "bg-aliado",
    puntos: [
      "Tus servicios, con categoría y para quién son.",
      "Las startups que acompañaste: mentoría, aceleración, clientes.",
      "Casos de éxito: el desafío, lo que hicieron y el resultado.",
      "Aparecés en Explorar cuando alguien busca lo que ofrecés.",
      "Presentá tu programa en un pitch de 90 segundos.",
    ],
    cta: "Entrar como aliado",
    visual: <VisualAliado />,
  },
];

/**
 * "Pecera cambia según quién sos": pestañas por rol que cambian el texto, lo que
 * podés hacer, la maqueta del producto y el CTA (que ya entra con ese rol).
 * Teclado: flechas entre pestañas, como cualquier tablist.
 */
export default function SegunQuienSos() {
  const [activa, setActiva] = useState(0);
  const pestanas = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const vista = VISTAS[activa];

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + VISTAS.length) % VISTAS.length;
    pestanas.current[siguiente]?.focus();
    setActiva(siguiente);
  }

  return (
    <div className="mt-12">
      <div
        role="tablist"
        aria-label="Elegí qué hacés"
        className="grid w-full grid-cols-3 gap-1 rounded-full border border-tinta/15 bg-marfil p-1 sm:inline-grid sm:w-auto"
      >
        {VISTAS.map((v, i) => (
          <button
            key={v.rol}
            ref={(el) => {
              pestanas.current[i] = el;
            }}
            id={`${base}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === activa}
            aria-controls={`${base}-panel`}
            tabIndex={i === activa ? 0 : -1}
            onClick={() => setActiva(i)}
            onKeyDown={(e) => alTeclear(e, i)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-2 text-[15px] font-semibold transition-colors duration-[var(--duracion)] ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla sm:px-6 ${
              i === activa ? "bg-tinta text-marfil" : "text-tinta/70 hover:text-tinta"
            }`}
          >
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${v.punto}`} />
            {v.pestana}
          </button>
        ))}
      </div>

      <div
        key={vista.rol}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${activa}`}
        className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"
      >
        <div className="entrada">
          <h3 className="font-display text-[1.75rem] font-semibold leading-tight text-balance sm:text-4xl">{vista.titulo}</h3>
          <ul className="mt-6 flex flex-col gap-3.5">
            {vista.puntos.map((p) => (
              <li key={p} className="flex gap-3 text-[17px] leading-snug text-tinta/80">
                <Tilde className="mt-0.5 text-aliado" />
                {p}
              </li>
            ))}
          </ul>
          <Link href={`/cuenta?rol=${vista.rol}`} className={`${boton("oscuro", "lg")} group mt-8`}>
            {vista.cta}
            <Flecha className="h-5 w-5 transition-transform duration-[var(--duracion)] ease-pecera group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="entrada flex justify-center" style={{ animationDelay: "90ms" }}>
          <figure className="flex flex-col items-center gap-3">
            {vista.visual}
            <figcaption className="text-xs text-tinta/65">Perfil de ejemplo</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
