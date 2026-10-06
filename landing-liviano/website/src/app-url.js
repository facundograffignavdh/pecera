// URLs de la app (ver vite.config.js). Sin barra al final.
const limpiar = (url) => String(url).replace(/\/+$/, "");

export const APP = limpiar(import.meta.env.VITE_APP_URL || "https://pecera.lat");
export const API = limpiar(import.meta.env.VITE_API_BASE || APP);
