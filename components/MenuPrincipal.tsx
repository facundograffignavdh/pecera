"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { IconoCerrar, IconoMenu } from "@/components/Iconos";
import { EVENTO_ACTUAL } from "@/lib/eventos";

const ENLACES = [
  { href: "/", label: "Feed", bajada: "Los pitches en video" },
  { href: `/eventos/${EVENTO_ACTUAL.slug}`, label: EVENTO_ACTUAL.nombre, bajada: "Programa y votación" },
  { href: "/academy", label: "Academy", bajada: "Aprendé y prepará tu startup" },
  { href: "/sumate", label: "Sumate", bajada: "Qué es Pecera y cómo entrar" },
  { href: "/cuenta", label: "Mi perfil", bajada: "Tu perfil, tu empresa y tus datos" },
] as const;

/**
 * Menú de la app: píldora de vidrio a la izquierda (espejo de la de la cuenta) que
 * abre un `<dialog>` nativo. Escape y tocar afuera cierran; el foco vuelve solo.
 */
export default function MenuPrincipal() {
  const ref = useRef<HTMLDialogElement>(null);
  const ruta = usePathname();
  const cerrar = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        aria-label="Abrir el menú"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className="vidrio pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] flex size-11 items-center justify-center rounded-full text-tinta transition-colors duration-200 ease-pecera hover:text-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
      >
        <IconoMenu className="size-5" />
      </button>

      <dialog
        ref={ref}
        aria-label="Menú"
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
        className="menu-principal pointer-events-auto m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-tinta/40"
      >
        <nav className="flex h-full w-[min(20rem,85vw)] flex-col gap-1 bg-marfil px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[8px_0_32px_rgb(28_27_22/0.18)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-xl font-semibold text-tinta">Pecera</span>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar el menú"
              className="flex size-11 items-center justify-center rounded-full text-tinta hover:bg-tinta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
            >
              <IconoCerrar className="size-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {ENLACES.map((e) => {
              // /docs (conceptos y legales) es parte de Academy.
              const actual =
                e.href === "/" ? ruta === "/" : ruta.startsWith(e.href) || (e.href === "/academy" && ruta.startsWith("/docs"));
              return (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    onClick={cerrar}
                    aria-current={actual ? "page" : undefined}
                    className={`flex min-h-14 flex-col justify-center rounded-2xl px-4 py-2 transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
                      actual ? "bg-tinta text-marfil" : "text-tinta hover:bg-tinta/5"
                    }`}
                  >
                    <span className="font-medium">{e.label}</span>
                    <span className={`text-sm ${actual ? "text-marfil/75" : "text-tinta/60"}`}>{e.bajada}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-auto text-xs leading-relaxed text-tinta/60">
            Pecera es una capa de descubrimiento y conexión. No capta fondos del público.
          </p>
        </nav>
      </dialog>
    </>
  );
}
