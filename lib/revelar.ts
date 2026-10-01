/**
 * Entradas al hacer scroll (`data-revelar`), compartidas por la landing y las
 * páginas de empresa y perfil. Lo que ya está en pantalla se marca antes de
 * esconder nada, así no parpadea; sin JavaScript se ve todo. Las barras y
 * contadores de un bloque esperan a que el bloque aparezca (ver globals.css).
 * Devuelve la limpieza.
 */
export function observarRevelar(alMostrar?: (el: HTMLElement) => void): () => void {
  const raiz = document.documentElement;
  const mostrar = (el: HTMLElement) => {
    el.dataset.visible = "";
    alMostrar?.(el);
  };
  const bloques = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
  const limite = window.innerHeight * 0.92;
  for (const el of bloques) if (el.getBoundingClientRect().top < limite) mostrar(el);
  raiz.dataset.revelar = "";
  const observer = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        mostrar(e.target as HTMLElement);
        observer.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  for (const el of bloques) if (!("visible" in el.dataset)) observer.observe(el);
  return () => {
    observer.disconnect();
    delete raiz.dataset.revelar;
  };
}
