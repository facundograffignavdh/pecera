// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba
// admin_vivo_stand() (20261021120000_vivo_stand.sql): solo admins y los totales de la pantalla
// del stand sin tráfico interno. No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\vivo_stand.mjs .
//   node vivo_stand.mjs <ruta al repo>
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
const NUEVA = "supabase/migrations/20261021120000_vivo_stand.sql";

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
async function aplicar(ruta) {
  try {
    await db.exec(readFileSync(join(RAIZ, ruta), "utf8"));
  } catch (e) {
    console.log(`FALLÓ ${ruta}: ${e.message}`);
    process.exit(1);
  }
}

const u = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const U = { a: u(1), b: u(2), inv: u(3), admin: u(5) };
const D = { publico: u(6), otro: u(7), equipo: u(8) };

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);

  console.log("0) Datos");
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.dispositivos_equipo (dispositivo) values ($1)`, [D.equipo]);

  const perfil = async (slug, usuario = null, publicado = true) =>
    (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto, usuario_id, consentimiento_at)
       values ($1, 'Nombre ' || $1, 'startup', 'emprendedor', 'Descripción', $2, false, $3, now()) returning id`,
      [slug, publicado, usuario]
    )).rows[0].id;
  const pitch = async (perfilId) =>
    (await sistema(
      `insert into public.pitches (perfil_id, video_url, orden, publicado) values ($1, 'x.mp4', 1, true) returning id`,
      [perfilId]
    )).rows[0].id;

  const P = {
    a: await perfil("a", U.a),
    b: await perfil("b", U.b),
    c: await perfil("c"),
    oculto: await perfil("oculto", null, false),
    test: await perfil("test-01"),
  };
  const X = { a: await pitch(P.a), b: await pitch(P.b), test: await pitch(P.test) };

  // Empresa visible (integrante a) y otra solo con un perfil de prueba.
  await yo(U.a, `select public.crear_empresa_v2('Alfa', 'alfa', 'Qué hace', null, '{fintech}')`);
  check((await valor(`select count(*)::int from public.empresas`)) === 1, "Alfa creada");

  // Vistas: 2 públicas, 1 del equipo, 1 a un perfil de prueba.
  for (const [x, d] of [[X.a, D.publico], [X.b, D.otro], [X.a, D.equipo], [X.test, D.publico]]) {
    await sistema(`insert into public.vistas (pitch_id, dispositivo) values ($1, $2)`, [x, d]);
  }
  // Piques: 2 públicos, 1 del equipo.
  for (const [x, d] of [[X.a, D.publico], [X.b, D.publico], [X.b, D.equipo]]) {
    await sistema(`insert into public.piques (pitch_id, dispositivo) values ($1, $2)`, [x, d]);
  }
  // Contactos: a recibe 2 toques del mismo dispositivo (1 CI), b recibe 1, test 1, equipo 1.
  for (const [p, d] of [[P.a, D.publico], [P.a, D.publico], [P.b, D.otro], [P.test, D.publico], [P.c, D.equipo]]) {
    await sistema(`insert into public.contactos (perfil_id, canal, dispositivo) values ($1, 'whatsapp', $2)`, [p, d]);
  }

  console.log("\n1) Permisos");
  await espera("anon no la llama", () => anon(`select public.admin_vivo_stand()`), "permission denied");
  await espera("una cuenta común tampoco", () => yo(U.b, `select public.admin_vivo_stand()`));

  console.log("\n2) Totales");
  const t = (await yo(U.admin, `select public.admin_vivo_stand() r`)).rows[0].r;
  check(t.conexiones === 2, "2 conexiones (sin repetidas en 24 h, sin prueba ni equipo)", t);
  check(t.proyectos_con_conexion === 2, "2 proyectos con al menos una", t);
  check(t.vistas === 2, "2 vistas", t);
  check(t.contactos === 3, "3 contactos (los repetidos cuentan)", t);
  check(t.piques === 2, "2 piques", t);
  check(t.personas === 3, "3 perfiles visibles (sin oculto ni prueba)", t);
  check(t.empresas === 1, "1 empresa visible", t);

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
