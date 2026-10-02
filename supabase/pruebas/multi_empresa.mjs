// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración multi_empresa: paso de los datos de hoy a membresías, tope de 5,
// permisos entre empresas, administración, empresa principal, empresa huérfana, borrar
// la cuenta con varias empresas, compatibilidad con las funciones de main y el script
// para volver atrás (supabase/rollback-multi-empresa.sql). No toca ninguna base real.
// Mismo armado que borrar_cuenta.mjs.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\multi_empresa.mjs .
//   node multi_empresa.mjs <ruta al repo>
// Tiene que terminar en "N ok · 0 fallas".
//
// Las otras seis suites también corren después del rollback (tienen que seguir en 0):
//   node <suite>.mjs <repo> --con supabase/rollback-multi-empresa.sql
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

// Las de main, en orden. multi_empresa va aparte: se aplica después de armar datos.
const MIGRACIONES_MAIN = [
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
];
const MULTI = "supabase/migrations/20261010120000_multi_empresa.sql";
const ROLLBACK = "supabase/rollback-multi-empresa.sql";

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

const uno = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const valor = async (sql, params = []) => Object.values((await uno(sql, params)) ?? {})[0];
const yo = (uid, sql, params = []) => como("authenticated", uid, sql, params);
// Como el SQL editor: sin sesión (auth.uid() null).
async function sistema(sql, params = []) {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);");
  return db.query(sql, params);
}

async function base() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES_MAIN) await aplicar(`supabase/migrations/${m}`);
  await db.exec(`update public.ajustes set autopublicar = true;`);
}

async function aplicar(ruta) {
  try {
    await db.exec(readFileSync(join(RAIZ, ruta), "utf8"));
  } catch (e) {
    console.log(`FALLÓ ${ruta}: ${e.message}`);
    process.exit(1);
  }
}

async function usuario(uid, email) {
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, email]);
}

async function alta(uid, slug, extra = {}) {
  const campos = {
    slug,
    nombre: "Nombre " + slug,
    tipo: "startup",
    rol: "emprendedor",
    descripcion: "Descripción",
    consentimiento_at: new Date().toISOString(),
    ...extra,
  };
  const cols = Object.keys(campos);
  const r = await yo(
    uid,
    `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`,
    Object.values(campos)
  );
  return r.rows[0].id;
}

const empresaDe = (slug) => valor(`select id from public.empresas where slug = $1`, [slug]);
const codigoDe = (id) => valor(`select codigo from public.empresas_codigos where empresa_id = $1`, [id]);
const principalDe = (perfil) => valor(`select empresa_id from public.perfiles where id = $1`, [perfil]);
const membresias = (perfil) => valor(`select count(*)::int from public.empresa_miembros where perfil_id = $1`, [perfil]);
const crear = (uid, slug, cargo = null) =>
  yo(uid, `select public.crear_empresa_v2($1, $2, 'Qué hace', null, '{}', null, null, $3) s`, ["Empresa " + slug, slug, cargo]);

/**
 * Rastros: cualquier columna uuid de public o auth con alguno de `ids`, y cualquier
 * columna de texto con alguno de `textos` (como en borrar_cuenta.mjs).
 */
async function rastros(ids, textos) {
  const cols = (
    await db.query(`
      select table_schema s, table_name t, column_name c, data_type d
      from information_schema.columns
      where table_schema in ('public', 'auth')
        and data_type in ('uuid', 'text', 'ARRAY')
        and table_name <> 'emails_bloqueados'
        and table_name in (select table_name from information_schema.tables
                           where table_schema in ('public', 'auth') and table_type = 'BASE TABLE')`)
  ).rows;
  const hallados = [];
  for (const { s, t, c, d } of cols) {
    let sql;
    if (d === "uuid") sql = `select count(*)::int n from ${s}.${t} where ${c} = any ($1::uuid[])`;
    else if (d === "text") sql = `select count(*)::int n from ${s}.${t} where ${c} = any ($1::text[])`;
    else sql = `select count(*)::int n from ${s}.${t} where ${c}::text[] && $1::text[]`;
    const n = (await db.query(sql, [d === "uuid" ? ids : textos])).rows[0].n;
    if (n > 0) hallados.push(`${t}.${c}`);
  }
  return hallados;
}

