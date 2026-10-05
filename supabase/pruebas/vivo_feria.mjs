// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración vivo_feria: permisos, empresas participantes (una
// representante, cambio de representante con sus votos), el ranking en vivo (sin los
// votos del equipo, empates, logo de la empresa), #feria21 en los pitches, las
// métricas con alcance (plataforma / feria-21) y el snapshot doble del Demo Day.
// No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\vivo_feria.mjs .
//   node vivo_feria.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261012120000_vivo_feria.sql";

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
  admin: u(1), equipo: u(2), a1: u(3), a2: u(4), b: u(5), nadie: u(6),
  v1: "a1a1a1a1-0000-4000-8000-000000000001",
  v2: "a1a1a1a1-0000-4000-8000-000000000002",
  v3: "a1a1a1a1-0000-4000-8000-000000000003",
  v4: "a1a1a1a1-0000-4000-8000-000000000004",
  v5: "a1a1a1a1-0000-4000-8000-000000000005",
};
const d = (n) => `d${String(n).padStart(7, "0")}-0000-4000-8000-000000000000`;
const EV = "feria-21";

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  // Una fila de snapshot de antes: tiene que quedar como 'plataforma'.
  await sistema(`insert into public.demo_day_snapshots (logica, desde, hasta, ci, ci_q, proyectos) values (1, now(), now(), 0, 0, 0)`);
  await aplicar(NUEVA);

  // -------------------------------------------------------------------------
  console.log("\n0) Datos");
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.equipo_ingesta (email) values ('equipo@mail.com')`);

  const perfil = async (slug, rol, usuario = null, avatar = null) =>
    (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto, usuario_id, avatar_url, industrias, consentimiento_at)
       values ($1, 'Nombre ' || $1, $2, $3, 'Descripción', true, false, $4, $5, '{agtech}', now()) returning id`,
      [slug, rol === "inversor" ? "angel" : "startup", rol, usuario, avatar]
    )).rows[0].id;
  const pitch = async (perfilId, descripcion = null) =>
    (await sistema(
      `insert into public.pitches (perfil_id, video_url, orden, publicado, descripcion) values ($1, 'x.mp4', 1, true, $2) returning id`,
      [perfilId, descripcion]
    )).rows[0].id;

  const P = {};
  P.a1 = await perfil("a1", "emprendedor", U.a1);
  P.a2 = await perfil("a2", "emprendedor", U.a2);
  P.b = await perfil("b", "emprendedor", U.b, "foto-b.jpg");
  P.c = await perfil("c", "emprendedor");
  P.sinpitch = await perfil("sinpitch", "emprendedor");
  P.inv = await perfil("inv", "inversor");
  P.test = await perfil("test-01", "emprendedor");
  const X = {};
  X.a1 = await pitch(P.a1);
  X.a2 = await pitch(P.a2);
  X.b = await pitch(P.b, "Hola");
  X.c = await pitch(P.c, "#Feria21 arranca #feria21 con #feria21x");
  X.test = await pitch(P.test);

  await yo(U.a1, `select public.crear_empresa_v2('Alfa', 'alfa', 'Qué hace', null, '{fintech}')`);
  const alfa = await valor(`select id from public.empresas where slug = 'alfa'`);
  const codigo = await valor(`select codigo from public.empresas_codigos where empresa_id = $1`, [alfa]);
  await yo(U.a2, `select public.unirse_empresa_v2($1)`, [codigo]);
  await sistema(`insert into public.empresa_logos (empresa_id, clave) values ($1, $2)`, [alfa, `${alfa}-abcdef12.png`]);
  check((await valor(`select count(*)::int from public.empresa_miembros where empresa_id = $1`, [alfa])) === 2, "Alfa con dos integrantes");

  // -------------------------------------------------------------------------
  console.log("\n1) Permisos");
  await espera("anon no lee evento_empresas", () => anon(`select * from public.evento_empresas`), "permission denied");
  await espera("authenticated tampoco", () => yo(U.nadie, `select * from public.evento_empresas`), "permission denied");
  for (const [desc, sql] of [
    ["admin_ranking_evento", `select public.admin_ranking_evento('${EV}')`],
    ["admin_vivo_en", `select public.admin_vivo_en('${EV}')`],
    ["admin_dataroom_en", `select public.admin_dataroom_en(null, null, null, '${EV}')`],
    ["admin_congelar_demo_day_en", `select public.admin_congelar_demo_day_en()`],
    ["admin_feria", `select public.admin_feria('${EV}')`],
    ["admin_empresa_participante", `select public.admin_empresa_participante('${EV}', '${alfa}', true)`],
    ["admin_representante", `select public.admin_representante('${EV}', '${alfa}', '${P.a2}')`],
    ["admin_pitch_feria", `select public.admin_pitch_feria('${X.b}', true)`],
  ]) {
    await espera(`${desc} pide admin`, () => yo(U.nadie, sql), "no autorizado");
    await espera(`anon no llama a ${desc}`, () => anon(sql), "permission denied");
  }
  await espera("metrica_proyectos_en es interna", () => yo(U.admin, `select * from public.metrica_proyectos_en('plataforma')`), "permission denied");
  await espera("evento_mover_votos es interna", () => yo(U.admin, `select public.evento_mover_votos(null, null, null)`), "permission denied");
  check((await valor(`select alcance from public.demo_day_snapshots order by id limit 1`)) === "plataforma", "el snapshot de antes queda como 'plataforma'");

  // -------------------------------------------------------------------------
  console.log("\n2) Empresas participantes");
  await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [alfa]);
  const participantes = async () =>
    (await sistema(`select p.slug from public.evento_participantes ep join public.perfiles p on p.id = ep.perfil_id order by p.slug`)).rows.map((r) => r.slug);
  check(JSON.stringify(await participantes()) === '["a1"]', "sumar Alfa anota solo a quien la administra (a1)", await participantes());
  await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [alfa]);
  check((await valor(`select count(*)::int from public.evento_empresas`)) === 1, "sumarla de nuevo no duplica");
  await espera("representante que no es integrante", () => yo(U.admin, `select public.admin_representante('${EV}', $1, $2)`, [alfa, P.b]), "integrante emprendedora visible");
  await espera("empresa que no participa", () => yo(U.admin, `select public.admin_representante('${EV}', $1, $2)`, [P.b, P.b]), "no participa");

  await yo(U.b, `select public.participar_evento('${EV}', true)`);
  await admin(`select public.admin_participante('${EV}', $1, true)`, [P.c]);
  await admin(`select public.admin_participante('${EV}', $1, true)`, [P.sinpitch]);
  await admin(`select public.admin_participante('${EV}', $1, true)`, [P.inv]);
  await admin(`select public.admin_participante('${EV}', $1, true)`, [P.test]);

  // -------------------------------------------------------------------------
  console.log("\n3) Ranking en vivo");
  let r = await admin(`select public.admin_ranking_evento('${EV}')`);
  check(r.filas.length === 0 && r.total === 0, "sin votos: ranking vacío", r);
  await admin(`select public.admin_configurar_evento('${EV}', true, false)`);
  const votar = (uid, perfilId) => yo(uid, `select public.votar('${EV}', $1)`, [perfilId]);
  await votar(U.v1, P.a1);
  await votar(U.v2, P.a1);
  await votar(U.v3, P.b);
  await votar(U.v4, P.b);
  await votar(U.v5, P.c);
  await votar(U.equipo, P.c);
  await votar(U.admin, P.c);
  await votar(U.b, P.test);
  r = await admin(`select public.admin_ranking_evento('${EV}')`);
  const resumen = r.filas.map((f) => `${f.puesto}${f.empate ? "=" : ""} ${f.nombre} ${f.votos}`);
  check(
    JSON.stringify(resumen) === JSON.stringify(["1= Alfa 2", "1= Nombre b 2", "3 Nombre c 1"]),
    "empates con puesto compartido, sin los votos del equipo ni los perfiles test-*",
    resumen
  );
  check(r.total === 5 && r.fuera === 0, "total sin el equipo", r);
  const filaAlfa = r.filas.find((f) => f.nombre === "Alfa");
  check(filaAlfa.es_empresa && filaAlfa.imagen === `${alfa}-abcdef12.png`, "Alfa con el logo de la empresa", filaAlfa);
  check(r.filas.find((f) => f.nombre === "Nombre b").imagen === "foto-b.jpg", "sin empresa: la foto del perfil");
  check(!JSON.stringify(r).includes(U.v1) && !("votante" in r.filas[0]), "nunca quién votó");
  const oficial = (await yo(U.admin, `select * from public.resultados_evento('${EV}')`)).rows;
  check(oficial.find((x) => x.perfil_id === P.c).votos === 3, "resultados_evento sigue contando como antes", oficial);

  // Top 10 con empate en el borde: 12 participantes más con 1 voto cada uno.
  const extras = [];
  for (let i = 0; i < 12; i++) {
    const id = await perfil(`x${i}`, "emprendedor");
    extras.push(id);
    await admin(`select public.admin_participante('${EV}', $1, true)`, [id]);
    const votante = `b2b2b2b2-0000-4000-8000-${String(i).padStart(12, "0")}`;
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [votante, `x${i}@mail.com`]);
    await votar(votante, id);
  }
  r = await admin(`select public.admin_ranking_evento('${EV}')`);
  check(r.filas.length === 12 && r.filas[2].puesto === 3 && r.filas[2].empate && r.fuera === 3, "empate en el puesto 3 que cruza el 10: tope de 12 filas y el resto fuera", { n: r.filas.length, fuera: r.fuera });
  for (const id of extras) await admin(`select public.admin_participante('${EV}', $1, false)`, [id]);

  // -------------------------------------------------------------------------
  console.log("\n4) Cambiar quién representa");
  await votar(U.a2, P.b); // a2 vota a b (puede: no comparten empresa)
  await admin(`select public.admin_representante('${EV}', $1, $2)`, [alfa, P.a2]);
  check(JSON.stringify((await participantes()).filter((s) => s.startsWith("a"))) === '["a2"]', "a2 representa y a1 deja de participar");
  check((await valor(`select count(*)::int from public.votos where perfil_id = $1`, [P.a2])) === 2, "los votos de a1 pasan a a2");
  r = await admin(`select public.admin_ranking_evento('${EV}')`);
  check(r.filas.find((f) => f.nombre === "Alfa")?.perfil_id === P.a2 && r.filas.find((f) => f.nombre === "Alfa").votos === 2, "el ranking sigue mostrando a Alfa con sus votos", r.filas);
  await espera("un inversor no representa", () => yo(U.admin, `select public.admin_representante('${EV}', $1, $2)`, [alfa, P.inv]), "integrante emprendedora visible");

  // Si la representante se saca sola, la empresa deja de participar.
  await yo(U.a2, `select public.participar_evento('${EV}', false)`);
  check((await valor(`select count(*)::int from public.evento_empresas`)) === 0, "la representante se saca: la empresa deja de participar");

  // Sumar y sacar la empresa.
  await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [alfa]);
  check((await participantes()).includes("a1"), "vuelve con quien la administra");
  await admin(`select public.admin_empresa_participante('${EV}', $1, false)`, [alfa]);
  check(!(await participantes()).includes("a1") && (await valor(`select count(*)::int from public.evento_empresas`)) === 0, "sacar la empresa desanota a su representante");

  // La representante sale de la empresa: la empresa deja de participar, ella sigue.
  await admin(`select public.admin_empresa_participante('${EV}', $1, true)`, [alfa]);
  await admin(`select public.admin_representante('${EV}', $1, $2)`, [alfa, P.a2]);
  await yo(U.a2, `select public.salir_empresa_en($1)`, [alfa]).catch(async () => {
    await sistema(`select set_config('pecera.empresa_rpc', 'on', false)`);
    await sistema(`delete from public.empresa_miembros where empresa_id = $1 and perfil_id = $2`, [alfa, P.a2]);
  });
  check(
    (await valor(`select count(*)::int from public.evento_empresas`)) === 0 && (await participantes()).includes("a2"),
    "sale de la empresa: Alfa deja de participar y a2 sigue por su cuenta"
  );

  // -------------------------------------------------------------------------
  console.log("\n5) #feria21 en los pitches");
  const desc = (id) => valor(`select descripcion from public.pitches where id = $1`, [id]);
  await admin(`select public.admin_pitch_feria($1, true)`, [X.b]);
  check((await desc(X.b)) === "Hola #feria21", "agrega el tag", await desc(X.b));
  await admin(`select public.admin_pitch_feria($1, true)`, [X.b]);
  check((await desc(X.b)) === "Hola #feria21", "no lo repite");
  await admin(`select public.admin_pitch_feria($1, false)`, [X.b]);
  check((await desc(X.b)) === "Hola", "lo quita", await desc(X.b));
  await admin(`select public.admin_pitch_feria($1, true)`, [X.a1]);
  check((await desc(X.a1)) === "Descripción #feria21", "sin descripción propia parte de la del perfil", await desc(X.a1));
  await admin(`select public.admin_pitch_feria($1, false)`, [X.c]);
  check((await desc(X.c)) === "arranca con #feria21x", "quita todas las variantes y deja otros tags", await desc(X.c));
  await sistema(`update public.pitches set descripcion = $2 where id = $1`, [X.a2, "x".repeat(145)]);
  await espera("si no entra en 150, avisa", () => yo(U.admin, `select public.admin_pitch_feria($1, true)`, [X.a2]), "no entra");
  await admin(`select public.admin_pitch_feria($1, true)`, [X.b]);

  const feria = await admin(`select public.admin_feria('${EV}')`);
  const pb = feria.perfiles.find((p) => p.slug === "b");
  check(pb.participa && pb.pitches_feria === 1 && pb.pitches === 1, "admin_feria: perfil con participa y pitches de la feria", pb);
  check(!feria.perfiles.some((p) => p.slug.startsWith("test-")), "admin_feria sin perfiles test-*");
  const ea = feria.empresas.find((e) => e.slug === "alfa");
  check(ea && ea.representante === null && ea.integrantes.some((i) => i.administra), "admin_feria: empresa con integrantes y quién administra", ea);
  check(feria.pitches.find((x) => x.id === X.b).con_tag && !feria.pitches.find((x) => x.id === X.c).con_tag, "admin_feria: pitches con y sin tag");

  // -------------------------------------------------------------------------
  console.log("\n6) Métricas con alcance");
  const proy = async (alc) => (await sistema(`select perfil_id from public.metrica_proyectos_en($1)`, [alc])).rows.map((x) => x.perfil_id).sort();
  const plataforma = await proy("plataforma");
  const base = (await sistema(`select perfil_id from public.metrica_proyectos()`)).rows.map((x) => x.perfil_id).sort();
  check(JSON.stringify(plataforma) === JSON.stringify(base), "'plataforma' = metrica_proyectos() de siempre");
  const enFeria = await proy(EV);
  const esperado = [P.a2, P.b, P.c, P.sinpitch].sort();
  check(JSON.stringify(enFeria) === JSON.stringify(esperado), "'feria-21' = participantes emprendedores visibles (con o sin pitch), sin inversores ni test-*", enFeria);
  check((await proy("otro-evento")).length === 0, "evento inexistente: ninguno");

  await sistema(`insert into public.contactos (perfil_id, canal, dispositivo, created_at) values ($1, 'whatsapp', $2, now() - interval '1 minute')`, [P.b, d(1)]);
  await sistema(`insert into public.contactos (perfil_id, canal, dispositivo, created_at) values ($1, 'whatsapp', $2, now() - interval '1 minute')`, [P.a1, d(2)]);
  const resF = await valor(`select public.metrica_resumen_en(now() - interval '1 hour', now(), $1)`, [EV]);
  const ahora = await valor(`select now()::text`);
  const resP = await valor(`select public.metrica_resumen_en($1::timestamptz - interval '1 hour', $1::timestamptz, 'plataforma')`, [ahora]);
  const resV = await valor(`select public.metrica_resumen($1::timestamptz - interval '1 hour', $1::timestamptz)`, [ahora]);
  check(resF.proyectos === 4 && resF.proyectos_con_ci === 1 && Number(resF.liquidez) === 0.25, "feria: liquidez = 1 de 4", resF);
  check(resF.ci === 2 && Number(resF.ci_por_participante) === 0.25, "feria: CI total igual, CI por participante solo a participantes", resF);
  delete resP.alcance;
  check(JSON.stringify(resP) === JSON.stringify(resV), "'plataforma' = metrica_resumen de siempre", { resP, resV });

  const vivoF = await admin(`select public.admin_vivo_en('${EV}')`);
  const vivoV = await admin(`select public.admin_vivo()`);
  check(vivoF.alcance === EV && vivoF.proyectos === 4 && vivoF.proyectos_con_ci === null, "admin_vivo_en: 4 proyectos de la feria (con < 5 el % va vacío)", vivoF);
  check(vivoF.ci_hoy === vivoV.ci_hoy && vivoF.pitches_vistos_hoy === vivoV.pitches_vistos_hoy, "CI de hoy y pitches vistos no cambian con el alcance");
  const vivoP = await admin(`select public.admin_vivo_en('plataforma')`);
  check(vivoP.proyectos === vivoV.proyectos, "admin_vivo_en('plataforma') = admin_vivo()");

  const drF = await admin(`select public.admin_dataroom_en(now() - interval '1 hour', now(), null, '${EV}')`);
  check(drF.alcance === EV && drF.resumen.proyectos === 4 && drF.liquidez.histograma["0"] === 3, "dataroom de la feria: resumen y liquidez con sus participantes", drF.liquidez);
  const drP = await admin(`select public.admin_dataroom_en(now() - interval '1 hour', now(), null, 'plataforma')`);
  const drV = await admin(`select public.admin_dataroom(now() - interval '1 hour', now(), null)`);
  check(drP.resumen.proyectos === drV.resumen.proyectos && JSON.stringify(drP.liquidez) === JSON.stringify(drV.liquidez), "dataroom 'plataforma' = el de siempre");

  // -------------------------------------------------------------------------
  console.log("\n7) Snapshot del Demo Day");
  const filas = await admin(`select public.admin_congelar_demo_day_en()`);
  check(filas.length === 2 && filas[0].alcance === "plataforma" && filas[1].alcance === EV && filas[0].hasta === filas[1].hasta, "congela dos filas en el mismo instante", filas.map((f) => f.alcance));
  check(filas[1].proyectos === 4, "la de la feria con sus proyectos", filas[1]);
  await espera("siguen sin poder modificarse", () => sistema(`update public.demo_day_snapshots set alcance = 'otro'`), "no se modifica");
  const lista = (await yo(U.admin, `select * from public.admin_demo_day_snapshots()`)).rows;
  check(lista.every((x) => typeof x.alcance === "string"), "admin_demo_day_snapshots trae el alcance");
  await espera("evento inexistente", () => yo(U.admin, `select public.admin_congelar_demo_day_en('nada')`), "evento inexistente");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
