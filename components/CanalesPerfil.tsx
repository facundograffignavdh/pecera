"use client";

import { useState } from "react";
import {
  IconoCopiar,
  IconoEmail,
  IconoInstagram,
  IconoLinkedin,
  IconoWeb,
  IconoWhatsapp,
} from "@/components/perfil/IconosMarca";
import { type Canal, canalesDe } from "@/lib/contacto";
import { registrarContacto } from "@/lib/medicion";
import type { Perfil } from "@/types/pecera";

/** Ícono, color de la marca al pasar y texto de ayuda de cada canal. */
const CANAL: Record<Canal["clave"], { icono: React.ReactNode; hover: string; ayuda: string }> = {
  whatsapp: { icono: <IconoWhatsapp />, hover: "hover:border-[#1f9d55] hover:text-[#1f7a43]", ayuda: "Abre WhatsApp con un saludo" },
  email: { icono: <IconoEmail />, hover: "hover:border-arcilla hover:text-arcilla", ayuda: "Escribile un email" },
  linkedin: { icono: <IconoLinkedin />, hover: "hover:border-[#0a66c2] hover:text-[#0a66c2]", ayuda: "Ver su LinkedIn" },
  instagram: { icono: <IconoInstagram />, hover: "hover:border-[#c13584] hover:text-[#c13584]", ayuda: "Ver su Instagram" },
  web: { icono: <IconoWeb />, hover: "hover:border-tinta hover:text-tinta", ayuda: "Ir a su web" },
};

const BASE =
  "boton group flex min-h-12 items-center gap-2.5 rounded-2xl border border-tinta/12 bg-marfil px-3.5 text-sm font-medium text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";

/**
 * Canales de contacto del perfil, con ícono y color de cada marca. Cada toque (y
 * copiar el email) se mide como contacto anónimo; solo lo ve el equipo en /admin.
 */
export default function CanalesPerfil({ perfil }: { perfil: Perfil }) {
  const canales = canalesDe(perfil);
  const [copiado, setCopiado] = useState(false);
  if (canales.length === 0) return null;

  async function copiarEmail() {
    if (!perfil.email) return;
    try {
      await navigator.clipboard.writeText(perfil.email);
      registrarContacto({ perfilId: perfil.id, canal: "email" });
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      window.prompt("Copiá el email:", perfil.email);
    }
  }

  return (
    <section aria-label="Canales de contacto">
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-tinta/50">Contacto y redes</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {canales.map((canal) => {
          const c = CANAL[canal.clave];
          return (
            <li key={canal.clave} className={canal.clave === "email" ? "col-span-2 flex gap-2" : undefined}>
              <a
                href={canal.href}
                {...(canal.externo && { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => registrarContacto({ perfilId: perfil.id, canal: canal.clave })}
                title={c.ayuda}
                aria-label={`${canal.label}: ${c.ayuda}`}
                className={`${BASE} ${c.hover} flex-1`}
              >
                <span className="text-tinta/70 transition-colors duration-200 group-hover:text-current">{c.icono}</span>
                <span className="truncate">{canal.label}</span>
                {canal.externo && (
                  <span aria-hidden className="ml-auto text-tinta/35 transition-transform duration-200 group-hover:translate-x-0.5">
                    ↗
                  </span>
                )}
              </a>
              {/* Para quien no tiene app de correo: el mailto no hace nada. */}
              {canal.clave === "email" && perfil.email && (
                <button
                  type="button"
                  onClick={copiarEmail}
                  title="Copiar el email"
                  aria-label="Copiar el email"
                  className={`${BASE} shrink-0 justify-center hover:border-tinta/40`}
                >
                  <IconoCopiar />
                  <span aria-live="polite">{copiado ? "¡Copiado!" : "Copiar"}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
