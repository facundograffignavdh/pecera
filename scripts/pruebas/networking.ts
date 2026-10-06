// Prueba de lib/networking.ts (encaje de networking) y del espejo de la taxonomía con la
// migración. Node corre TS directo: `node scripts/pruebas/networking.ts`.
// Tiene que terminar en "N ok · 0 fallas".
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "..");
// Los imports "@/lib/x" de la app → archivos .ts del repo.
registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador.startsWith("@/")) {
      return siguiente(pathToFileURL(join(RAIZ, `${especificador.slice(2)}.ts`)).href, contexto);
    }
    return siguiente(especificador, contexto);
  },
});

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

async function main() {
  const n = await import("../../lib/networking.ts");
  const e = await import("../../lib/etiquetas.ts");

  console.log("\n1) Taxonomía = espejo de la migración");
  const sql = readFileSync(join(RAIZ, "supabase/migrations/20261015120000_networking_feria.sql"), "utf8");
  const bloque = sql.slice(sql.indexOf("select array["), sql.indexOf("]::text[]"));
  const enSql = [...bloque.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  const enApp = e.NECESIDADES.map((x) => x.valor).sort();
  check(JSON.stringify(enSql) === JSON.stringify(enApp), `mismas ${enApp.length} opciones en lib/etiquetas.ts y en el CHECK`, { enSql, enApp });
  const viejas = ["inversion", "cofundador", "mentoria", "clientes", "talento", "alianzas", "proveedores", "networking", "prensa", "empleo"];
  check(viejas.every((v) => enApp.includes(v)), "las 10 opciones de antes siguen");
  check(e.CATEGORIAS_NECESIDAD.length === 10 && e.NECESIDADES.every((x) => e.categoriaDe(x.valor)), "10 categorías y cada opción tiene la suya");
  check(e.MAX_NECESIDADES === 10 && /cardinality\(busca\) <= 10/.test(sql), "tope 10 en los dos lados");
  const comosSql = /busca_como <@ array\[([^\]]+)\]/.exec(sql)?.[1].match(/[a-z_]+/g) ?? [];
  check(JSON.stringify(comosSql) === JSON.stringify(e.COMOS.map((c) => c.valor)), "COMOS = CHECK del cómo");
  check(!n.OPCIONES_ELEGIBLES.some((o) => o.valor === "inversion" || o.valor === "talento"), "las 'en general' no se ofrecen para elegir");
  check(n.EJEMPLOS_BUSCA_OFRECE.length === 7, "7 ejemplos por rol");
  check(
    n.EJEMPLOS_BUSCA_OFRECE.every((x) => [...x.busca, ...x.ofrece].every((v) => enApp.includes(v)) && x.busca.length <= 10 && x.ofrece.length <= 10),
    "los ejemplos usan opciones válidas y entran en el tope"
  );

  console.log("\n2) Encaje");
  const vacio = { busca: [], ofrece: [] };
  const r0 = n.encajeNetworking(vacio, vacio, "Ana");
  check(r0.puntos === 0 && r0.razones.length === 0 && r0.nivel === "bajo", "perfiles vacíos: 0 y sin razones", r0);

  const exacta = n.encajeNetworking({ busca: ["mentoria"] }, { ofrece: ["mentoria"] }, "Laura");
  const categoria = n.encajeNetworking({ busca: ["mentoria"] }, { ofrece: ["capacitacion"] }, "Laura");
  check(exacta.puntos > categoria.puntos && categoria.puntos > 0, "la opción exacta suma más que la misma categoría", [exacta.puntos, categoria.puntos]);
  check(exacta.razones[0] === "Laura ofrece mentoría, que es lo que buscás", "razón con el nombre, sin pronombres", exacta.razones);
  check(categoria.razones[0] === "Buscás mentoría y Laura ofrece capacitación", "razón por categoría", categoria.razones);

  const a = { busca: ["clientes"], ofrece: ["mentoria"] };
  const b = { busca: ["mentoria"], ofrece: ["pilotos"] };
  check(n.encajeNetworking(a, b, "B").puntos === n.encajeNetworking(b, a, "A").puntos, "simétrico en puntos");
  const dos = n.encajeNetworking(a, b, "Sol");
  check(dos.razones.includes("Buscás primeros clientes y Sol ofrece pilotos y pruebas de concepto"), "las dos direcciones dan razones", dos.razones);
  check(dos.razones.includes("Busca mentoría, que es lo que ofrecés vos"), "y la otra dirección también", dos.razones);
  const unaSola = n.encajeNetworking({ busca: ["clientes"] }, { ofrece: ["pilotos"] }, "Sol");
  check(dos.puntos > unaSola.puntos, "las dos direcciones suman más que una");

  const general = n.encajeNetworking({ busca: ["inversion"] }, { ofrece: ["inversion_angel"] }, "Beto");
  check(general.puntos > 0 && general.puntos === n.encajeNetworking({ busca: ["capital_riesgo"] }, { ofrece: ["inversion_angel"] }, "Beto").puntos,
    "la vieja 'inversion' vale por toda la categoría (como misma categoría)");
  check(n.encajeNetworking({ busca: ["inversion"] }, { ofrece: ["inversion"] }, "Beto").puntos === exacta.puntos, "vieja con vieja: exacta");

  const sinComo = n.encajeNetworking({ busca: ["mentoria"] }, { ofrece: ["mentoria"] }, "Ana");
  const conComo = n.encajeNetworking({ busca: ["mentoria"], busca_como: ["canje"] }, { ofrece: ["mentoria"], ofrece_como: ["canje", "pago"] }, "Ana");
  const conversar = n.encajeNetworking({ busca: ["mentoria"], busca_como: ["sin_costo"] }, { ofrece: ["mentoria"], ofrece_como: ["a_conversar"] }, "Ana");
  const choca = n.encajeNetworking({ busca: ["mentoria"], busca_como: ["sin_costo"] }, { ofrece: ["mentoria"], ofrece_como: ["pago"] }, "Ana");
  check(conComo.puntos === sinComo.puntos + 4 && conversar.puntos === sinComo.puntos + 4 && choca.puntos === sinComo.puntos, "el cómo compatible suma un poco", [sinComo.puntos, conComo.puntos, conversar.puntos, choca.puntos]);
  check(conComo.razones.includes("Coinciden en el cómo: canje"), "razón del cómo", conComo.razones);
  check(n.encajeNetworking({ busca_como: ["canje"] }, { ofrece_como: ["canje"] }, "Ana").puntos === 0, "el cómo solo suma si hay coincidencia de opciones");

  const todo = n.encajeNetworking(
    { busca: ["clientes", "mentoria", "pilotos"], ofrece: ["desarrollo"], ubicacion: "Córdoba, Argentina", industrias: ["agro", "ia"], etapa: "mvp" },
    { busca: ["desarrollo"], ofrece: ["clientes", "mentoria", "pilotos"], ubicacion: "cordoba", industrias: ["agro", "ia"], etapa: "mvp" },
    "Caro"
  );
  check(todo.razones.length === 3 && todo.nivel === "alto" && todo.puntos <= 100, "hasta tres razones, nivel alto, tope 100", todo);
  check(n.encajeNetworking({ ubicacion: "Córdoba" }, { ubicacion: "córdoba, Argentina" }, "X").razones[0] === "Misma zona: córdoba, Argentina", "zona sin tildes");

  check(n.minuscula("IA y automatización") === "IA y automatización" && n.minuscula("Primeros clientes") === "primeros clientes", "minúscula solo cuando corresponde");
  check(n.nombreCorto({ nombre: "Laura Gómez", tipo: "persona" }) === "Laura" && n.nombreCorto({ nombre: "Raíz Verde", tipo: "startup" }) === "Raíz Verde", "nombre corto");
  check(n.buscaOfreceCompleto({ busca: ["x"], ofrece: [] }) === false && n.haceNetworking({ busca: ["x"], ofrece: [] }), "completo vs. hace networking");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
