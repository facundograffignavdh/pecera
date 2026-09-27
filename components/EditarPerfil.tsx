"use client";

import Link from "next/link";
import { useCuentaLocal } from "@/lib/cuenta-local";

/**
 * "Editar perfil" solo para el dueño. El servidor lo renderiza siempre oculto (la
 * página es estática); el navegador decide. Es solo interfaz: la seguridad real
 * está en la RLS y el trigger.
 */
export default function EditarPerfil({ slug }: { slug: string }) {
  const cuenta = useCuentaLocal();
  if (cuenta?.perfil?.slug !== slug) return null;

  return (
    <Link
      href="/cuenta"
      className="mt-5 inline-flex min-h-11 items-center rounded-full border border-tinta/55 px-4 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
    >
      Editar perfil
    </Link>
  );
}
