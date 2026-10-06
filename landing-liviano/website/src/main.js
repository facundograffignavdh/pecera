import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setupDemo } from "./demo.js";
import { setupMapa } from "./mapa.js";
import { setupPitches } from "./pitches.js";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isDesktop = () => matchMedia("(hover: hover) and (min-width: 769px)").matches;

/* ---------- Smooth scroll (Lenis drives ScrollTrigger) ---------- */
const lenis = new Lenis({ duration: 1.2, smoothWheel: !reduceMotion });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Anchor links go through Lenis so pins and scrub stay in sync
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0 });
    if (target.id === "page") target.focus({ preventScroll: true });
  });
});

/* ---------- Background video scrub + reading bar ---------- */
const bgVideo = document.getElementById("bgv");
const barra = document.getElementById("progreso");
let lastVideoT = -1;
let galleryST = null;

// While the audience gallery is pinned, the video advances at k speed so
// the macro → workspace transition isn't burned through during the pin.
const PIN_VIDEO_SPEED = 0.18;

function onFrame() {
  const y = lenis.scroll;
  barra.style.transform = `scaleX(${lenis.limit > 0 ? y / lenis.limit : 0})`;

  if (!bgVideo.duration || !isDesktop()) return;

  let eff = y;
  let removed = 0;
  if (galleryST) {
    const gs = galleryST.start;
    const ge = galleryST.end;
    removed = (ge - gs) * (1 - PIN_VIDEO_SPEED);
    if (y >= ge) eff = y - removed;
    else if (y > gs) eff = gs + (y - gs) * PIN_VIDEO_SPEED;
  }

  const p = gsap.utils.clamp(0, 1, eff / Math.max(1, lenis.limit - removed));
  const t = p * (bgVideo.duration - 0.05);
  if (Math.abs(t - lastVideoT) > 0.008) {
    bgVideo.currentTime = t;
    lastVideoT = t;
  }
}

bgVideo.pause();
bgVideo.addEventListener("loadedmetadata", onFrame);
gsap.ticker.add(onFrame);

/* ---------- Entradas de la app (lib/revelar.ts) ----------
   `data-revelar`: fade + 14 px al aparecer. Lo que ya está en pantalla se marca
   antes de esconder nada, así no parpadea; sin JS se ve todo.
   `data-escena`: se marca `data-en-escena` con la mitad a la vista (una vez). */
function splitPalabras(el) {
  const palabras = el.textContent.trim().split(/\s+/);
  el.replaceChildren(
    ...palabras.flatMap((w, i) => {
      const span = document.createElement("span");
      span.className = "palabra";
      span.style.setProperty("--i", i);
      span.textContent = w;
      return i < palabras.length - 1 ? [span, " "] : [span];
    }),
  );
}

function setupRevelar() {
  document.querySelectorAll("[data-palabras]").forEach(splitPalabras);

  const raiz = document.documentElement;
  const bloques = [...document.querySelectorAll("[data-revelar]")];
  const mostrar = (el) => {
    el.dataset.visible = "";
  };
  const limite = innerHeight * 0.92;
  for (const el of bloques) if (el.getBoundingClientRect().top < limite) mostrar(el);
  raiz.dataset.revelar = "";

  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        mostrar(e.target);
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  for (const el of bloques) if (!("visible" in el.dataset)) io.observe(el);

  const escenas = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.dataset.enEscena = "";
        escenas.unobserve(e.target);
      }
    },
    { threshold: 0.5 },
  );
  document.querySelectorAll("[data-escena]").forEach((el) => escenas.observe(el));
}

/* ---------- Hero: el panel se aleja cuando el video empieza a moverse ---------- */
function setupHero() {
  gsap.to(".hero__panel", {
    yPercent: -12,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: "#home", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".pista-scroll", {
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: "#home", start: "top top", end: "20% top", scrub: true },
  });
}

/* ---------- Lema: fijado, palabra por palabra con el scroll ---------- */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.replaceChildren(
    ...words.flatMap((w, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = w;
      return i < words.length - 1 ? [span, " "] : [span];
    }),
  );
  return [...el.querySelectorAll(".word")];
}

