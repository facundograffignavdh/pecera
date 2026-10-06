// Prueba de app/api/landing/pitches/forma.ts: la respuesta pública de la landing tiene una
// lista CERRADA de campos. Node 24 corre TS directo: `node scripts/pruebas/landing-pitches.ts`.
// Tiene que terminar en "N ok · 0 fallas".
import {
  CAMPOS_LANDING,
  LARGO_DESCRIPCION,
  armarPitchesLanding,
  leerN,
  recortar,
  type FilaLanding,
} from "../../app/api/landing/pitches/forma.ts";

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

const url = (clave: string) => `https://media.ejemplo/${clave}`;

// Una fila "envenenada": todo lo que la consulta jamás debería dejar salir.
const SENSIBLES = {
  whatsapp: "3511234567",
  email: "secreto@ejemplo.com",
  linkedin: "https://linkedin.com/in/secreto",
  instagram: "secreto_ig",
  web: "https://secreto.ejemplo",
  ticket: "100k-500k",
  usuario_id: "uuid-usuario-secreto",
  origen_id: "drive-secreto",
};
const envenenada = {
  id: "p1",
  poster_url: "p1-abcd1234.jpg",
  video_url: "p1-abcd1234.mp4",
  descripcion: "Hacemos algo útil #feria21",
  subtitulos: [{ desde: 0, hasta: 1, texto: "texto-secreto" }],
  ...SENSIBLES,
  perfil: {
    slug: "ana",
    nombre: "Ana Pérez",
    rol: "emprendedor",
    descripcion: "Perfil",
    empresa: { nombre: "Acme", slug: "acme", logo_url: "logo-secreto.png" },
    ...SENSIBLES,
  },
} as unknown as FilaLanding;

console.log("Campos");
const [item] = armarPitchesLanding([envenenada], url);
check(
  JSON.stringify(Object.keys(item).sort()) === JSON.stringify([...CAMPOS_LANDING].sort()),
  `exactamente ${CAMPOS_LANDING.join(", ")} (salió: ${Object.keys(item).join(", ")})`
);
const json = JSON.stringify(armarPitchesLanding([envenenada], url));
for (const [campo, valor] of Object.entries(SENSIBLES)) {
  check(!json.includes(valor) && !json.includes(`"${campo}"`), `no sale ${campo}`);
}
for (const extra of ["video_url", "subtitulos", "texto-secreto", "logo-secreto", "acme\""]) {
  check(!json.includes(extra), `no sale ${extra}`);
}
check(item.poster === "https://media.ejemplo/p1-abcd1234.jpg", "poster con la URL armada");
check(item.empresa === "Acme", "empresa = nombre de la empresa");
check(item.descripcion === "Hacemos algo útil", "descripción sin hashtags");

console.log("Nulos");
const sinNada = armarPitchesLanding(
  [{ id: "p2", poster_url: "x.jpg", descripcion: null, perfil: { slug: "b", nombre: "B", rol: "aliado", descripcion: "Del perfil", empresa: null } }],
  url
)[0];
check(sinNada.empresa === null, "sin empresa → null");
check(sinNada.descripcion === "Del perfil", "sin descripción del pitch → la del perfil");
check(
  armarPitchesLanding([{ id: "p3", poster_url: null, perfil: { slug: "c", nombre: "C", rol: "inversor" } }], url).length === 0,
  "sin poster → afuera"
);

console.log("Recorte");
const largo = "palabra ".repeat(40);
const r = recortar(largo);
check(r.length <= LARGO_DESCRIPCION, `≤ ${LARGO_DESCRIPCION} caracteres (${r.length})`);
check(r.endsWith("…") && !r.includes("palabr…"), "corta en una palabra, con …");
check(recortar("  corto   y  limpio ") === "corto y limpio", "texto corto queda igual, sin espacios de más");
check(recortar(null) === "", "null → vacío");

console.log("?n=");
check(leerN(null) === 12, "sin n → 12");
check(leerN("") === 12, "vacío → 12");
check(leerN("0") === 12, "0 → 12");
check(leerN("5") === 5, "5 → 5");
check(leerN("50") === 20, "50 → tope 20");
check(leerN("abc") === 12 && leerN("-3") === 12 && leerN("2.5") === 12, "basura → 12");

console.log(`\n${ok} ok · ${fallas} fallas`);
if (fallas) process.exit(1);
