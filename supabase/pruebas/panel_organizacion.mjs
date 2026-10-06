// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba
// el panel de la organización (/organizacion): solo emails habilitados y admins; números sin el
// equipo, matches por par, y con nombre SOLO quienes aceptaron compartir (retirar los saca al
// instante). Ni mensajes ni quién con quién. No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\networking_admin.mjs .
//   node networking_admin.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261016120000_panel_organizacion.sql";

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
const U = { ana: u(1), beto: u(2), caro: u(3), dani: u(4), admin: u(5), rector: u(6), curioso: u(7) };


async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);
  await aplicar(NUEVA);

  const EMAIL = { admin: "admin@mail.com", rector: "rector@siglo21.edu.ar", curioso: "curioso@mail.com" };
  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, EMAIL[k] ?? `${k}@mail.com`]);
  }
  await sistema(`update public.ajustes set autopublicar = true`);
  await sistema(`insert into public.admins (email) values ('admin@mail.com')`);

  const alta = (uid, slug, extra = {}) => {
    const campos = { slug, nombre: "Nombre " + slug, tipo: "persona", rol: "emprendedor", descripcion: "Descripción",
      whatsapp: "3515550000", email: `${slug}@mail.com`, consentimiento_at: new Date().toISOString(), ...extra };
    const cols = Object.keys(campos);
    return yo(uid, `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`, Object.values(campos))
      .then((r) => r.rows[0].id);
  };
  const ana = await alta(U.ana, "ana", { busca: ["clientes", "mentoria"], ofrece: ["desarrollo"], busca_como: ["canje"] });
  const beto = await alta(U.beto, "beto", { rol: "inversor", busca: ["pilotos"], ofrece: ["inversion_angel", "mentoria"] });
  const caro = await alta(U.caro, "caro", { rol: "aliado", ofrece: ["contable"] });
  const dani = await alta(U.dani, "dani", { busca: ["empleo"], ofrece: ["colaboracion"] });
  const adminPerfil = await alta(U.admin, "equipo-admin", { busca: ["prensa"], ofrece: ["networking"] });
  for (const uid of [U.ana, U.beto, U.caro, U.dani, U.admin]) await yo(uid, "select public.participar_evento('feria-21', true)");

  const interesar = (uid, a) => yo(uid, "select public.networking_interesar($1, 'Hola, secreto', 'feria-21') r", [a]).then((r) => r.rows[0].r);
  await interesar(U.ana, beto);
  await yo(U.beto, "select public.networking_responder($1, true)", [ana]);
  await interesar(U.caro, ana);
  await interesar(U.ana, caro); // match inmediato: dos filas, un par
  await interesar(U.dani, ana);
  await yo(U.ana, "select public.networking_responder($1, false)", [dani]);
  await interesar(U.admin, ana); // del equipo: no cuenta
  await yo(U.beto, "select public.networking_interesar($1, '', null)", [dani]); // sin evento: no es de la feria

  await yo(U.ana, "select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')");
  await yo(U.beto, "select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')");
  await yo(U.caro, "select public.guardar_consentimiento_evento('feria-21', false, 'u21-v1')");
  await yo(U.admin, "select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')");

  const panel = (uid) => yo(uid, "select public.organizacion_networking('feria-21') r").then((r) => r.rows[0].r);
  const puede = (uid) => yo(uid, "select public.puede_ver_organizacion('feria-21') r").then((r) => r.rows[0].r);

  // -------------------------------------------------------------------------
  console.log("\n1) Acceso");
  check((await puede(U.rector)) === false, "un email no habilitado no puede");
  await espera("y no ve el panel", () => panel(U.rector), "no autorizado");
  await espera("anon no lo llama", () => anon("select public.organizacion_networking('feria-21')"), "permission denied");
  await espera("una persona común no habilita emails", () =>
    yo(U.ana, "select public.admin_organizador('feria-21', 'rector@siglo21.edu.ar', true)"), "no autorizado");
  await yo(U.admin, "select public.admin_organizador('feria-21', '  Rector@Siglo21.edu.ar ', true)");
  check((await yo(U.admin, "select * from public.admin_organizadores('feria-21')")).rows.map((r) => r.email).join() === "rector@siglo21.edu.ar",
    "el admin lo habilita (en minúsculas, sin espacios)");
  await yo(U.admin, "select public.admin_organizador('feria-21', 'rector@siglo21.edu.ar', true)");
  bien("habilitarlo dos veces no falla");
  await espera("email inválido", () => yo(U.admin, "select public.admin_organizador('feria-21', 'no-es-email', true)"), "email inválido");
  await espera("la Universidad no ve la lista de emails", () => yo(U.rector, "select * from public.admin_organizadores('feria-21')"), "no autorizado");
  await espera("nadie lee la tabla directo", () => yo(U.admin, "select * from public.evento_organizadores"), "permission denied");
  check((await puede(U.rector)) === true && (await puede(U.admin)) === true && (await puede(U.curioso)) === false,
    "entran el email habilitado y los admins; nadie más");
  check((await puede(U.rector)) === true && (await yo(U.rector, "select public.es_admin() r")).rows[0].r === false,
    "la Universidad no es admin (no entra al resto de /admin)");
  await espera("la Universidad no llama funciones de admin", () => yo(U.rector, "select public.admin_resumen()"), "no autorizado");
  await espera("con otro evento, no", () => yo(U.rector, "select public.organizacion_networking('otro-evento')"), "no autorizado");

  // -------------------------------------------------------------------------
  console.log("\n2) Números (sin el equipo, solo la feria)");
  const p = await panel(U.rector);
  check(p.personas === 4, "4 personas de la feria (sin el admin)", p.personas);
  check(p.completos === 3 && p.con_busca === 3 && p.con_ofrece === 4, "busca y ofrece completos", p);
  check(p.intereses === 4, "4 intereses de la feria (sin el del equipo ni el de toda la plataforma)", p.intereses);
  check(p.matches === 2, "2 matches contados por par", p.matches);
  check(p.rechazados === 1 && p.pendientes === 0, "pasados y pendientes", p);
  check(p.busca.clientes === 1 && p.ofrece.mentoria === 1 && !p.busca.prensa, "lo más buscado y ofrecido, sin el equipo", [p.busca, p.ofrece]);
  check(p.busca_como.canje === 1, "el cómo");
  check(p.por_dia.length === 1 && p.por_dia[0].intereses === 4, "por día", p.por_dia);
  check(p.por_roles.some((r) => r.de === "emprendedor" && r.a === "inversor" && r.intereses === 1), "entre roles", p.por_roles);
  check(p.consentimiento.aceptan === 2 && p.consentimiento.retiraron === 1 && p.consentimiento.sin_decidir === 1, "consentimiento en números", p.consentimiento);

  // -------------------------------------------------------------------------
  console.log("\n3) Con nombre, solo quienes aceptaron");
  check(p.consentidos.map((c) => c.slug).join() === "ana,beto", "ana y beto (caro no aceptó, el admin es del equipo)", p.consentidos.map((c) => c.slug));
  const a = p.consentidos[0];
  check(JSON.stringify(a.busca) === JSON.stringify(["clientes", "mentoria"]) && a.participa === true && a.acepto_at, "su perfil público y lo que busca y ofrece", a);
  const texto = JSON.stringify(p);
  check(!texto.includes("secreto"), "ningún mensaje");
  check(!texto.includes("@mail.com") && !texto.includes("3515550000"), "ni emails ni teléfonos");
  check(!texto.includes("\"de\":\"" + ana) && !texto.includes(ana), "ni ids: nada de quién con quién");
  check(p.sin_completar === null && p.es_admin === false, "la Universidad no ve quién no completó");
  const pa = await panel(U.admin);
  check(Array.isArray(pa.sin_completar) && pa.sin_completar.map((s) => s.slug).join() === "caro" && pa.sin_completar[0].falta === "busca",
    "el admin sí, para empujar en el stand", pa.sin_completar);

  await yo(U.beto, "select public.guardar_consentimiento_evento('feria-21', false, 'u21-v1')");
  check((await panel(U.rector)).consentidos.map((c) => c.slug).join() === "ana", "retirar el consentimiento lo saca al instante");
  await yo(U.ana, `update public.perfiles set oculto = true where usuario_id = $1`, [U.ana]);
  check((await panel(U.rector)).consentidos.length === 0, "con el perfil oculto tampoco aparece");
  await yo(U.ana, `update public.perfiles set oculto = false where usuario_id = $1`, [U.ana]);

  // -------------------------------------------------------------------------
  console.log("\n4) Sacar el acceso y borrar la cuenta");
  await yo(U.admin, "select public.admin_organizador('feria-21', 'rector@siglo21.edu.ar', false)");
  check((await puede(U.rector)) === false, "sacado el email, ya no entra");
  await yo(U.admin, "select public.admin_organizador('feria-21', 'rector@siglo21.edu.ar', true)");
  await yo(U.ana, "select public.borrar_mi_cuenta()");
  const p2 = await panel(U.rector);
  check(p2.consentidos.length === 0 && p2.personas === 3, "borrar la cuenta la saca de todo", p2.personas);

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
