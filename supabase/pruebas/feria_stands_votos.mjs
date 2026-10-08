// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración feria_stands_votos: la planilla de stands (emparejamiento por
// slug, nombre, perfil con el nombre del emprendimiento y empresa; anotado automático
// al crear o publicar el perfil; un stand se vincula una sola vez; feria_dias sin
// nombres) y el voto sin cuenta (un voto por dispositivo, cambiable, frenos, sin voto
// doble con la cuenta, conteos que suman las dos tablas, ranking sin el equipo).
// Después aplica el rollback (supabase/rollback-feria-stands-votos.sql). No toca
// ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\feria_stands_votos.mjs .
//   node feria_stands_votos.mjs <ruta al repo>
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
const NUEVA = "supabase/migrations/20261019120000_feria_stands_votos.sql";
const ROLLBACK = "supabase/rollback-feria-stands-votos.sql";

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
const U = { admin: u(1), equipo: u(2), ana: u(3), beto: u(4), caro: u(5), dani: u(6), socio: u(7), tarde: u(8), v1: u(9) };
const D = {
  a: "d0d0d0d0-0000-4000-8000-00000000000a",
  b: "d0d0d0d0-0000-4000-8000-00000000000b",
  c: "d0d0d0d0-0000-4000-8000-00000000000c",
  ana: "d0d0d0d0-0000-4000-8000-0000000000aa",
  v1: "d0d0d0d0-0000-4000-8000-0000000000f1",
  socio: "d0d0d0d0-0000-4000-8000-0000000000f7",
};
const EV = "feria-21";

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  const permisos = async () =>
    (await sistema(`
      select p.proname, array_to_string(p.proacl, ',') acl
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('resultados_evento', 'total_votos_evento', 'admin_evento',
        'admin_ranking_evento', 'evento_mover_votos')
      order by 1`)).rows;
  const antes = await permisos();
  await aplicar(NUEVA);
  check(JSON.stringify(await permisos()) === JSON.stringify(antes), "create or replace conserva los permisos de las cinco funciones");

  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.equipo_ingesta (email) values ('equipo@mail.com')`);
  const perfil = async (slug, nombre, usuario = null, publicado = true) =>
    (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto, usuario_id, consentimiento_at)
       values ($1, $2, 'startup', 'emprendedor', 'Descripción', $3, false, $4, now()) returning id`,
      [slug, nombre, publicado, usuario]
    )).rows[0].id;
  const evento = await valor(`select id from public.eventos where slug = '${EV}'`);
  const anotados = async () =>
    (await sistema(`select perfil_id from public.evento_participantes where evento_id = $1`, [evento])).rows.map((x) => x.perfil_id);

  // -------------------------------------------------------------------------
  console.log("\n1) Planilla y emparejamiento");
  const P = {};
  P.ana = await perfil("ana-perez", "Ana Pérez", U.ana);
  P.beto = await perfil("beto-x", "Beto Gómez", U.beto);
  P.rodia = await perfil("rodia", "RODIA", U.caro);
  P.dani = await perfil("dani", "Daniel Sosa", U.dani);
  P.homonimo1 = await perfil("juan-1", "Juan Paz");
  P.homonimo2 = await perfil("juan-2", "Juan Paz");
  await yo(U.dani, `select public.crear_empresa_v2('Lia', 'lia', 'IA', null, '{}')`);
  const lia = await valor(`select id from public.empresas where slug = 'lia'`);
  const stand = (codigo, dia, nombre, emp, slug = null) =>
    sistema(
      `insert into public.feria_stands (codigo, evento_id, dia, stand, nombre, emprendimiento, slug)
       values ($1, $2, $3, 1, $4, $5, $6)`,
      [codigo, evento, dia, nombre, emp, slug]
    );
  await stand("s101", "2026-10-07", "Otra Persona", "Algo", "ana-perez");
  await stand("s102", "2026-10-07", "BETO GOMEZ", "Turnero");
  await stand("s103", "2026-10-08", "Gonzalo X", "Rodia");
  await stand("s104", "2026-10-08", "Felipe Y", "LIA");
  await stand("s105", "2026-10-09", "Juan Paz", "Nada");
  await stand("s106", "2026-10-09", "Sin Cuenta Todavía", "Futuro SA");
  await stand("s107", "2026-10-09", "Ana Perez", "Algo");
  const n = await valor(`select public.feria_anotar_stands()`);
  check(n === 5, "vincula 5 stands", n);
  const vinc = Object.fromEntries((await sistema(`select codigo, perfil_id from public.feria_stands`)).rows.map((x) => [x.codigo, x.perfil_id]));
  check(vinc.s101 === P.ana, "por slug");
  check(vinc.s102 === P.beto, "por nombre de la persona (sin tildes ni mayúsculas)");
  check(vinc.s103 === P.rodia, "por perfil con el nombre del emprendimiento");
  check(vinc.s104 === P.dani, "por empresa: su representante");
  check(vinc.s107 === P.ana, "la misma persona en otro día");
  check(vinc.s105 === null, "dos perfiles con el mismo nombre: no adivina", vinc.s105);
  check(vinc.s106 === null, "sin cuenta: queda sin vincular");
  check((await valor(`select count(*)::int from public.evento_empresas where empresa_id = $1`, [lia])) === 1, "la empresa queda participando con su representante");
  const a = await anotados();
  check([P.ana, P.beto, P.rodia, P.dani].every((id) => a.includes(id)) && !a.includes(P.homonimo1), "los vinculados quedan anotados en el evento", a);

  // -------------------------------------------------------------------------
  console.log("\n2) Automático al sumarse");
  P.tarde = await perfil("futuro", "Sin Cuenta Todavía", U.tarde, false);
  check(!(await anotados()).includes(P.tarde), "sin publicar todavía: no se anota");
  await sistema(`update public.perfiles set publicado = true where id = $1`, [P.tarde]);
  check((await anotados()).includes(P.tarde), "al publicarse, el trigger lo anota solo");
  check((await valor(`select perfil_id from public.feria_stands where codigo = 's106'`)) === P.tarde, "y vincula el stand");
  await admin(`select public.admin_participante('${EV}', $1, false)`, [P.tarde]);
  await sistema(`update public.perfiles set nombre = 'Sin Cuenta Todavía' where id = $1`, [P.tarde]);
  check(!(await anotados()).includes(P.tarde), "si /admin lo saca, no vuelve a entrar solo");
  await sistema(`alter function public.feria_anotar_stands() rename to feria_anotar_stands_ok`);
  await sistema(`create function public.feria_anotar_stands() returns int language sql as 'select 1/0'`);
  await stand("s108", "2026-10-07", "Nadie Más", null);
  await perfil("otro", "Otro Perfil");
  bien("si el emparejamiento falla, el alta del perfil sigue igual");
  await sistema(`drop function public.feria_anotar_stands()`);
  await sistema(`alter function public.feria_anotar_stands_ok() rename to feria_anotar_stands`);

  // -------------------------------------------------------------------------
  console.log("\n3) feria_dias");
  const dias = Object.fromEntries(
    (await anon(`select perfil_id, dias::text[] d from public.feria_dias('${EV}')`)).rows.map((x) => [x.perfil_id, x.d])
  );
  check(JSON.stringify(dias[P.ana]) === JSON.stringify(["2026-10-07", "2026-10-09"]), "Ana: sus dos stands", dias[P.ana]);
  check(JSON.stringify(dias[P.dani]) === JSON.stringify(["2026-10-08"]), "integrante de una empresa de la planilla", dias[P.dani]);
  check(!(P.tarde in dias), "quien no participa no aparece");
  await espera("anon no lee la planilla", () => anon(`select nombre from public.feria_stands`), "permission denied");
  await espera("anon no corre el emparejamiento", () => anon(`select public.feria_anotar_stands()`), "permission denied");
  const cols = (await anon(`select * from public.feria_dias('${EV}') limit 1`)).fields.map((f) => f.name);
  check(JSON.stringify(cols) === JSON.stringify(["perfil_id", "dias"]), "feria_dias devuelve solo ids y días", cols);

  // -------------------------------------------------------------------------
  console.log("\n4) Voto sin cuenta");
  const vd = (disp, p) => anon(`select public.votar_dispositivo('${EV}', $1, $2)`, [p, disp]);
  await espera("con la votación cerrada, no", () => vd(D.a, P.ana), "votación cerrada");
  await admin(`select public.admin_configurar_evento('${EV}', true, false)`);
  await vd(D.a, P.ana);
  await vd(D.b, P.ana);
  await vd(D.c, P.beto);
  bien("tres dispositivos votan sin cuenta");
  await vd(D.a, P.beto);
  check((await valor(`select count(*)::int from public.votos_dispositivo where dispositivo = $1`, [D.a])) === 1, "un voto por dispositivo: cambiarlo lo reemplaza");
  check((await anon(`select public.mi_voto_dispositivo('${EV}', $1) r`, [D.a])).rows[0].r === P.beto, "mi_voto_dispositivo");
  await espera("no a un perfil no anotado", () => vd(D.a, P.homonimo1), "participante inexistente");
  await espera("sin dispositivo, no", () => vd(null, P.ana), "datos inválidos");
  await espera("con sesión se vota con la cuenta", () => yo(U.v1, `select public.votar_dispositivo('${EV}', $1, $2)`, [P.ana, D.v1]), "permission denied|con la cuenta");
  await sistema(`insert into public.dispositivo_cuentas (dispositivo, usuario_id) values ($1, $2)`, [D.ana, U.ana]);
  await espera("el dispositivo de Ana no vota a Ana", () => vd(D.ana, P.ana), "no podés votarte");
  await sistema(`insert into public.dispositivo_cuentas (dispositivo, usuario_id) values ($1, $2)`, [D.socio, U.dani]);
  await espera("ni a sí misma por su empresa", () => vd(D.socio, P.dani), "no podés votarte|tu empresa");
  let limite = null;
  for (let i = 0; i < 12 && !limite; i++) {
    try {
      await vd(D.b, i % 2 ? P.ana : P.beto);
    } catch (e) {
      limite = e.message;
    }
  }
  check(/demasiadas/.test(limite ?? ""), "límite de frecuencia", limite);

  // -------------------------------------------------------------------------
  console.log("\n5) Sin voto doble con la cuenta");
  await sistema(`insert into public.dispositivo_cuentas (dispositivo, usuario_id) values ($1, $2)`, [D.v1, U.v1]);
  await sistema(`delete from public.medicion_frecuencia`);
  await vd(D.v1, P.ana);
  await yo(U.v1, `select public.votar('${EV}', $1)`, [P.beto]);
  check((await valor(`select count(*)::int from public.votos_dispositivo where dispositivo = $1`, [D.v1])) === 0, "al votar con la cuenta, el voto del dispositivo vinculado se borra");
  await espera("y ese dispositivo ya no vota sin cuenta", () => vd(D.v1, P.ana), "ya votaste");

  // -------------------------------------------------------------------------
  console.log("\n6) Conteos");
  const total = await valor(`select public.total_votos_evento('${EV}')`);
  check(total === 4, "total_votos_evento suma las dos tablas (1 con cuenta + 3 sin cuenta)", total);
  check((await yo(U.ana, `select * from public.resultados_evento('${EV}')`)).rows.length === 0, "resultados ocultos para el público");
  const res = (await yo(U.admin, `select * from public.resultados_evento('${EV}')`)).rows.reduce((t, x) => t + x.votos, 0);
  check(res === 4, "el equipo ve los resultados con los dos tipos", res);
  check((await admin(`select votos from public.admin_evento('${EV}')`)) === 4, "admin_evento cuenta los dos");
  const sc = (await yo(U.admin, `select * from public.admin_votos_sin_cuenta('${EV}')`)).rows.reduce((t, x) => t + x.votos, 0);
  check(sc === 3, "admin_votos_sin_cuenta: 3", sc);
  await espera("admin_votos_sin_cuenta solo para el equipo", () => yo(U.ana, `select * from public.admin_votos_sin_cuenta('${EV}')`), "no autorizado");
  await sistema(`insert into public.dispositivos_equipo (dispositivo) values ($1)`, [D.c]);
  const rk = await admin(`select public.admin_ranking_evento('${EV}')`);
  check(rk.total === 3, "el ranking del stand no cuenta los dispositivos del equipo", rk.total);

  // -------------------------------------------------------------------------
  console.log("\n7) Quitar y mover");
  await anon(`select public.quitar_voto_dispositivo('${EV}', $1)`, [D.a]);
  check((await valor(`select public.total_votos_evento('${EV}')`)) === 3, "quitar_voto_dispositivo");
  await sistema(`select public.evento_mover_votos($1, $2, $3)`, [evento, P.beto, P.rodia]);
  check((await valor(`select count(*)::int from public.votos_dispositivo where perfil_id = $1`, [P.rodia])) >= 1, "evento_mover_votos mueve también los votos sin cuenta");

  // -------------------------------------------------------------------------
  console.log("\n8) Rollback");
  await aplicar(ROLLBACK);
  check(
    (await valor(`select count(*)::int from information_schema.tables where table_schema = 'public' and table_name in ('feria_stands', 'votos_dispositivo')`)) === 0,
    "sin las tablas nuevas"
  );
  check((await valor(`select public.total_votos_evento('${EV}')`)) === 1, "total_votos_evento vuelve a contar solo con cuenta");
  await perfil("despues", "Después del rollback");
  bien("el alta de perfiles sigue andando sin los triggers");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
