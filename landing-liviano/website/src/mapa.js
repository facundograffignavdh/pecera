import { APP } from "./app-url.js";

/* ---------- Mapa del ecosistema (components/landing/MapaEcosistema.tsx) ----------
   Pecera al centro y cinco grupos alrededor. Elegir uno enciende su rama y muestra sus
   módulos. Es un tablist: flechas para moverse, el panel cambia al toque.
   Datos fijos por ahora (en la app salen del código): el evento actual (Feria 21,
   /eventos/feria-21), 13 lecciones de Startup Essentials y 10 templates. */

const EVENTO = { nombre: "Feria 21", slug: "feria-21" };
const LECCIONES = 13;
const TEMPLATES = 10;

export const MAPA_GRUPOS = [
  {
    nombre: "Descubrir",
    bajada: "Encontrá proyectos, inversores y aliados sin depender de a quién conocés.",
    modulos: [
      { nombre: "Feed de pitches", texto: "Pitches verticales de 90 segundos, uno atrás del otro.", href: "/" },
      { nombre: "Explorar", texto: "Directorio con búsqueda y filtros por rol, industria, etapa y portfolio.", href: "/explorar" },
      { nombre: "Perfiles y empresas", texto: "Cada persona y cada empresa con su página y su link para compartir." },
    ],
  },
  {
    nombre: "Construir",
    bajada: "Tu identidad en el ecosistema, y la de tu empresa, en un mismo lugar.",
    modulos: [
      { nombre: "Perfil", texto: "Quién sos, qué hacés y tus canales de contacto." },
      { nombre: "Empresa y equipo", texto: "Sumá a tu equipo con un código: cada uno con su cargo." },
      { nombre: "Producto y One Pager", texto: "Tu producto o servicio con imágenes, y una hoja lista para mandar." },
      { nombre: "Build in Public", texto: "Hitos, avances y una racha por cada semana que contás algo." },
    ],
  },
  {
    nombre: "Conectar",
    bajada: "Del interés a la conversación, sin intermediarios.",
    modulos: [
      { nombre: "Piques", texto: "El “me picó” de Pecera: interés, no compromiso." },
      { nombre: "Contacto directo", texto: "WhatsApp, email, LinkedIn o web, desde cada perfil." },
      { nombre: `${EVENTO.nombre} y eventos`, texto: "Programa, participantes y votación del público.", href: `/eventos/${EVENTO.slug}` },
      { nombre: "Newsletter", texto: "Tu Substack en tu perfil, para que te sigan." },
    ],
  },
  {
    nombre: "Fondear",
    bajada: "La ronda, a la vista de quien tiene que verla, cuando vos decidís.",
    modulos: [
      { nombre: "Ronda", texto: "Qué ronda buscás y, si querés, cuánto y para qué." },
      { nombre: "Transparencia", texto: "Métricas y documentos clave, privados hasta que los compartís." },
      { nombre: "Dataroom", texto: "Documentos por categoría y un PDF para inversores." },
      { nombre: "Portfolio y tesis", texto: "Qué buscan los inversores y en qué ya invirtieron." },
    ],
  },
  {
    nombre: "Aprender",
    bajada: "Lo que te van a preguntar, antes de que te lo pregunten.",
    modulos: [
      { nombre: "Startup Essentials", texto: `${LECCIONES} lecciones: problema, negocio, números e inversión.`, href: "/academy" },
      { nombre: "Templates", texto: `${TEMPLATES} templates guiados que se guardan solos.` },
      { nombre: "Glosario y documentos", texto: "Qué es cada término y qué documento te van a pedir.", href: "/academy/docs" },
    ],
  },
];

function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto != null) nodo.textContent = texto;
  return nodo;
}

function modulo(m) {
  const li = el("li");
  const caja = el("div");
  caja.append(el("p", "mapa__modulo", m.nombre), el("p", "mapa__texto", m.texto));
  li.append(caja);
  if (m.href) {
    const a = el("a", "mapa__abrir", "Abrir ");
    a.href = `${APP}${m.href}`;
    const flecha = el("span", null, "→");
    flecha.setAttribute("aria-hidden", "true");
    a.append(flecha, el("span", "sr-only", ` ${m.nombre}`));
    li.append(a);
  }
  return li;
}

export function setupMapa() {
  const raiz = document.getElementById("mapa");
  if (!raiz) return;
  const tabs = [...raiz.querySelectorAll('[role="tab"]')];
  const ramas = [...raiz.querySelectorAll(".rama")];
  const panel = raiz.querySelector('[role="tabpanel"]');
  let activo = 0;

  function elegir(i, foco = false) {
    if (i === activo) {
      if (foco) tabs[i].focus();
      return;
    }
    activo = i;
    tabs.forEach((t, j) => {
      const si = j === i;
      t.setAttribute("aria-selected", String(si));
      t.tabIndex = si ? 0 : -1;
    });
    ramas.forEach((r, j) => r.toggleAttribute("data-activa", j === i));
    const g = MAPA_GRUPOS[i];
    panel.setAttribute("aria-labelledby", tabs[i].id);
    const lista = el("ul", "mapa__modulos");
    lista.append(...g.modulos.map(modulo));
    panel.replaceChildren(el("h3", "mapa__nombre", g.nombre), el("p", "mapa__bajada", g.bajada), lista);
    // Reinicia la entrada del panel (la misma de la app)
    panel.classList.remove("entrada");
    void panel.offsetWidth;
    panel.classList.add("entrada");
    if (foco) tabs[i].focus();
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => elegir(i));
    t.addEventListener("keydown", (e) => {
      let destino = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") destino = 0;
      else if (e.key === "End") destino = tabs.length - 1;
      if (destino === null) return;
      e.preventDefault();
      elegir(destino, true);
    });
  });
}
