import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Kit del video demo: se carga tal cual en el navegador vía <x-import>,
    // no pasa por el build de Next — no es código de la app.
    "public/demo-video/**",
    // Pruebas de migraciones: script suelto que corre con PGlite fuera de la app.
    "supabase/pruebas/**",
  ]),
]);

export default eslintConfig;
