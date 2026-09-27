"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import { IconoPersona } from "@/components/Iconos";
import { useCuentaLocal } from "@/lib/cuenta-local";

const POSICION =
  "vidrio pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 items-center justify-center rounded-full transition-colors duration-200 ease-pecera";

/**
 * Píldora de la cuenta. Sin sesión: "Entrar". Con perfil: su foto o sus iniciales,
 * y lleva al perfil público si está visible (si no, a /cuenta). Todo se decide en
 * el navegador: el feed y los perfiles no leen cookies en el servidor.
 */
export default function AccesoCuenta({ compacto = false }: { compacto?: boolean }) {
  const cuenta = useCuentaLocal();
  const perfil = cuenta?.perfil;

  if (perfil) {
    const etiqueta = perfil.visible ? "Ver mi perfil" : "Mi cuenta";
    return (
      <Link
        href={perfil.visible ? `/p/${perfil.slug}` : "/cuenta"}
        aria-label={etiqueta}
        className={`${POSICION} w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla`}
      >
        <Avatar
          perfil={{ nombre: perfil.nombre, rol: perfil.rol, avatar_url: perfil.avatar }}
          size={36}
        />
      </Link>
    );
  }

  const texto = cuenta ? "Mi perfil" : "Entrar";
  return (
    <Link
      href="/cuenta"
      aria-label={texto}
      className={`${POSICION} min-w-11 gap-1.5 px-3 text-sm font-medium text-tinta hover:text-arcilla`}
    >
      <IconoPersona className="size-5" />
      <span className={compacto ? "hidden min-[400px]:inline" : undefined}>{texto}</span>
    </Link>
  );
}
