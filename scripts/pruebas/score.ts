// Prueba de lib/score.ts: el score crediticio A-D de una empresa según lo transparente de su
// Dataroom. Node 24 corre TS directo: `node scripts/pruebas/score.ts`.
// Tiene que terminar en "N ok · 0 fallas".
import { CATEGORIA_DE_DATO } from "../../lib/dataroom.ts";
import { PLANTILLAS } from "../../lib/plantillas.ts";
import {
  AREAS,
  LARGO_MINIMO_ESCRITO,
  NIVELES_SCORE,
  ORDEN_LETRAS,
  UMBRALES,
  calcularScore,
  construirMetricas,
  type AreaId,
  type DatoScore,
  type DocumentoScore,
} from "../../lib/score.ts";
import { DATOS } from "../../lib/transparencia.ts";

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

const doc = (categoria: string, extra: Partial<DocumentoScore> = {}): DocumentoScore => ({
  categoria,
  tipo: "plantilla",
  completo: true,
  url: null,
  cuerpo: null,
  visible: true,
  archivado: false,
  ...extra,
});
const dato = (clave: string, extra: Partial<DatoScore> = {}): DatoScore => ({
  clave,
  valor: "USD 4.200",
  url: null,
  visible: true,
  ...extra,
});
const score = (documentos: DocumentoScore[], datos: DatoScore[] = [], soloVisibles = true) =>
  calcularScore({ documentos, datos }, CATEGORIA_DE_DATO, { soloVisibles });
const deAreas = (ids: AreaId[]) => score(ids.map((id) => doc(id)));
/** "No sumó nada": todavía en el piso (D con 0 puntos). */
const enElPiso = (s: ReturnType<typeof score>) => s.letra === "D" && s.puntos === 0;

console.log("Pesos y umbrales");
check(AREAS.reduce((s, a) => s + a.peso, 0) === 100, "los pesos de las 9 áreas suman 100");
check(AREAS.length === 9 && !AREAS.some((a) => (a.id as string) === "otros"), "9 áreas, sin «Otros»");
check(ORDEN_LETRAS.join("") === "DCBA", "el orden va de D (peor) a A (mejor)");
check(UMBRALES.D.puntos === 0 && UMBRALES.D.areas.length === 0, "D es el piso: no pide nada, la tiene toda empresa");
check(
  UMBRALES.D.puntos < UMBRALES.C.puntos && UMBRALES.C.puntos < UMBRALES.B.puntos && UMBRALES.B.puntos < UMBRALES.A.puntos,
  "los umbrales crecen D < C < B < A"
);
check(["A", "B", "C", "D"].every((k) => k in NIVELES_SCORE) && !("sin" in NIVELES_SCORE), "hay texto y color para A, B, C y D, y no existe «sin score»");

console.log("Toda empresa tiene score: sin nada es D");
const vacio = score([]);
check(vacio.letra === "D" && vacio.puntos === 0, "sin nada transparente la letra es D (0 puntos), nunca «sin score»");
check(vacio.cubiertas === 0, "y no tiene ningún área cubierta");
check(vacio.siguiente?.letra === "C" && vacio.siguiente.faltan === 30, "lo siguiente es la C, a 30 puntos");
check(vacio.siguiente?.agregar.map((a) => a.id).join(",") === "finanzas,traccion", "y le sugiere primero lo que más pesa: finanzas y tracción");
const una = score([], [dato("pitch_deck", { valor: null, url: "https://drive.google.com/x" })]);
check(una.letra === "D" && una.puntos === 5, "con un solo link https de «Empresa» sigue en D, con 5 puntos");
check(una.siguiente?.letra === "C" && una.siguiente.faltan === 25, "desde ahí, la C está a 25 puntos");

