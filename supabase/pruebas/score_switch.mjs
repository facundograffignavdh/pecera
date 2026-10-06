// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba el
// interruptor del score crediticio (20261018120000_score_switch.sql): la columna, config_score(),
// admin_score() solo para admins, que config_funciones/admin_funciones siguen igual, y el rollback.
// No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\score_switch.mjs .
//   node score_switch.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261018120000_score_switch.sql";
const ROLLBACK = "supabase/rollback-score-switch.sql";

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
const yo = (uid, sql, params = []) => como("authenticated", uid, sql, params);
const anon = (sql, params = []) => como("anon", null, sql, params);
const r = (uid, sql, params = []) => yo(uid, `select ${sql} r`, params).then((x) => x.rows[0].r);

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

const funcion = (nombre) => valor(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = $1`, [nombre]);
const columna = () => valor(`select count(*)::int from information_schema.columns
  where table_schema = 'public' and table_name = 'funciones_config' and column_name = 'score_activo'`);
const CLAVES = ["pared_activa", "pared_libres", "traspaso_activo", "visitas_activas", "visitas_desde"];
const claves = async () => Object.keys(await anon("select public.config_funciones() r").then((x) => x.rows[0].r)).sort();

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
  console.log("1) Columna");
  check((await columna()) === 1, "funciones_config.score_activo existe");
  check((await valor("select score_activo from public.funciones_config where id")) === false, "arranca en false");
  check((await valor(`select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'funciones_config' and column_name = 'score_activo'`)) === "NO", "not null");

  // -------------------------------------------------------------------------
  console.log("\n2) config_score");
  check((await anon("select public.config_score() r")).rows[0].r === false, "anon lee false");
  check((await r(U.ana, "public.config_score()")) === false, "authenticated lee false");
  await sistema("delete from public.funciones_config");
  check((await anon("select public.config_score() r")).rows[0].r === false, "sin fila: false (nunca null)");
  await sistema("insert into public.funciones_config default values");
  await espera("anon no lee la tabla directo", () => anon("select score_activo from public.funciones_config"), "permission denied");

  // -------------------------------------------------------------------------
  console.log("\n3) admin_score");
  await espera("anon no puede ejecutarla", () => anon("select public.admin_score(true)"), "permission denied");
  await espera("una cuenta que no es admin, tampoco", () => r(U.ana, "public.admin_score(true)"), "no autorizado");
  check((await valor("select score_activo from public.funciones_config where id")) === false, "sigue apagado");
  await espera("null no vale", () => r(U.admin, "public.admin_score(null)"), "datos inválidos");
  await r(U.admin, "public.admin_score(true)");
  check((await anon("select public.config_score() r")).rows[0].r === true, "el admin lo prende y anon lee true");
  await r(U.admin, "public.admin_score(false)");
  check((await anon("select public.config_score() r")).rows[0].r === false, "el admin lo apaga");

  // -------------------------------------------------------------------------
  console.log("\n4) Los otros interruptores no cambian");
  check(JSON.stringify(await claves()) === JSON.stringify(CLAVES), "config_funciones con sus 5 claves", await claves());
  await r(U.admin, "public.admin_score(true)");
  await r(U.admin, "public.admin_funciones(true, false, 3, false)");
  check((await valor("select score_activo from public.funciones_config where id")) === true, "admin_funciones no toca el score");
  check((await anon("select public.config_funciones() r")).rows[0].r.pared_libres === 3, "y admin_funciones anda");

  // -------------------------------------------------------------------------
  console.log("\n5) Rollback");
  await aplicar(ROLLBACK);
  check((await funcion("config_score")) === 0 && (await funcion("admin_score")) === 0, "sin las dos funciones");
  check((await columna()) === 0, "sin la columna");
  check(JSON.stringify(await claves()) === JSON.stringify(CLAVES), "config_funciones sigue andando");
  await r(U.admin, "public.admin_funciones(false, false, 2, false)");
  check((await anon("select public.config_funciones() r")).rows[0].r.pared_libres === 2, "admin_funciones sigue andando");
  await aplicar(NUEVA);
  check((await anon("select public.config_score() r")).rows[0].r === false, "se vuelve a aplicar y arranca apagado");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
