"use client";

import { useEffect } from "react";
import { observarRevelar } from "@/lib/revelar";

/**
 * Toda la capa de movimiento de la landing, sobre atributos del HTML:
 * - `data-revelar`: entra con fade + 14 px al aparecer (lib/revelar.ts). Sin
 *   JavaScript se ve todo.
 * - `data-escena`: se marca `data-en-escena` cuando está a la vista en serio
 *   (la mitad en pantalla), para las transformaciones que hay que ver pasar.
 * - `data-profundidad`: con el mouse, sus capas (`--z`) se corren a distintas
 *   profundidades. `data-magnetic`: el botón se corre un poco hacia el cursor.
 * - `#progreso`: barra de lectura atada al scroll de `scroller`.
 * - `#cta-fijo`: el CTA fijo aparece solo cuando ningún `data-cta-zona` (los CTA
 *   del hero y del cierre) está en pantalla; mientras tanto queda `inert`.
 * Con "reducir movimiento" no hay profundidad ni imán; las entradas y los
 * cambios de estado siguen, sin desplazamiento (globals.css).
 */

const TITULO_AUSENTE = "La pecera te espera · Pecera";

export default function Movimiento({ scroller }: { scroller: string }) {
  useEffect(() => {
    const contenedor = document.getElementById(scroller);
    const conMovimiento = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const limpiar: (() => void)[] = [];
    const escuchar = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      tipo: K,
      fn: (e: HTMLElementEventMap[K]) => void
    ) => {
      el.addEventListener(tipo, fn);
      limpiar.push(() => el.removeEventListener(tipo, fn));
    };

    limpiar.push(observarRevelar());

    // Escenas: se disparan con la mitad a la vista, una sola vez.
    const escenas = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.enEscena = "";
          escenas.unobserve(e.target);
        }
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll("[data-escena]").forEach((el) => escenas.observe(el));
    limpiar.push(() => escenas.disconnect());

    // CTA fijo: visible cuando no se ve ningún otro CTA.
    const fijo = document.getElementById("cta-fijo");
    if (fijo) {
      const visibles = new Set<Element>();
      const zonas = new IntersectionObserver((entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target);
          else visibles.delete(e.target);
        }
        const ocultar = visibles.size > 0;
        fijo.toggleAttribute("data-oculto", ocultar);
        fijo.toggleAttribute("inert", ocultar);
      });
      document.querySelectorAll("[data-cta-zona]").forEach((el) => zonas.observe(el));
      limpiar.push(() => zonas.disconnect());
    }

    // Barra de lectura.
    const barra = document.getElementById("progreso");
    if (contenedor && barra) {
      let pendiente = false;
      const actualizar = () => {
        pendiente = false;
        const total = contenedor.scrollHeight - contenedor.clientHeight;
        barra.style.transform = `scaleX(${total > 0 ? contenedor.scrollTop / total : 0})`;
      };
      const alScroll = () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(actualizar);
      };
      contenedor.addEventListener("scroll", alScroll, { passive: true });
      limpiar.push(() => contenedor.removeEventListener("scroll", alScroll));
      actualizar();
    }

    if (conMovimiento && conMouse) {
      // Profundidad: -1..1 según dónde está el cursor; cada capa se corre --z px.
      document.querySelectorAll<HTMLElement>("[data-profundidad]").forEach((capa) => {
        let cuadro = 0;
        escuchar(capa, "pointermove", (e) => {
          if (cuadro) return;
          cuadro = requestAnimationFrame(() => {
            cuadro = 0;
            const r = capa.getBoundingClientRect();
            capa.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
            capa.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
          });
        });
        escuchar(capa, "pointerleave", () => {
          capa.style.setProperty("--px", "0");
          capa.style.setProperty("--py", "0");
        });
      });

      // Botones magnéticos: se corren un poco hacia el cursor.
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((boton) => {
        escuchar(boton, "pointermove", (e) => {
          const r = boton.getBoundingClientRect();
          const dx = (e.clientX - r.left - r.width / 2) * 0.16;
          const dy = (e.clientY - r.top - r.height / 2) * 0.16;
          boton.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        });
        escuchar(boton, "pointerleave", () => {
          boton.style.translate = "0px 0px";
        });
      });
    }

    // Guiño en la pestaña cuando la persona se va a otra.
    const tituloOriginal = document.title;
    const alCambiarPestana = () => {
      document.title = document.hidden ? TITULO_AUSENTE : tituloOriginal;
    };
    document.addEventListener("visibilitychange", alCambiarPestana);
    limpiar.push(() => {
      document.removeEventListener("visibilitychange", alCambiarPestana);
      document.title = tituloOriginal;
    });

    return () => limpiar.forEach((fn) => fn());
  }, [scroller]);

  return null;
}
