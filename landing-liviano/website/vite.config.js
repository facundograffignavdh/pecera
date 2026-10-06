import { defineConfig } from "vite";

// Única constante con la URL de la app. Vite toma las VITE_* de process.env, así que se
// pueden pisar desde afuera (por ejemplo, en el entorno Preview de Vercel):
//   VITE_APP_URL   → links de index.html (%VITE_APP_URL%) y de main.js
//   VITE_API_BASE  → de dónde sale el carrusel de pitches (/api/landing/pitches)
process.env.VITE_APP_URL ||= "https://pecera.lat";
process.env.VITE_API_BASE ||= process.env.VITE_APP_URL;

export default defineConfig({});
