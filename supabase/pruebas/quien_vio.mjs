// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba
// "Quién vio tu perfil" (20261017120000_quien_vio.sql): interruptores, aviso, modo privado,
// reciprocidad, unión en la lectura (sin perfil → con nombre), pique quitado, 30 días, borrar el
// historial, cascada al borrar la cuenta, traspaso de la sesión y el rollback. No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\quien_vio.mjs .
//   node quien_vio.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261017120000_quien_vio.sql";
const ROLLBACK = "supabase/rollback-quien-vio-perfil.sql";

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
const U = { ana: u(1), beto: u(2), caro: u(3), dani: u(4), admin: u(5), equipo: u(6), eva: u(7), fede: u(8) };
const AVISO = "visitas-v1";

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);

  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`update public.ajustes set autopublicar = true`);
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);
  await sistema(`insert into public.equipo_ingesta (email) values ('equipo@mail.com')`);

  const alta = (uid, slug, extra = {}) => {
    const campos = { slug, nombre: "Nombre " + slug, tipo: "persona", rol: "emprendedor", descripcion: "Descripción",
      whatsapp: "3515550000", email: `${slug}@mail.com`, consentimiento_at: new Date().toISOString(), ...extra };
    const cols = Object.keys(campos);
    return yo(uid, `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`, Object.values(campos))
      .then((x) => x.rows[0].id);
  };
  const pitch = async (perfilId, publicado = true) =>
    (await sistema(`insert into public.pitches (perfil_id, video_url, orden, publicado) values ($1, 'x.mp4', 1, $2) returning id`,
      [perfilId, publicado])).rows[0].id;

  const ana = await alta(U.ana, "ana");
  const beto = await alta(U.beto, "beto", { rol: "inversor" });
  const dani = await alta(U.dani, "dani");
  const equipo = await alta(U.equipo, "equipo-x");
  const pAna = await pitch(ana);
  const pAnaBorrador = await pitch(ana, false);
  const pBeto = await pitch(beto);
  // caro y eva no tienen perfil.

  const visita = (uid, tipo, { perfil = null, pitch: p = null } = {}) =>
    r(uid, "public.registrar_visita($1, $2, $3)", [tipo, perfil, p]);
  const aviso = (uid, mostrar) => yo(uid, "select public.guardar_aviso_visitas($1, $2)", [AVISO, mostrar]);
  const filas = (where = "true") => valor(`select count(*)::int from public.visitas where ${where}`);
  const resumen = (uid) => r(uid, "public.mis_visitas_resumen()");
  const lista = (uid, tipo = null, dia = null, pagina = 1) =>
    yo(uid, "select * from public.mis_visitas($1, $2, $3)", [tipo, dia, pagina]).then((x) => x.rows);

  // -------------------------------------------------------------------------
  console.log("\n1) Permisos");
  await espera("anon no registra", () => anon("select public.registrar_visita('perfil', null, null)"), "permission denied");
  await espera("anon no lee el resumen", () => anon("select public.mis_visitas_resumen()"), "permission denied");
  await espera("nadie lee la tabla directo", () => yo(U.admin, "select * from public.visitas"), "permission denied");
  await espera("ni los ajustes", () => yo(U.ana, "select * from public.visitas_ajustes"), "permission denied");
  await espera("ni la config", () => anon("select * from public.funciones_config"), "permission denied");
  await espera("las internas no se llaman", () => yo(U.ana, "select public.visitas_anonimizar($1)", [U.ana]), "permission denied");
  await espera("la poda es solo del service role", () => yo(U.admin, "select public.podar_visitas()"), "permission denied");
  const cfg = (await anon("select public.config_funciones() r")).rows[0].r;
  check(cfg.visitas_activas === false && cfg.pared_activa === false && cfg.pared_libres === 2 && cfg.traspaso_activo === false,
    "anon lee los interruptores: todo apagado por defecto", cfg);

  // -------------------------------------------------------------------------
  console.log("\n2) Apagada no registra nada");
  await aviso(U.beto, true);
  check((await visita(U.beto, "perfil", { perfil: ana })) === false && (await filas()) === 0, "con la función apagada, nada");
  await espera("una persona común no prende nada", () =>
    yo(U.ana, "select public.admin_funciones(true, false, 2, false)"), "no autorizado");
  await espera("libres fuera de rango", () => yo(U.admin, "select public.admin_funciones(true, false, 50, false)"), "entre 0 y 20");
  await yo(U.admin, "select public.admin_funciones(true, false, 2, false)");
  const desde = await valor("select visitas_desde from public.funciones_config");
  check(desde !== null, "el admin la prende y queda la fecha de lanzamiento");
  await yo(U.admin, "select public.admin_funciones(false, false, 2, false)");
  await yo(U.admin, "select public.admin_funciones(true, false, 2, false)");
  check(String(await valor("select visitas_desde from public.funciones_config")) === String(desde), "reencender no cambia la fecha");

  // -------------------------------------------------------------------------
  console.log("\n3) Aviso, una por día, autovisita, equipo, visibilidad");
  check((await visita(U.caro, "perfil", { perfil: ana })) === false && (await filas()) === 0, "sin aviso visto no se registra nada");
  check((await r(U.caro, "public.mi_estado_visitas()")).aviso_visto_at === null, "y el estado lo dice");
  check((await visita(U.beto, "perfil", { perfil: ana })) === true, "con aviso: se registra");
  check((await visita(U.beto, "perfil", { perfil: ana })) === false && (await filas()) === 1, "repetir el mismo día no suma");
  check((await visita(U.beto, "pitch", { pitch: pAna })) === true && (await visita(U.beto, "pique", { pitch: pAna })) === true,
    "pitch y pique son otro tipo");
  await aviso(U.ana, true);
  check((await visita(U.ana, "perfil", { perfil: ana })) === false && (await visita(U.ana, "pitch", { pitch: pAna })) === false,
    "nunca autovisitas");
  await aviso(U.equipo, true);
  await aviso(U.admin, true);
  check((await visita(U.equipo, "perfil", { perfil: ana })) === false && (await visita(U.admin, "perfil", { perfil: ana })) === false,
    "ni cuentas del equipo (equipo_ingesta, admins)");
  check((await visita(U.beto, "pitch", { pitch: pAnaBorrador })) === false, "ni pitches sin publicar");
  await sistema("update public.pitches set oculto = true where id = $1", [pBeto]);
  check((await visita(U.ana, "pitch", { pitch: pBeto })) === false, "ni pitches ocultos");
  await sistema("update public.pitches set oculto = false where id = $1", [pBeto]);
  await yo(U.dani, "update public.perfiles set oculto = true where usuario_id = $1", [U.dani]);
  check((await visita(U.beto, "perfil", { perfil: dani })) === false, "ni perfiles ocultos");
  await yo(U.dani, "update public.perfiles set oculto = false where usuario_id = $1", [U.dani]);
  await espera("tipo inválido", () => visita(U.beto, "contacto", { perfil: ana }), "tipo inválido");
  await espera("sin sesión", () => yo(null, "select public.registrar_visita('perfil', null, null)"), "sin sesión");
  check((await filas("visitado_id = '" + ana + "'")) === 3, "ana tiene 3 filas de beto");

  // -------------------------------------------------------------------------
  console.log("\n4) Lo que ve la dueña");
  const res = await resumen(U.ana);
  check(res.visible && res.personas === 1 && res.perfil === 1 && res.pitch === 1 && res.pique === 1 && res.privado === 0 && res.sin_perfil === 0,
    "resumen: 1 persona, perfil + pitch + pique", res);
  const l = await lista(U.ana);
  check(l.length === 3 && l.every((f) => f.slug === "beto" && f.rol === "inversor" && f.nombre === "Nombre beto"),
    "lista con nombre, rol y slug", l);
  check(l.every((f) => !("created_at" in f) && !("visitante_id" in f)), "sin hora ni ids");
  check((await lista(U.ana, "pique")).length === 1, "filtro por tipo");
  check((await lista(U.ana, null, "2000-01-01")).length === 0, "filtro por día");
  check(Number(l[0].total) === 3, "trae el total para paginar");
  await espera("sin perfil propio no hay lista", () => lista(U.caro), "primero creá tu perfil");

  // -------------------------------------------------------------------------
  console.log("\n5) Modo privado y reciprocidad");
  await aviso(U.dani, false);
  check((await visita(U.dani, "perfil", { perfil: ana })) === true, "en privado suma");
  check((await filas(`visitante_id = '${U.dani}'`)) === 0, "pero sin identidad");
  check((await resumen(U.ana)).privado === 1, "la dueña ve 1 en modo privado");
  check((await resumen(U.dani)).visible === false && (await lista(U.dani)).length === 0,
    "reciprocidad: en privado, dani no ve quién la visitó");
  check((await visita(U.ana, "perfil", { perfil: dani })) === true && (await filas(`visitado_id = '${dani}'`)) === 1,
    "(pero sus visitas se siguen contando)");
  // beto pasa a privado: sus 3 filas se vuelven contador.
  await aviso(U.beto, false);
  check((await filas(`visitante_id = '${U.beto}'`)) === 0, "pasar a privado borra la identidad guardada");
  const res2 = await resumen(U.ana);
  check(res2.privado === 4 && res2.personas === 0, "y la dueña las ve como modo privado", res2);
  await aviso(U.beto, true);
  check((await resumen(U.ana)).privado === 4 && (await filas(`visitante_id = '${U.beto}'`)) === 0, "reencender no las vuelve a identificar");

  // -------------------------------------------------------------------------
  console.log("\n6) Sin perfil y unión en la lectura");
  await aviso(U.caro, true);
  check((await visita(U.caro, "perfil", { perfil: ana })) === true, "caro (sin perfil) visita");
  check((await resumen(U.ana)).sin_perfil === 1 && (await lista(U.ana)).length === 0, "la dueña la ve como 'sin perfil'");
  await alta(U.caro, "caro", { rol: "aliado" });
  const conCaro = await lista(U.ana);
  check(conCaro.length === 1 && conCaro[0].slug === "caro" && (await resumen(U.ana)).sin_perfil === 0,
    "arma el perfil y aparece con su nombre", conCaro);
  await yo(U.caro, "update public.perfiles set oculto = true where usuario_id = $1", [U.caro]);
  check((await lista(U.ana)).length === 0 && (await resumen(U.ana)).sin_perfil === 1, "si lo oculta, vuelve a 'sin perfil'");
  await yo(U.caro, "update public.perfiles set oculto = false where usuario_id = $1", [U.caro]);

  // -------------------------------------------------------------------------
  console.log("\n7) Pique quitado");
  check((await visita(U.caro, "pique", { pitch: pAna })) === true, "caro da pique");
  check((await r(U.caro, "public.quitar_visita_pique($1)", [pAna])) === true && (await filas(`visitante_id = '${U.caro}' and tipo = 'pique'`)) === 0,
    "lo saca el mismo día: se borra la fila");
  await sistema(`insert into public.visitas (visitado_id, visitante_id, tipo, dia) values ($1, $2, 'pique', public.visitas_hoy() - 2)`, [ana, U.caro]);
  check((await r(U.caro, "public.quitar_visita_pique($1)", [pAna])) === false && (await filas(`visitante_id = '${U.caro}' and tipo = 'pique'`)) === 1,
    "el de otro día queda");

  // -------------------------------------------------------------------------
  console.log("\n8) 30 días y poda");
  await sistema(`insert into public.visitas (visitado_id, visitante_id, tipo, dia) values ($1, $2, 'perfil', public.visitas_hoy() - 31)`, [ana, U.caro]);
  await sistema(`insert into public.visitas_anonimas (visitado_id, dia, tipo, cantidad) values ($1, public.visitas_hoy() - 40, 'perfil', 7)`, [ana]);
  const res3 = await resumen(U.ana);
  check((await lista(U.ana)).length === 2 && res3.privado === 4, "lo de hace más de 30 días no se ve", res3);
  check((await como("service_role", null, "select public.podar_visitas() r")).rows[0].r === 2, "podar_visitas lo borra");
  check((await filas("dia < public.visitas_hoy() - 29")) === 0, "no queda nada viejo");

  // -------------------------------------------------------------------------
  console.log("\n9) Lo que otros ven de mí y borrar el historial");
  const hechas = (await yo(U.caro, "select * from public.mis_visitas_hechas()")).rows;
  check(hechas.length === 2 && hechas.every((h) => h.slug === "ana"), "caro ve sus visitas a ana", hechas);
  check((await r(U.caro, "public.borrar_mis_visitas_hechas()")) === 2 && (await filas(`visitante_id = '${U.caro}'`)) === 0,
    "y las borra");

  // -------------------------------------------------------------------------
  console.log("\n10) Frecuencia");
  await sistema("update public.visitas_frecuencia set acciones = 60, ventana = now() where usuario_id = $1", [U.beto]);
  await espera("más de 60 por minuto", () => visita(U.beto, "perfil", { perfil: dani }), "demasiadas acciones");

  // -------------------------------------------------------------------------
  console.log("\n11) Traspaso de la sesión");
  check((await r(U.eva, "public.acreditar_traspaso($1, true, $2, $3, $4)", [AVISO, [ana], [pAna], [pAna]])) === 0
    && (await valor(`select count(*)::int from public.visitas_ajustes where usuario_id = $1`, [U.eva])) === 0,
    "con el traspaso apagado no hace nada");
  await yo(U.admin, "select public.admin_funciones(true, false, 2, true)");
  await espera("más de 10 por tipo", () =>
    r(U.eva, "public.acreditar_traspaso($1, true, $2, '{}', '{}')", [AVISO, Array(11).fill(ana)]), "demasiados");
  const acreditadas = await r(U.eva, "public.acreditar_traspaso($1, true, $2, $3, $4)",
    [AVISO, [ana, dani], [pAna, pAnaBorrador], [pBeto]]);
  check(acreditadas === 4, "acredita perfiles, pitches y piques visibles (no el borrador)", acreditadas);
  check((await r(U.eva, "public.mi_estado_visitas()")).aviso_version === AVISO, "y deja el aviso guardado");
  check((await filas(`visitante_id = '${U.eva}' and origen = 'traspaso'`)) === 4, "marcadas como traspaso");
  check((await visita(U.eva, "perfil", { perfil: ana })) === false, "una visita directa el mismo día no duplica");
  check((await r(U.eva, "public.acreditar_traspaso($1, true, $2, '{}', '{}')", [AVISO, [beto]])) === 0,
    "un traspaso por hora");
  check((await resumen(U.ana)).sin_perfil === 1, "eva no tiene perfil: 'sin perfil'");
  // fede destilda: modo privado, nada acreditado.
  check((await r(U.fede, "public.acreditar_traspaso($1, false, $2, '{}', '{}')", [AVISO, [ana]])) === 0
    && (await filas(`visitante_id = '${U.fede}'`)) === 0, "destildar no acredita nada");
  check((await r(U.fede, "public.mi_estado_visitas()")).mostrar === false, "y queda en modo privado");
  check((await r(U.dani, "public.acreditar_traspaso($1, true, $2, '{}', '{}')", [AVISO, [beto]])) === 0
    && (await r(U.dani, "public.mi_estado_visitas()")).mostrar === false, "si ya estaba en privado, se respeta");
  check((await r(U.ana, "public.acreditar_traspaso($1, true, $2, $3, '{}')", [AVISO, [ana], [pAna]])) === 0, "sin autovisitas");

  // -------------------------------------------------------------------------
  console.log("\n12) PostgREST: sin muchos-a-muchos nuevos (PGRST201)");
  const fks = (await sistema(`
    select confrelid::regclass::text as a from pg_constraint
    where conrelid = 'public.visitas'::regclass and contype = 'f'`)).rows.map((x) => x.a).sort();
  check(JSON.stringify(fks) === JSON.stringify(["auth.users", "perfiles"]), "visitas: una FK a perfiles y una a auth.users", fks);
  const fksAnon = (await sistema(`
    select confrelid::regclass::text as a from pg_constraint
    where conrelid = 'public.visitas_anonimas'::regclass and contype = 'f'`)).rows.map((x) => x.a);
  check(JSON.stringify(fksAnon) === JSON.stringify(["perfiles"]), "visitas_anonimas: solo perfiles", fksAnon);

  // -------------------------------------------------------------------------
  console.log("\n13) Borrar la cuenta");
  await visita(U.beto, "perfil", { perfil: dani }).catch(() => {});
  await sistema("delete from public.visitas_frecuencia");
  check((await visita(U.ana, "pitch", { pitch: pBeto })) === true, "ana visita a beto");
  await yo(U.ana, "select public.borrar_mi_cuenta()");
  check((await filas(`visitante_id = '${U.ana}'`)) === 0, "sus visitas hechas se borran");
  check((await filas(`visitado_id = '${ana}'`)) === 0 && (await valor(`select count(*)::int from public.visitas_anonimas where visitado_id = $1`, [ana])) === 0,
    "y las recibidas");
  check((await valor(`select count(*)::int from public.visitas_ajustes where usuario_id = $1`, [U.ana])) === 0, "y su aviso");

  // -------------------------------------------------------------------------
  console.log("\n14) Rollback");
  await aplicar(ROLLBACK);
  const quedan = await valor(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like '%visita%' or p.proname in ('config_funciones', 'acreditar_traspaso', 'admin_funciones', 'podar_visitas', 'mi_estado_visitas'))`);
  const tablas = await valor(`select count(*)::int from information_schema.tables where table_schema = 'public'
    and table_name in ('visitas', 'visitas_ajustes', 'visitas_anonimas', 'visitas_frecuencia', 'funciones_config')`);
  check(quedan === 0 && tablas === 0, "no queda nada", { quedan, tablas });
  check((await valor("select count(*)::int from public.piques")) >= 0 && (await valor("select count(*)::int from public.perfiles")) > 0,
    "lo de antes sigue");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar la migración");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
