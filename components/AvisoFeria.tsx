"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SelloFeria21, TrazoAmarillo } from "@/components/eventos/MarcaFeria21";
import { BOTON_FERIA } from "@/components/eventos/TarjetaParticipante";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { supabase } from "@/lib/supabase";
import { suscribirVoto, yaVoto } from "@/lib/voto-feria";

const EVENTO = EVENTO_ACTUAL.slug;
const VOTAR = `/eventos/${EVENTO}#votacion`;
/** Una vez por visita (pestaña). */
const CLAVE_POPUP = "pecera:popup-feria";
/** Si la votación está abierta, guardado unos minutos para no consultar en cada página. */
const CLAVE_ABIERTA = "pecera:feria-abierta";
const VIGENCIA_MS = 5 * 60 * 1000;

/**
 * Llamado a votar en la Feria 21, en toda la app mientras la votación esté abierta:
 * un pop-up una vez por visita y, hasta que el navegador vote (con o sin cuenta,
 * `pecera:voto-feria`), el sello FERIA 21 asomando en el borde izquierdo (el derecho
 * es de la columna de acciones del reel). No va en la página de la votación, ni en
 * /admin, legales, login o imprimibles.
 */
function excluida(ruta: string): boolean {
  return (
    ruta.startsWith(`/eventos/${EVENTO}`) ||
    ruta.startsWith("/admin") ||
    ruta.startsWith("/organizacion") ||
    ruta.startsWith("/auth") ||
    ruta.startsWith("/privacidad") ||
    ruta.startsWith("/terminos") ||
    ruta.startsWith("/cuenta/eliminar") ||
    ruta.endsWith("/one-pager") ||
    ruta.endsWith("/exportar")
  );
}

function leerAbierta(): boolean | null {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_ABIERTA) ?? "null") as { v: boolean; t: number } | null;
    if (guardado && Date.now() - guardado.t < VIGENCIA_MS) return guardado.v;
  } catch {
    // Sin storage: se consulta.
  }
  return null;
}

/** ¿La votación está abierta? null mientras no se sabe; ante cualquier falla, false. */
function useVotacionAbierta(): boolean | null {
  const [abierta, setAbierta] = useState<boolean | null>(null);
  useEffect(() => {
    let vigente = true;
    const guardado = leerAbierta();
    const consulta: PromiseLike<boolean> =
      guardado !== null
        ? Promise.resolve(guardado)
        : supabase
            .from("eventos")
            .select("votacion_abierta")
            .eq("slug", EVENTO)
            .eq("activo", true)
            .maybeSingle()
            .then(({ data }) => {
              const v = !!(data as { votacion_abierta: boolean } | null)?.votacion_abierta;
              try {
                sessionStorage.setItem(CLAVE_ABIERTA, JSON.stringify({ v, t: Date.now() }));
              } catch {
                // Sin storage: se vuelve a consultar en la próxima página.
              }
              return v;
            });
    consulta.then(
      (v) => vigente && setAbierta(v),
      () => vigente && setAbierta(false)
    );
    return () => {
      vigente = false;
    };
  }, []);
  return abierta;
}

export default function AvisoFeria() {
  const ruta = usePathname();
  const abierta = useVotacionAbierta();
  // En el servidor e hidratando, "ya votó": no se dibuja nada hasta saber.
  const voto = useSyncExternalStore(suscribirVoto, () => yaVoto(EVENTO), () => true);
  const dialogo = useRef<HTMLDialogElement>(null);
  const activo = abierta === true && !voto && !excluida(ruta);

  useEffect(() => {
    if (!activo) return;
    try {
      if (sessionStorage.getItem(CLAVE_POPUP)) return;
    } catch {
      return;
    }
    // Un respiro para que la página se dibuje primero.
    const t = setTimeout(() => {
      const d = dialogo.current;
      if (!d || d.open) return;
      try {
        sessionStorage.setItem(CLAVE_POPUP, "1");
      } catch {
        // Sin storage no se insiste: se mostró una vez en esta página.
      }
      d.showModal();
    }, 1200);
    return () => clearTimeout(t);
  }, [activo]);

  if (!activo) return null;

  return (
    <>
      <dialog
        ref={dialogo}
        aria-labelledby="popup-feria-titulo"
        onClick={(e) => {
          // Tocar afuera de la tarjeta cierra.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="tema-fijo m-auto w-[min(22rem,calc(100vw-2rem))] overflow-visible rounded-[2rem] bg-transparent p-0 backdrop:bg-black/55"
      >
        <div className="relative flex flex-col items-start gap-4 rounded-[2rem] bg-s21-verde-oscuro px-6 pb-6 pt-7 text-white shadow-[0_24px_60px_rgb(0_0_0/0.35)]">
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Cerrar"
            className="boton absolute right-3 top-3 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ×
          </button>
          <SelloFeria21 chico />
          <div>
            <h2 id="popup-feria-titulo" className="font-sans text-3xl font-bold uppercase leading-[0.95] tracking-tight">
              ¡Votá ya tu emprendimiento favorito!
            </h2>
            <TrazoAmarillo className="mt-2 h-3.5 w-36" />
          </div>
          <p className="text-base leading-relaxed text-white/90">
            El ganador se lleva la insignia <strong className="font-semibold text-white">«Ganador Feria 21»</strong> y el{" "}
            <strong className="font-semibold text-white">Verificado de Pecera</strong>.
          </p>
          <div className="flex w-full flex-col gap-2">
            <Link href={VOTAR} onClick={() => dialogo.current?.close()} className={BOTON_FERIA}>
              Votar ahora
            </Link>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="boton min-h-11 rounded-full text-sm font-medium text-white/90 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Ahora no
            </button>
          </div>
        </div>
      </dialog>

      {/* El sello que asoma en el borde hasta que vote. */}
      <Link
        href={VOTAR}
        aria-label="Votá en la Feria 21"
        className="burbuja-feria tema-fijo fixed left-0 top-[42%] z-30 flex -translate-x-1.5 flex-col items-start rounded-r-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-s21-verde-oscuro"
      >
        <span aria-hidden className="ml-3 -mb-1.5 rounded-full bg-s21-amarillo px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-[#353535] shadow">
          ¡Votá!
        </span>
        <SelloFeria21 chico className="rounded-l-none pl-3.5" />
      </Link>
    </>
  );
}
