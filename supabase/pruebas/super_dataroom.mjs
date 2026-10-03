// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración super_dataroom: permisos, registrar_actividad (lista cerrada,
// props, límite con descartes), vínculo dispositivo ↔ cuenta, exclusión del equipo,
// las fórmulas de CI / CI-Q / liquidez / ceros, admin_vivo (k ≥ 5 en el ticker),
// admin_dataroom, snapshots por hora, poda de 90 días, snapshot del Demo Day
// inmutable, "sin rastro" después de borrar_mi_cuenta y el script para volver atrás
// (supabase/rollback-super-dataroom.sql). No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\super_dataroom.mjs .
//   node super_dataroom.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261011120000_super_dataroom.sql";
const ROLLBACK = "supabase/rollback-super-dataroom.sql";

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

// Como el SQL editor: sin sesión (auth.uid() null).
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

/** Cualquier columna uuid de public o auth con alguno de `ids` (como en borrar_cuenta.mjs). */
async function rastros(ids) {
  const cols = (
    await sistema(`
      select table_schema s, table_name t, column_name c
      from information_schema.columns
      where table_schema in ('public', 'auth') and data_type = 'uuid'
        and table_name in (select table_name from information_schema.tables
                           where table_schema in ('public', 'auth') and table_type = 'BASE TABLE')`)
  ).rows;
  const hallados = [];
  for (const { s, t, c } of cols) {
    const n = (await sistema(`select count(*)::int n from ${s}.${t} where ${c} = any ($1::uuid[])`, [ids])).rows[0].n;
    if (n > 0) hallados.push(`${t}.${c}`);
  }
  return hallados;
}

const U = {
  inv: "11111111-1111-4111-8111-111111111111",
  ali: "22222222-2222-4222-8222-222222222222",
  emp1: "33333333-3333-4333-8333-333333333333",
  emp2: "44444444-4444-4444-8444-444444444444",
  admin: "55555555-5555-4555-8555-555555555555",
  equipo: "66666666-6666-4666-8666-666666666666",
  borra: "77777777-7777-4777-8777-777777777777",
  nadie: "88888888-8888-4888-8888-888888888888",
};
// Dispositivos: d(n) → uuid v4 válido.
const d = (n) => `d${String(n).padStart(7, "0")}-0000-4000-8000-000000000000`;
const D = {
  anon: d(1), inv: d(2), inv2: d(3), ali: d(4), equipo: d(5), admin: d(6), propio: d(7),
  emp2: d(8), ticker: d(9), limite: d(10), marcado: d(11), b1: d(12), b2: d(13), compartido: d(14),
  suelto: d(15),
};

