// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración feria_todos_los_roles: en la Feria 21 compite cualquier perfil.
// Un inversor y un aliado anotados reciben votos, aparecen en el ranking del stand y
// cuentan como participantes en las métricas; siguen las reglas de siempre (visible,
// anotado, ni a sí mismo ni a su empresa, un voto por cuenta). Después aplica el
// rollback (supabase/rollback-feria-todos-los-roles.sql) y vuelve a la regla de antes.
// No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\feria_todos_los_roles.mjs .
//   node feria_todos_los_roles.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261013120000_feria_todos_los_roles.sql";
const ROLLBACK = "supabase/rollback-feria-todos-los-roles.sql";

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
const admin = async (sql, params = []) => Object.values((await yo(U.admin, sql, params)).rows[0] ?? {})[0];

async function aplicar(ruta) {
  try {
    await db.exec(readFileSync(join(RAIZ, ruta), "utf8"));
  } catch (e) {
    console.log(`FALLÓ ${ruta}: ${e.message}`);
    process.exit(1);
  }
}

const u = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const U = {
  admin: u(1), equipo: u(2), emp: u(3), inv: u(4), ali: u(5), socio: u(6), nadie: u(7),
  v1: "a1a1a1a1-0000-4000-8000-000000000001",
  v2: "a1a1a1a1-0000-4000-8000-000000000002",
  v3: "a1a1a1a1-0000-4000-8000-000000000003",
  v4: "a1a1a1a1-0000-4000-8000-000000000004",
  v5: "a1a1a1a1-0000-4000-8000-000000000005",
};
const EV = "feria-21";

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);

  // Permisos de antes, para comparar después.
  const permisos = async () =>
    (await sistema(`
      select p.proname, array_to_string(p.proacl, ',') acl
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('votar', 'metrica_proyectos_en', 'admin_ranking_evento',
        'evento_representante_por_defecto', 'admin_empresa_participante', 'admin_representante')
      order by 1`)).rows;
  const antes = await permisos();
  await aplicar(NUEVA);

  // -------------------------------------------------------------------------
  console.log("\n0) Datos");
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.equipo_ingesta (email) values ('equipo@mail.com')`);
  const perfil = async (slug, rol, usuario = null) =>
    (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto, usuario_id, consentimiento_at)
       values ($1, 'Nombre ' || $1, $2, $3, 'Descripción', true, false, $4, now()) returning id`,
      [slug, rol === "inversor" ? "angel" : rol === "aliado" ? "aceleradora" : "startup", rol, usuario]
    )).rows[0].id;
  const P = {};
  P.emp = await perfil("emp", "emprendedor", U.emp);
  P.inv = await perfil("inv", "inversor", U.inv);
  P.ali = await perfil("ali", "aliado", U.ali);
  P.socio = await perfil("socio", "inversor", U.socio);
  P.oculto = await perfil("oculto", "aliado");
  await sistema(`update public.perfiles set oculto = true where id = $1`, [P.oculto]);
  P.suelto = await perfil("suelto", "inversor");

  check(JSON.stringify(await permisos()) === JSON.stringify(antes), "create or replace conserva los permisos de las seis funciones");

  // Fondo: una empresa con un inversor que la administra y otro inversor de integrante.
  await yo(U.inv, `select public.crear_empresa_v2('Fondo Uno', 'fondo-uno', 'Invierte', null, '{}')`);
  const fondo = await valor(`select id from public.empresas where slug = 'fondo-uno'`);
  const codigo = await valor(`select codigo from public.empresas_codigos where empresa_id = $1`, [fondo]);
  await yo(U.socio, `select public.unirse_empresa_v2($1)`, [codigo]);

  // -------------------------------------------------------------------------
  console.log("\n1) Anotarse y recibir votos con cualquier rol");
  await yo(U.ali, `select public.participar_evento('${EV}', true)`);
  await yo(U.emp, `select public.participar_evento('${EV}', true)`);
  await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [fondo]);
  check((await valor(`select perfil_id from public.evento_empresas where empresa_id = $1`, [fondo])) === P.inv, "la empresa de un inversor participa a través de quien la administra (inversor)");
  await admin(`select public.admin_participante('${EV}', $1, true)`, [P.oculto]);
  await admin(`select public.admin_configurar_evento('${EV}', true, false)`);

  const votar = (uid, perfilId) => yo(uid, `select public.votar('${EV}', $1)`, [perfilId]);
  await votar(U.v1, P.inv);
  bien("un inversor anotado recibe un voto");
  await votar(U.v2, P.ali);
  bien("un aliado anotado recibe un voto");
  await votar(U.v3, P.ali);
  await votar(U.v4, P.emp);
  await votar(U.emp, P.ali);
  bien("un emprendedor vota a un aliado");
  await votar(U.v5, P.inv);
  await votar(U.equipo, P.inv);

  await espera("nadie se vota a sí mismo (aliado)", () => votar(U.ali, P.ali), "no podés votarte");
  await espera("ni a alguien de su empresa (inversor → inversor del mismo fondo)", () => votar(U.socio, P.inv), "no podés votar a tu empresa");
  await espera("perfil oculto no recibe votos", () => votar(U.nadie, P.oculto), "participante inexistente");
  await espera("perfil no anotado no recibe votos", () => votar(U.nadie, P.suelto), "participante inexistente");
  await espera("anon no vota", () => anon(`select public.votar('${EV}', $1)`, [P.ali]), "permission denied");
  await votar(U.v1, P.ali);
  check(
    (await valor(`select count(*)::int from public.votos where votante = $1`, [U.v1])) === 1 &&
      (await valor(`select perfil_id from public.votos where votante = $1`, [U.v1])) === P.ali,
    "un voto por cuenta: cambiar el voto lo reemplaza"
  );
  await admin(`select public.admin_configurar_evento('${EV}', false, false)`);
  await espera("con la votación cerrada no se vota", () => votar(U.nadie, P.ali), "votación cerrada");

  // -------------------------------------------------------------------------
  console.log("\n2) Ranking, resultados y métricas");
  const r = await admin(`select public.admin_ranking_evento('${EV}')`);
  const resumen = r.filas.map((f) => `${f.puesto}${f.empate ? "=" : ""} ${f.nombre} ${f.votos}`);
  check(
    JSON.stringify(resumen) === JSON.stringify(["1 Nombre ali 4", "2= Fondo Uno 1", "2= Nombre emp 1"]),
    "el ranking del stand incluye aliado e inversor (por su empresa), sin el voto del equipo",
    resumen
  );
  const oficial = (await yo(U.admin, `select * from public.resultados_evento('${EV}')`)).rows;
  check(oficial.find((x) => x.perfil_id === P.inv)?.votos === 1 + 1, "resultados_evento no cambia (cuenta también el voto del equipo)", oficial);
  const proy = (await sistema(`select perfil_id, rol from public.metrica_proyectos_en($1)`, [EV])).rows;
  check(
    JSON.stringify(proy.map((x) => x.rol).sort()) === JSON.stringify(["aliado", "emprendedor", "inversor"]),
    "participantes de la feria: todos los roles anotados y visibles (no el oculto)",
    proy
  );
  const base = (await sistema(`select perfil_id from public.metrica_proyectos()`)).rows.length;
  const plat = (await sistema(`select perfil_id from public.metrica_proyectos_en('plataforma')`)).rows.length;
  check(base === plat, "'plataforma' sigue igual a metrica_proyectos()");

  // -------------------------------------------------------------------------
  console.log("\n3) Representante de cualquier rol");
  await admin(`select public.admin_representante('${EV}', $1, $2)`, [fondo, P.socio]);
  check((await valor(`select perfil_id from public.evento_empresas where empresa_id = $1`, [fondo])) === P.socio, "otro inversor del fondo pasa a representarlo");
  await espera("quien no es integrante no representa", () => yo(U.admin, `select public.admin_representante('${EV}', $1, $2)`, [fondo, P.ali]), "integrante visible");

  // -------------------------------------------------------------------------
  console.log("\n4) Rollback");
  await aplicar(ROLLBACK);
  check(JSON.stringify(await permisos()) === JSON.stringify(antes), "el rollback conserva los permisos");
  await admin(`select public.admin_configurar_evento('${EV}', true, false)`);
  await espera("con el rollback, un aliado vuelve a no recibir votos", () => votar(U.nadie, P.ali), "participante inexistente");
  await votar(U.nadie, P.emp);
  bien("con el rollback, un emprendedor sigue recibiendo votos");
  const proyAntes = (await sistema(`select rol from public.metrica_proyectos_en($1)`, [EV])).rows.map((x) => x.rol);
  check(proyAntes.every((x) => x === "emprendedor"), "con el rollback, la feria cuenta solo emprendedores", proyAntes);
  const rAntes = await admin(`select public.admin_ranking_evento('${EV}')`);
  check(rAntes.filas.every((f) => f.nombre === "Nombre emp"), "con el rollback, el ranking muestra solo emprendedores", rAntes.filas);
  check((await valor(`select count(*)::int from public.votos where perfil_id = $1`, [P.ali])) === 4, "el rollback no borra votos ya dados");
  await espera("la empresa de inversores no se puede volver a sumar", async () => {
    await admin(`select public.admin_empresa_participante('${EV}', $1, false)`, [fondo]);
    await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [fondo]);
  }, "integrante emprendedora visible");
  await aplicar(NUEVA);
  await votar(U.nadie, P.ali);
  bien("se vuelve a aplicar la migración y el aliado recibe votos otra vez");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
