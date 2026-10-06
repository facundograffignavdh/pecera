/* ---------- Demo del celular (#demo) ----------
   La animación carga React, ReactDOM y Babel desde unpkg y compila el JSX en el navegador,
   así que el iframe recién recibe su src cuando la sección está por entrar en pantalla y lo
   suelta (about:blank) cuando se aleja: deja de correr su rAF de 60 fps. Con reducir
   movimiento nunca se carga: queda la imagen fija del pique. */

export function setupDemo({ reduceMotion }) {
  const marco = document.querySelector(".demo__marco");
  if (!marco) return;
  const iframe = marco.querySelector(".demo__iframe");
  const fijo = marco.querySelector(".demo__fijo");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    iframe.remove();
    fijo.hidden = false;
    return;
  }

  const cargar = () => {
    if ("cargado" in iframe.dataset) return;
    iframe.src = iframe.dataset.src;
    iframe.dataset.cargado = "";
  };
  const soltar = () => {
    if (!("cargado" in iframe.dataset)) return;
    iframe.src = "about:blank";
    delete iframe.dataset.cargado;
  };

  new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && cargar(), { rootMargin: "300px 0px" }).observe(marco);
  new IntersectionObserver((e) => !e.some((x) => x.isIntersecting) && soltar(), { rootMargin: "150% 0px" }).observe(marco);
}
