// Prueba de lib/vinculo.ts: el vínculo dispositivo ↔ cuenta nunca traba ni rompe el
// login. Node 24 corre TS directo: `node scripts/pruebas/vinculo.ts`.
// Tiene que terminar en "N ok · 0 fallas".
import { vincularSinFallar } from "../../lib/vinculo.ts";

const D = "d0000001-0000-4000-8000-000000000000";
let ok = 0;
let fallas = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    ok++;
    console.log(`  ✔ ${msg}`);
  } else {
    fallas++;
    console.log(`  ✘ ${msg}`);
  }
}

type Respuesta = { error: unknown };
const cliente = (rpc: (f: string, a: Record<string, unknown>) => PromiseLike<Respuesta>) => ({ rpc });
const llamadas: unknown[] = [];
const bien = cliente((f, a) => {
  llamadas.push([f, a]);
  return Promise.resolve({ error: null });
});

async function main() {
  check((await vincularSinFallar(bien, D)) === true, "con todo bien, vincula");
  check(JSON.stringify(llamadas[0]) === JSON.stringify(["vincular_dispositivo", { p_dispositivo: D }]), "llama a vincular_dispositivo con el uuid");

  for (const [nombre, valor] of [["sin cookie", undefined], ["vacío", ""], ["no es uuid", "abc"], ["objeto", { x: 1 }]] as const) {
    const antes = llamadas.length;
    check((await vincularSinFallar(bien, valor)) === false && llamadas.length === antes, `${nombre}: false y no llama a la base`);
  }

  check((await vincularSinFallar(cliente(() => Promise.resolve({ error: { code: "42501" } })), D)) === false, "error de la base: false");
  check((await vincularSinFallar(cliente(() => Promise.reject(new Error("red"))), D)) === false, "la promesa rechaza: false");
  check(
    (await vincularSinFallar(
      cliente(() => {
        throw new Error("explota al llamar");
      }),
      D
    )) === false,
    "tira al llamar: false"
  );
  check((await vincularSinFallar(cliente(() => Promise.resolve(null as unknown as Respuesta)), D)) === false, "respuesta vacía: false");

  const inicio = Date.now();
  const colgado = await vincularSinFallar(cliente(() => new Promise<Respuesta>(() => {})), D, 200);
  const tardo = Date.now() - inicio;
  check(colgado === false && tardo < 600, `la base no responde: false a los ${tardo} ms (tope 200)`);

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main();
