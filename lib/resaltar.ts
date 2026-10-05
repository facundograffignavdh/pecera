/**
 * Lleva a un elemento de la página y lo resalta un momento (el anillo de
 * `[data-resaltado]` en globals.css). Lo usa el "+" de la barra para llegar al botón
 * de subir el pitch en /cuenta, venga de otra página o ya esté ahí.
 */
export function resaltar(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  delete el.dataset.resaltado;
  // Un frame después, para que la animación vuelva a correr si ya estaba.
  requestAnimationFrame(() => {
    el.dataset.resaltado = "";
    setTimeout(() => delete el.dataset.resaltado, 2200);
  });
  return true;
}