// Momento fijo dentro de la franja de la feria (7/10 10:00 hora argentina).
const T = "2026-10-07 10:00:00-03";
const mas = (horas) => `(timestamptz '${T}' + interval '${horas} hours')`;

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);

  // -------------------------------------------------------------------------
  console.log("\n0) Datos");
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.equipo_ingesta (email) values ('equipo@mail.com')`);

  const perfil = async (slug, rol, usuario = null, industrias = []) =>
    (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, oculto, usuario_id, industrias, consentimiento_at)
       values ($1, 'Nombre ' || $1, $2, $3, 'Descripción', true, false, $4, $5, now()) returning id`,
      [slug, rol === "inversor" ? "angel" : rol === "aliado" ? "aceleradora" : "startup", rol, usuario, industrias]
    )).rows[0].id;
  const pitch = async (perfilId) =>
    (await sistema(
      `insert into public.pitches (perfil_id, video_url, orden, publicado) values ($1, 'x.mp4', 1, true) returning id`,
      [perfilId]
    )).rows[0].id;

  const P = {};
  P.e1 = await perfil("e1", "emprendedor", U.emp1, ["agtech"]);
  P.e2 = await perfil("e2", "emprendedor", U.emp2, ["agtech"]);
  P.e3 = await perfil("e3", "emprendedor", null, ["agtech"]);
  P.e4 = await perfil("e4", "emprendedor", null, ["agtech"]);
  P.e5 = await perfil("e5", "emprendedor", null, ["agtech"]);
  P.e6 = await perfil("e6", "emprendedor", null, ["fintech"]);
  P.inv = await perfil("inv", "inversor", U.inv);
  P.ali = await perfil("ali", "aliado", U.ali);
  P.borra = await perfil("borra", "inversor", U.borra);
  P.pecera = await perfil("pecera", "aliado");
  P.test = await perfil("test-01", "emprendedor");
  P.adm = await perfil("adm", "emprendedor", U.admin);
  P.oculto = await perfil("oculto", "emprendedor");
  await sistema(`update public.perfiles set oculto = true where id = $1`, [P.oculto]);
  const X = {};
  for (const k of ["e1", "e2", "e3", "e4", "e5", "e6", "pecera", "test", "adm", "oculto"]) X[k] = await pitch(P[k]);
  check(Object.keys(P).length === 13, "13 perfiles y 10 pitches cargados");

  // -------------------------------------------------------------------------
  console.log("\n1) Permisos");
  for (const t of ["actividad", "dispositivo_cuentas", "dispositivos_equipo", "feria_franjas", "actividad_descartes", "metricas_hora", "demo_day_snapshots"]) {
    await espera(`anon no lee ${t}`, () => anon(`select * from public.${t}`), "permission denied");
  }
  await espera("authenticated no lee actividad", () => yo(U.nadie, `select * from public.actividad`), "permission denied");
  await espera("anon no escribe actividad directo", () => anon(`insert into public.actividad (nombre, dispositivo, en_feria) values ('sesion_iniciada', $1, false)`, [D.anon]), "permission denied");
  await espera("anon no llama a metrica_ci", () => anon(`select * from public.metrica_ci(now() - interval '1 day', now())`), "permission denied");
  await espera("authenticated no llama a metrica_resumen", () => yo(U.nadie, `select public.metrica_resumen(now() - interval '1 day', now())`), "permission denied");
  await espera("anon no corre el snapshot por hora", () => anon(`select public.snapshot_metricas_hora()`), "permission denied");
  await espera("authenticated tampoco", () => yo(U.nadie, `select public.snapshot_metricas_hora()`), "permission denied");
  await espera("anon no vincula", () => anon(`select public.vincular_dispositivo($1)`, [D.anon]), "permission denied");
  await espera("admin_vivo pide admin", () => yo(U.nadie, `select public.admin_vivo()`), "no autorizado");
  await espera("admin_dataroom pide admin", () => yo(U.nadie, `select public.admin_dataroom()`), "no autorizado");
  await espera("congelar pide admin", () => yo(U.nadie, `select public.admin_congelar_demo_day()`), "no autorizado");
  await espera("anon no ve admin_vivo", () => anon(`select public.admin_vivo()`), "permission denied");

  // -------------------------------------------------------------------------
  console.log("\n2) registrar_actividad");
  const reg = (args, uid = null) => {
    const campos = Object.keys(args);
    const sql = `select public.registrar_actividad(${campos.map((k, i) => `${k} => $${i + 1}`).join(", ")}) r`;
    return como(uid ? "authenticated" : "anon", uid, sql, Object.values(args));
  };
  const franjas = (await sistema(`select desde, hasta from public.feria_franjas order by desde`)).rows;
  check(franjas.length === 3, "tres franjas de la feria cargadas");
  // Sin franja que cubra ahora: fuera de horario.
  await sistema(`create temp table franjas_guardadas as select * from public.feria_franjas`);
  await sistema(`delete from public.feria_franjas`);
  check((await reg({ p_nombre: "sesion_iniciada", p_dispositivo: D.suelto, p_fuente: "instagram", p_clase: "celular" })).rows[0].r === true, "sesion_iniciada de anon vale");
  let fila = (await sistema(`select * from public.actividad where dispositivo = $1 order by id desc limit 1`, [D.suelto])).rows[0];
  check(fila.cuenta_id === null && fila.en_feria === false && fila.fuente === "instagram" && fila.clase === "celular", "sin cuenta, fuera de horario, con fuente y clase", fila);
  await sistema(`insert into public.feria_franjas values (now() - interval '1 hour', now() + interval '1 hour')`);
  await reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.e1, p_props: { desde: "feed" } });
  fila = (await sistema(`select * from public.actividad where dispositivo = $1 order by id desc limit 1`, [D.suelto])).rows[0];
  check(fila.en_feria === true && fila.perfil_id === P.e1 && fila.props.desde === "feed", "dentro de la franja: en_feria", fila);
  await sistema(`delete from public.feria_franjas`);
  await sistema(`insert into public.feria_franjas select * from franjas_guardadas`);
  await reg({ p_nombre: "tarjeta_escaneada", p_dispositivo: D.suelto, p_perfil: P.e1, p_fuente: "nfc", p_tarjeta: "s16" });
  fila = (await sistema(`select * from public.actividad where dispositivo = $1 order by id desc limit 1`, [D.suelto])).rows[0];
  check(fila.en_feria === true && fila.tarjeta_id === "s16", "src=nfc: en_feria aunque sea fuera de horario", fila);
  await reg({ p_nombre: "sesion_iniciada", p_dispositivo: D.suelto, p_fuente: "UTM Raro", p_medio: "x".repeat(41), p_clase: "tablet" });
  fila = (await sistema(`select * from public.actividad where dispositivo = $1 order by id desc limit 1`, [D.suelto])).rows[0];
  check(fila.fuente === null && fila.medio === null && fila.clase === null, "fuente, medio y clase fuera de formato se guardan vacíos", fila);
  await reg({ p_nombre: "pitch_completado", p_dispositivo: D.suelto, p_pitch: X.e2 });
  fila = (await sistema(`select * from public.actividad where dispositivo = $1 order by id desc limit 1`, [D.suelto])).rows[0];
  check(fila.perfil_id === P.e2 && fila.pitch_id === X.e2, "pitch_completado trae su perfil", fila);

  await espera("nombre fuera de la lista", () => reg({ p_nombre: "click", p_dispositivo: D.suelto }), "evento inválido");
  await espera("cuenta_vinculada no entra por acá", () => reg({ p_nombre: "cuenta_vinculada", p_dispositivo: D.suelto }), "evento inválido");
  await espera("equipo_marcado tampoco", () => reg({ p_nombre: "equipo_marcado", p_dispositivo: D.suelto }), "evento inválido");
  await espera("sin dispositivo", () => reg({ p_nombre: "sesion_iniciada", p_dispositivo: null }), "evento inválido");
  await espera("props con una clave no permitida", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.e1, p_props: { email: "a" } }), "props inválidas");
  await espera("props con un valor raro", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.e1, p_props: { desde: "Feed Grande" } }), "props inválidas");
  await espera("desde fuera de la lista", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.e1, p_props: { desde: "google" } }), "props inválidas");
  await espera("props que no son objeto", () => reg({ p_nombre: "sesion_iniciada", p_dispositivo: D.suelto, p_props: [1] }), "props inválidas");
  await espera("motivo fuera de la lista", () => reg({ p_nombre: "motivo_elegido", p_dispositivo: D.suelto, p_perfil: P.e1, p_props: { motivo: "charla" } }), "props inválidas");
  check((await reg({ p_nombre: "motivo_elegido", p_dispositivo: D.suelto, p_perfil: P.e1, p_canal: "whatsapp", p_props: { motivo: "inversion" } })).rows[0].r, "motivo_elegido con su canal");
  await espera("canal en un evento que no lleva", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.e1, p_canal: "nativo" }), "canal inválido");
  await espera("tarjeta sin nfc", () => reg({ p_nombre: "tarjeta_escaneada", p_dispositivo: D.suelto, p_perfil: P.e1, p_tarjeta: "s16" }), "evento incompleto");
  await espera("tarjeta con otro formato (prueba1)", () => reg({ p_nombre: "tarjeta_escaneada", p_dispositivo: D.suelto, p_perfil: P.e1, p_fuente: "nfc", p_tarjeta: "prueba1" }), "evento incompleto");
  await espera("perfil_abierto sin perfil", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto }), "evento incompleto");
  await espera("perfil oculto", () => reg({ p_nombre: "perfil_abierto", p_dispositivo: D.suelto, p_perfil: P.oculto }), "perfil inexistente");
  await espera("pitch de un perfil oculto", () => reg({ p_nombre: "pitch_completado", p_dispositivo: D.suelto, p_pitch: X.oculto }), "pitch inexistente");
  await espera("pitch de otro perfil", () => reg({ p_nombre: "pitch_completado", p_dispositivo: D.suelto, p_pitch: X.e1, p_perfil: P.e2 }), "pitch inexistente");
  await espera("actividad no se modifica", () => sistema(`update public.actividad set nombre = 'perfil_abierto'`), "no se modifica");

  let ultimos = [];
  for (let i = 0; i < 62; i++) ultimos.push((await reg({ p_nombre: "sesion_iniciada", p_dispositivo: D.limite })).rows[0].r);
  check(ultimos.filter((r) => r).length === 60 && ultimos[61] === false, "límite: 60 por minuto, el resto devuelve false sin error");
  check((await valor(`select count(*)::int from public.actividad where dispositivo = $1`, [D.limite])) === 60, "y no se guardan");
  check((await valor(`select sum(cantidad)::int from public.actividad_descartes where nombre = 'sesion_iniciada'`)) === 2, "los descartes se cuentan sin dispositivo");

  // -------------------------------------------------------------------------
  console.log("\n3) Vínculo dispositivo ↔ cuenta y equipo");
  check((await yo(U.inv, `select public.vincular_dispositivo($1) r`, [D.inv])).rows[0].r === true, "vincular: nuevo");
  check((await yo(U.inv, `select public.vincular_dispositivo($1) r`, [D.inv])).rows[0].r === false, "vincular otra vez: no duplica");
  check((await valor(`select count(*)::int from public.actividad where nombre = 'cuenta_vinculada' and dispositivo = $1`, [D.inv])) === 1, "un solo cuenta_vinculada");
  check((await yo(U.inv, `select public.vincular_dispositivo(null) r`)).rows[0].r === false, "sin dispositivo devuelve false, sin error");
  await espera("sin sesión no vincula", () => como("authenticated", null, `select public.vincular_dispositivo($1)`, [D.inv]), "sin sesión");
  await reg({ p_nombre: "sesion_iniciada", p_dispositivo: D.inv });
  check((await valor(`select cuenta_id from public.actividad where dispositivo = $1 and nombre = 'sesion_iniciada'`, [D.inv])) === U.inv, "un evento anónimo de un dispositivo vinculado lleva la cuenta");
  await yo(U.inv, `select public.vincular_dispositivo($1)`, [D.inv2]);
  await yo(U.admin, `select public.vincular_dispositivo($1)`, [D.admin]);
  await yo(U.emp1, `select public.vincular_dispositivo($1)`, [D.propio]);
  await yo(U.emp2, `select public.vincular_dispositivo($1)`, [D.emp2]);
  // Ali inicia sesión DESPUÉS de contactar: el vínculo igual atribuye.
  await yo(U.ali, `select public.vincular_dispositivo($1)`, [D.ali]);
  await sistema(`update public.dispositivo_cuentas set desde = ${mas(2)} where dispositivo = $1`, [D.ali]);
  await anon(`select public.marcar_equipo($1)`, [D.equipo]);
  await anon(`select public.marcar_equipo($1)`, [D.equipo]);
  check((await valor(`select count(*)::int from public.actividad where nombre = 'equipo_marcado' and dispositivo = $1`, [D.equipo])) === 1, "?equipo=1 dos veces: un solo equipo_marcado");
  await espera("marcar sin dispositivo", () => anon(`select public.marcar_equipo(null)`), "dispositivo inválido");
  const equipoDisp = (await sistema(`select array_agg(x order by x) a from public.metrica_dispositivos_equipo() x`)).rows[0].a;
  check(equipoDisp.length === 2 && equipoDisp.includes(D.equipo) && equipoDisp.includes(D.admin), "internos: el marcado y el vinculado a un admin", equipoDisp);
  const equipoPerfiles = (await sistema(`select array_agg(x) a from public.metrica_perfiles_equipo() x`)).rows[0].a;
  check(equipoPerfiles.length === 3 && [P.pecera, P.test, P.adm].every((p) => equipoPerfiles.includes(p)), "perfiles del equipo: pecera, test-* y el del admin");
  await sistema(`insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, usuario_id, consentimiento_at)
                 values ('equipo-ingesta', 'Equipo', 'startup', 'emprendedor', 'D', true, $1, now())`, [U.equipo]);
  check((await valor(`select count(*)::int from public.metrica_perfiles_equipo()`)) === 4, "y el de una cuenta de equipo_ingesta");

  // -------------------------------------------------------------------------
  console.log("\n4) Conexiones iniciadas (CI), CI-Q y liquidez");
  const contacto = (perfilId, disp, cuando, canal = "whatsapp") =>
    sistema(`insert into public.contactos (perfil_id, canal, dispositivo, created_at) values ($1, $2, $3, ${cuando})`, [perfilId, canal, disp]);
  const vista = (pitchId, disp, cuando) =>
    sistema(`insert into public.vistas (pitch_id, dispositivo, created_at) values ($1, $2, ${cuando})`, [pitchId, disp]);
  // El anónimo llegó por la tarjeta del stand 16.
  await sistema(`insert into public.actividad (ts, nombre, dispositivo, perfil_id, fuente, tarjeta_id, en_feria)
                 values (${mas(-0.2)}, 'tarjeta_escaneada', $1, $2, 'nfc', 's16', true)`, [D.anon, P.e1]);
  await sistema(`insert into public.actividad (ts, nombre, dispositivo, fuente, en_feria)
                 values (${mas(-0.2)}, 'sesion_iniciada', $1, 'nfc', true)`, [D.anon]);
  await contacto(P.e1, D.anon, mas(0));
  await contacto(P.e1, D.anon, mas(1), "email");        // < 24 h y otro canal: no suma
  await contacto(P.e1, D.anon, mas(26));                // 25 h después del anterior: nueva
  await contacto(P.e2, D.anon, mas(0));
  await contacto(P.e2, D.anon, mas(20));                // encadenado: no suma
  await contacto(P.e2, D.anon, mas(40));                // 20 h del anterior: no suma
  await contacto(P.e2, D.inv, mas(0));                  // inversor → emprendedor: CI-Q
  await contacto(P.e2, D.inv2, mas(2));                 // la misma cuenta desde otro dispositivo: no suma
  await contacto(P.ali, D.inv, mas(0));                 // inversor → aliado: CI, no Q
  await contacto(P.e3, D.ali, mas(0));                  // aliado (vinculado después) → emprendedor: CI-Q
  await contacto(P.inv, D.emp2, mas(3));                // emprendedor → inversor: recíproca con inv → e2
  await contacto(P.e4, D.equipo, mas(0));               // dispositivo marcado: fuera
  await contacto(P.e4, D.admin, mas(0));                // dispositivo de un admin: fuera
  await contacto(P.e1, D.propio, mas(0));               // su propio perfil: fuera
  await contacto(P.pecera, D.anon, mas(0));             // perfil oficial: fuera
  await contacto(P.test, D.anon, mas(0));               // perfil de prueba: fuera
  await vista(X.e4, D.anon, mas(0));
  await vista(X.e4, D.suelto, mas(10));                 // 20 h: fuera de horario
  await vista(X.e5, D.equipo, mas(0));                  // interna: no cuenta

  const rango = [`${mas(-24)}`, `${mas(72)}`];
  const ci = (await sistema(`select * from public.metrica_ci(${rango[0]}, ${rango[1]}) order by ts, destino`)).rows;
  check(ci.length === 7, "7 CI (dedup de 24 h, canal y cuenta con dos dispositivos)", ci.map((c) => [c.origen.slice(0, 10), c.destino.slice(0, 4)]));
  check(ci.filter((c) => c.calificada).length === 2, "2 CI-Q (inversor → e2 y aliado → e3)");
  const deAli = ci.find((c) => c.destino === P.e3);
  check(deAli?.cuenta === U.ali && deAli.rol_origen === "aliado", "el vínculo posterior atribuye el origen a la cuenta", deAli);
  const deAnon = ci.filter((c) => c.dispositivo === D.anon);
  check(deAnon.length === 3 && deAnon.every((c) => c.fuente === "nfc" && c.tarjeta === "s16" && c.en_feria), "las del anónimo: fuente nfc, tarjeta s16, en feria", deAnon);
  check(ci.find((c) => c.destino === P.inv)?.en_feria === true, "13 h del 7/10: en feria por horario");
  const soloHoy = (await sistema(`select count(*)::int n from public.metrica_ci(${mas(25)}, ${mas(30)})`)).rows[0].n;
  check(soloHoy === 1, "una ventana corta mira las 24 h previas: solo la de 25 h después cuenta", soloHoy);

  const r = (await sistema(`select public.metrica_resumen(${rango[0]}, ${rango[1]}) r`)).rows[0].r;
  check(r.ci === 7 && r.ci_q === 2, "resumen: CI 7, CI-Q 2", r);
  check(r.proyectos === 6, "proyectos: e1..e6 (sin pecera, test-*, admin, oculto ni perfiles sin pitch)", r.proyectos);
  check(r.proyectos_con_ci === 3 && Number(r.liquidez) === 0.5, "liquidez 3/6 = 0,5", r);
  check(r.proyectos_con_ciq === 2 && Number(r.liquidez_q) === 0.3333, "liquidez calificada 2/6", r);
  check(Number(r.ci_por_participante) === 0.83, "CI por participante: 5 CI a proyectos / 6", r.ci_por_participante);
  check(r.vistas === 2 && r.vistas_fuera_horario === 1 && Number(r.pct_vistas_fuera_horario) === 0.5, "vistas fuera del horario de la feria: 1 de 2 (la interna no cuenta)", r);

  // -------------------------------------------------------------------------
  console.log("\n5) admin_dataroom");
  const dr = (await yo(U.admin, `select public.admin_dataroom(${rango[0]}, ${rango[1]}) r`)).rows[0].r;
  check(dr.resumen.ci === 7, "trae el resumen");
  check(dr.liquidez.histograma["0"] === 3 && dr.liquidez.histograma["1"] === 1 && dr.liquidez.histograma["2"] === 2, "histograma de CI por proyecto (e1 y e2 con 2, e3 con 1)", dr.liquidez.histograma);
  check(dr.liquidez.ceros.length === 1 && dr.liquidez.ceros[0].slug === "e4", "ceros: e4 (vistas y ninguna CI)", dr.liquidez.ceros);
  check(Number(dr.liquidez.top10_pct) === 0.4, "el 10 % de arriba (1 proyecto) se lleva 2 de 5", dr.liquidez.top10_pct);
  const roles = dr.matriz.roles;
  check(roles["anonimo>emprendedor"] === 3 && roles["inversor>emprendedor"] === 1 && roles["aliado>emprendedor"] === 1 &&
        roles["inversor>aliado"] === 1 && roles["emprendedor>inversor"] === 1, "matriz rol → rol", roles);
  check(dr.matriz.pares_reciprocos === 1, "reciprocidad: inv ↔ e2", dr.matriz);
  check(dr.atribucion.por_tarjeta.s16?.ci === 3 && dr.atribucion.por_tarjeta.s16?.escaneos === 1, "atribución por tarjeta", dr.atribucion.por_tarjeta);
  check(dr.atribucion.por_fuente.nfc?.ci === 3 && dr.atribucion.por_fuente.directo?.ci === 4, "atribución por fuente", dr.atribucion.por_fuente);
  check(dr.embudo.con_contacto >= 4 && dr.embudo.visitas >= dr.embudo.con_contacto, "embudo", dr.embudo);
  const nfc = (await yo(U.admin, `select public.admin_dataroom(${rango[0]}, ${rango[1]}, 'nfc') r`)).rows[0].r;
  check(nfc.embudo.visitas === 1 && nfc.embudo.con_contacto === 1 && nfc.embudo.con_vista === 1, "embudo filtrado por fuente nfc: el día del anónimo", nfc.embudo);
  check(Array.isArray(dr.cohortes) && dr.calidad.descartes.sesion_iniciada === undefined, "cohortes y calidad (los descartes de hoy no caen en el 7/10)", dr.calidad);
  const sinRango = (await yo(U.admin, `select public.admin_dataroom() r`)).rows[0].r;
  check(sinRango.desde && sinRango.calidad.dispositivos_equipo === 2, "sin rango: desde el inicio de la feria", sinRango.calidad);

  // -------------------------------------------------------------------------
  console.log("\n6) admin_vivo (stand)");
  // Dos CI hace 5 min, a un agtech (5 proyectos) y a un fintech (1 proyecto).
  await contacto(P.e5, D.ticker, `now() - interval '5 minutes'`);
  await contacto(P.e6, D.ticker, `now() - interval '6 minutes'`);
  await contacto(P.e6, D.ticker, `now() - interval '30 seconds'`);   // menos de 2 min: todavía no
  const vivo = (await yo(U.admin, `select public.admin_vivo() r`)).rows[0].r;
  check(vivo.ci_hoy >= 2 && vivo.proyectos === 6 && typeof vivo.pitches_vistos_hoy === "number", "números grandes", vivo);
  check(vivo.ticker.length === 2 && vivo.ticker[0].industria === "agtech" && vivo.ticker[1].industria === null, "ticker: la industria solo con 5 proyectos o más", vivo.ticker);
  check(vivo.ticker.every((t) => t.minutos >= 2 && Object.keys(t).length === 2), "ticker: solo minutos e industria, con 2 min de demora");
  check(!JSON.stringify(vivo).match(/[0-9a-f]{8}-[0-9a-f]{4}-/), "admin_vivo no trae ningún uuid");
  await sistema(`update public.perfiles set oculto = true where slug in ('e3', 'e4')`);
  const pocos = (await yo(U.admin, `select public.admin_vivo() r`)).rows[0].r;
  check(pocos.proyectos === 4 && pocos.proyectos_con_ci === null, "con menos de 5 proyectos, el % va vacío", pocos);
  await sistema(`update public.perfiles set oculto = false where slug in ('e3', 'e4')`);

  // -------------------------------------------------------------------------
  console.log("\n7) Snapshots por hora y poda");
  const s1 = (await como("service_role", null, `select public.snapshot_metricas_hora() r`)).rows[0].r;
  check(s1.horas === 26, "26 horas calculadas", s1);
  const s2 = (await como("service_role", null, `select public.snapshot_metricas_hora() r`)).rows[0].r;
  check(s2.horas === 26 && (await valor(`select count(*)::int from public.metricas_hora`)) === 26, "idempotente: correrlo dos veces no duplica");
  const hora = (await sistema(`select * from public.metricas_hora where hora = date_trunc('hour', now() - interval '5 minutes')`)).rows[0];
  check(hora && hora.ci >= 1 && hora.logica === 1 && "pct_vistas_fuera_horario" in hora, "la hora del ticker tiene sus CI", hora);
  check(!JSON.stringify((await sistema(`select * from public.metricas_hora`)).rows).match(/[0-9a-f]{8}-[0-9a-f]{4}-/), "metricas_hora no guarda ningún uuid");
  await sistema(`insert into public.actividad (ts, nombre, dispositivo, en_feria) values
                 (now() - interval '91 days', 'sesion_iniciada', $1, false),
                 (now() - interval '89 days', 'sesion_iniciada', $1, false)`, [D.suelto]);
  await sistema(`insert into public.actividad_descartes values (now() - interval '91 days', 'sesion_iniciada', 3)`);
  const s3 = (await como("service_role", null, `select public.snapshot_metricas_hora() r`)).rows[0].r;
  check(s3.podadas === 1, "poda: lo de más de 90 días", s3);
  check((await valor(`select count(*)::int from public.actividad where ts < now() - interval '80 days'`)) === 1, "lo de 89 días queda");
  check((await valor(`select count(*)::int from public.actividad_descartes where minuto < now() - interval '90 days'`)) === 0, "y los descartes viejos también se van");

  // -------------------------------------------------------------------------
  console.log("\n8) Snapshot del Demo Day");
  const snap = (await yo(U.admin, `select public.admin_congelar_demo_day() r`)).rows[0].r;
  check(snap.id && "pct_vistas_fuera_horario" in snap && "liquidez_q" in snap && "ci_por_participante" in snap, "congela los números", snap);
  await espera("no se modifica", () => sistema(`update public.demo_day_snapshots set ci = 999`), "no se modifica");
  await espera("no se borra", () => sistema(`delete from public.demo_day_snapshots`), "no se modifica");
  check((await yo(U.admin, `select * from public.admin_demo_day_snapshots()`)).rows.length === 1, "admin_demo_day_snapshots lo lista");

  // -------------------------------------------------------------------------
  console.log("\n9) borrar_mi_cuenta: sin rastro");
  await yo(U.borra, `select public.vincular_dispositivo($1)`, [D.b1]);
  await yo(U.borra, `select public.vincular_dispositivo($1)`, [D.b2]);
  await yo(U.borra, `select public.vincular_dispositivo($1)`, [D.compartido]);
  await yo(U.ali, `select public.vincular_dispositivo($1)`, [D.compartido]);
  // Actividad de antes de iniciar sesión (sin cuenta_id) y con cuenta, vistas, contactos y piques.
  await sistema(`insert into public.actividad (ts, nombre, dispositivo, en_feria) values (now() - interval '1 day', 'sesion_iniciada', $1, false)`, [D.b2]);
  await reg({ p_nombre: "perfil_abierto", p_dispositivo: D.b1, p_perfil: P.e1 });
  await reg({ p_nombre: "perfil_abierto", p_dispositivo: D.b2, p_perfil: P.e2 }, U.borra);
  await reg({ p_nombre: "perfil_abierto", p_dispositivo: D.compartido, p_perfil: P.e2 });
  await contacto(P.e1, D.b2, `now()`);
  await vista(X.e1, D.b2, `now()`);
  await anon(`select public.dar_pique($1, $2)`, [X.e1, D.b2]);
  await anon(`select public.marcar_equipo($1)`, [D.b2]);
  const antes = await rastros([U.borra, D.b1, D.b2]);
  check(antes.length >= 6, "antes hay rastros", antes);
  // El navegador manda su dispositivo (b1); b2 se borra por el vínculo.
  await yo(U.borra, `select public.borrar_mi_cuenta($1)`, [D.b1]);
  const despues = await rastros([U.borra, D.b1, D.b2, P.borra]);
  check(despues.length === 0, "después: ni la cuenta ni sus dos dispositivos aparecen en ninguna tabla", despues);
  check((await valor(`select count(*)::int from public.dispositivo_cuentas where dispositivo = $1`, [D.compartido])) === 1, "el dispositivo compartido sigue vinculado a la otra cuenta");
  check((await valor(`select count(*)::int from public.actividad where dispositivo = $1`, [D.compartido])) >= 1, "y su actividad queda (es de otra persona también)");
  check((await valor(`select count(*)::int from public.demo_day_snapshots`)) === 1, "los agregados (snapshot del Demo Day) quedan");

  // -------------------------------------------------------------------------
  console.log("\n10) Volver atrás");
  await aplicar(ROLLBACK);
  const quedan = (await sistema(`select count(*)::int n from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relname in ('actividad','dispositivo_cuentas','dispositivos_equipo','feria_franjas',
      'actividad_descartes','metricas_hora','demo_day_snapshots')`)).rows[0].n;
  check(quedan === 0, "no queda ninguna tabla nueva");
  const fns = (await sistema(`select count(*)::int n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and (left(p.proname, 8) = 'metrica_' or p.proname in ('registrar_actividad','vincular_dispositivo',
      'marcar_equipo','admin_vivo','admin_dataroom','snapshot_metricas_hora','podar_actividad','en_horario_feria'))`)).rows[0].n;
  check(fns === 0, "ni ninguna función nueva");
  check((await valor(`select count(*)::int from public.contactos`)) > 0, "contactos y vistas siguen");
  await yo(U.nadie, `select public.borrar_mi_cuenta(null)`);
  check((await valor(`select count(*)::int from auth.users where id = $1`, [U.nadie])) === 0, "borrar_mi_cuenta sigue andando sin la migración");
  await aplicar(NUEVA);
  check((await valor(`select count(*)::int from public.feria_franjas`)) === 3, "y la migración se puede volver a correr");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
