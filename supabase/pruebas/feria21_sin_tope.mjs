// Harness: aplica schema + migraciones de Pecera sobre PGlite y prueba que #feria21 no cuente para
// el tope de 150 de la descripción de un pitch (20261020120000_feria21_sin_tope.sql) y el rollback.
// No toca ninguna base.
//
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\feria21_sin_tope.mjs .
//   node feria21_sin_tope.mjs <ruta al repo>
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
];
const PREVIA = "supabase/migrations/20261019120000_alta_rapida.sql";
const NUEVA = "supabase/migrations/20261020120000_feria21_sin_tope.sql";
const ROLLBACK = "supabase/rollback-feria21-sin-tope.sql";
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
const U = { admin: u(1), ana: u(3) };
const desc = (id) => valor("select descripcion from public.pitches where id = $1", [id]);
const funcion = (nombre) => valor(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = $1`, [nombre]);

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(PREVIA);

  await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'admin@mail.com', now()), ($2, 'ana@mail.com', now())`, [U.admin, U.ana]);
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  const perfil = await valor(`insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, usuario_id, consentimiento_at)
    values ('ana', 'Ana', 'persona', 'emprendedor', $1, true, $2, now()) returning id`, ["p".repeat(150), U.ana]);
  const pitch = (d) => valor(`insert into public.pitches (perfil_id, video_url, orden, publicado, descripcion)
    values ($1, 'v.mp4', 1, true, $2) returning id`, [perfil, d]);
  const largo = await pitch("x".repeat(150));
  const corto = await pitch("Corto");
  const sinPropia = await pitch(null);

  console.log("1) Antes de la migración: el tag no entra");
  await espera("con 150, admin_pitch_feria no puede", () => r(U.admin, `public.admin_pitch_feria('${largo}', true)`), "no entra");

  await aplicar(NUEVA);

  console.log("\n2) El CHECK nuevo");
  await espera("151 sin tag no vale", () => sistema("update public.pitches set descripcion = $1 where id = $2", ["x".repeat(151), corto]), "check");
  await sistema("update public.pitches set descripcion = $1 where id = $2", ["x".repeat(150) + " #feria21", corto]);
  bien("150 + #feria21 vale");
  await espera("el tag no sirve para escribir más: 151 + tag no vale",
    () => sistema("update public.pitches set descripcion = $1 where id = $2", ["x".repeat(151) + " #feria21", corto]), "check");
  await sistema("update public.pitches set descripcion = 'Corto' where id = $1", [corto]);

  console.log("\n3) admin_pitch_feria_libre");
  await espera("anon no la ejecuta", () => anon(`select public.admin_pitch_feria_libre('${largo}', true)`), "permission denied");
  await espera("no-admin no la ejecuta", () => r(U.ana, `public.admin_pitch_feria_libre('${largo}', true)`), "no autorizado");
  await r(U.admin, `public.admin_pitch_feria_libre('${largo}', true)`);
  check((await desc(largo)) === "x".repeat(150) + " #feria21", "con 150: se suma igual", (await desc(largo)).length);
  await r(U.admin, `public.admin_pitch_feria_libre('${largo}', true)`);
  check((await desc(largo)) === "x".repeat(150) + " #feria21", "dos veces: no se duplica");
  await r(U.admin, `public.admin_pitch_feria_libre('${sinPropia}', true)`);
  check((await desc(sinPropia)) === "p".repeat(150) + " #feria21", "sin descripción propia: parte de la del perfil (150)");
  await r(U.admin, `public.admin_pitch_feria_libre('${corto}', true)`);
  check((await desc(corto)) === "Corto #feria21", "una corta");
  await r(U.admin, `public.admin_pitch_feria_libre('${largo}', false)`);
  check((await desc(largo)) === "x".repeat(150), "se saca");
  await r(U.admin, `public.admin_pitch_feria(${"'" + corto + "'"}, false)`);
  check((await desc(corto)) === "Corto", "la función de antes sigue andando");

  console.log("\n4) La dueña edita con el tag puesto");
  await r(U.ana, `public.editar_mi_pitch('${sinPropia}', $1)`, ["y".repeat(150) + " #feria21"]);
  check((await desc(sinPropia)) === "y".repeat(150) + " #feria21", "150 + tag se guarda");
  await espera("151 + tag no", () => r(U.ana, `public.editar_mi_pitch('${sinPropia}', $1)`, ["y".repeat(151) + " #feria21"]), "check");

  console.log("\n5) Rollback");
  await r(U.admin, `public.admin_pitch_feria_libre('${largo}', true)`);
  await aplicar(ROLLBACK);
  check((await funcion("admin_pitch_feria_libre")) === 0, "sin la función");
  check((await desc(largo)).length === 159, "lo que ya tenía el tag queda como está");
  await espera("lo nuevo vuelve al tope de 150", () => sistema("update public.pitches set descripcion = $1 where id = $2", ["x".repeat(151), corto]), "check");
  await espera("y admin_pitch_feria vuelve a avisar", () => r(U.admin, `public.admin_pitch_feria('${largo}', false)`).then(() => r(U.admin, `public.admin_pitch_feria('${largo}', true)`)), "no entra");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
