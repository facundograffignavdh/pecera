// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba el juego
// del stand (/tarjetas, 20261021120000_juego_stand.sql): permisos, que el número nunca salga, validaciones,
// 3 intentos por teléfono, el tope de tarjetas, juego cerrado, límite de frecuencia, /admin y el
// rollback. No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\juego_stand.mjs .
//   node juego_stand.mjs <ruta al repo>
// Tiene que terminar en "N ok · 0 fallas".
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.argv[2];
let db;

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
`;

const MIGRACIONES = [
  "20260925120000_ingesta.sql",
  "20260925150000_r2_borrar.sql",
  "20260926120000_subtitulos.sql",
  "20260927120000_piques.sql",
  "20260928120000_cuentas.sql",
  "20260929120000_formulario_pitches.sql",
  "20260930120000_perfiles_vacios.sql",
  "20261001120000_feria_lista.sql",
  "20261002120000_medicion.sql",
  "20261003120000_pitch_build_producto_newsletter.sql",
  "20261004120000_dataroom.sql",
  "20261005120000_portfolio.sql",
  "20261006120000_logos.sql",
  "20261007120000_feria_pro.sql",
  "20261008120000_borrar_cuenta.sql",
  "20261009120000_cofundador_conexiones.sql",
  "20261010120000_multi_empresa.sql",
  "20261011120000_super_dataroom.sql",
  "20261012120000_vivo_feria.sql",
  "20261013120000_feria_todos_los_roles.sql",
  "20261014120000_persona_empresa.sql",
  "20261015120000_networking_feria.sql",
  "20261016120000_panel_organizacion.sql",
  "20261017120000_quien_vio.sql",
  "20261018120000_score_switch.sql",
  "20261019120000_alta_rapida.sql",
  "20261019120000_feria_stands_votos.sql",
  "20261020120000_feria21_sin_tope.sql",
];
const NUEVA = "supabase/migrations/20261021120000_juego_stand.sql";
const ROLLBACK = "supabase/rollback-juego-stand.sql";

let ok = 0;
let fallas = 0;
function bien(msg) { ok++; console.log(`  ✔ ${msg}`); }
function mal(msg) { fallas++; console.log(`  ✘ ${msg}`); }
function check(cond, msg, detalle) { cond ? bien(msg) : mal(detalle === undefined ? msg : `${msg} → ${JSON.stringify(detalle)}`); }

async function limpiarSesion() {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);");
}
async function como(rol, uid, sql, params = []) {
  await limpiarSesion();
  if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  await db.exec(`set role ${rol}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}
async function espera(desc, fn, patron) {
  try {
    await fn();
    mal(`${desc} (debió fallar)`);
  } catch (e) {
    if (!patron || new RegExp(patron, "i").test(e.message)) bien(`${desc} → "${e.message}"`);
    else mal(`${desc} → error inesperado: ${e.message}`);
  }
}
async function sistema(sql, params = []) {
  await limpiarSesion();
  return db.query(sql, params);
}
const valor = async (sql, params = []) => Object.values((await sistema(sql, params)).rows[0] ?? {})[0];
const anon = (sql, params = []) => como("anon", null, sql, params);
const yo = (uid, sql, params = []) => como("authenticated", uid, sql, params);
const r = (uid, sql, params = []) => yo(uid, `select ${sql} r`, params).then((x) => x.rows[0].r);
const a = (sql, params = []) => anon(`select ${sql} r`, params).then((x) => x.rows[0].r);

async function aplicar(ruta) {
  try {
    await db.exec(readFileSync(join(RAIZ, ruta), "utf8"));
  } catch (e) {
    console.log(`FALLÓ ${ruta}: ${e.message}`);
    process.exit(1);
  }
}

const u = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const U = { ana: u(1), admin: u(5) };
let n = 100;
/** Un dispositivo nuevo cada vez (así el límite de frecuencia no se mezcla entre pruebas). */
const disp = () => `${String(++n).padStart(8, "0")}-0000-4000-8000-000000000000`;
let tel = 3510000000;
const telefono = () => String(++tel);

