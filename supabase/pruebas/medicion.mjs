// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración de medición (vistas y contactos) con roles y JWT simulados
// (como PostgREST de Supabase). No toca ninguna base real. Mismo armado que
// feria_lista.mjs.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\medicion.mjs .
//   node medicion.mjs <ruta al repo>
// Tiene que terminar en "N ok · 0 fallas". Si agregás una migración, sumala a MIGRACIONES.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.argv[2];
const db = new PGlite();

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
];

let ok = 0;
let fallas = 0;
function bien(msg) { ok++; console.log(`  ✔ ${msg}`); }
function mal(msg) { fallas++; console.log(`  ✘ ${msg}`); }

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

async function main() {
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) {
    try {
      await db.exec(readFileSync(join(RAIZ, "supabase/migrations", m), "utf8"));
      console.log(`aplicada ${m}`);
    } catch (e) {
      console.log(`FALLÓ ${m}: ${e.message}`);
      process.exit(1);
    }
  }

  const ADMIN = "44444444-4444-4444-4444-444444444444";
  const NADIE = "55555555-5555-5555-5555-555555555555";
  const D1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const D2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const D3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${ADMIN}', 'equipo@pecera.com', now()),
      ('${NADIE}', 'nadie@mail.com', now());
    insert into public.admins (email) values ('equipo@pecera.com');
  `);

  // Perfiles cargados como el SQL editor (sin sesión: el guardián no frena).
  const perfil = async (slug, publicado, oculto) =>
    (await db.query(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto)
       values ($1, 'Nombre ' || $1, 'startup', 'emprendedor', 'Descripción', $2, $3) returning id`,
      [slug, publicado, oculto]
    )).rows[0].id;
  const pitch = async (perfilId, publicado) =>
    (await db.query(
      `insert into public.pitches (perfil_id, video_url, orden, publicado) values ($1, 'x.mp4', 1, $2) returning id`,
      [perfilId, publicado]
    )).rows[0].id;

  const ana = await perfil("ana", true, false);
  const oculta = await perfil("oculta", true, true);
  const borrador = await perfil("borrador", false, false);
  const pAna = await pitch(ana, true);
  const pAnaBorrador = await pitch(ana, false);
  const pOculta = await pitch(oculta, true);
  const pBorrador = await pitch(borrador, true);

  const vista = (disp, p) =>
    como("anon", null, `select public.registrar_vista($1, $2) as ok`, [p, disp]).then((r) => r.rows[0].ok);
  const contacto = (perfilId, p, canal, disp) =>
    como("anon", null, `select public.registrar_contacto($1, $2, $3, $4)`, [perfilId, p, canal, disp]);

  console.log("\n1) Tablas cerradas");
  for (const t of ["vistas", "contactos", "medicion_frecuencia"]) {
    await espera(`anon no lee ${t}`, () => como("anon", null, `select * from public.${t}`), "permission denied");
    await espera(`authenticated no lee ${t}`, () => como("authenticated", NADIE, `select * from public.${t}`), "permission denied");
  }
  await espera("anon no escribe vistas directo", () => como("anon", null, `insert into public.vistas (pitch_id, dispositivo) values ($1, $2)`, [pAna, D1]), "permission denied");
  await espera("anon no llama medicion_limitar", () => como("anon", null, `select public.medicion_limitar($1, 'vista', 1)`, [D1]), "permission denied");

  console.log("\n2) Vistas");
  (await vista(D1, pAna)) === true ? bien("la primera vista cuenta") : mal("la primera vista no contó");
  (await vista(D1, pAna)) === false ? bien("la segunda del mismo dispositivo en 12 h no cuenta") : mal("contó dos veces");
  (await vista(D2, pAna)) === true ? bien("otro dispositivo cuenta") : mal("otro dispositivo no contó");
  await db.query(`update public.vistas set created_at = now() - interval '13 hours' where dispositivo = $1`, [D1]);
  (await vista(D1, pAna)) === true ? bien("pasadas 12 h vuelve a contar") : mal("no volvió a contar tras 12 h");
  await espera("pitch no publicado", () => vista(D1, pAnaBorrador), "pitch inexistente");
  await espera("pitch de perfil oculto", () => vista(D1, pOculta), "pitch inexistente");
  await espera("pitch de perfil no publicado", () => vista(D1, pBorrador), "pitch inexistente");
  await espera("sin dispositivo", () => vista(null, pAna), "vista inválida");

  console.log("\n3) Contactos");
  await contacto(ana, null, "whatsapp", D1);
  await contacto(ana, pAna, "email", D1);
  await contacto(ana, pAna, "email", D2);
  bien("contactos desde el perfil y desde el pop-up");
  await espera("canal inválido", () => contacto(ana, null, "telegram", D1), "contacto inválido");
  await espera("perfil oculto", () => contacto(oculta, null, "web", D1), "perfil inexistente");
  await espera("pitch de otro perfil", () => contacto(ana, pOculta, "web", D1), "pitch inexistente");
  await espera("pitch no publicado", () => contacto(ana, pAnaBorrador, "web", D1), "pitch inexistente");

  console.log("\n4) Conteos públicos");
  const m = (await como("anon", null, `select * from public.metricas_perfil('ana')`)).rows;
  m.length === 1 && m[0].pitch_id === pAna && m[0].vistas === 3 && m[0].piques === 0
    ? bien("metricas_perfil: solo el pitch publicado, con 3 vistas") : mal(`metricas_perfil: ${JSON.stringify(m)}`);
  const mo = (await como("anon", null, `select * from public.metricas_perfil('oculta')`)).rows;
  mo.length === 0 ? bien("metricas_perfil de un perfil oculto: nada") : mal(`oculta: ${JSON.stringify(mo)}`);

  console.log("\n5) Admin");
  await espera("admin_metricas sin ser admin", () => como("authenticated", NADIE, `select * from public.admin_metricas()`), "no autorizado");
  await espera("admin_metricas para anon", () => como("anon", null, `select * from public.admin_metricas()`), "permission denied");
  const a = (await como("authenticated", ADMIN, `select * from public.admin_metricas()`)).rows;
  a.length === 1 && a[0].vistas === 3 && a[0].contactos === 3 && a[0].por_canal.email === 2 && a[0].por_canal.whatsapp === 1
    ? bien("admin_metricas: ana con 3 vistas y 3 contactos (2 email, 1 whatsapp)") : mal(`admin_metricas: ${JSON.stringify(a)}`);

  console.log("\n6) Límites de frecuencia");
  for (let i = 0; i < 20; i++) await contacto(ana, null, "web", D3);
  await espera("el contacto 21 del minuto se corta", () => contacto(ana, null, "web", D3), "demasiadas acciones");
  (await vista(D3, pAna)) === true ? bien("el cupo de vistas es aparte del de contactos") : mal("la vista no contó");
  for (let i = 0; i < 29; i++) await vista(D3, pAna);
  await espera("la vista 31 del minuto se corta", () => vista(D3, pAna), "demasiadas acciones");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
