// Copia la demo del celular de la app (public/demo-video/) a la landing
// (website/public/demo-video/). La original es la fuente: no editar la copia.
//
//   npm run sync-demo        copia (borra lo que sobra en la copia)
//   node scripts/sync-demo.mjs --check
//                            corta con error si la copia quedó vieja (corre en prebuild).
//                            Si la original no está (por ejemplo, un deploy que solo ve
//                            website/), avisa y no corta.
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const ORIGEN = join(aqui, "..", "..", "..", "public", "demo-video");
const DESTINO = join(aqui, "..", "public", "demo-video");

function archivos(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}

function huellas(dir) {
  return new Map(
    archivos(dir).map((p) => [relative(dir, p).replaceAll("\\", "/"), createHash("sha256").update(readFileSync(p)).digest("hex")]),
  );
}

if (!existsSync(ORIGEN)) {
  console.warn(`sync-demo: no encuentro ${ORIGEN}; se usa la copia que ya está.`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  const a = huellas(ORIGEN);
  const b = huellas(DESTINO);
  const distintos = [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k));
  if (distintos.length) {
    console.error(`sync-demo: la copia de la demo quedó vieja (${distintos.join(", ")}). Corré: npm run sync-demo`);
    process.exit(1);
  }
  console.log("sync-demo: copia al día.");
} else {
  rmSync(DESTINO, { recursive: true, force: true });
  cpSync(ORIGEN, DESTINO, { recursive: true });
  console.log(`sync-demo: ${archivos(DESTINO).length} archivos copiados.`);
}
