// Esta landing no usa PostCSS. Sin este archivo, Vite sube por las carpetas, encuentra el
// postcss.config.mjs de Tailwind de la app Next (raíz del repo) y falla porque acá no está instalado.
export default { plugins: [] };
