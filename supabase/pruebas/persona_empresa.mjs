// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración persona_empresa: perfiles con tipo 'persona', empresas con tipo y
// descripción opcional, crear_empresa_basica, editar_empresa_v3_en y mis_empresas_v2.
// Después aplica el rollback (supabase/rollback-persona-empresa.sql).
// No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\persona_empresa.mjs .
//   node persona_empresa.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261014120000_persona_empresa.sql";
const ROLLBACK = "supabase/rollback-persona-empresa.sql";

let ok = 0;
let fallas = 0;
function bien(msg) { ok++; console.log(`  ✔ ${msg}`); }
function mal(msg) { fallas++; console.log(`  ✘ ${msg}`); }
function check(cond, msg, detalle) { cond ? bien(msg) : mal(detalle === undefined ? msg : `${msg} → ${JSON.stringify(detalle)}`); }

async function como(rol, uid, sql, params = []) {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);");
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
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);");
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
const U = { ana: u(1), beto: u(2), viejo: u(3) };

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);

  // Un perfil de antes, creado como empresa, y una empresa de antes.
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`update public.ajustes set autopublicar = true`);
  await yo(U.viejo, `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at)
                     values ('raiz-verde', 'Raíz Verde', 'startup', 'emprendedor', 'Sustrato de café', now())`);
  await yo(U.viejo, `select public.crear_empresa_v2('Vieja', 'vieja', 'Una empresa de antes', null, '{}')`);

  await aplicar(NUEVA);

  // -------------------------------------------------------------------------
  console.log("\n1) Perfil personal");
  await yo(U.ana, `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at)
                   values ('ana-perez', 'Ana Pérez', 'persona', 'emprendedor', 'Fundadora', now())`);
  check((await valor(`select tipo from public.perfiles where slug = 'ana-perez'`)) === "persona", "un perfil nuevo se guarda con tipo 'persona'");
  await yo(U.viejo, `update public.perfiles set tipo = 'persona' where usuario_id = $1`, [U.viejo]);
  bien("un perfil viejo puede pasar a 'persona'");
  await espera("un tipo inventado sigue rechazado", () =>
    yo(U.viejo, `update public.perfiles set tipo = 'otro' where usuario_id = $1`, [U.viejo]), "perfiles_tipo_check");
  await espera("la descripción del perfil sigue obligatoria", () =>
    yo(U.ana, `update public.perfiles set descripcion = '' where usuario_id = $1`, [U.ana]), "descripcion");

  // -------------------------------------------------------------------------
  console.log("\n2) Crear empresa con lo básico");
  const slug = (await yo(U.ana, `select public.crear_empresa_basica('Raíz', 'raiz', 'startup', 'ceo') s`)).rows[0].s;
  check(slug === "raiz", "crear_empresa_basica devuelve el slug");
  const e = (await sistema(`select id, tipo, descripcion, dueno_id from public.empresas where slug = 'raiz'`)).rows[0];
  check(e.tipo === "startup" && e.descripcion === null && e.dueno_id === U.ana, "sin descripción, con tipo y administrada por quien la crea", e);
  check((await valor(`select cargo from public.empresa_miembros where empresa_id = $1`, [e.id])) === "ceo", "queda como integrante con su cargo");
  check((await valor(`select empresa_id from public.perfiles where slug = 'ana-perez'`)) === e.id, "la primera pasa a ser la principal");
  check((await valor(`select cargo from public.perfiles where slug = 'ana-perez'`)) === "ceo", "el cargo del perfil es el de la principal");
  check((await valor(`select count(*)::int from public.empresas_codigos where empresa_id = $1`, [e.id])) === 1, "tiene código para invitar");
  await yo(U.ana, `select public.crear_empresa_basica('Sin tipo', 'sin-tipo')`);
  check((await valor(`select tipo from public.empresas where slug = 'sin-tipo'`)) === null, "el tipo es opcional");
  await espera("tipo de empresa inválido", () => yo(U.ana, `select public.crear_empresa_basica('X', 'x-1', 'angel')`), "empresas_tipo_valido");
  await espera("slug repetido", () => yo(U.ana, `select public.crear_empresa_basica('Raíz 2', 'raiz')`), "duplicate|unique");
  await espera("cargo inválido", () => yo(U.ana, `select public.crear_empresa_basica('Y', 'y-1', null, 'rey')`), "check");
  await yo(U.ana, `select public.crear_empresa_basica('Tres', 'tres')`);
  await yo(U.ana, `select public.crear_empresa_basica('Cuatro', 'cuatro')`);
  await yo(U.ana, `select public.crear_empresa_basica('Cinco', 'cinco')`);
  await espera("tope de 5 empresas", () => yo(U.ana, `select public.crear_empresa_basica('Seis', 'seis')`), "tope de empresas");
  await espera("anon no crea empresas", () => anon(`select public.crear_empresa_basica('Z', 'z-1')`), "permission denied");
  await espera("sin perfil no se crea empresa", () => yo(U.beto, `select public.crear_empresa_basica('Z', 'z-2')`), "");

  // -------------------------------------------------------------------------
  console.log("\n3) Editar con tipo");
  await yo(U.ana, `select public.editar_empresa_v3_en($1, 'Raíz Verde', 'emprendimiento', 'Sustrato de borra de café', 'https://raiz.com.ar')`, [e.id]);
  const ed = (await sistema(`select nombre, tipo, descripcion, web from public.empresas where id = $1`, [e.id])).rows[0];
  check(ed.tipo === "emprendimiento" && ed.descripcion === "Sustrato de borra de café" && ed.web === "https://raiz.com.ar", "guarda tipo, descripción y web", ed);
  await yo(U.ana, `select public.editar_empresa_v3_en($1, 'Raíz Verde', 'emprendimiento', '   ')`, [e.id]);
  check((await valor(`select descripcion from public.empresas where id = $1`, [e.id])) === null, "descripción en blanco queda en null");
  await espera("quien no es parte no edita", () => yo(U.viejo, `select public.editar_empresa_v3_en($1, 'X')`, [e.id]), "no sos parte");
  const codigo = await valor(`select codigo from public.empresas_codigos where empresa_id = (select id from public.empresas where slug = 'vieja')`);
  await yo(U.ana, `select public.salir_de_empresa((select id from public.empresas where slug = 'cinco'), true)`);
  await yo(U.ana, `select public.unirse_empresa_v2($1)`, [codigo]);
  const vieja = await valor(`select id from public.empresas where slug = 'vieja'`);
  await espera("una integrante que no administra no edita", () => yo(U.ana, `select public.editar_empresa_v3_en($1, 'X')`, [vieja]), "solo el dueño");
  await espera("anon no edita", () => anon(`select public.editar_empresa_v3_en($1, 'X')`, [e.id]), "permission denied");

  // -------------------------------------------------------------------------
  console.log("\n4) Lecturas");
  const mias = (await yo(U.ana, `select slug, tipo, cargo, es_principal from public.mis_empresas_v2()`)).rows;
  check(mias.length === 5 && mias[0].slug === "raiz" && mias[0].tipo === "emprendimiento" && mias[0].es_principal, "mis_empresas_v2 trae el tipo, la principal primero", mias);
  const viejas = (await yo(U.ana, `select slug from public.mis_empresas()`)).rows;
  check(viejas.length === 5, "mis_empresas sigue andando");
  await espera("anon no llama a mis_empresas_v2", () => anon(`select * from public.mis_empresas_v2()`), "permission denied");
  const publica = (await anon(`select slug, descripcion, tipo from public.empresas where slug = 'raiz'`)).rows;
  check(publica.length === 1 && publica[0].descripcion === null, "anon ve la empresa sin descripción", publica);
  await yo(U.viejo, `select public.editar_empresa_en($1, 'Vieja', 'Sigue igual')`, [vieja]);
  check((await valor(`select descripcion from public.empresas where id = $1`, [vieja])) === "Sigue igual", "editar_empresa_en (main) sigue igual");
  await yo(U.viejo, `select public.crear_empresa_v2('Otra', 'otra', 'Con descripción', null, '{}')`);
  bien("crear_empresa_v2 (main) sigue igual");

  // -------------------------------------------------------------------------
  console.log("\n5) Rollback");
  await aplicar(ROLLBACK);
  check((await valor(`select count(*)::int from information_schema.columns where table_name = 'empresas' and column_name = 'tipo'`)) === 0, "sin columna tipo");
  check((await valor(`select count(*)::int from pg_proc where proname in ('crear_empresa_basica', 'editar_empresa_v3_en', 'mis_empresas_v2')`)) === 0, "sin las funciones nuevas");
  check((await valor(`select is_nullable from information_schema.columns where table_name = 'empresas' and column_name = 'descripcion'`)) === "YES", "con empresas sin descripción, la columna queda opcional (no inventa texto)");
  await yo(U.ana, `update public.perfiles set tipo = 'startup' where usuario_id = $1`, [U.ana]);
  await yo(U.viejo, `update public.perfiles set tipo = 'startup' where usuario_id = $1`, [U.viejo]);
  await sistema(`update public.empresas set descripcion = 'Completada' where descripcion is null`);
  await aplicar(ROLLBACK);
  await espera("sin filas 'persona', el rollback restaura el CHECK de antes", () =>
    yo(U.ana, `update public.perfiles set tipo = 'persona' where usuario_id = $1`, [U.ana]), "perfiles_tipo_check");
  check((await valor(`select is_nullable from information_schema.columns where table_name = 'empresas' and column_name = 'descripcion'`)) === "NO", "y la descripción vuelve a ser obligatoria");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar la migración");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
