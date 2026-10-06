// Prueba de lib/traspaso.ts (traspaso de la sesión): registro, ventana de 6 h, tope de 10,
// validación de lo que llega y que nunca trabe el login. Node corre TS directo:
// `node scripts/pruebas/traspaso.ts`. Tiene que terminar en "N ok · 0 fallas".
import {
  acreditarSinFallar,
  anotar,
  armarLista,
  leerRegistro,
  leerTraspaso,
  quitar,
  registroVacio,
} from "../../lib/traspaso.ts";

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

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const H = 60 * 60 * 1000;
const ahora = Date.UTC(2026, 9, 6, 15);

console.log("\n1) Registro de la sesión");
let r = registroVacio();
r = anotar(r, "perfiles", id(1), ahora - 7 * H);
r = anotar(r, "perfiles", id(2), ahora - H);
r = anotar(r, "pitches", id(3), ahora);
r = anotar(r, "piques", id(3), ahora);
r = anotar(r, "perfiles", "no-es-uuid", ahora);
let l = armarLista(r, true, ahora);
check(l.perfiles.join() === id(2), "lo de más de 6 h no va", l.perfiles);
check(l.pitches.join() === id(3) && l.piques.join() === id(3), "pitches y piques");
r = quitar(r, "piques", id(3));
check(armarLista(r, true, ahora).piques.length === 0, "sacar el pique lo saca de la lista");
for (let i = 10; i < 30; i++) r = anotar(r, "pitches", id(i), ahora - (30 - i) * 1000);
l = armarLista(r, true, ahora);
check(l.pitches.length === 10 && l.pitches[0] === id(3), "10 por tipo, los más recientes primero", l.pitches);
check(leerRegistro("roto").perfiles.length === 0 && leerRegistro({ perfiles: [{ id: "x", ts: 1 }] }).perfiles.length === 0,
  "lo roto se descarta");

console.log("\n2) Lo que llega al servidor");
check(leerTraspaso(undefined) === null && leerTraspaso("{") === null && leerTraspaso('{"perfiles":[]}') === null,
  "sin mostrar o roto: nada");
const muchos = JSON.stringify({ mostrar: true, perfiles: Array.from({ length: 15 }, (_, i) => id(i)), pitches: ["x", id(1), id(1)] });
const v = leerTraspaso(muchos)!;
check(v.perfiles.length === 10 && v.pitches.join() === id(1) && v.piques.length === 0, "tope de 10, sin repetidos ni basura", v);
check(leerTraspaso("x".repeat(5000)) === null, "demasiado largo: nada");

console.log("\n3) Nunca traba el login");
const lento = { rpc: () => new Promise<{ error: unknown }>(() => {}) };
const t0 = Date.now();
check((await acreditarSinFallar(lento, JSON.stringify({ mostrar: true, perfiles: [id(1)] }), "visitas-v1", 50)) === false
  && Date.now() - t0 < 1000, "si la base tarda, sigue");
const roto = { rpc: () => { throw new Error("x"); } };
check((await acreditarSinFallar(roto, JSON.stringify({ mostrar: true }), "visitas-v1")) === false, "si la base falla, sigue");
let args: Record<string, unknown> = {};
const bien = { rpc: (_f: string, a: Record<string, unknown>) => { args = a; return Promise.resolve({ error: null }); } };
check((await acreditarSinFallar(bien, undefined, "visitas-v1")) === false && Object.keys(args).length === 0, "sin cookie no llama");
check((await acreditarSinFallar(bien, JSON.stringify({ mostrar: false, perfiles: [] }), "visitas-v1")) === true
  && args.p_mostrar === false && args.p_version === "visitas-v1", "destildada: manda mostrar=false");

console.log(`\n${ok} ok · ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
