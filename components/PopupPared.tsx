"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { entrar } from "@/app/cuenta/acciones";
import AvisoEntrar from "@/components/AvisoEntrar";
import AvisoNavegadorInterno from "@/components/AvisoNavegadorInterno";
import { IconoCerrar } from "@/components/Iconos";
import { marcarEntrandoDesdePared } from "@/lib/pared";
import { boton } from "@/lib/ui";
import { listaTraspaso } from "@/lib/visitas";
import type { ItemFeed } from "@/types/pecera";

const SALIDA_MS = 150;
const sinCambios = () => () => {};

type Props = {
  /** El reel que quedó detrás de la pared; `null` = cerrado. */
  item: ItemFeed | null;
  /** Traspaso de la sesión prendido (/admin): aviso y casilla antes del botón. */
  traspaso: boolean;
  onCerrado: () => void;
};

/**
 * La pared de pitches: para seguir viendo pitches hay que entrar con Google (un toque, sin
 * campos). Vuelve al mismo pitch (`next` con `#<pitch>`, `destinoSeguro` en el callback). No
 * atrapa: se cierra con ✕ o Escape y ofrece ir a perfiles, Explorar o Eventos, que siguen libres.
 * En los navegadores internos (Instagram, LinkedIn…) Google bloquea el login: `AvisoNavegadorInterno`
 * ofrece copiar el link. Mismo `<dialog>` que PopupPique, pero con la tarjeta en Marfil sólido
 * porque lleva más texto (AA sobre cualquier video).
 */
export default function PopupPared({ item, traspaso, onCerrado }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [saliendo, setSaliendo] = useState(false);
  const timer = useRef<number | null>(null);
  const ruta = useSyncExternalStore(sinCambios, () => window.location.pathname + window.location.search, () => "/");

  useEffect(() => {
    const dialogo = ref.current;
    if (item && dialogo && !dialogo.open) dialogo.showModal();
  }, [item]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  function cerrar() {
    if (timer.current !== null) return;
    setSaliendo(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      ref.current?.close();
    }, SALIDA_MS);
  }

  if (!item) return null;
  const { perfil, pitch } = item;

  return (
    <dialog
      ref={ref}
      aria-labelledby="popup-pared-titulo"
      data-saliendo={saliendo || undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
      onClose={() => {
        setSaliendo(false);
        onCerrado();
      }}
      className="popup-pique m-0 h-dvh max-h-none w-full max-w-none items-center justify-center bg-transparent p-4 open:flex"
    >
      <div className="popup-tarjeta relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-marfil px-5 pb-5 pt-6 text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.12),0_16px_40px_rgb(28_27_22/0.22)]">
        <h2 id="popup-pared-titulo" className="pr-8 font-display text-2xl font-semibold leading-tight">
          Entrá para seguir viendo pitches
        </h2>
        <p className="mt-2 text-[15px] leading-snug">
          Ya viste los pitches libres. Con tu cuenta seguís mirando todos los que quieras. Es gratis y es un toque.
        </p>

        <div className="mt-3">
          <AvisoNavegadorInterno />
        </div>

        <form action={entrar} onSubmit={marcarEntrandoDesdePared} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="next" value={`${ruta}#${pitch.id}`} />
          {traspaso && <CasillaTraspaso />}
          <button type="submit" className={boton("primario", "lg")}>
            Entrar con Google
          </button>
          <AvisoEntrar />
        </form>

        <nav aria-label="Seguir sin cuenta" className="mt-4 border-t border-tinta/10 pt-3">
          <p className="text-sm">Sin cuenta podés seguir con todo lo demás:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li>
              <Link href={`/p/${perfil.slug}?desde=${pitch.id}`} className={boton("secundario", "sm")}>
                Ver el perfil de {perfil.nombre.split(" ")[0]}
              </Link>
            </li>
            <li>
              <Link href="/explorar" className={boton("secundario", "sm")}>
                Explorar
              </Link>
            </li>
            <li>
              <Link href="/eventos" className={boton("secundario", "sm")}>
                Eventos
              </Link>
            </li>
          </ul>
        </nav>

        {/* Último en el DOM para que showModal() enfoque primero la acción principal. */}
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="group absolute right-1 top-1 flex h-11 w-11 items-center justify-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-tinta/15 bg-marfil transition-colors duration-200 ease-pecera group-hover:bg-tinta/5">
            <IconoCerrar className="h-[18px] w-[18px]" />
          </span>
        </button>
      </div>
    </dialog>
  );
}

/**
 * Aviso y casilla del traspaso, ANTES del botón. Tildada (por defecto): se acredita lo de esta
 * visita y de ahí en más las visitas se ven. Destildada: no se acredita nada y la cuenta queda en
 * modo privado. La lista se toma al abrir el pop-up (6 h, 10 por tipo) y viaja en el form.
 */
function CasillaTraspaso() {
  const [lista] = useState(() => listaTraspaso(true));
  const [mostrar, setMostrar] = useState(true);
  const valor = JSON.stringify(mostrar ? lista : { mostrar: false, perfiles: [], pitches: [], piques: [] });
  return (
    <div className="mb-1 rounded-xl border border-tinta/15 px-3 py-2.5 text-sm leading-snug">
      <p>
        Los perfiles que abriste, los pitches que viste y los piques que diste en esta visita se les van a mostrar a
        sus dueños, y también lo que visites de ahora en más. Lo podés apagar cuando quieras en Mi CRM.{" "}
        <Link href="/privacidad#visitas" target="_blank" className="underline underline-offset-2">
          Más info
        </Link>
      </p>
      <label className="mt-2 flex min-h-11 items-center gap-2.5 font-medium">
        <input
          type="checkbox"
          checked={mostrar}
          onChange={(e) => setMostrar(e.target.checked)}
          className="size-5 shrink-0 accent-tinta"
        />
        Mostrar que visité y di pique
      </label>
      <input type="hidden" name="traspaso" value={valor} />
    </div>
  );
}
