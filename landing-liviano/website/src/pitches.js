import { API, APP } from "./app-url.js";

/* ---------- Carrusel de pitches (debajo del lema) ----------
   Pide los pitches publicados a la app (/api/landing/pitches) cuando la sección se
   acerca. Mientras tanto, esqueletos del mismo tamaño; si falla o no hay pitches, el
   bloque desaparece y la sección queda como siempre. Cada tarjeta abre el feed en ese
   pitch (`/#<id>`). Se mueve solo y despacio (pausable); con reducir movimiento, no. */

const ROLES = {
  emprendedor: { label: "Emprendedor", punto: "punto--arcilla" },
  inversor: { label: "Inversor", punto: "punto--inversor" },
  aliado: { label: "Aliado", punto: "punto--aliado" },
};

const VELOCIDAD = 22; // px por segundo
const ESPERA_FINAL_MS = 2000;
const TIMEOUT_MS = 6000;
const ESQUELETOS = 4;

function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto != null) nodo.textContent = texto;
  return nodo;
}

function tarjeta(p) {
  const rol = ROLES[p.rol] ?? ROLES.emprendedor;
  const li = el("li", "pitch-tarjeta");
  const a = el("a", "pitch-tarjeta__link");
  a.href = `${APP}/#${encodeURIComponent(p.id)}`;
  a.draggable = false;

  const img = el("img", "pitch-tarjeta__poster");
  img.src = p.poster;
  img.alt = "";
  img.width = 270;
  img.height = 480;
  img.loading = "lazy";
  img.decoding = "async";
  img.draggable = false;

  const cuerpo = el("span", "pitch-tarjeta__cuerpo");
  cuerpo.append(el("span", "pitch-tarjeta__nombre", p.nombre));
  const meta = el("span", "pitch-tarjeta__meta");
  meta.append(el("span", `punto ${rol.punto}`), el("span", null, p.empresa ? `${rol.label} · ${p.empresa}` : rol.label));
  cuerpo.append(meta);
  if (p.descripcion) cuerpo.append(el("span", "pitch-tarjeta__frase", p.descripcion));
  const ver = el("span", "pitch-tarjeta__ver", "Ver pitch ");
  const flecha = el("span", null, "→");
  flecha.setAttribute("aria-hidden", "true");
  ver.append(flecha);
  cuerpo.append(ver);

  a.append(img, cuerpo);
  li.append(a);
  return li;
}

function esValido(p) {
  return p && typeof p.id === "string" && typeof p.poster === "string" && /^https?:\/\//.test(p.poster) && typeof p.nombre === "string";
}

