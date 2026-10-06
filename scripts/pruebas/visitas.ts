// Prueba de lib/visitas-dia.ts ("Quién vio tu perfil" en el navegador): el día en Buenos Aires y
// la deduplicación por día. Node corre TS directo: `node scripts/pruebas/visitas.ts`.
// Tiene que terminar en "N ok · 0 fallas".
import { claveVisita, delDia, diaBuenosAires, sacarClave, sumarClave } from "../../lib/visitas-dia.ts";

let ok = 0;
let fallas = 0;
function check(cond: boolean, msg: string, detalle?: unknown) {
  if (cond) {
    ok++;
    console.log(`  ✔ ${msg}`);
  } else {
    fallas++;
    console.log(`  ✘ ${msg}${detalle === undefined ? "" : ` → ${JSON.stringify(detalle)}`}`);
  }
}

console.log("\n1) Día en Buenos Aires (UTC-3, sin horario de verano)");
check(diaBuenosAires(new Date("2026-10-07T02:59:00Z")) === "2026-10-06", "02:59 UTC todavía es el día anterior");
check(diaBuenosAires(new Date("2026-10-07T03:00:00Z")) === "2026-10-07", "03:00 UTC ya es el día siguiente");
check(diaBuenosAires(new Date("2026-01-01T12:00:00Z")) === "2026-01-01", "formato YYYY-MM-DD");

console.log("\n2) Una por día");
const hoy = delDia(null, "2026-10-06");
check(hoy.claves.length === 0, "sin nada guardado, vacío");
const k = claveVisita("perfil", "abc");
const uno = sumarClave(hoy, k);
check(uno !== null && uno.claves.join() === "perfil:abc", "la primera se manda");
check(sumarClave(uno!, k) === null, "la segunda del día, no");
check(sumarClave(uno!, claveVisita("pitch", "abc")) !== null, "otro tipo, sí");
check(delDia(uno, "2026-10-07").claves.length === 0, "al día siguiente se vuelve a mandar");
check(delDia({ dia: "2026-10-06", claves: "roto" }, "2026-10-06").claves.length === 0, "lo roto se ignora");
check(sacarClave(uno!, k).claves.length === 0, "si falla, se saca para reintentar");
let muchas = hoy;
for (let i = 0; i < 400; i++) muchas = sumarClave(muchas, `perfil:${i}`)!;
check(muchas.claves.length === 300 && muchas.claves[299] === "perfil:399", "tope de 300 claves, quedan las últimas");

console.log(`\n${ok} ok · ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
