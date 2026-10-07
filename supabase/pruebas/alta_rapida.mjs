// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba el alta
// rápida del equipo, la edición desde /admin y el reclamo del perfil
// (20261019120000_alta_rapida.sql), y el rollback. No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\alta_rapida.mjs .
//   node alta_rapida.mjs <ruta al repo>
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
const NUEVA = "supabase/migrations/20261019120000_alta_rapida.sql";
const ROLLBACK = "supabase/rollback-alta-rapida.sql";
const EV = "feria-21";
const V = "alta-v1";

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
const U = { admin: u(1), admin2: u(2), ana: u(3), beto: u(4), caro: u(5), dani: u(6), eli: u(7), fede: u(8) };

// alta con valores por defecto; `o` pisa lo que haga falta.
function alta(uid, o = {}) {
  const a = {
    nombre: "Persona", descripcion: "Hace algo útil", empresa: null, empresa_desc: null, empresa_tipo: "startup",
    sumar_a: null, email: null, evento: null, rol: "emprendedor", publicado: true, consentimiento: true, version: V, ...o,
  };
  return r(uid, `public.admin_alta_rapida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
    a.nombre, a.descripcion, a.empresa, a.empresa_desc, a.empresa_tipo, a.sumar_a, a.email, a.evento, a.rol,
    a.publicado, a.consentimiento, a.version,
  ]);
}
const perfil = async (id) => (await sistema("select * from public.perfiles where id = $1", [id])).rows[0];
const evento = () => valor(`select id from public.eventos where slug = '${EV}'`);

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);

  const emails = {
    admin: "admin@mail.com", admin2: "admin2@mail.com", ana: "ana@mail.com", beto: "beto@mail.com",
    caro: "Caro.Perez@gmail.com", dani: "dani@mail.com", eli: "eli@mail.com", fede: "fede@mail.com",
  };
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)`,
      [uid, emails[k], k === "dani" ? null : new Date().toISOString()]);
  }
  await sistema(`insert into public.admins (email) values ('admin@mail.com'), ('admin2@mail.com')`);

  // Beto ya tiene su perfil propio (cuenta con perfil).
  const betoPropio = await valor(`insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, usuario_id, consentimiento_at)
    values ('beto-propio', 'Beto', 'persona', 'emprendedor', 'Lo mío', true, $1, now()) returning id`, [U.beto]);

  // -------------------------------------------------------------------------
  console.log("1) PostgREST: ninguna tabla nueva con FK a perfiles y empresas a la vez");
  const ambas = await valor(`
    select count(*)::int from (
      select c.conrelid
      from pg_constraint c
      where c.contype = 'f'
        and c.conrelid in ('public.perfiles_alta_equipo'::regclass, 'public.perfiles_reclamo'::regclass, 'public.equipo_acciones'::regclass)
      group by c.conrelid
      having bool_or(c.confrelid = 'public.perfiles'::regclass) and bool_or(c.confrelid = 'public.empresas'::regclass)
    ) x`);
  check(ambas === 0, "ninguna");
  check((await valor(`select count(*)::int from pg_constraint where contype = 'f' and conrelid = 'public.equipo_acciones'::regclass`)) === 0,
    "equipo_acciones sin FK");

  // -------------------------------------------------------------------------
  console.log("\n2) Permisos");
  for (const f of [
    "public.admin_alta_rapida('X', 'Y')", "public.admin_parecidos('X')", "public.admin_empresas_parecidas('X')",
    "public.admin_altas_recientes()", "public.admin_perfiles_v2()", "public.admin_reclamos_revisar()",
  ]) {
    await espera(`anon no ejecuta ${f.split("(")[0]}`, () => anon(`select ${f}`), "permission denied");
    await espera(`no-admin no ejecuta ${f.split("(")[0]}`, () => r(U.ana, f), "no autorizado");
  }
  const cualquiera = "00000000-0000-4000-8000-000000000000";
  for (const f of [
    `public.admin_deshacer_alta('${cualquiera}')`, `public.admin_borrar_perfil_equipo('${cualquiera}')`,
    `public.admin_perfil_detalle('${cualquiera}')`, `public.admin_editar_perfil_cuenta('${cualquiera}', 'A', 'B')`,
    `public.admin_editar_perfil_equipo('${cualquiera}', 'A', 'B', 'emprendedor', 'persona', true, false)`,
    `public.admin_editar_empresa_equipo('${cualquiera}', 'A', null)`, `public.admin_agregar_empresa('${cualquiera}', 'A')`,
    `public.admin_sumar_a_empresa('${cualquiera}', '${cualquiera}')`, `public.admin_email_reclamo('${cualquiera}', 'a@b.co')`,
    `public.admin_vincular_cuenta('${cualquiera}', 'a@b.co')`,
  ]) {
    await espera(`no-admin no ejecuta ${f.split("(")[0]}`, () => r(U.ana, f), "no autorizado");
  }
  for (const t of ["perfiles_alta_equipo", "perfiles_reclamo", "equipo_acciones"]) {
    await espera(`anon no lee ${t}`, () => anon(`select * from public.${t}`), "permission denied");
    await espera(`authenticated no lee ${t}`, () => yo(U.ana, `select * from public.${t}`), "permission denied");
  }
  await espera("authenticated no ejecuta las internas", () => r(U.admin, "public.slug_libre('a', 'perfiles')"), "permission denied");

  // -------------------------------------------------------------------------
  console.log("\n3) Alta: perfil sin dueña");
  const a1 = await alta(U.admin, { nombre: "José Ñúñez", descripcion: "Café de especialidad", empresa: "Café Ñandú",
    empresa_desc: "Tostadores", evento: EV, email: "jose.nunez+feria@gmail.com" });
  const p1 = await perfil(a1.id);
  check(p1.usuario_id === null, "usuario_id null");
  check(p1.slug === "jose-nunez", "slug sin tildes ni ñ", p1.slug);
  check(p1.tipo === "persona" && p1.rol === "emprendedor" && p1.publicado === true, "persona, emprendedor, publicado");
  check(p1.consentimiento_at !== null, "con consentimiento_at");
  const reg = (await sistema("select * from public.perfiles_alta_equipo where perfil_id = $1", [a1.id])).rows[0];
  check(reg?.creado_por === U.admin && reg?.consentimiento_version === V, "registro: quién y qué versión");
  check(reg?.empresa_id === a1.empresa_id, "registro: la empresa");
  const e1 = (await sistema("select * from public.empresas where id = $1", [a1.empresa_id])).rows[0];
  check(e1.slug === "cafe-nandu" && e1.dueno_id === null && e1.tipo === "startup", "empresa sin dueño, startup", e1);
  check(p1.empresa_id === a1.empresa_id, "es su principal");
  check((await valor("select count(*)::int from public.empresas_codigos where empresa_id = $1", [a1.empresa_id])) === 1, "con código");
  const ev = await evento();
  check((await valor("select count(*)::int from public.evento_participantes where evento_id = $1 and perfil_id = $2", [ev, a1.id])) === 1, "anotado en la feria");
  check((await valor("select perfil_id from public.evento_empresas where evento_id = $1 and empresa_id = $2", [ev, a1.empresa_id])) === a1.id, "representante de su empresa");
  const rec = (await sistema("select * from public.perfiles_reclamo where perfil_id = $1", [a1.id])).rows[0];
  check(rec.email === "jose.nunez+feria@gmail.com" && rec.email_canonico === "josenunez@gmail.com", "email de reclamo canónico", rec);
  check(p1.email === null, "perfiles.email sigue vacío");
  check((await valor("select count(*)::int from public.equipo_acciones where accion = 'alta' and perfil_id = $1", [a1.id])) === 1, "acción registrada");

  // Slugs
  const a2 = await alta(U.admin, { nombre: "Jose Nuñez" });
  check(a2.slug === "jose-nunez-2", "repetido: -2", a2.slug);
  const a3 = await alta(U.admin, { nombre: "Al" });
  check(a3.slug === "perfil-al", "corto: con prefijo", a3.slug);
  const a4 = await alta(U.admin, { nombre: "Test Uno" });
  check(a4.slug === "p-test-uno", "nunca test-", a4.slug);
  const a5 = await alta(U.admin, { nombre: "x".repeat(80) });
  check(a5.slug.length <= 60, "≤ 60", a5.slug.length);
  const a6 = await alta(U.admin, { nombre: "Otro", empresa: "Café Ñandú" });
  check(a6.empresa_slug === "cafe-nandu-2", "empresa repetida: -2", a6.empresa_slug);
  const a7 = await alta(U.admin, { nombre: "Sin publicar", publicado: false });
  check((await perfil(a7.id)).publicado === false, "publicado false si se pide");

  // Límites
  await espera("sin consentimiento", () => alta(U.admin, { consentimiento: false }), "falta el consentimiento");
  await espera("sin versión", () => alta(U.admin, { version: "" }), "falta el consentimiento");
  await espera("nombre de 81", () => alta(U.admin, { nombre: "x".repeat(81) }), "dato inválido: nombre");
  await espera("nombre vacío", () => alta(U.admin, { nombre: "  " }), "dato inválido: nombre");
  await espera("descripción de 151", () => alta(U.admin, { descripcion: "x".repeat(151) }), "dato inválido: descripcion");
  await espera("descripción con salto de línea", () => alta(U.admin, { descripcion: "a\nb" }), "dato inválido: descripcion");
  await espera("email inválido", () => alta(U.admin, { email: "no-es-email" }), "email inválido");
  await espera("rol inválido", () => alta(U.admin, { rol: "rey" }), "dato inválido: rol");
  await espera("empresa de 81", () => alta(U.admin, { empresa: "x".repeat(81) }), "dato inválido: empresa");
  await espera("descripción de empresa de 281", () => alta(U.admin, { empresa: "E", empresa_desc: "x".repeat(281) }), "dato inválido: empresa_descripcion");
  await espera("tipo de empresa inválido", () => alta(U.admin, { empresa: "E", empresa_tipo: "secta" }), "dato inválido: empresa_tipo");
  await espera("evento inexistente", () => alta(U.admin, { evento: "nada" }), "evento inexistente");

  // Frecuencia
  await sistema(`update public.medicion_frecuencia set acciones = 20, ventana = now() where dispositivo = $1 and tipo = 'alta_equipo'`, [U.admin]);
  const antes = await valor("select count(*)::int from public.perfiles");
  await espera("pasado el tope por minuto", () => alta(U.admin, { nombre: "Uno más" }), "demasiadas acciones");
  check((await valor("select count(*)::int from public.perfiles")) === antes, "y no creó nada");
  await sistema(`delete from public.medicion_frecuencia where tipo = 'alta_equipo'`);

  // -------------------------------------------------------------------------
  console.log("\n4) Parecidos");
  const par = await yo(U.admin, "select * from public.admin_parecidos('JOSE NUNEZ', null)").then((x) => x.rows);
  check(par.length >= 2 && par[0].nombre === "José Ñúñez", "sin tildes ni mayúsculas", par.map((p) => p.nombre));
  const parE = await yo(U.admin, "select * from public.admin_parecidos('Nadie', 'cafe ñandu')").then((x) => x.rows);
  check(parE.some((p) => p.id === a1.id), "por empresa");
  check((await yo(U.admin, "select * from public.admin_parecidos('Zzzz', null)")).rows.length === 0, "nada si no se parece");
  const parEmp = await yo(U.admin, `select * from public.admin_empresas_parecidas('CAFE NANDU', '${EV}')`).then((x) => x.rows);
  check(parEmp.length === 2 && parEmp[0].participa === true && parEmp[0].representante === "José Ñúñez", "empresas parecidas con su representante", parEmp);

  // -------------------------------------------------------------------------
  console.log("\n5) Sumar a una empresa existente en el alta");
  const a8 = await alta(U.admin, { nombre: "Socia de José", sumar_a: a1.empresa_id, evento: EV });
  check((await valor("select count(*)::int from public.empresa_miembros where empresa_id = $1", [a1.empresa_id])) === 2, "dos integrantes");
  check((await valor("select perfil_id from public.evento_empresas where evento_id = $1 and empresa_id = $2", [ev, a1.empresa_id])) === a1.id, "el representante no cambia");
  check((await valor("select dueno_id from public.empresas where id = $1", [a1.empresa_id])) === null, "el dueño no cambia");
  check((await valor("select count(*)::int from public.evento_participantes where evento_id = $1 and perfil_id = $2", [ev, a8.id])) === 1, "pero ella queda anotada");

  // -------------------------------------------------------------------------
  console.log("\n6) Recientes, deshacer y borrar");
  const rec5 = await yo(U.admin, "select * from public.admin_altas_recientes()").then((x) => x.rows);
  check(rec5.length === 5 && rec5[0].id === a8.id && rec5.every((x) => x.puede_deshacer), "mis últimas 5, deshacibles");
  check((await yo(U.admin2, "select * from public.admin_altas_recientes()")).rows.length === 0, "las de otro admin no");
  await espera("otro admin no deshace", () => r(U.admin2, `public.admin_deshacer_alta('${a7.id}')`), "ya no se puede deshacer");
  await r(U.admin, `public.admin_deshacer_alta('${a6.id}')`);
  check((await perfil(a6.id)) === undefined, "deshecho");
  check((await valor("select count(*)::int from public.empresas where id = $1", [a6.empresa_id])) === 0, "y su empresa (única integrante) también");
  await sistema("update public.perfiles_alta_equipo set created_at = now() - interval '11 minutes' where perfil_id = $1", [a7.id]);
  await espera("pasados 10 minutos, no", () => r(U.admin, `public.admin_deshacer_alta('${a7.id}')`), "ya no se puede deshacer");
  // Sumada a una empresa con otra integrante: se borra ella, la empresa queda.
  await r(U.admin2, `public.admin_borrar_perfil_equipo('${a8.id}')`);
  check((await perfil(a8.id)) === undefined && (await valor("select count(*)::int from public.empresas where id = $1", [a1.empresa_id])) === 1,
    "borrar: se va ella, la empresa con otra integrante queda");
  await espera("no se borra un perfil con cuenta", () => r(U.admin, `public.admin_borrar_perfil_equipo('${betoPropio}')`), "solo perfiles del equipo sin cuenta");
  const viejo = await valor(`insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado)
    values ('viejo-ingesta', 'Viejo', 'startup', 'emprendedor', 'De la ingesta', true) returning id`);
  await espera("ni uno viejo que no creó el equipo", () => r(U.admin, `public.admin_borrar_perfil_equipo('${viejo}')`), "solo perfiles del equipo sin cuenta");
  check((await valor("select count(*)::int from public.equipo_acciones where accion in ('deshacer', 'borrar_perfil')")) === 2, "registradas");

  // -------------------------------------------------------------------------
  console.log("\n7) Edición");
  await r(U.admin, `public.admin_editar_perfil_equipo('${a2.id}', 'Jose N.', 'Otra línea', 'aliado', 'coach', false, true)`);
  const p2 = await perfil(a2.id);
  check(p2.nombre === "Jose N." && p2.rol === "aliado" && p2.tipo === "coach" && !p2.publicado && p2.oculto, "edición completa sin cuenta");
  check(p2.usuario_id === null && p2.slug === a2.slug, "sin dueña y mismo slug");
  const campos = await valor("select campos from public.equipo_acciones where accion = 'editar_perfil' and perfil_id = $1", [a2.id]);
  check(JSON.stringify(campos) === JSON.stringify(["nombre", "descripcion", "rol", "tipo", "publicado", "oculto"]), "registro con los campos, sin valores", campos);
  await espera("completa con cuenta, no", () => r(U.admin, `public.admin_editar_perfil_equipo('${betoPropio}', 'B', 'C', 'emprendedor', 'persona', true, false)`), "el perfil tiene cuenta");
  await espera("tipo inválido", () => r(U.admin, `public.admin_editar_perfil_equipo('${a2.id}', 'B', 'C', 'emprendedor', 'rey', true, false)`), "dato inválido: tipo");
  const antesBeto = await perfil(betoPropio);
  await r(U.admin, `public.admin_editar_perfil_cuenta('${betoPropio}', 'Beto Gómez', 'Lo mío, corregido')`);
  const despuesBeto = await perfil(betoPropio);
  const difBeto = Object.keys(antesBeto).filter((k) => JSON.stringify(antesBeto[k]) !== JSON.stringify(despuesBeto[k]));
  check(JSON.stringify(difBeto.sort()) === JSON.stringify(["descripcion", "nombre"]), "con cuenta: solo nombre y descripción", difBeto);
  check(despuesBeto.usuario_id === U.beto, "la dueña sigue");
  check((await valor("select admin_id from public.equipo_acciones where accion = 'editar_perfil_cuenta' and perfil_id = $1", [betoPropio])) === U.admin, "registrado quién");
  await espera("descripción de 151", () => r(U.admin, `public.admin_editar_perfil_cuenta('${betoPropio}', 'B', '${"x".repeat(151)}')`), "dato inválido: descripcion");
  await r(U.admin, `public.admin_editar_empresa_equipo('${a1.empresa_id}', 'Café Ñandú SRL', '')`);
  const e1b = (await sistema("select nombre, descripcion from public.empresas where id = $1", [a1.empresa_id])).rows[0];
  check(e1b.nombre === "Café Ñandú SRL" && e1b.descripcion === null, "empresa: nombre y descripción vacía = null");

  // -------------------------------------------------------------------------
  console.log("\n8) Empresas desde /admin");
  // Ana tiene cuenta y perfil, sin empresa.
  const anaPerfil = await valor(`insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, usuario_id, consentimiento_at)
    values ('ana', 'Ana', 'persona', 'emprendedor', 'Ana hace', true, $1, now()) returning id`, [U.ana]);
  const eAna = await r(U.admin, `public.admin_agregar_empresa('${anaPerfil}', 'FluIA', 'IA para fluidos', 'startup', '${EV}')`);
  check((await valor("select dueno_id from public.empresas where id = $1", [eAna.id])) === U.ana, "con cuenta: dueña la persona");
  check((await valor("select empresa_id from public.perfiles where id = $1", [anaPerfil])) === eAna.id, "es su principal");
  check((await valor("select perfil_id from public.evento_empresas where evento_id = $1 and empresa_id = $2", [ev, eAna.id])) === anaPerfil, "representante en la feria");
  const eSin = await r(U.admin, `public.admin_agregar_empresa('${a3.id}', 'Otra Cosa')`);
  check((await valor("select dueno_id from public.empresas where id = $1", [eSin.id])) === null, "sin cuenta: sin dueña");
  await espera("feria: ya representa a otra", () => r(U.admin, `public.admin_agregar_empresa('${anaPerfil}', 'Segunda', null, 'startup', '${EV}')`), "ya representa a otra empresa");
  check((await valor("select count(*)::int from public.empresa_miembros where perfil_id = $1", [anaPerfil])) === 1, "y no escribió nada");
  // Sumar a FluIA a un perfil sin cuenta: no cambia dueña ni representante.
  await r(U.admin, `public.admin_sumar_a_empresa('${a3.id}', '${eAna.id}', 'cto', '${EV}')`);
  check((await valor("select dueno_id from public.empresas where id = $1", [eAna.id])) === U.ana, "sumar: la dueña no cambia");
  check((await valor("select perfil_id from public.evento_empresas where evento_id = $1 and empresa_id = $2", [ev, eAna.id])) === anaPerfil, "sumar: el representante no cambia");
  check((await valor("select cargo from public.empresa_miembros where empresa_id = $1 and perfil_id = $2", [eAna.id, a3.id])) === "cto", "con su cargo");
  await espera("dos veces, no", () => r(U.admin, `public.admin_sumar_a_empresa('${a3.id}', '${eAna.id}')`), "ya es parte de esa empresa");
  await espera("cargo inválido", () => r(U.admin, `public.admin_sumar_a_empresa('${a4.id}', '${eAna.id}', 'rey')`), "dato inválido: cargo");
  // Tope de 5.
  for (let i = 0; i < 3; i++) await r(U.admin, `public.admin_agregar_empresa('${anaPerfil}', 'Extra ${i}')`);
  await r(U.admin, `public.admin_sumar_a_empresa('${anaPerfil}', '${a1.empresa_id}')`);
  check((await valor("select count(*)::int from public.empresa_miembros where perfil_id = $1", [anaPerfil])) === 5, "5 empresas");
  await espera("agregar la sexta", () => r(U.admin, `public.admin_agregar_empresa('${anaPerfil}', 'Sexta')`), "tope de empresas");
  await espera("sumar a la sexta", () => r(U.admin, `public.admin_sumar_a_empresa('${anaPerfil}', '${eSin.id}')`), "tope de empresas");
  check((await valor("select count(*)::int from public.equipo_acciones where accion in ('agregar_empresa', 'sumar_empresa')")) === 7, "registradas (5 agregadas, 2 sumadas)");
  const det = await r(U.admin, `public.admin_perfil_detalle('${anaPerfil}', '${EV}')`);
  check(det.empresas.length === 5 && det.empresas[0].principal && det.representa === "FluIA" && det.con_cuenta, "detalle para el editor", det);

  // -------------------------------------------------------------------------
  console.log("\n9) Reclamo");
  // Caro (Caro.Perez@gmail.com, confirmada) y su perfil del equipo, cargado con puntos y "+".
  const ac = await alta(U.admin, { nombre: "Caro Pérez", empresa: "Caro SA", email: "caroperez+stand@googlemail.com" });
  const det2 = await r(U.admin, `public.admin_perfil_detalle('${ac.id}', '${EV}')`);
  check(det2.email_reclamo === "caroperez+stand@googlemail.com", "el editor ve el email");
  check((await yo(U.ana, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "ana (ya tiene perfil, otro email): nada");
  check((await yo(U.eli, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "eli (email que no coincide): nada");
  // Mismo usuario en otro dominio: no coincide.
  await alta(U.admin, { nombre: "Eli Falsa", email: "eli@otro.com" });
  check((await yo(U.eli, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "eli@otro.com no es eli@mail.com");
  const pend = (await yo(U.caro, "select * from public.mi_reclamo_pendiente()")).rows;
  check(pend.length === 1 && pend[0].perfil_id === ac.id && pend[0].empresa === "Caro SA", "caro lo ve (gmail sin puntos ni +)", pend);
  check((await r(U.eli, `public.reclamar_perfil('${ac.id}', true)`)) === null, "otra cuenta no lo reclama");
  await espera("sin consentimiento: 22023", () => r(U.caro, `public.reclamar_perfil('${ac.id}', false)`), "falta el consentimiento");
  await espera("consentimiento null: 22023", () => r(U.caro, `public.reclamar_perfil('${ac.id}', null)`), "falta el consentimiento");
  check((await perfil(ac.id)).usuario_id === null, "y no vinculó");

  const antesCaro = await perfil(ac.id);
  await limpiarSesion();
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [U.caro]);
  await db.exec("set role authenticated");
  const res = await db.exec(`begin;
    select public.reclamar_perfil('${ac.id}', true) s;
    select auth.uid()::text u;
    commit;`);
  await db.exec("reset role");
  check(res[1].rows[0].s === ac.slug, "reclamó: devuelve el slug");
  check(res[2].rows[0].u === U.caro, "en la misma transacción, auth.uid() vuelve a ser la sesión");
  check((await yo(U.caro, "select auth.uid()::text u")).rows[0].u === U.caro, "y en la siguiente");
  const despuesCaro = await perfil(ac.id);
  const dif = Object.keys(antesCaro).filter((k) => JSON.stringify(antesCaro[k]) !== JSON.stringify(despuesCaro[k]));
  check(JSON.stringify(dif.sort()) === JSON.stringify(["consentimiento_at", "usuario_id"]), "solo cambian usuario_id y consentimiento_at", dif);
  check(despuesCaro.usuario_id === U.caro, "dueña: caro");
  check((await valor("select dueno_id from public.empresas where id = $1", [ac.empresa_id])) === U.caro, "y administra su empresa");
  check((await valor("select count(*)::int from public.perfiles_reclamo where perfil_id = $1", [ac.id])) === 0, "el email de reclamo se borró");
  check((await yo(U.caro, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "ya no hay nada pendiente");
  check((await r(U.caro, `public.reclamar_perfil('${ac.id}', true)`)) === null, "dos veces: nada");

  // Perfil con dueña: no se pisa.
  await sistema("insert into public.perfiles_reclamo (perfil_id, email, email_canonico) values ($1, 'fede@mail.com', 'fede@mail.com')", [ac.id]);
  check((await r(U.fede, `public.reclamar_perfil('${ac.id}', true)`)) === null, "un perfil con dueña no se reclama");
  check((await perfil(ac.id)).usuario_id === U.caro, "sigue siendo de caro");
  await sistema("delete from public.perfiles_reclamo where perfil_id = $1", [ac.id]);

  // Email sin confirmar.
  const ad = await alta(U.admin, { nombre: "Dani", email: "dani@mail.com" });
  check((await yo(U.dani, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "dani (sin confirmar) no lo ve");
  check((await r(U.dani, `public.reclamar_perfil('${ad.id}', true)`)) === null, "ni lo reclama");
  check((await perfil(ad.id)).usuario_id === null, "sigue sin dueña");

  // Cuenta que ya tiene perfil propio: "Para revisar", nada se pisa.
  const ab = await alta(U.admin, { nombre: "Beto del stand", email: "BETO@mail.com" });
  check((await yo(U.beto, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "beto (ya con perfil) no lo ve");
  check((await r(U.beto, `public.reclamar_perfil('${ab.id}', true)`)) === null, "ni lo reclama");
  check((await perfil(ab.id)).usuario_id === null && (await perfil(betoPropio)).usuario_id === U.beto, "nada se pisa");

  // "No es mío".
  const ae = await alta(U.admin, { nombre: "Eli del stand", email: "eli@mail.com" });
  check((await r(U.eli, `public.rechazar_reclamo('${ae.id}')`)) === true, "eli dice que no es suyo");
  check((await yo(U.eli, "select * from public.mi_reclamo_pendiente()")).rows.length === 0, "y deja de ofrecerse");
  const revisar = await yo(U.admin, "select * from public.admin_reclamos_revisar()").then((x) => x.rows);
  check(revisar.some((x) => x.perfil_id === ab.id && x.propio_id === betoPropio), "para revisar: el de beto, con su perfil propio");
  check(revisar.some((x) => x.perfil_id === ae.id && x.rechazado_at !== null), "para revisar: el rechazado");
  check(!revisar.some((x) => x.perfil_id === ad.id), "el de dani (sin confirmar) no");
  await espera("anon no ve reclamos", () => anon("select * from public.mi_reclamo_pendiente()"), "permission denied");

  // Frecuencia del reclamo.
  await sistema(`insert into public.medicion_frecuencia (dispositivo, tipo, ventana, acciones) values ($1, 'reclamo', now(), 10)
    on conflict (dispositivo, tipo) do update set acciones = 10, ventana = now()`, [U.eli]);
  await espera("reclamo: tope por minuto", () => r(U.eli, `public.reclamar_perfil('${ae.id}', true)`), "demasiadas acciones");

  // -------------------------------------------------------------------------
  console.log("\n10) Vincular a mano y email de reclamo");
  check((await r(U.admin, `public.admin_vincular_cuenta('${ad.id}', 'dani@mail.com')`)) === false, "sin confirmar: no");
  check((await r(U.admin, `public.admin_vincular_cuenta('${ad.id}', 'beto@mail.com')`)) === false, "cuenta con perfil: no");
  check((await r(U.admin, `public.admin_vincular_cuenta('${ad.id}', 'nadie@mail.com')`)) === false, "cuenta inexistente: no (mismo resultado)");
  check((await r(U.admin, `public.admin_vincular_cuenta('${betoPropio}', 'eli@mail.com')`)) === false, "perfil con dueña: no");
  check((await valor("select acciones from public.medicion_frecuencia where dispositivo = $1 and tipo = 'vincular'", [U.admin])) === 4, "los intentos fallidos quedan contados");
  const consAntes = (await perfil(ad.id)).consentimiento_at;
  check((await r(U.admin, `public.admin_vincular_cuenta('${ad.id}', 'E.L.I@mail.com')`)) === false, "otro dominio: los puntos importan");
  check((await r(U.admin, `public.admin_vincular_cuenta('${ad.id}', 'ELI@mail.com')`)) === true, "eli (confirmada, sin perfil): sí");
  const pd = await perfil(ad.id);
  check(pd.usuario_id === U.eli && String(pd.consentimiento_at) === String(consAntes), "dueña eli, el consentimiento del stand no cambia");
  check((await valor("select count(*)::int from public.perfiles_reclamo where perfil_id = $1", [ad.id])) === 0, "y el reclamo se borró");
  await espera("email de reclamo en perfil con cuenta: no", () => r(U.admin, `public.admin_email_reclamo('${ad.id}', 'x@y.co')`), "el perfil tiene cuenta");
  await r(U.admin, `public.admin_email_reclamo('${a4.id}', '  Nuevo@Mail.com ')`);
  check((await valor("select email from public.perfiles_reclamo where perfil_id = $1", [a4.id])) === "nuevo@mail.com", "email guardado en minúsculas");
  await r(U.admin, `public.admin_email_reclamo('${a4.id}', '')`);
  check((await valor("select count(*)::int from public.perfiles_reclamo where perfil_id = $1", [a4.id])) === 0, "vacío = borrar");
  const lista = await yo(U.admin, "select * from public.admin_perfiles_v2()").then((x) => x.rows);
  check(lista.find((x) => x.id === a1.id)?.creado_equipo === true && lista.find((x) => x.id === a1.id)?.con_reclamo === true, "admin_perfiles_v2: equipo y reclamo");
  check(lista.find((x) => x.id === betoPropio)?.creado_equipo === false, "beto no lo creó el equipo");

  // -------------------------------------------------------------------------
  console.log("\n11) Lo de antes sigue andando");
  check((await yo(U.admin, "select count(*)::int n from public.admin_perfiles()")).rows[0].n === lista.length, "admin_perfiles igual");
  // El guardián sigue frenando a una persona con sesión que intenta cambiar usuario_id.
  await espera("el guardián sigue", () => yo(U.caro, `update public.perfiles set usuario_id = '${U.fede}' where id = '${ac.id}'`), "campo no editable");

  // -------------------------------------------------------------------------
  console.log("\n12) Rollback");
  const perfilesAntes = await valor("select count(*)::int from public.perfiles");
  await aplicar(ROLLBACK);
  for (const t of ["perfiles_alta_equipo", "perfiles_reclamo", "equipo_acciones"]) {
    check((await valor(`select to_regclass('public.${t}') is null`)) === true, `sin ${t}`);
  }
  check((await valor(`select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('admin_alta_rapida', 'reclamar_perfil', 'admin_agregar_empresa', 'email_canonico', 'perfil_equipo_borrar')`)) === 0, "sin las funciones");
  check((await valor(`select count(*)::int from public.medicion_frecuencia where tipo in ('alta_equipo', 'vincular', 'reclamo', 'reclamo_ver')`)) === 0, "sin sus contadores");
  check((await valor("select count(*)::int from public.perfiles")) === perfilesAntes, "los perfiles quedan");
  check((await yo(U.admin, "select count(*)::int n from public.admin_perfiles()")).rows[0].n === lista.length, "admin_perfiles sigue andando");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
