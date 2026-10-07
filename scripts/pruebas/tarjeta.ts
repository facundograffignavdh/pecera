// Prueba de lib/tarjeta.ts: el código de la tarjeta NFC de cada stand de la Feria 21.
// Node corre TS directo: `node scripts/pruebas/tarjeta.ts`. Tiene que terminar en "N ok · 0 fallas".
import { codigoTarjeta, conCodigoTarjeta } from "../../lib/tarjeta.ts";

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

console.log("\n1) El esquema de la planilla");
check(codigoTarjeta(7, 1) === "s101", "miércoles 7, stand 1 → s101", codigoTarjeta(7, 1));
check(codigoTarjeta(8, 16) === "s216", "jueves 8, stand 16 → s216", codigoTarjeta(8, 16));
check(codigoTarjeta(9, 30) === "s330", "viernes 9, stand 30 → s330", codigoTarjeta(9, 30));

console.log("\n2) Lo que no vale");
check(codigoTarjeta(6, 1) === null, "un día fuera de la feria");
check(codigoTarjeta(8, 0) === null, "stand 0");
check(codigoTarjeta(8, 100) === null, "stand 100 (pisaría el día siguiente)");
check(codigoTarjeta(8, 1.5) === null, "stand con decimales");

console.log("\n3) El link");
check(
  conCodigoTarjeta("https://www.pecera.lat/p/ana", "s216") === "https://www.pecera.lat/p/ana?src=nfc&t=s216",
  "perfil + ?src=nfc&t=s216"
);

console.log(`\n${ok} ok · ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
