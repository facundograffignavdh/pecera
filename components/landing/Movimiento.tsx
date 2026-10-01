"use client";

import { useEffect } from "react";
import { observarRevelar } from "@/lib/revelar";

/**
 * Toda la capa de movimiento de la landing, sobre atributos del HTML:
 * - `data-revelar`: entra con fade + 14 px al aparecer. Los bloques solo se
 *   esconden cuando este efecto marca el <html>: sin JavaScript se ve todo.
 * - `data-contar`: número que cuenta desde 0 al revelarse su bloque.
 * - `data-tilt` / `data-magnetic`: tarjetas que se inclinan y botones que
 *   siguen al cursor (solo con mouse).
 * - `#progreso`, `#arriba`, `[data-parallax]`: atados al scroll de `scroller`.
 * - `[data-carrusel]`: flechas del carrusel.
 * Con "reducir movimiento" queda solo lo esencial: nada se mueve ni cuenta.
 */

const TITULO_AUSENTE = "La pecera te espera · Pecera";

function contar(el: HTMLElement) {
  const fin = Number(el.dataset.contar);
  const antes = el.dataset.prefijo ?? "";
  const despues = el.dataset.sufijo ?? "";
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const t = Math.min((ahora - inicio) / 1100, 1);
    el.textContent = antes + Math.round(fin * (1 - Math.pow(1 - t, 3))) + despues;
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

export default function Movimiento({ scroller }: { scroller: string }) {
  useEffect(() => {
    const contenedor = document.getElementById(scroller);
    const conMovimiento = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conMouse = window.matchMedia("(hover: hover)").matches;
    const limpiar: (() => void)[] = [];
    const escuchar = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      tipo: K,
      fn: (e: HTMLElementEventMap[K]) => void
    ) => {
      el.addEventListener(tipo, fn);
      limpiar.push(() => el.removeEventListener(tipo, fn));
    };

    // Entradas al hacer scroll; los números cuentan al revelarse su bloque.
    limpiar.push(
      observarRevelar((el) => {
        if (conMovimiento) el.querySelectorAll<HTMLElement>("[data-contar]").forEach(contar);
      })
    );

    // Barra de progreso, burbuja para volver arriba y parallax del hero.
    const barra = document.getElementById("progreso");
    const arriba = document.getElementById("arriba") as HTMLButtonElement | null;
    const parallax = document.querySelector<HTMLElement>("[data-parallax]");
    if (contenedor) {
      let pendiente = false;
      const actualizar = () => {
        pendiente = false;
        const y = contenedor.scrollTop;
        const total = contenedor.scrollHeight - contenedor.clientHeight;
        if (barra) barra.style.transform = `scaleX(${total > 0 ? y / total : 0})`;
        arriba?.toggleAttribute("data-oculto", y < 700);
        if (parallax && conMovimiento) {
          const p = Math.min(1, y / (window.innerHeight * 0.8));
          parallax.style.transform = `translateY(${(-p * 60).toFixed(1)}px)`;
          parallax.style.opacity = String(1 - p * 0.85);
        }
      };
      const alScroll = () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(actualizar);
      };
      contenedor.addEventListener("scroll", alScroll, { passive: true });
      limpiar.push(() => contenedor.removeEventListener("scroll", alScroll));
      actualizar();

      if (arriba) {
        escuchar(arriba, "click", () =>
          contenedor.scrollTo({ top: 0, behavior: conMovimiento ? "smooth" : "auto" })
        );
      }
    }

    // Tarjetas con tilt 3D y luz que sigue al cursor.
    if (conMovimiento && conMouse) {
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((tarjeta) => {
        let cuadro = 0;
        escuchar(tarjeta, "mousemove", (e) => {
          if (cuadro) return;
          cuadro = requestAnimationFrame(() => {
            cuadro = 0;
            const r = tarjeta.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            tarjeta.style.setProperty("--ry", `${((x / r.width - 0.5) * 6).toFixed(2)}deg`);
            tarjeta.style.setProperty("--rx", `${(-(y / r.height - 0.5) * 6).toFixed(2)}deg`);
            tarjeta.style.setProperty("--lift", "-4px");
            tarjeta.style.setProperty("--mx", `${x.toFixed(0)}px`);
            tarjeta.style.setProperty("--my", `${y.toFixed(0)}px`);
          });
        });
        escuchar(tarjeta, "mouseleave", () => {
          tarjeta.style.setProperty("--rx", "0deg");
          tarjeta.style.setProperty("--ry", "0deg");
          tarjeta.style.setProperty("--lift", "0px");
        });
      });

      // Botones magnéticos: se corren un poco hacia el cursor.
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((boton) => {
        escuchar(boton, "mousemove", (e) => {
          const r = boton.getBoundingClientRect();
          const dx = (e.clientX - r.left - r.width / 2) * 0.18;
          const dy = (e.clientY - r.top - r.height / 2) * 0.18;
          boton.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        });
        escuchar(boton, "mouseleave", () => {
          boton.style.translate = "0px 0px";
        });
      });
    }

    // Carrusel: flechas y bordes.
    document.querySelectorAll<HTMLElement>("[data-carrusel]").forEach((pista) => {
      const bloque = pista.closest<HTMLElement>("[data-carrusel-raiz]");
      const prev = bloque?.querySelector<HTMLButtonElement>("[data-carrusel-prev]");
      const next = bloque?.querySelector<HTMLButtonElement>("[data-carrusel-next]");
      if (!prev || !next) return;
      const paso = () => Math.max(pista.clientWidth * 0.8, 280);
      const comportamiento = conMovimiento ? "smooth" : "auto";
      const bordes = () => {
        prev.disabled = pista.scrollLeft <= 4;
        next.disabled = pista.scrollLeft >= pista.scrollWidth - pista.clientWidth - 4;
      };
      escuchar(prev, "click", () => pista.scrollBy({ left: -paso(), behavior: comportamiento }));
      escuchar(next, "click", () => pista.scrollBy({ left: paso(), behavior: comportamiento }));
      escuchar(pista, "scroll", bordes);
      bordes();
    });

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
