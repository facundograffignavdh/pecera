"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconoAcademy,
  IconoCalendario,
  IconoCofundadores,
  IconoExplorar,
  IconoMas,
} from "@/components/Iconos";
import { resaltar } from "@/lib/resaltar";

type Item = {
  href: string;
  label: string;
  icono: (p: { className?: string }) => React.ReactNode;
  /** Rutas que marcan el ítem como actual (prefijos). */
  rutas: string[];
};

const IZQUIERDA: Item[] = [
  { href: "/explorar", label: "Explorar", icono: IconoExplorar, rutas: ["/explorar", "/t/", "/red"] },
  { href: "/eventos", label: "Eventos", icono: IconoCalendario, rutas: ["/eventos"] },
];
const DERECHA: Item[] = [
  { href: "/cofundadores", label: "Cofundadores", icono: IconoCofundadores, rutas: ["/cofundadores"] },
  { href: "/academy", label: "Academy", icono: IconoAcademy, rutas: ["/academy", "/docs"] },
];

/** Pantallas que no llevan la barra: el stand, la landing (tiene su CTA fijo) y las imprimibles. */
function sinBarra(ruta: string): boolean {
  return (
    ruta.startsWith("/admin/vivo") ||
    ruta.startsWith("/sumate") ||
    ruta.endsWith("/one-pager") ||
    ruta.endsWith("/exportar")
  );
}

/** Con un campo de texto enfocado (teclado abierto en el celular) la barra baja y se esconde. */
function useEscribiendo(): boolean {
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    const esCampo = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(el.type)));
    const entra = (e: FocusEvent) => setEscribiendo(esCampo(e.target));
    const sale = () => setEscribiendo(false);
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", sale);
    return () => {
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", sale);
    };
  }, []);
  return escribiendo;
}

/**
 * Barra de navegación fija abajo, de vidrio (como el header), con las secciones
 * principales y el "+" naranja para subir el pitch. Su alto queda en `--alto-nav`
 * (globals.css): las páginas y lo fijo abajo lo suman para que nada quede tapado.
 * El feed sigue a sangre: solo sube el bloque de datos del reel.
 */
export default function NavInferior() {
  const ruta = usePathname();
  const escribiendo = useEscribiendo();
  if (sinBarra(ruta)) return null;

  const item = (i: Item) => {
    const actual = i.rutas.some((r) => ruta === r || ruta.startsWith(r.endsWith("/") ? r : `${r}/`));
    const Icono = i.icono;
    return (
      <li key={i.href} className="flex">
        <Link
          href={i.href}
          aria-label={i.label}
          aria-current={actual ? "page" : undefined}
          className={`boton relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.6875rem] leading-none text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
            actual ? "bg-tinta/[0.07] font-semibold" : "font-medium hover:bg-tinta/[0.04]"
          }`}
        >
          <Icono className="size-6" />
          <span aria-hidden>{i.label}</span>
          {actual && <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-arcilla" />}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      data-escondida={escribiendo || undefined}
      className="nav-inferior vidrio no-imprimir fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <ul className="mx-auto grid h-14 max-w-md grid-cols-5 items-center px-1">
        {IZQUIERDA.map(item)}
        <li className="flex justify-center">
          <Link
            href="/cuenta#subir-pitch"
            aria-label="Subir mi pitch"
            onClick={(e) => {
              // Ya en /cuenta: solo lleva al botón y lo resalta.
              if (ruta === "/cuenta" && resaltar("subir-pitch")) e.preventDefault();
            }}
            className="boton flex size-12 items-center justify-center rounded-full bg-naranja text-tinta shadow-[0_4px_14px_rgb(28_27_22/0.18)] hover:bg-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
          >
            <IconoMas className="size-6" />
          </Link>
        </li>
        {DERECHA.map(item)}
      </ul>
    </nav>
  );
}