const registrar = (d, t, { nombre = "Ana", apellido = "Pérez", nfc = true, consiento = true } = {}) =>
  a("public.stand_registrar($1, $2, $3, $4, $5, $6)", [nombre, apellido, t, nfc, consiento, d]);
const adivinar = (j, d, num) => a("public.stand_adivinar($1, $2, $3)", [j, d, num]);
const funcion = (nombre) => valor(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`, [nombre]);
const tabla = (nombre) => valor(`select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = $1`, [nombre]);

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);

  // -------------------------------------------------------------------------
  console.log("1) Permisos: las tablas no se tocan directo");
  await espera("anon no lee stand_juego (ahí está el número)", () => anon("select secreto from public.stand_juego"), "permission denied");
  await espera("authenticated tampoco", () => yo(U.ana, "select secreto from public.stand_juego"), "permission denied");
  await espera("anon no lee stand_jugadores", () => anon("select telefono from public.stand_jugadores"), "permission denied");
  await espera("anon no inserta jugadores", () => anon(`insert into public.stand_jugadores (nombre, apellido, telefono, quiere_nfc, dispositivo, consentimiento_at) values ('a','b','3511111111',true,'${disp()}',now())`), "permission denied");
  await espera("anon no llama stand_quedan", () => a("public.stand_quedan()"), "permission denied");
  await espera("anon no llama admin_stand", () => a("public.admin_stand()"), "permission denied");
  await espera("una cuenta que no es admin no ve la lista", () => r(U.ana, "public.admin_stand()"), "no autorizado");
  await espera("ni carga el número", () => r(U.ana, "public.admin_stand_config(true, 5, 123)"), "no autorizado");

  // -------------------------------------------------------------------------
  console.log("\n2) Sin número cargado, el juego espera");
  let e = await a("public.stand_estado()");
  check(e.activo === true && e.listo === false && e.premios === 5 && e.quedan === 5, "estado: abierto, sin número, 5 tarjetas", e);
  check(!("secreto" in e), "el estado no trae el número");
  await espera("anotarse antes de cargar el número", () => registrar(disp(), telefono()), "todavía no arrancó");

  // -------------------------------------------------------------------------
  console.log("\n3) El admin carga el número");
  await espera("número fuera de rango", () => r(U.admin, "public.admin_stand_config(true, 5, 1000)"), "datos inválidos");
  await espera("premios negativos", () => r(U.admin, "public.admin_stand_config(true, -1, 417)"), "datos inválidos");
  await r(U.admin, "public.admin_stand_config(true, 5, 417)");
  e = await a("public.stand_estado()");
  check(e.listo === true, "ahora está listo");
  const adm = await r(U.admin, "public.admin_stand()");
  check(!JSON.stringify(adm).includes("secreto") && adm.listo === true, "admin_stand dice que está cargado pero no lo devuelve");
  await r(U.admin, "public.admin_stand_config(true, 5, null)");
  check((await valor("select secreto from public.stand_juego where id")) === 417, "null no borra el número");

  // -------------------------------------------------------------------------
  console.log("\n4) Anotarse: validaciones");
  await espera("sin dispositivo", () => registrar(null, telefono()), "datos inválidos");
  await espera("sin nombre", () => registrar(disp(), telefono(), { nombre: "  " }), "nombre o apellido");
  await espera("apellido de 61 letras", () => registrar(disp(), telefono(), { apellido: "x".repeat(61) }), "nombre o apellido");
  await espera("teléfono corto", () => registrar(disp(), "351123"), "teléfono inválido");
  await espera("teléfono con 0 adelante", () => registrar(disp(), "03511234567"), "teléfono inválido");
  await espera("sin la respuesta NFC", () => registrar(disp(), telefono(), { nfc: null }), "tarjeta NFC");
  await espera("sin consentimiento", () => registrar(disp(), telefono(), { consiento: false }), "consentimiento");
  const d1 = disp();
  const j1 = await registrar(d1, "351 123-4567");
  check(j1.intentos_restantes === 3 && j1.gano === false && j1.codigo === null && typeof j1.jugador === "string", "se anota con 3 intentos", j1);
  check((await valor("select telefono from public.stand_jugadores where id = $1", [j1.jugador])) === "3511234567", "el teléfono queda normalizado (solo dígitos)");
  const jInt = await registrar(disp(), "+54 9 351 765-4321");
  check((await valor("select telefono from public.stand_jugadores where id = $1", [jInt.jugador])) === "+5493517654321", "acepta +E.164");
  check((await valor("select quiere_nfc from public.stand_jugadores where id = $1", [j1.jugador])) === true, "guarda la respuesta NFC");

  // -------------------------------------------------------------------------
  console.log("\n5) Un juego por teléfono");
  const otra = await registrar(d1, "3511234567", { nombre: "Otra" });
  check(otra.jugador === j1.jugador, "mismo teléfono y mismo celular: retoma el mismo juego");
  await espera("mismo teléfono desde otro celular", () => registrar(disp(), "3511234567"), "otro celular");
  check((await a("public.stand_mi_juego($1, $2)", [j1.jugador, d1])).jugador === j1.jugador, "stand_mi_juego lo devuelve con el mismo celular");
  check((await a("public.stand_mi_juego($1, $2)", [j1.jugador, disp()])) === null, "con otro celular, nada");

  // -------------------------------------------------------------------------
  console.log("\n6) Tres intentos");
  await espera("otro celular no puede adivinar por vos", () => adivinar(j1.jugador, disp(), 100), "no encontramos tu juego");
  await espera("número de 4 cifras", () => adivinar(j1.jugador, d1, 1000), "3 cifras");
  await espera("número negativo", () => adivinar(j1.jugador, d1, -1), "3 cifras");
  let x = await adivinar(j1.jugador, d1, 100);
  check(x.resultado === "fallo" && x.intentos_restantes === 2, "primer intento errado: quedan 2", x);
  check(!JSON.stringify(x).includes("417"), "la respuesta no trae el número");
  x = await adivinar(j1.jugador, d1, 500);
  check(x.resultado === "fallo" && x.intentos_restantes === 1, "segundo: queda 1");
  x = await adivinar(j1.jugador, d1, 287);
  check(x.resultado === "fallo" && x.intentos_restantes === 0, "tercero: quedan 0");
  x = await adivinar(j1.jugador, d1, 417);
  check(x.resultado === "sin_intentos" && x.gano === false, "el cuarto, aunque sea el correcto, no cuenta", x);
  check((await valor("select intentos from public.stand_jugadores where id = $1", [j1.jugador])) === 3, "los intentos no pasan de 3");
  const vuelta = await registrar(d1, "3511234567");
  check(vuelta.intentos_restantes === 0, "volver a anotarse no reinicia los intentos");

  // -------------------------------------------------------------------------
  console.log("\n7) Ganar");
  const d2 = disp();
  const j2 = await registrar(d2, telefono());
  x = await adivinar(j2.jugador, d2, 417);
  check(x.resultado === "gano" && /^[0-9A-F]{6}$/.test(x.codigo) && x.quedan === 4, "acierta: gana, código de 6 y quedan 4", x);
  const y = await adivinar(j2.jugador, d2, 417);
  check(y.resultado === "ya_gano" && y.codigo === x.codigo, "otra vez: ya ganó, mismo código");
  check((await a("public.stand_mi_juego($1, $2)", [j2.jugador, d2])).codigo === x.codigo, "al volver a la página ve su código");
  check((await a("public.stand_estado()")).quedan === 4, "el estado público dice 4");
  const d3 = disp();
  const j3 = await registrar(d3, telefono());
  await adivinar(j3.jugador, d3, 111);
  x = await adivinar(j3.jugador, d3, 417);
  check(x.resultado === "gano" && x.intentos_restantes === 1, "se puede ganar en el segundo intento");

  // -------------------------------------------------------------------------
  console.log("\n8) Cuando se terminan las tarjetas");
  for (let i = 0; i < 3; i++) {
    const d = disp();
    const j = await registrar(d, telefono());
    await adivinar(j.jugador, d, 417);
  }
  check((await a("public.stand_estado()")).quedan === 0, "5 ganadores: quedan 0");
  const d6 = disp();
  const j6 = await registrar(d6, telefono());
  x = await adivinar(j6.jugador, d6, 417);
  check(x.resultado === "agotado" && x.gano === false && x.codigo === null && x.acerto === true, "el sexto acierta pero ya no hay tarjeta", x);
  check((await valor("select count(*)::int from public.stand_jugadores where gano")) === 5, "nunca más de 5 ganadores");
  x = await adivinar(j6.jugador, d6, 417);
  check(x.resultado === "sin_intentos", "después de acertar no sigue jugando");
  check((await valor("select count(distinct codigo)::int from public.stand_jugadores where gano")) === 5, "los 5 códigos son distintos");

  // -------------------------------------------------------------------------
  console.log("\n9) Más tarjetas y juego cerrado");
  await r(U.admin, "public.admin_stand_config(true, 6, null)");
  check((await a("public.stand_estado()")).quedan === 1, "con 6 premios vuelve a quedar 1");
  await r(U.admin, "public.admin_stand_config(false, 6, null)");
  check((await a("public.stand_estado()")).activo === false, "cerrado");
  await espera("cerrado: no se anota nadie", () => registrar(disp(), telefono()), "cerrado");
  await espera("cerrado: no se adivina", () => adivinar(j3.jugador, d3, 417), "cerrado");
  await r(U.admin, "public.admin_stand_config(true, 5, null)");

  // -------------------------------------------------------------------------
  console.log("\n10) Límite de frecuencia");
  const dSpam = disp();
  let corto = false;
  for (let i = 0; i < 14; i++) {
    try {
      await registrar(dSpam, telefono());
    } catch (err) {
      corto = /demasiadas/i.test(err.message);
      break;
    }
  }
  check(corto, "más de 12 anotaciones por minuto desde un celular: frena");

  // -------------------------------------------------------------------------
  console.log("\n11) /admin");
  const lista = await r(U.admin, "public.admin_stand()");
  check(Array.isArray(lista.jugadores) && lista.jugadores.length >= 10, "lista los jugadores", lista.jugadores?.length);
  const ganador = lista.jugadores.find((g) => g.gano);
  check(ganador && ganador.codigo && "telefono" in ganador && "quiere_nfc" in ganador, "con teléfono, NFC y código");
  await espera("entregar a alguien que no ganó", () => r(U.admin, "public.admin_stand_entregar($1, true)", [j1.jugador]), "no ganó");
  await espera("una cuenta común no entrega", () => r(U.ana, "public.admin_stand_entregar($1, true)", [ganador.id]), "no autorizado");
  await r(U.admin, "public.admin_stand_entregar($1, true)", [ganador.id]);
  check((await valor("select entregado_at is not null from public.stand_jugadores where id = $1", [ganador.id])) === true, "marca la entrega");
  await r(U.admin, "public.admin_stand_entregar($1, false)", [ganador.id]);
  check((await valor("select entregado_at is null from public.stand_jugadores where id = $1", [ganador.id])) === true, "y la desmarca");

  // -------------------------------------------------------------------------
  console.log("\n12) Rollback");
  await aplicar(ROLLBACK);
  check((await tabla("stand_juego")) === 0 && (await tabla("stand_jugadores")) === 0, "sin las tablas");
  check((await funcion("stand_adivinar")) === 0 && (await funcion("admin_stand")) === 0 && (await funcion("stand_telefono")) === 0, "sin las funciones");
  await aplicar(NUEVA);
  e = await a("public.stand_estado()");
  check(e.listo === false && e.quedan === 5, "se vuelve a aplicar: sin número y con 5 tarjetas");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