console.log("Qué cuenta y qué no");
check(enElPiso(score([doc("finanzas", { visible: false })])), "un documento privado no cuenta");
check(enElPiso(score([], [dato("mrr", { visible: false })])), "un dato privado no cuenta");
check(enElPiso(score([doc("finanzas", { archivado: true })])), "un documento archivado no cuenta");
check(enElPiso(score([doc("finanzas", { completo: false })])), "una plantilla incompleta no cuenta");
check(
  enElPiso(score([doc("finanzas", { tipo: "link", url: "http://x.com/a", completo: true })])),
  "un link http (no https) no cuenta"
);
check(score([doc("finanzas", { tipo: "link", url: "https://x.com/a" })]).puntos === 20, "un link https cuenta");
check(
  enElPiso(score([doc("finanzas", { tipo: "escrito", cuerpo: "x".repeat(LARGO_MINIMO_ESCRITO - 1) })])),
  `un escrito de menos de ${LARGO_MINIMO_ESCRITO} caracteres no cuenta (completo solo marca que no está vacío)`
);
check(
  score([doc("finanzas", { tipo: "escrito", cuerpo: "x".repeat(LARGO_MINIMO_ESCRITO) })]).puntos === 20,
  `un escrito de ${LARGO_MINIMO_ESCRITO} caracteres cuenta`
);
check(enElPiso(score([doc("finanzas", { tipo: "escrito", cuerpo: " ".repeat(500) })])), "un escrito de puros espacios no cuenta");
check(enElPiso(score([], [dato("mrr", { valor: "   " })])), "un dato con el valor vacío no cuenta");
check(enElPiso(score([], [dato("clave_inventada")])), "un dato sin área en el Dataroom no cuenta");
check(enElPiso(score([], [dato("data_room", { valor: null, url: "https://x.com/y" })])), "lo de «Otros» no suma");
check(enElPiso(score([doc("otros")])), "un documento de «Otros» no suma");
check(
  score([doc("traccion"), doc("traccion"), doc("traccion")]).puntos === 20,
  "tres piezas del mismo área suman lo mismo que una (no se acumula por cantidad)"
);
check(score([doc("finanzas")], [dato("mrr")]).puntos === 40, "un documento y un dato de áreas distintas suman cada uno su área");
const privadoYPublico = [doc("finanzas"), doc("traccion", { visible: false })];
check(score(privadoYPublico).puntos === 20, "el score público ignora lo privado");
check(score(privadoYPublico, [], false).puntos === 40, "el potencial (soloVisibles=false) cuenta también lo privado");
check(enElPiso(score([doc("traccion", { visible: false, archivado: true })], [], false)), "ni el potencial cuenta lo archivado");

console.log("Las letras y sus puertas");
check(deAreas(["finanzas", "traccion"]).letra === "C", "finanzas + tracción (40) = C");
check(deAreas(["legal", "fundraising", "fundadores"]).letra === "C", "legal + fundraising + fundadores (35) = C");
check(deAreas(["finanzas", "traccion", "legal", "fundraising"]).letra === "B", "finanzas + tracción + legal + fundraising (65) = B");
const sinFinTrac = deAreas(["legal", "fundraising", "fundadores", "producto", "mercado", "modelo", "empresa"]);
check(sinFinTrac.puntos === 60 && sinFinTrac.letra === "C", "60 puntos sin finanzas ni tracción se quedan en C: B pide las dos");
const todasMenosLegal = AREAS.filter((a) => a.id !== "legal").map((a) => a.id);
check(deAreas(todasMenosLegal).puntos === 85 && deAreas(todasMenosLegal).letra === "B", "85 puntos sin legal = B: la A exige legal");
check(deAreas(AREAS.map((a) => a.id)).letra === "A" && deAreas(AREAS.map((a) => a.id)).puntos === 100, "todo transparente = A (100)");
check(deAreas(AREAS.map((a) => a.id)).siguiente === null, "la A no tiene siguiente");
const sinTraccion = AREAS.filter((a) => a.id !== "traccion").map((a) => a.id);
check(deAreas(sinTraccion).letra === "C", "80 puntos sin tracción = C (le falta una puerta)");

console.log("Cómo mejorarlo");
const c = deAreas(["finanzas", "traccion"]);
check(c.siguiente?.letra === "B", "desde C lo siguiente es la B");
check(c.siguiente?.agregar.map((a) => a.id).join(",") === "legal,fundraising", "para la B le sugiere lo que más pesa que le falta (legal y fundraising)");
const bSinLegal = deAreas(todasMenosLegal);
check(
  bSinLegal.siguiente?.letra === "A" && bSinLegal.siguiente.agregar.map((a) => a.id).join(",") === "legal",
  "con 85 puntos pero sin legal, para la A solo le falta legal (el área obligatoria)"
);
check(bSinLegal.siguiente?.faltan === 0, "y no le faltan puntos, solo esa área");
check(deAreas(["finanzas"]).areas.find((a) => a.id === "finanzas")?.cubierta === true, "marca el área cubierta");
check(deAreas(["finanzas"]).areas.find((a) => a.id === "traccion")?.cubierta === false, "y las que faltan");
check(deAreas(["finanzas", "traccion"]).cubiertas === 2, "cuenta las áreas cubiertas");

