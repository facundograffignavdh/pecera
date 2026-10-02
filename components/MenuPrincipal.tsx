"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { IconoCerrar, IconoMenu } from "@/components/Iconos";
import SelectorTema from "@/components/SelectorTema";
import { EVENTO_ACTUAL } from "@/lib/eventos";

const GRUPOS = [
  {
    titulo: "Descubrir",
    enlaces: [
      { href: "/", label: "Feed", bajada: "Para vos y Stakeholding" },
      { href: "/explorar", label: "Explorar", bajada: "Startups, inversores, aliados y hashtags" },
      { href: "/eventos", label: "Eventos", bajada: "Ferias, networking, pitch events y más" },
      { href: `/eventos/${EVENTO_ACTUAL.slug}`, label: EVENTO_ACTUAL.nombre.toUpperCase(), bajada: "Programa y votación", sub: true },
      { href: "/cofundadores", label: "Cofundadores", bajada: "Encontrá socio/a, como en YC" },
    ],
  },
  {
    titulo: "Lo tuyo",
    enlaces: [
      { href: "/red", label: "Mi red", bajada: "Los perfiles que seguís y guardaste" },
      { href: "/cuenta", label: "Mi perfil", bajada: "Tu perfil, tu empresa y tus datos" },
    ],
  },
  {
    titulo: "Pecera",
    enlaces: [
      { href: "/academy", label: "Academy", bajada: "Aprendé y prepará tu startup" },
      { href: "/sumate", label: "Landing", bajada: "Qué es Pecera y cómo sumarte" },
    ],
  },
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
          <div className="no-scrollbar -mx-1 flex flex-1 flex-col gap-4 overflow-y-auto px-1">
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo} className="flex flex-col gap-1">
                <p className="px-4 text-xs font-semibold uppercase tracking-[0.12em] text-tinta/50">{grupo.titulo}</p>
                <ul className="flex flex-col gap-0.5">
                  {grupo.enlaces.map((e) => {
                    // /eventos solo marca el índice (la feria tiene su entrada); /docs es parte de Academy.
                    const actual =
                      e.href === "/"
                        ? ruta === "/"
                        : e.href === "/eventos"
                          ? ruta === "/eventos"
                          : ruta.startsWith(e.href) || (e.href === "/academy" && ruta.startsWith("/docs"));
                    const sub = "sub" in e && e.sub;
                    return (
                      <li key={e.href} className={sub ? "ml-4 border-l-2 border-tinta/10 pl-2" : undefined}>
                        <Link
                          href={e.href}
                          onClick={cerrar}
                          aria-current={actual ? "page" : undefined}
                          className={`boton relative flex min-h-13 flex-col justify-center rounded-2xl py-2 pl-5 pr-4 text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
                            actual ? "bg-naranja-suave" : "hover:bg-tinta/5"
                          }`}
                        >
                          {/* La sección actual: una barra naranja a la izquierda, sin pintar todo. */}
                          {actual && <span aria-hidden className="absolute inset-y-3 left-1.5 w-1 rounded-full bg-naranja" />}
                          <span className={actual ? "font-semibold" : "font-medium"}>{e.label}</span>
                          <span className="text-sm text-tinta/65">{e.bajada}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-tinta/10 pt-4">
            <SelectorTema />
            <p className="text-xs leading-relaxed text-tinta/60">
              Pecera es una capa de descubrimiento y conexión. No capta fondos del público.
            </p>
          </div>
        </nav>
      </dialog>
    </>
  );
}