async function pedir() {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/api/landing/pitches?n=12`, { signal: control.signal });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.pitches) ? json.pitches.filter(esValido) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function setupPitches({ reduceMotion, alCambiarAlto }) {
  const bloque = document.getElementById("pitches");
  if (!bloque) return;
  const pista = bloque.querySelector(".pitches__pista");
  const anterior = bloque.querySelector("[data-pitches='anterior']");
  const siguiente = bloque.querySelector("[data-pitches='siguiente']");
  const pausa = bloque.querySelector("[data-pitches='pausa']");

  // Esqueletos: ocupan el alto final desde el principio, así nada salta.
  pista.replaceChildren(
    ...Array.from({ length: ESQUELETOS }, () => {
      const li = el("li", "pitch-tarjeta pitch-tarjeta--esqueleto");
      li.setAttribute("aria-hidden", "true");
      return li;
    }),
  );
  bloque.hidden = false;
  bloque.setAttribute("aria-busy", "true");

  const cargar = new IntersectionObserver(
    async (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      cargar.disconnect();
      const pitches = await pedir();
      if (!pitches.length) {
        bloque.remove();
        alCambiarAlto();
        return;
      }
      pista.replaceChildren(...pitches.map(tarjeta));
      bloque.removeAttribute("aria-busy");
      alCambiarAlto();
      iniciar();
    },
    { rootMargin: "800px 0px" },
  );
  cargar.observe(bloque);

  function iniciar() {
    const paso = () => {
      const t = pista.querySelector(".pitch-tarjeta");
      const gap = parseFloat(getComputedStyle(pista).columnGap) || 0;
      return t ? t.getBoundingClientRect().width + gap : pista.clientWidth * 0.8;
    };
    const maximo = () => pista.scrollWidth - pista.clientWidth;
    const comportamiento = reduceMotion ? "auto" : "smooth";

    function actualizarFlechas() {
      anterior.disabled = pista.scrollLeft <= 2;
      siguiente.disabled = pista.scrollLeft >= maximo() - 2;
    }
    pista.addEventListener("scroll", actualizarFlechas, { passive: true });
    addEventListener("resize", actualizarFlechas);
    actualizarFlechas();

    /* --- Movimiento automático --- */
    let detenido = reduceMotion; // lo paró la persona (o reducir movimiento)
    let encima = false; // mouse o foco adentro: pausa momentánea
    let visible = false;
    let pos = pista.scrollLeft;
    let ultimo = null;
    let esperaHasta = 0;
    let volviendo = false;
    let raf = null;

    const corre = () => !detenido && !encima && visible && !document.hidden;

    function cuadro(ts) {
      raf = null;
      if (!corre()) {
        ultimo = null;
        bloque.classList.remove("pitches--auto");
        return;
      }
      bloque.classList.add("pitches--auto");
      if (ultimo === null) {
        ultimo = ts;
        pos = pista.scrollLeft;
      }
      const dt = Math.min(0.1, (ts - ultimo) / 1000);
      ultimo = ts;
      if (ts >= esperaHasta && !volviendo) {
        if (pos >= maximo() - 1) {
          // Al final: espera y vuelve al principio.
          volviendo = true;
          setTimeout(() => {
            if (!detenido) pista.scrollTo({ left: 0, behavior: "smooth" });
            setTimeout(() => {
              pos = 0;
              volviendo = false;
              esperaHasta = performance.now() + 800;
            }, 900);
          }, ESPERA_FINAL_MS);
        } else {
          pos += VELOCIDAD * dt;
          pista.scrollLeft = pos;
        }
      }
      raf = requestAnimationFrame(cuadro);
    }
    function despertar() {
      if (raf === null && corre()) raf = requestAnimationFrame(cuadro);
      if (!corre()) bloque.classList.remove("pitches--auto");
    }
    function pintarPausa() {
      pausa.setAttribute("aria-pressed", String(detenido));
      pausa.querySelector(".pitches__pausa-texto").textContent = detenido ? "Seguir" : "Pausar";
      pausa.setAttribute("aria-label", detenido ? "Seguir el movimiento de los pitches" : "Pausar el movimiento de los pitches");
    }
    function detener() {
      if (detenido) return;
      detenido = true;
      pintarPausa();
      despertar();
    }

    if (reduceMotion) {
      pausa.hidden = true;
    } else {
      pausa.hidden = false;
      pintarPausa();
      pausa.addEventListener("click", () => {
        detenido = !detenido;
        ultimo = null;
        pintarPausa();
        despertar();
      });
      new IntersectionObserver(
        (entradas) => {
          visible = entradas.some((e) => e.isIntersecting);
          despertar();
        },
        { threshold: 0.25 },
      ).observe(pista);
      document.addEventListener("visibilitychange", despertar);
      bloque.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") {
          encima = true;
          despertar();
        }
      });
      bloque.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "mouse" && !bloque.contains(document.activeElement)) {
          encima = false;
          despertar();
        }
      });
      bloque.addEventListener("focusin", () => {
        encima = true;
        despertar();
      });
      bloque.addEventListener("focusout", (e) => {
        if (!bloque.contains(e.relatedTarget)) {
          encima = false;
          despertar();
        }
      });
    }

    /* --- Flechas en pantalla y teclado --- */
    const mover = (sentido) => {
      detener();
      pista.scrollBy({ left: sentido * paso(), behavior: comportamiento });
    };
    anterior.addEventListener("click", () => mover(-1));
    siguiente.addEventListener("click", () => mover(1));
    pista.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      mover(e.key === "ArrowRight" ? 1 : -1);
    });

    /* --- Tacto: el arrastre es nativo; tocar detiene el automático --- */
    pista.addEventListener("touchstart", detener, { passive: true });

    /* --- Rueda: lo horizontal (trackpad) es nativo gracias a data-lenis-prevent-horizontal.
       Shift + rueda en navegadores que mandan deltaY: se pasa a horizontal acá. --- */
    pista.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          detener();
          return;
        }
        if (e.shiftKey && e.deltaY) {
          e.preventDefault();
          e.stopPropagation();
          detener();
          pista.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );

    /* --- Arrastre con el mouse --- */
    let arrastre = null;
    let huboArrastre = false;
    pista.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      arrastre = { x: e.clientX, left: pista.scrollLeft, id: e.pointerId };
      huboArrastre = false;
    });
    pista.addEventListener("pointermove", (e) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      const dx = e.clientX - arrastre.x;
      if (!huboArrastre && Math.abs(dx) > 6) {
        huboArrastre = true;
        detener();
        pista.setPointerCapture(e.pointerId);
        bloque.classList.add("pitches--arrastrando");
      }
      if (huboArrastre) pista.scrollLeft = arrastre.left - dx;
    });
    const soltar = () => {
      if (!arrastre) return;
      arrastre = null;
      bloque.classList.remove("pitches--arrastrando");
    };
    pista.addEventListener("pointerup", soltar);
    pista.addEventListener("pointercancel", soltar);
    // Si hubo arrastre, el click del final no abre el pitch.
    pista.addEventListener(
      "click",
      (e) => {
        if (huboArrastre) {
          e.preventDefault();
          e.stopPropagation();
          huboArrastre = false;
        }
      },
      true,
    );

    despertar();
  }
}