console.log("Qué métricas de la app suben el score (sale de los catálogos reales)");
const metricas = construirMetricas({ datos: DATOS, plantillas: PLANTILLAS.map((p) => ({ categoria: p.categoria, nombre: p.nombre })) }, CATEGORIA_DE_DATO);
check(AREAS.every((a) => a.id in metricas), "hay una entrada por cada una de las 9 áreas");
const nombresMetricas = (id: AreaId) => [...metricas[id].metricas, ...metricas[id].documentos, ...metricas[id].templates];
check(
  metricas.traccion.metricas.includes("MRR") && metricas.traccion.metricas.includes("Clientes") && metricas.traccion.metricas.includes("Churn"),
  "Tracción: MRR, Clientes y Churn son métricas que suben el score"
);
check(
  metricas.finanzas.metricas.includes("Runway") && metricas.finanzas.documentos.includes("Cap table") && metricas.finanzas.templates.includes("Unit economics"),
  "Finanzas: Runway (métrica), Cap table (documento) y Unit economics (template)"
);
check(metricas.legal.documentos.includes("Estatuto") && metricas.legal.metricas.length === 0, "Legal: solo documentos (Estatuto), sin métricas");
check(
  metricas.fundraising.metricas.includes("Valuación / cap") && metricas.fundraising.templates.length > 0,
  "Fundraising: Valuación / cap y el template de la ronda"
);
check(metricas.empresa.documentos.includes("Pitch deck"), "Empresa: el Pitch deck");
check(metricas.fundadores.templates.includes("Equipo fundador"), "Fundadores: el template del equipo fundador");
check(AREAS.every((a) => nombresMetricas(a.id).length > 0), "ninguna de las 9 áreas queda sin nada para cargar");
// Cada dato del catálogo que cae en un área cuenta para el score y aparece en su lista (y al revés).
const claves = DATOS.filter((d) => CATEGORIA_DE_DATO[d.clave] && CATEGORIA_DE_DATO[d.clave] !== "otros");
check(
  claves.every((d) => nombresMetricas(CATEGORIA_DE_DATO[d.clave] as AreaId).includes(d.label)),
  "todo dato de Transparencia que suma al score está en la lista de su área"
);
check(
  DATOS.every((d) => (CATEGORIA_DE_DATO[d.clave] === undefined ? false : true)),
  "y todo dato del catálogo tiene un área (si se suma uno nuevo sin área, esta prueba avisa)"
);
check(
  claves.every((d) => score([], [dato(d.clave, d.tipo === "link" ? { valor: null, url: "https://x.com/y" } : {})]).puntos > 0),
  "y cargar cualquiera de esos datos, de verdad, suma puntos"
);
check(
  PLANTILLAS.every((p) => (p.categoria as string) === "otros" || p.categoria in metricas),
  "toda plantilla de Academy cae en un área que cuenta"
);

console.log("Para cualquier combinación de las 9 áreas (512)");
const ids = AREAS.map((a) => a.id);
const porMascara = (m: number) => ids.filter((_, i) => m & (1 << i));
const idx = (l: string) => ORDEN_LETRAS.indexOf(l as (typeof ORDEN_LETRAS)[number]);
let monotona = true;
let planSirve = true;
let siguienteUna = true;
let puntosBien = true;
let siempreHayLetra = true;
let primerFallo = "";
for (let m = 0; m < 512; m++) {
  const s = deAreas(porMascara(m));
  const esperado = porMascara(m).reduce((t, id) => t + (AREAS.find((a) => a.id === id)?.peso ?? 0), 0);
  if (s.puntos !== esperado) puntosBien = false;
  if (idx(s.letra) < 0) siempreHayLetra = false;
  // Sumar un área nunca baja la letra.
  for (let b = 0; b < 9; b++) {
    if (m & (1 << b)) continue;
    if (idx(deAreas(porMascara(m | (1 << b))).letra) < idx(s.letra)) {
      monotona = false;
      primerFallo ||= `sumar ${ids[b]} a [${porMascara(m)}] baja la letra`;
    }
  }
  // La siguiente es exactamente una más arriba, y seguir el plan llega a ella.
  if (s.siguiente) {
    if (idx(s.siguiente.letra) !== idx(s.letra) + 1) siguienteUna = false;
    const conPlan = deAreas([...new Set([...porMascara(m), ...s.siguiente.agregar.map((a) => a.id)])]);
    if (idx(conPlan.letra) < idx(s.siguiente.letra)) {
      planSirve = false;
      primerFallo ||= `el plan de [${porMascara(m)}] hacia ${s.siguiente.letra} no alcanza (llega a ${conPlan.letra})`;
    }
  } else if (s.letra !== "A") {
    siguienteUna = false;
  }
}
check(siempreHayLetra, "todas las combinaciones, hasta la vacía, tienen una letra de A a D");
check(puntosBien, "los puntos son la suma de los pesos de las áreas cubiertas");
check(monotona, `sumar información nunca baja la letra${primerFallo && !monotona ? ` (${primerFallo})` : ""}`);
check(siguienteUna, "la letra siguiente es siempre la inmediata (y solo la A no tiene)");
check(planSirve, `hacer lo que sugiere «Cómo mejorarlo» siempre alcanza la letra siguiente${primerFallo && !planSirve ? ` (${primerFallo})` : ""}`);

console.log(`\n${ok} ok · ${fallas} fallas`);
if (fallas > 0) process.exit(1);
