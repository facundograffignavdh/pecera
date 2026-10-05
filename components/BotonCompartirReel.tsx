"use client";

import { useEffect, useState } from "react";
import { IconoCompartir } from "@/components/Iconos";
import { registrarActividad } from "@/lib/actividad";
import { urlSitio } from "@/lib/cuenta";
import type { ItemFeed } from "@/types/pecera";

/**
 * Mensaje listo para mandar: el link que abre este reel (`/#<pitch>` salta a él al
 * cargar) y la landing para que quien lo recibe se sume. `src=compartir` entra en la
 * atribución (lib/atribucion.ts limpia el query y conserva el #).
 */
export function mensajeCompartir(item: ItemFeed): { titulo: string; texto: string; url: string } {
  const url = urlSitio(`/?src=compartir#${item.pitch.id}`);
  const sumate = urlSitio("/sumate?src=compartir");
  return {
    titulo: `${item.perfil.nombre} en Pecera`,
    texto: `Mirá el pitch de ${item.perfil.nombre} en Pecera: ${url}\n\n¿Emprendés, invertís o acompañás a quienes emprenden? Sumate a Pecera: ${sumate}`,
    url,
  };
}

/** Botón de la columna del reel, entre el corazón y los subtítulos. */
export default function BotonCompartirReel({ item }: { item: ItemFeed }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  async function compartir() {
    const { titulo, texto, url } = mensajeCompartir(item);
    if (navigator.share) {
      try {
        // El link ya va en el texto: algunas apps duplican `url` si se manda aparte.
        await navigator.share({ title: titulo, text: texto });
        registrarActividad({ nombre: "pitch_compartido", perfilId: item.perfil.id, canal: "nativo" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
      registrarActividad({ nombre: "pitch_compartido", perfilId: item.perfil.id, canal: "copiado" });
      setCopiado(true);
    } catch {
      window.prompt("Copiá el link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      aria-label="Compartir"
      className="relative flex h-12 w-12 items-center justify-center"
    >
      <IconoCompartir className="icono-sombra h-7 w-7 text-marfil" />
      <span aria-live="polite" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
      {/* Aviso visual a la izquierda del ícono: no mueve la columna. */}
      {copiado && (
        <span
          aria-hidden
          className="vidrio pointer-events-none absolute right-full top-1/2 mr-1 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-tinta"
        >
          Copiado
        </span>
      )}
    </button>
  );
}