function setupLema() {
  const section = document.querySelector("#lema");
  const words = [...section.querySelectorAll("[data-split]")].flatMap(splitWords);

  function render(p) {
    words.forEach((word, i) => {
      const start = (i / words.length) * 0.7;
      const o = gsap.utils.clamp(0, 1, (p - start) / 0.14);
      word.style.opacity = 0.14 + o * 0.86;
      word.style.filter = `blur(${(1 - o) * 8}px)`;
      word.style.transform = `translateY(${(1 - o) * 18}px)`;
    });
  }

  if (reduceMotion) {
    render(1);
    return () => words.forEach((w) => w.removeAttribute("style"));
  }

  render(0);
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => "+=" + innerHeight * 1.4,
    pin: ".lema__pin",
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => render(self.progress),
  });

  return () => words.forEach((w) => w.removeAttribute("style"));
}

/* ---------- Para vos: una tarjeta a la vez ---------- */
function setupGaleria() {
  const slides = [...document.querySelectorAll("#galeria-pista .tarjeta")];
  const N = slides.length;
  const indexEl = document.getElementById("wf-index");
  document.getElementById("wf-total").textContent = String(N).padStart(2, "0");

  function render(p) {
    const pos = p * (N - 1);
    indexEl.textContent = String(Math.round(pos) + 1).padStart(2, "0");
    slides.forEach((el, i) => {
      const d = pos - i;
      const ad = Math.abs(d);
      const opacity = Math.max(0, 1 - ad / 0.6);
      el.style.opacity = opacity;
      el.style.transform = `translate(${-d * 130}px, -50%) scale(${1 - Math.min(ad, 1) * 0.06})`;
      el.style.filter = `blur(${Math.min(ad * 10, 14)}px)`;
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.style.pointerEvents = opacity > 0.6 ? "auto" : "none";
      el.inert = opacity <= 0.6;
    });
  }

  render(0);
  galleryST = ScrollTrigger.create({
    trigger: "#para-vos",
    start: "top top",
    end: () => "+=" + Math.max(1, N - 1) * innerHeight * 0.72,
    pin: ".galeria__pin",
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => render(self.progress),
  });

  return () => {
    galleryST = null;
    slides.forEach((el) => {
      el.removeAttribute("style");
      el.inert = false;
    });
  };
}

/* ---------- Botones magnéticos (Movimiento.tsx) ---------- */
function setupMagnetic() {
  if (reduceMotion || !conMouse) return;
  document.querySelectorAll("[data-magnetic]").forEach((boton) => {
    boton.addEventListener("pointermove", (e) => {
      const r = boton.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.16;
      const dy = (e.clientY - r.top - r.height / 2) * 0.16;
      boton.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
    boton.addEventListener("pointerleave", () => {
      boton.style.translate = "0px 0px";
    });
  });
}

/* ---------- Switch Privado ↔ Transparente (liquid glass de la app) ---------- */
function setupSwitch() {
  const sw = document.getElementById("switch-doc");
  const estado = document.getElementById("estado-doc");
  sw.addEventListener("click", () => {
    const on = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", String(on));
    estado.textContent = on
      ? "Transparente · Lo ven quienes visitan tu empresa."
      : "Privado · Solo lo ve tu equipo.";
  });
}

/* ---------- Nav: marca la sección visible ---------- */
function setupNavActiva() {
  const links = [...document.querySelectorAll(".nav__links a")];
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute("href"));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => {
        if (self.isActive) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          a.setAttribute("aria-current", "true");
        } else {
          a.removeAttribute("aria-current");
        }
      },
    });
  });
}

/* ---------- Init ---------- */
setupRevelar();
setupMagnetic();
setupSwitch();
setupPitches({ reduceMotion, alCambiarAlto: () => ScrollTrigger.refresh() });
setupMapa();
setupDemo({ reduceMotion });

const mm = gsap.matchMedia();
mm.add("(hover: hover) and (min-width: 769px)", () => {
  if (!reduceMotion) setupHero();
  const cleanLema = setupLema();
  const cleanGaleria = setupGaleria();
  setupNavActiva();
  return () => {
    cleanLema();
    cleanGaleria();
  };
});

addEventListener("load", () => ScrollTrigger.refresh());

if (import.meta.env.DEV) {
  window.__lenis = lenis;
  window.__ST = ScrollTrigger;
  window.__bgv = bgVideo;
}
