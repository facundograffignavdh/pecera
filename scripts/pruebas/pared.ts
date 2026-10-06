// Prueba de lib/pared-reglas.ts (pared de pitches): cuándo un pitch queda bloqueado.
// Node corre TS directo: `node scripts/pruebas/pared.ts`. Tiene que terminar en "N ok · 0 fallas".
import { type EstadoPared, estaBloqueado, leerVistos, sumarVisto } from "../../lib/pared-reglas.ts";

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

const base: EstadoPared = { activa: true, libres: 2, sesion: false, vistos: [] };

console.log("\n1) Los libres");
check(!estaBloqueado(base, "a"), "el primero, libre");
check(!estaBloqueado({ ...base, vistos: ["a"] }, "b"), "el segundo, libre");
check(estaBloqueado({ ...base, vistos: ["a", "b"] }, "c"), "el tercero distinto, bloqueado");
check(!estaBloqueado({ ...base, vistos: ["a", "b"] }, "a"), "volver a ver uno ya visto, libre");
check(estaBloqueado({ ...base, libres: 0 }, "a"), "con 0 libres, todo bloqueado");
check(!estaBloqueado({ ...base, libres: 5, vistos: ["a", "b", "c"] }, "d"), "con 5 libres, el cuarto pasa");

console.log("\n2) Interruptor y sesión");
check(!estaBloqueado({ ...base, activa: false, vistos: ["a", "b", "c"] }, "d"), "apagada (o sin config): nunca bloquea");
check(!estaBloqueado({ ...base, sesion: true, vistos: ["a", "b", "c"] }, "d"), "con sesión: nunca bloquea");

console.log("\n3) Contador");
check(leerVistos(null).length === 0 && leerVistos("roto").length === 0, "lo roto o vacío, de cero");
check(leerVistos(["a", 1, "b"]).join() === "a,b", "ignora lo que no es id");
const uno = sumarVisto([], "a");
check(uno?.join() === "a", "suma un pitch");
check(sumarVisto(uno!, "a") === null, "el mismo pitch no suma dos veces (volver de Google tampoco)");
let muchos: string[] = [];
for (let i = 0; i < 80; i++) muchos = sumarVisto(muchos, `p${i}`)!;
check(muchos.length === 50, "tope de 50 ids");

console.log(`\n${ok} ok · ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