/** Las funciones que multi_empresa redefine (`create or replace`), sacadas del archivo. */
function redefinidas() {
  const sql = readFileSync(join(RAIZ, MULTI), "utf8");
  return [...sql.matchAll(/^create or replace function public\.(\w+)\(/gm)].map((m) => m[1]);
}

async function definiciones(nombres) {
  const r = await db.query(
    `select p.proname n, pg_get_functiondef(p.oid) d, p.proacl::text acl
     from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.proname = any ($1::text[])
     order by 1, 2`,
    [nombres]
  );
  return r.rows;
}

const U = {
  ana: "11111111-1111-4111-8111-111111111111",
  beto: "22222222-2222-4222-8222-222222222222",
  caro: "33333333-3333-4333-8333-333333333333",
  dani: "44444444-4444-4444-8444-444444444444",
  admin: "55555555-5555-4555-8555-555555555555",
  fede: "66666666-6666-4666-8666-666666666666",
  gabi: "77777777-7777-4777-8777-777777777777",
  sinEmpresa: "88888888-8888-4888-8888-888888888888",
};

async function main() {
  await base();

  // -------------------------------------------------------------------------
  console.log("\n0) Datos de hoy (con las funciones de main) y paso a membresías");
  for (const [k, uid] of Object.entries(U)) await usuario(uid, `${k}@mail.com`);
  await db.exec(`insert into public.admins (email) values ('admin@mail.com');`);
  // Dani se crea antes que Beto, pero se suma a la empresa después: la administración
  // tiene que pasar por antigüedad EN LA EMPRESA, no del perfil.
  const ana = await alta(U.ana, "ana-startup");
  const dani = await alta(U.dani, "dani-dev");
  const beto = await alta(U.beto, "beto-agro");
  const caro = await alta(U.caro, "caro-inversora", { rol: "inversor", tipo: "angel" });
  await yo(U.ana, `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato', null, '{agtech}', 'mvp', 'seed', 'ceo')`);
  const raiz = await empresaDe("raiz-verde");
  await yo(U.beto, `select public.unirse_empresa($1, 'cto')`, [await codigoDe(raiz)]);
  await yo(U.dani, `select public.unirse_empresa($1, 'equipo')`, [await codigoDe(raiz)]);

  await aplicar(MULTI);
  const filas = (await db.query(`select perfil_id, cargo from public.empresa_miembros where empresa_id = $1 order by created_at`, [raiz])).rows;
  check(
    // Antigüedad = la del perfil, como ordenaba main: Dani (perfil más viejo) antes que Beto.
    filas.length === 3 && filas[0].perfil_id === ana && filas[0].cargo === "ceo" &&
      filas[1].perfil_id === dani && filas[2].perfil_id === beto && filas[2].cargo === "cto",
    "cada perfil con empresa tiene su membresía, con su cargo y el orden de antes",
    filas
  );
  const backfill = readFileSync(join(RAIZ, MULTI), "utf8").match(/insert into public\.empresa_miembros \(empresa_id, perfil_id, cargo, created_at\)[\s\S]*?do nothing;/)[0];
  await db.exec(backfill);
  check((await valor(`select count(*)::int from public.empresa_miembros`)) === 3, "volver a correr el paso de datos no duplica nada");
  check((await principalDe(ana)) === raiz && (await principalDe(beto)) === raiz, "empresa_id queda como la principal");

  // -------------------------------------------------------------------------
  console.log("\n1) Compatibilidad con main (funciones de siempre)");
  const mia = (await yo(U.ana, `select slug, es_dueno, miembros from public.mi_empresa()`)).rows;
  check(mia.length === 1 && mia[0].slug === "raiz-verde" && mia[0].es_dueno && mia[0].miembros === 3, "mi_empresa: una fila, la principal, con 3 integrantes", mia);
  const v2 = (await yo(U.ana, `select miembros from public.mi_empresa_v2()`)).rows;
  check(v2.length === 1 && v2[0].miembros === 3, "mi_empresa_v2 igual", v2);
  await espera("crear_empresa sigue con una sola", () => yo(U.ana, `select public.crear_empresa('Otra', 'otra-mas', 'Otra')`), "ya tenés empresa");
  await espera("unirse_empresa sigue con una sola", () => yo(U.beto, `select public.unirse_empresa('00000000')`), "ya tenés empresa");
  const equipo = (await yo(U.beto, `select slug, cargo, es_dueno from public.miembros_mi_empresa()`)).rows;
  check(equipo.length === 3 && equipo[0].slug === "ana-startup" && equipo[0].es_dueno && equipo[2].cargo === "cto", "miembros_mi_empresa: el equipo, quien administra primero", equipo);

  // -------------------------------------------------------------------------
  console.log("\n2) Varias empresas y tope de 5");
  for (const s of ["ana-dos", "ana-tres", "ana-cuatro", "ana-cinco"]) await crear(U.ana, s, "asesor");
  check((await membresias(ana)) === 5, "Ana crea 4 más: 5 empresas");
  check((await principalDe(ana)) === raiz, "la principal sigue siendo la primera");
  await espera("la sexta no se crea", () => crear(U.ana, "ana-seis"), "tope de empresas");
  check(!(await empresaDe("ana-seis")), "y no queda una empresa a medio crear");
  const otra = (await crear(U.caro, "caro-fondo")).rows[0].s;
  const caroFondo = await empresaDe(otra);
  const codigoFondo = await codigoDe(caroFondo);
  await espera("ni se suma a una sexta con código", () => yo(U.ana, `select public.unirse_empresa_v2($1)`, [codigoFondo]), "tope de empresas");
  await espera(
    "el tope vale también para una fila escrita a mano (SQL editor)",
    () => sistema(`insert into public.empresa_miembros (empresa_id, perfil_id) values ($1, $2)`, [caroFondo, ana]),
    "tope de empresas"
  );
  const lista = (await yo(U.ana, `select slug, es_principal, cargo, es_dueno from public.mis_empresas()`)).rows;
  check(
    lista.length === 5 && lista[0].slug === "raiz-verde" && lista[0].es_principal && lista.slice(1).every((e) => !e.es_principal && e.cargo === "asesor"),
    "mis_empresas: las 5, la principal primero, cargo por empresa",
    lista
  );
  const codigoRaiz = await codigoDe(raiz);
  await espera("unirse dos veces a la misma", () => yo(U.beto, `select public.unirse_empresa_v2($1)`, [codigoRaiz]), "ya sos parte");
  check((await yo(U.beto, `select public.unirse_empresa_v2('ZZZZZZZZ') s`)).rows[0].s === null, "un código que no existe devuelve null");
  // Salir libera un lugar.
  const dos = await empresaDe("ana-dos");
  await yo(U.beto, `select public.unirse_empresa_v2($1, 'cto')`, [await codigoDe(dos)]);
  await yo(U.ana, `select public.salir_de_empresa($1)`, [dos]);
  check((await membresias(ana)) === 4, "salir libera un lugar");
  await yo(U.ana, `select public.unirse_empresa_v2($1)`, [await codigoDe(caroFondo)]);
  check((await membresias(ana)) === 5, "y ese lugar se puede volver a usar");
  check((await valor(`select dueno_id from public.empresas where id = $1`, [dos])) === U.beto, "Ana administraba ana-dos: pasa a Beto");

  // -------------------------------------------------------------------------
  console.log("\n3) Permisos: nadie toca una empresa de la que no es parte");
  // Contenido de Raíz Verde (Ana) para intentar tocarlo desde afuera.
  const hito = (await yo(U.ana, `select public.guardar_hito_en($1, null, 'Primer cliente', null, null, 'logrado', null, null) s`, [raiz])).rows[0].s;
  const avance = (await yo(U.ana, `select public.publicar_avance_en($1, 'Arrancamos', null) s`, [raiz])).rows[0].s;
  const doc = (await yo(U.ana, `select public.guardar_documento_en($1, null, null, 'empresa', 'escrito', 'Visión', '{}', 'Texto', null, false) s`, [raiz])).rows[0].s;
  await yo(U.ana, `select public.guardar_dato_en($1, 'mrr', '100', null, false)`, [raiz]);
  await yo(U.ana, `select public.guardar_producto_en($1, 'producto', 'Sustrato', 'Para cultivar', null, null, null, '{}', null, null)`, [raiz]);
  check(!!hito && !!avance && !!doc, "Ana carga hito, avance, documento, dato y producto en Raíz Verde");

  const ajenas = [
    ["editar_empresa_en", `select public.editar_empresa_en($1, 'X', 'Y')`],
    ["renovar_codigo_en", `select public.renovar_codigo_en($1)`],
    ["mis_datos_en", `select * from public.mis_datos_en($1)`],
    ["guardar_dato_en", `select public.guardar_dato_en($1, 'mrr', '1', null, true)`],
    ["guardar_hito_en", `select public.guardar_hito_en($1, null, 'X', null, null, 'proximo', null, null)`],
    ["publicar_avance_en", `select public.publicar_avance_en($1, 'X', null)`],
    ["guardar_producto_en", `select public.guardar_producto_en($1, 'producto', 'X', 'Y', null, null, null, '{}', null, null)`],
    ["poner_imagenes_producto_en", `select public.poner_imagenes_producto_en($1, '{}')`],
    ["poner_logo_en", `select public.poner_logo_en($1, null)`],
    ["guardar_documento_en", `select public.guardar_documento_en($1, null, null, 'empresa', 'escrito', 'X', '{}', 'Y', null, false)`],
    ["miembros_de_empresa", `select * from public.miembros_de_empresa($1)`],
    ["salir_de_empresa", `select public.salir_de_empresa($1, true)`],
    ["elegir_empresa_principal", `select public.elegir_empresa_principal($1)`],
    ["cambiar_cargo_en", `select public.cambiar_cargo_en($1, 'ceo')`],
  ];
  for (const [nombre, sql] of ajenas) {
    await espera(`Caro (de afuera) no usa ${nombre} en Raíz Verde`, () => yo(U.caro, sql, [raiz]), "no sos parte");
  }
  // Con los ids de las filas, desde su propia empresa.
  await espera(
    "ni edita un hito ajeno pasando su propia empresa",
    () => yo(U.caro, `select public.guardar_hito_en($1, $2, 'X', null, null, 'logrado', null, null)`, [caroFondo, hito]),
    "no es de tu empresa"
  );
  await espera(
    "ni un documento ajeno",
    () => yo(U.caro, `select public.guardar_documento_en($1, $2, null, 'empresa', 'escrito', 'X', '{}', 'Y', null, false)`, [caroFondo, doc]),
    "no es de tu empresa"
  );
  await yo(U.caro, `select public.borrar_hito($1)`, [hito]);
  await yo(U.caro, `select public.borrar_avance($1)`, [avance]);
  check((await valor(`select count(*)::int from public.empresa_hitos where id = $1`, [hito])) === 1, "borrar_hito con un id ajeno no borra nada");
  check((await valor(`select count(*)::int from public.empresa_avances where id = $1`, [avance])) === 1, "borrar_avance con un id ajeno tampoco");
  await espera("visibilidad_documento ajeno", () => yo(U.caro, `select public.visibilidad_documento($1, true)`, [doc]), "no es de tu empresa");
  await espera("archivar_documento ajeno", () => yo(U.caro, `select public.archivar_documento($1, true)`, [doc]), "no es de tu empresa");
  // Lectura: lo privado de Raíz Verde no se ve desde afuera.
  check((await yo(U.caro, `select count(*)::int n from public.empresa_datos where empresa_id = $1`, [raiz])).rows[0].n === 0, "Caro no lee los datos privados");
  check((await yo(U.caro, `select count(*)::int n from public.empresa_documentos where empresa_id = $1`, [raiz])).rows[0].n === 0, "ni los documentos privados");
  // Escritura directa con el JWT.
  await espera(
    "nadie escribe empresa_miembros directo",
    () => yo(U.caro, `insert into public.empresa_miembros (empresa_id, perfil_id) values ($1, $2)`, [raiz, caro]),
    "permission denied"
  );
  await espera(
    "ni se mete cambiando su empresa_id",
    () => yo(U.caro, `update public.perfiles set empresa_id = $1 where id = $2`, [raiz, caro]),
    "campo no editable"
  );
  // Dentro de la empresa: solo quien administra edita y renueva el código.
  await espera("Beto (integrante) no edita la empresa", () => yo(U.beto, `select public.editar_empresa_en($1, 'X', 'Y')`, [raiz]), "solo el dueño");
  await espera("ni renueva el código", () => yo(U.beto, `select public.renovar_codigo_en($1)`, [raiz]), "solo el dueño");
  await yo(U.beto, `select public.guardar_dato_en($1, 'clientes', '12', null, false)`, [raiz]);
  check((await valor(`select valor from public.empresa_datos where empresa_id = $1 and clave = 'clientes'`, [raiz])) === "12", "cualquier integrante carga datos, como antes");
  await yo(U.ana, `select public.editar_empresa_en($1, 'Raíz Verde', 'Sustrato de café', null, null, null, '{agtech}', 'mvp', 'seed', 'Córdoba')`, [raiz]);
  check((await valor(`select ubicacion from public.empresas where id = $1`, [raiz])) === "Córdoba", "Ana (administra) edita");
  // Responder una relación que nombra a otra empresa.
  const rel = await valor(
    `insert into public.portfolio (perfil_id, tipo, empresa_id, nombre, confirmacion) values ($1, 'inversion', $2, 'Raíz Verde', 'pendiente') returning id`,
    [caro, raiz]
  );
  await espera("Caro no confirma una relación que nombra a Raíz Verde", () => yo(U.caro, `select public.responder_relacion($1, true)`, [rel]), "no espera tu respuesta");
  const pend = (await yo(U.dani, `select id, empresa_slug from public.relaciones_pendientes_v2()`)).rows;
  check(pend.length === 1 && pend[0].empresa_slug === "raiz-verde", "relaciones_pendientes_v2 dice qué empresa nombra", pend);
  await yo(U.dani, `select public.responder_relacion($1, true)`, [rel]);
  check((await valor(`select confirmacion from public.portfolio where id = $1`, [rel])) === "confirmada", "Dani (integrante) la confirma");
  await espera(
    "sin ninguna empresa, el error de siempre",
    async () => {
      await alta(U.sinEmpresa, "sin-empresa");
      await yo(U.sinEmpresa, `select public.responder_relacion($1, true)`, [rel]);
    },
    "primero sumate"
  );

  // -------------------------------------------------------------------------
  console.log("\n4) Lectura pública");
  const vistas = (await como("anon", null, `select empresa_id from public.empresa_miembros where perfil_id = $1`, [ana])).rows;
  check(vistas.length === 5, "anon ve las 5 membresías de Ana (perfil y empresas visibles)", vistas.length);
  await yo(U.admin, `select public.admin_ocultar_empresa($1, true)`, [caroFondo]);
  check(
    (await como("anon", null, `select count(*)::int n from public.empresa_miembros where empresa_id = $1`, [caroFondo])).rows[0].n === 0,
    "una empresa oculta no muestra a su equipo"
  );
  check(
    (await yo(U.ana, `select count(*)::int n from public.empresa_miembros where empresa_id = $1`, [caroFondo])).rows[0].n === 2,
    "pero sus integrantes sí lo ven"
  );
  await yo(U.admin, `select public.admin_ocultar_empresa($1, false)`, [caroFondo]);
  const tres = await empresaDe("ana-tres");
  check((await como("anon", null, `select count(*)::int n from public.empresas where id = $1`, [tres])).rows[0].n === 1, "una empresa que no es la principal de nadie es visible igual");
  const adminLista = (await yo(U.admin, `select empresa from public.admin_perfiles() where slug = 'ana-startup'`)).rows[0].empresa;
  check(adminLista.startsWith("Raíz Verde, ") && adminLista.split(", ").length === 5, "admin_perfiles lista sus 5 empresas, la principal primero", adminLista);
  check((await yo(U.admin, `select miembros from public.admin_empresas() where slug = 'caro-fondo'`)).rows[0].miembros === 2, "admin_empresas cuenta por membresía");

  // -------------------------------------------------------------------------
  console.log("\n5) Empresa principal");
  await yo(U.ana, `select public.elegir_empresa_principal($1)`, [tres]);
  check((await principalDe(ana)) === tres, "Ana elige ana-tres como principal");
  check((await yo(U.ana, `select slug from public.mi_empresa()`)).rows[0].slug === "ana-tres", "main (mi_empresa) ve la nueva principal");
  check((await valor(`select cargo from public.perfiles where id = $1`, [ana])) === "asesor", "y el cargo del perfil pasa a ser el de esa empresa");
  await yo(U.ana, `select public.cambiar_cargo_en($1, 'ceo')`, [tres]);
  check((await valor(`select cargo from public.perfiles where id = $1`, [ana])) === "ceo", "cambiar el cargo de la principal cambia el del perfil");
  // Salir de la principal (una compartida: Caro Fondo).
  await yo(U.ana, `select public.elegir_empresa_principal($1)`, [caroFondo]);
  await yo(U.ana, `select public.salir_de_empresa($1)`, [caroFondo]);
  check((await principalDe(ana)) === raiz, "al salir de la principal, pasa a la membresía más antigua (Raíz Verde)");
  await espera("no elige como principal una empresa ajena", () => yo(U.ana, `select public.elegir_empresa_principal($1)`, [caroFondo]), "no sos parte");
  // Votación: Ana y Beto comparten Raíz Verde, que ya no es la principal de Ana.
  await db.exec(`update public.eventos set votacion_abierta = true where slug = 'feria-21'`);
  const evento = await valor(`select id from public.eventos where slug = 'feria-21'`);
  await db.query(`insert into public.evento_participantes (evento_id, perfil_id) values ($1, $2)`, [evento, ana]);
  await yo(U.ana, `select public.elegir_empresa_principal($1)`, [tres]);
  await espera("Beto no vota a Ana aunque compartan una empresa que no es la principal de ella", () => yo(U.beto, `select public.votar('feria-21', $1)`, [ana]), "tu empresa");
  await yo(U.caro, `select public.votar('feria-21', $1)`, [ana]);
  check((await valor(`select count(*)::int from public.votos`)) === 1, "Caro (de otra empresa) sí la vota");
  // Espejo: si el SQL editor escribe empresa_id, la membresía aparece.
  const cuatro = await empresaDe("ana-cuatro");
  await sistema(`update public.perfiles set empresa_id = $1 where id = $2`, [cuatro, dani]);
  check(
    (await valor(`select count(*)::int from public.empresa_miembros where perfil_id = $1 and empresa_id = $2`, [dani, cuatro])) === 1,
    "empresa_id escrito a mano crea su membresía (nunca quedan desparejos)"
  );

  // -------------------------------------------------------------------------
  console.log("\n6) Administración: pasa a la integrante más antigua de esa empresa");
  await yo(U.ana, `select public.elegir_empresa_principal($1)`, [raiz]);
  await yo(U.ana, `select public.salir_de_empresa($1)`, [raiz]);
  check((await valor(`select dueno_id from public.empresas where id = $1`, [raiz])) === U.dani, "Ana sale de Raíz Verde: administra Dani, la más antigua (como en main)");
  check((await principalDe(ana)) === tres, "la principal de Ana pasa a la más antigua de las que le quedan");
  // Membresías nuevas: cuenta la antigüedad EN LA EMPRESA, no la del perfil.
  const cinco = await empresaDe("ana-cinco");
  await yo(U.beto, `select public.unirse_empresa_v2($1)`, [await codigoDe(cinco)]);
  await yo(U.dani, `select public.unirse_empresa_v2($1)`, [await codigoDe(cinco)]);
  await yo(U.ana, `select public.salir_de_empresa($1)`, [cinco]);
  check(
    (await valor(`select dueno_id from public.empresas where id = $1`, [cinco])) === U.beto,
    "en ana-cinco administra Beto: se sumó antes que Dani, aunque su perfil es más nuevo"
  );
  check((await membresias(ana)) === 2, "Ana queda con 2");

  // -------------------------------------------------------------------------
  console.log("\n7) Empresa huérfana");
  // ana-tres: Ana sola. Le cargamos de todo.
  await yo(U.ana, `select public.poner_logo_en($1, $2)`, [tres, `${tres}-c1c1c1c1.png`]);
  await sistema(`update public.empresas set logo_url = $1 where id = $2`, [`empresa-${tres}-c2c2c2c2.jpg`, tres]);
  await yo(U.ana, `select public.guardar_producto_en($1, 'producto', 'X', 'Y', null, null, null, '{}', null, null)`, [tres]);
  await yo(U.ana, `select public.poner_imagenes_producto_en($1, $2)`, [tres, [`${tres}-d1d1d1d1.jpg`]]);
  await yo(U.ana, `select public.guardar_hito_en($1, null, 'Hito', null, null, 'logrado', null, null)`, [tres]);
  await yo(U.ana, `select public.publicar_avance_en($1, 'Avance', null)`, [tres]);
  await yo(U.ana, `select public.guardar_documento_en($1, null, null, 'empresa', 'escrito', 'Doc', '{}', 'X', null, false)`, [tres]);
  await yo(U.ana, `select public.guardar_dato_en($1, 'mrr', '5', null, true)`, [tres]);
  await db.query(`insert into public.r2_borrar (clave, borrar_despues) values ($1, now() + interval '1 hour')`, [`${tres}-0f0f0f0f.png`]);
  const relTres = await valor(
    `insert into public.portfolio (perfil_id, tipo, empresa_id, nombre, confirmacion) values ($1, 'inversion', $2, 'Ana tres', 'confirmada') returning id`,
    [caro, tres]
  );
  const previa = (await yo(U.ana, `select empresa_slug, otros_miembros, se_borra from public.antes_de_borrar_v2() where empresa_id = $1`, [tres])).rows[0];
  check(previa?.se_borra === true && previa.otros_miembros === 0, "antes_de_borrar_v2 avisa que se borra", previa);
  await espera("sin confirmar, no se borra", () => yo(U.ana, `select public.salir_de_empresa($1)`, [tres]), "confirmá el borrado");
  await espera("la función de main tampoco la borra sin confirmación", () => yo(U.ana, `select public.salir_empresa()`), "sos la única integrante");
  check(!!(await empresaDe("ana-tres")) && (await membresias(ana)) === 2, "y no cambió nada");
  const res = (await yo(U.ana, `select public.salir_de_empresa($1, true) r`, [tres])).rows[0].r;
  check(res.borrada === true && res.slug === "ana-tres", "con la confirmación, se borra", res);
  const tablas = ["empresas_codigos", "empresa_datos", "empresa_hitos", "empresa_avances", "empresa_productos", "empresa_documentos", "empresa_logos", "empresa_miembros"];
  const quedan = [];
  for (const t of tablas) if ((await valor(`select count(*)::int from public.${t} where empresa_id = $1`, [tres])) > 0) quedan.push(t);
  check(!(await empresaDe("ana-tres")) && quedan.length === 0, "la empresa y todo lo suyo desaparecen", quedan);
  const r2 = (await db.query(`select clave from public.r2_borrar where borrar_despues <= now() and (clave like $1 or clave like $2) order by 1`, [`${tres}-%`, `empresa-${tres}-%`])).rows.map((r) => r.clave);
  check(
    r2.length === 4 && r2.includes(`${tres}-c1c1c1c1.png`) && r2.includes(`empresa-${tres}-c2c2c2c2.jpg`) && r2.includes(`${tres}-d1d1d1d1.jpg`) && r2.includes(`${tres}-0f0f0f0f.png`),
    "logo, logo viejo, imágenes del producto y lo que esperaba su hora van a r2_borrar ya",
    r2
  );
  const relDespues = await uno(`select empresa_id, confirmacion from public.portfolio where id = $1`, [relTres]);
  check(relDespues.empresa_id === null && relDespues.confirmacion === "declarada", "el portfolio que la nombraba vuelve a 'declarada'", relDespues);
  check((await principalDe(ana)) === cuatro && (await membresias(ana)) === 1, "Ana sigue con su otra empresa, que pasa a ser la principal");

  // -------------------------------------------------------------------------
  console.log("\n8) Borrar la cuenta con 3 empresas");
  const fede = await alta(U.fede, "fede-founder");
  const gabi = await alta(U.gabi, "gabi-founder");
  await crear(U.fede, "fede-sola", "ceo");
  await crear(U.fede, "fede-y-gabi", "ceo");
  await crear(U.gabi, "gabi-y-fede", "ceo");
  const fSola = await empresaDe("fede-sola");
  const fCompartida = await empresaDe("fede-y-gabi");
  const gCompartida = await empresaDe("gabi-y-fede");
  await yo(U.gabi, `select public.unirse_empresa_v2($1, 'cto')`, [await codigoDe(fCompartida)]);
  await yo(U.fede, `select public.unirse_empresa_v2($1, 'cto')`, [await codigoDe(gCompartida)]);
  await yo(U.fede, `select public.poner_logo_en($1, $2)`, [fSola, `${fSola}-a1a1a1a1.png`]);
  await yo(U.fede, `select public.publicar_avance_en($1, 'Lo escribió Fede', null)`, [fCompartida]);
  const previaFede = (await yo(U.fede, `select empresa_slug, se_borra from public.antes_de_borrar_v2()`)).rows;
  check(
    previaFede.length === 3 && previaFede.filter((e) => e.se_borra).map((e) => e.empresa_slug).join() === "fede-sola",
    "antes_de_borrar_v2: 3 empresas, solo fede-sola se borra",
    previaFede
  );
  const resFede = (await yo(U.fede, `select public.borrar_mi_cuenta(null) r`)).rows[0].r;
  const porSlug = Object.fromEntries(resFede.empresas.map((e) => [e.slug, e.borrada]));
  check(
    resFede.empresa === "fede-sola" && resFede.empresa_borrada === true && porSlug["fede-sola"] === true && porSlug["fede-y-gabi"] === false && porSlug["gabi-y-fede"] === false,
    "devuelve cada empresa con si se borró",
    resFede
  );
  check(!(await empresaDe("fede-sola")), "la empresa donde estaba sola se borra");
  check((await valor(`select count(*)::int from public.r2_borrar where clave = $1 and borrar_despues <= now()`, [`${fSola}-a1a1a1a1.png`])) === 1, "con su logo a r2_borrar");
  check((await valor(`select dueno_id from public.empresas where id = $1`, [fCompartida])) === U.gabi, "la compartida que administraba pasa a Gabi");
  check((await valor(`select dueno_id from public.empresas where id = $1`, [gCompartida])) === U.gabi, "la otra compartida sigue con Gabi");
  const avFede = await uno(`select autor_id from public.empresa_avances where empresa_id = $1`, [fCompartida]);
  check(avFede && avFede.autor_id === null, "lo que escribió queda, sin autor", avFede);
  const rastrosFede = await rastros([U.fede, fede], ["fede@mail.com", "fede-founder"]);
  check(rastrosFede.length === 0, "no queda nada de Fede en ninguna tabla", rastrosFede);
  check((await membresias(gabi)) === 2, "Gabi sigue con sus 2 empresas");

  // -------------------------------------------------------------------------
  console.log("\n9) Rollback (supabase/rollback-multi-empresa.sql)");
  const nombresR = redefinidas();
  const textoRollback = readFileSync(join(RAIZ, ROLLBACK), "utf8");
  const faltan = nombresR.filter((n) => !new RegExp(`create or replace function public\\.${n}\\(`).test(textoRollback));
  check(nombresR.length >= 19 && faltan.length === 0, `el rollback restaura las ${nombresR.length} funciones que la migración redefine`, faltan);

  // Base de referencia: solo main.
  await base();
  const deMain = await definiciones(nombresR);
  // Base con multi_empresa, datos con varias empresas y rollback.
  await base();
  for (const [k, uid] of Object.entries(U)) await usuario(uid, `${k}@mail.com`);
  const ana2 = await alta(U.ana, "ana-startup");
  await alta(U.beto, "beto-agro");
  await yo(U.ana, `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato', null, '{agtech}', 'mvp', 'seed', 'ceo')`);
  await aplicar(MULTI);
  await crear(U.ana, "ana-dos");
  await crear(U.beto, "beto-uno");
  await yo(U.beto, `select public.unirse_empresa_v2($1)`, [await codigoDe(await empresaDe("ana-dos"))]);
  const principalAntes = await principalDe(ana2);
  const conteo = (await db.query(textoRollback.match(/select\n  count\(\*\) filter[\s\S]*?on p\.id = m\.perfil_id;/)[0])).rows[0];
  check(conteo.membresias_que_se_pierden === 2 && conteo.personas_afectadas === 2, "el rollback muestra qué se pierde (2 membresías de 2 personas)", conteo);
  await aplicar(ROLLBACK);
  check((await db.query(`select to_regclass('public.empresa_miembros') t`)).rows[0].t === null, "la tabla empresa_miembros ya no está");
  const nuevas = (
    await db.query(
      `select proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
       where s.nspname = 'public' and proname = any ($1::text[])`,
      [[
        "mis_empresas", "crear_empresa_v2", "unirse_empresa_v2", "salir_de_empresa", "elegir_empresa_principal",
        "cambiar_cargo_en", "editar_empresa_en", "renovar_codigo_en", "miembros_de_empresa", "mis_datos_en",
        "guardar_dato_en", "guardar_hito_en", "publicar_avance_en", "guardar_producto_en", "poner_imagenes_producto_en",
        "poner_logo_en", "guardar_documento_en", "relaciones_pendientes_v2", "antes_de_borrar_v2", "empresa_mia",
        "salir_interno", "borrar_empresa_entera", "empresa_miembros_tope", "empresa_miembros_principal", "perfiles_empresa_espejo",
      ]]
    )
  ).rows;
  check(nuevas.length === 0, "no queda ninguna función nueva", nuevas);
  const triggers = (await db.query(`select tgname from pg_trigger where tgname in ('perfiles_empresa_espejo', 'empresa_miembros_tope', 'empresa_miembros_principal')`)).rows;
  check(triggers.length === 0, "ni ningún trigger nuevo", triggers);
  const tras = await definiciones(nombresR);
  // Sin los \r: el fin de línea de los .sql depende de cómo git hizo el checkout.
  const igual = (x, y) => x.replace(/\r/g, "") === y.replace(/\r/g, "");
  const distintas = nombresR.filter((n) => {
    const a = deMain.filter((f) => f.n === n);
    const b = tras.filter((f) => f.n === n);
    return a.length !== b.length || a.some((f, i) => !igual(f.d, b[i].d) || f.acl !== b[i].acl);
  });
  check(distintas.length === 0 && tras.length === deMain.length, "cada función redefinida queda igual que en main (cuerpo y permisos)", distintas);
  check((await principalDe(ana2)) === principalAntes, "empresa_id (la principal) no se toca");
  const mainVe = (await yo(U.ana, `select slug, miembros from public.mi_empresa()`)).rows;
  check(mainVe.length === 1 && mainVe[0].slug === "raiz-verde" && mainVe[0].miembros === 1, "main sigue andando: mi_empresa ve su empresa", mainVe);
  await espera("y crear_empresa sigue cortando en una", () => yo(U.ana, `select public.crear_empresa('Otra', 'otra-mas', 'Otra')`), "ya tenés empresa");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
