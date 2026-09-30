"use client";

import BotonCopiar from "@/components/BotonCopiar";
import { canalesDe } from "@/lib/contacto";
import { registrarContacto } from "@/lib/medicion";
import type { Perfil } from "@/types/pecera";

const CLASE_CANAL =
  "inline-flex rounded-full border border-tinta/25 px-4 py-2 text-sm text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla";

/**
 * "Escribile" del perfil. Cada toque (y copiar el email) se mide como contacto
 * anónimo; solo lo ve el equipo en /admin.
 */
export default function CanalesPerfil({ perfil }: { perfil: Perfil }) {
  const canales = canalesDe(perfil);
  if (canales.length === 0) return null;

  return (
    <section className="mt-7">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-tinta/50">
        Escribile
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {canales.map((canal) => (
          <li key={canal.clave} className="flex gap-2">
            <a
              href={canal.href}
              {...(canal.externo && { target: "_blank", rel: "noopener noreferrer" })}
              onClick={() => registrarContacto({ perfilId: perfil.id, canal: canal.clave })}
              className={CLASE_CANAL}
            >
              {canal.label}
            </a>
            {/* Para quien no tiene app de correo: el mailto no hace nada. */}
            {canal.clave === "email" && perfil.email && (
              <BotonCopiar
                texto={perfil.email}
                etiqueta="Copiar email"
                onCopiado={() => registrarContacto({ perfilId: perfil.id, canal: "email" })}
                className={CLASE_CANAL}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
