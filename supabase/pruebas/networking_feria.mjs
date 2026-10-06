// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y prueba la
// migración networking_feria: taxonomía nueva de busca/ofrece (los valores viejos siguen
// valiendo), detalle y "cómo", intereses de networking (mismo flujo que cofundador, tope
// propio), consentimiento para la organización del evento, borrar_mi_cuenta sin rastro y el
// rollback (supabase/rollback-networking-feria.sql). No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\networking_feria.mjs .
//   node networking_feria.mjs <ruta al repo>
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
];
const NUEVA = "supabase/migrations/20261015120000_networking_feria.sql";
const ROLLBACK = "supabase/rollback-networking-feria.sql";

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
const U = { ana: u(1), beto: u(2), caro: u(3), dani: u(4), eli: u(5), fede: u(6), vieja: u(7) };

async function main() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(readFileSync(join(RAIZ, "supabase/schema.sql"), "utf8"));
  for (const m of MIGRACIONES) await aplicar(`supabase/migrations/${m}`);

  for (const [k, uid] of Object.entries(U)) {
    await sistema(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [uid, `${k}@mail.com`]);
  }
  await sistema(`update public.ajustes set autopublicar = true`);

  const alta = (uid, slug, extra = {}) => {
    const campos = {
      slug,
      nombre: "Nombre " + slug,
      tipo: "persona",
      rol: "emprendedor",
      descripcion: "Descripción",
      whatsapp: "3515550000",
      email: `${slug}@mail.com`,
      consentimiento_at: new Date().toISOString(),
      ...extra,
    };
    const cols = Object.keys(campos);
    return yo(uid, `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`, Object.values(campos))
      .then((r) => r.rows[0].id);
  };

  // Un perfil de antes, con las opciones viejas (las 6 del tope de antes).
  const VIEJAS = ["inversion", "talento", "clientes", "mentoria", "alianzas", "prensa"];
  const vieja = await alta(U.vieja, "vieja", { busca: VIEJAS, ofrece: ["networking", "empleo", "proveedores", "cofundador"] });

  await aplicar(NUEVA);

  // -------------------------------------------------------------------------
  console.log("\n1) Taxonomía");
  const v = (await sistema(`select busca, ofrece from public.perfiles where id = $1`, [vieja])).rows[0];
  check(JSON.stringify(v.busca) === JSON.stringify(VIEJAS) && v.ofrece.length === 4, "lo que ya había elegido cada persona queda igual", v);
  await yo(U.vieja, `update public.perfiles set busca = busca where usuario_id = $1`, [U.vieja]);
  bien("las 10 opciones de antes siguen valiendo (se puede volver a guardar)");
  const diez = ["inversion_angel", "capital_riesgo", "pilotos", "clientes", "mvp", "ia", "creditos_nube", "laboratorio", "universidad_empresa", "exponer"];
  await yo(U.vieja, `update public.perfiles set busca = $2 where usuario_id = $1`, [U.vieja, diez]);
  bien("se guardan 10 opciones nuevas");
  await espera("11 opciones: tope", () =>
    yo(U.vieja, `update public.perfiles set busca = $2 where usuario_id = $1`, [U.vieja, [...diez, "prensa"]]), "perfiles_busca_valido");
  await espera("una opción inventada", () =>
    yo(U.vieja, `update public.perfiles set ofrece = $2 where usuario_id = $1`, [U.vieja, ["teletransporte"]]), "perfiles_ofrece_valido");
  await yo(U.vieja, `update public.perfiles set busca_detalle = $2, ofrece_detalle = $3, busca_como = $4, ofrece_como = $5 where usuario_id = $1`,
    [U.vieja, ["Figma", "créditos de AWS"], ["Excel avanzado"], ["canje", "a_conversar"], ["pago"]]);
  bien("detalle libre y cómo se guardan");
  await espera("9 etiquetas de detalle", () =>
    yo(U.vieja, `update public.perfiles set busca_detalle = $2 where usuario_id = $1`, [U.vieja, Array.from({ length: 9 }, (_, i) => "t" + i)]), "busca_detalle");
  await espera("una etiqueta de más de 30 caracteres", () =>
    yo(U.vieja, `update public.perfiles set ofrece_detalle = $2 where usuario_id = $1`, [U.vieja, ["x".repeat(31)]]), "ofrece_detalle");
  await espera("una etiqueta vacía", () =>
    yo(U.vieja, `update public.perfiles set ofrece_detalle = $2 where usuario_id = $1`, [U.vieja, ["  "]]), "ofrece_detalle");
  await espera("un cómo fuera de lista", () =>
    yo(U.vieja, `update public.perfiles set busca_como = $2 where usuario_id = $1`, [U.vieja, ["trueque"]]), "busca_como");
  check((await anon(`select busca_detalle, ofrece_como from public.perfiles where slug = 'vieja'`)).rows.length === 1, "anon lee el detalle y el cómo (son parte del perfil público)");

  // -------------------------------------------------------------------------
  console.log("\n2) Intereses de networking");
  const ana = await alta(U.ana, "ana", { busca: ["clientes"], ofrece: ["mentoria"] });
  const beto = await alta(U.beto, "beto", { rol: "inversor", busca: ["pilotos"], ofrece: ["inversion_angel"] });
  const caro = await alta(U.caro, "caro", { rol: "aliado", ofrece: ["contable"] });
  const dani = await alta(U.dani, "dani", { busca: ["empleo"] });
  const eli = await alta(U.eli, "eli"); // sin busca ni ofrece
  const fede = await alta(U.fede, "fede", { busca: ["prensa"] });

  const interesar = (uid, a, msg = "", ev = null) => yo(uid, "select public.networking_interesar($1, $2, $3) r", [a, msg, ev]).then((r) => r.rows[0].r);
  const responder = (uid, de, si) => yo(uid, "select public.networking_responder($1, $2) r", [de, si]).then((r) => r.rows[0].r);
  const conexiones = (uid) => yo(uid, "select * from public.mis_networking_conexiones()").then((r) => r.rows);
  const retirar = (uid, a) => yo(uid, "select public.networking_retirar($1)", [a]);
  const fila = async (de, a) => (await sistema("select * from public.networking_intereses where de = $1 and a = $2", [de, a])).rows[0];

  check((await interesar(U.ana, beto, "Hola, busco pilotos", "feria-21")) === "pendiente", "ana muestra interés en beto (todos los roles)");
  const f1 = await fila(ana, beto);
  check(f1.evento_id === (await valor(`select id from public.eventos where slug = 'feria-21'`)), "guarda el evento (Feria 21)", f1);
  check((await interesar(U.ana, beto)) === "ya_enviado", "dos veces: ya_enviado");
  let cb = await conexiones(U.beto);
  check(cb.length === 1 && cb[0].tipo === "recibido" && cb[0].mensaje === "Hola, busco pilotos" && cb[0].whatsapp === null && cb[0].email === null,
    "beto lo ve recibido, con mensaje y sin contacto", cb);
  check((await responder(U.beto, ana, true)) === "aceptado", "beto acepta");
  cb = await conexiones(U.beto);
  check(cb.length === 1 && cb[0].tipo === "match" && cb[0].whatsapp === "3515550000" && cb[0].email === "ana@mail.com", "con match viene el contacto", cb);
  check((await conexiones(U.ana))[0]?.tipo === "match", "ana también ve el match");

  check((await interesar(U.caro, ana)) === "pendiente", "caro (solo ofrece) muestra interés en ana");
  check((await interesar(U.ana, caro, "Dale")) === "match", "si ana también la elige, es match inmediato");
  const mc = await conexiones(U.caro);
  check(mc.length === 1 && mc[0].tipo === "match", "el match aparece una sola vez", mc);
  check((await fila(ana, caro)).evento_id === null, "sin evento: toda la plataforma");

  check((await interesar(U.dani, ana, "Hola")) === "pendiente", "dani muestra interés en ana");
  check((await responder(U.ana, dani, false)) === "rechazado", "ana pasa");
  check((await fila(dani, ana)).mensaje === "", "al pasar se vacía el mensaje");
  check((await interesar(U.dani, ana)) === "rechazado", "no se vuelve a pedir");
  check((await conexiones(U.dani)).length === 0, "'pasó' no se muestra");
  await espera("responder algo que no existe", () => responder(U.ana, dani, true), "no hay un interés pendiente");

  check((await interesar(U.fede, dani, "Buenas")) === "pendiente", "fede muestra interés en dani");
  await retirar(U.fede, dani);
  const fr = await fila(fede, dani);
  check(fr.estado === "retirado" && fr.mensaje === "", "retirar deja la fila sin mensaje", fr);
  check((await interesar(U.fede, dani)) === "retirado", "lo retirado no se vuelve a pedir");
  check((await conexiones(U.dani)).length === 0, "dani ya no lo ve");

  await espera("sin busca ni ofrece no se muestra interés", () => interesar(U.eli, ana), "qué buscás y qué ofrecés");
  await espera("a quien no tiene busca ni ofrece", () => interesar(U.ana, eli), "no está haciendo networking");
  await espera("a uno mismo", () => interesar(U.ana, ana), "inválido");
  await espera("mensaje de más de 280", () => interesar(U.fede, beto, "x".repeat(281)), "muy largo");
  await yo(U.fede, `update public.perfiles set oculto = true where usuario_id = $1`, [U.fede]);
  await espera("con el perfil oculto no se muestra interés", () => interesar(U.fede, beto), "qué buscás");
  await yo(U.fede, `update public.perfiles set oculto = false where usuario_id = $1`, [U.fede]);
  await espera("anon no muestra interés", () => anon("select public.networking_interesar($1)", [ana]), "permission denied");
  await espera("anon no lee conexiones", () => anon("select * from public.mis_networking_conexiones()"), "permission denied");
  await espera("nadie lee la tabla directo", () => yo(U.ana, "select * from public.networking_intereses"), "permission denied");
  await espera("nadie escribe la tabla directo", () => yo(U.ana, "insert into public.networking_intereses (de, a) values ($1, $2)", [ana, fede]), "permission denied");

  // Tope propio: 20 por día. Los de cofundador no cuentan.
  await sistema(`update public.perfiles set busca_cofundador = true, cofundador_aporta = 'producto', cofundador_busca = '{tecnico}' where id = $1`, [fede]);
  const rellenos = [];
  for (let i = 0; i < 20; i++) {
    const uid = (await sistema(`insert into auth.users (email) values ($1) returning id`, [`relleno-${i}@mail.com`])).rows[0].id;
    const r = (await sistema(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at, publicado, busca, busca_cofundador, cofundador_aporta, usuario_id)
       values ($1, 'Relleno', 'persona', 'emprendedor', 'x', now(), true, '{clientes}', true, 'tecnico', $2) returning id`,
      ["relleno-" + i, uid]
    )).rows[0].id;
    rellenos.push(r);
  }
  for (let i = 0; i < 18; i++) await sistema(`insert into public.cofundador_intereses (de, a) values ($1, $2)`, [fede, rellenos[i]]);
  for (let i = 0; i < 18; i++) await sistema(`insert into public.networking_intereses (de, a) values ($1, $2)`, [fede, rellenos[i]]);
  // fede ya tenía 2 de hoy (a dani, retirado) + 18 = 19. El 20 entra.
  check((await interesar(U.fede, rellenos[18])) === "pendiente", "el 20 del día entra (los de cofundador no cuentan)");
  await espera("el 21 se frena", () => interesar(U.fede, rellenos[19]), "mucho interés hoy");
  check((await valor(`select count(*)::int from public.networking_intereses where de = $1 and estado = 'retirado'`, [fede])) === 1, "lo retirado sigue contando para el tope");
  check((await yo(U.fede, "select public.cofundador_interesar($1) r", [rellenos[19]])).rows[0].r === "pendiente",
    "el tope de cofundador es aparte: con 18 de cofundador hoy, puede pedir otro");

  // -------------------------------------------------------------------------
  console.log("\n3) Consentimiento para la organización");
  const cons = (uid) => yo(uid, "select * from public.mi_consentimiento_evento('feria-21')").then((r) => r.rows);
  check((await cons(U.ana)).length === 0, "sin elección, no hay fila");
  await yo(U.ana, "select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')");
  let c = await cons(U.ana);
  check(c.length === 1 && c[0].acepta === true && c[0].version === "u21-v1" && c[0].decidido_at, "acepta, con versión y fecha", c);
  const primera = c[0].decidido_at;
  await sistema(`update public.evento_consentimientos set decidido_at = now() - interval '1 hour'`);
  await yo(U.ana, "select public.guardar_consentimiento_evento('feria-21', false, 'u21-v1')");
  c = await cons(U.ana);
  check(c.length === 1 && c[0].acepta === false && new Date(c[0].decidido_at) >= new Date(primera), "retirarlo guarda acepta = false con la fecha nueva", c);
  await espera("evento inexistente", () => yo(U.ana, "select public.guardar_consentimiento_evento('otro', true, 'u21-v1')"), "evento inválido");
  await espera("versión con caracteres raros", () => yo(U.ana, "select public.guardar_consentimiento_evento('feria-21', true, 'V 1!')"), "version_valida");
  await espera("anon no guarda", () => anon("select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')"), "permission denied");
  await espera("anon no lee", () => anon("select * from public.mi_consentimiento_evento('feria-21')"), "permission denied");
  await espera("nadie lee la tabla directo", () => yo(U.ana, "select * from public.evento_consentimientos"), "permission denied");
  check((await cons(U.beto)).length === 0, "cada persona ve solo lo suyo");
  await espera("sin perfil no se guarda", async () => {
    await sistema(`insert into auth.users (id, email) values ('99999999-9999-4999-8999-999999999999', 'x@mail.com')`);
    await yo("99999999-9999-4999-8999-999999999999", "select public.guardar_consentimiento_evento('feria-21', true, 'u21-v1')");
  }, "primero creá tu perfil");

  // -------------------------------------------------------------------------
  console.log("\n4) Cofundador sin cambios");
  check((await valor(`select count(*)::int from information_schema.columns where table_name = 'cofundador_intereses'`)) === 6, "cofundador_intereses tiene las mismas columnas");
  check((await valor(`select pg_get_function_identity_arguments('public.cofundador_interesar'::regproc)`)) === "p_a uuid, p_mensaje text", "cofundador_interesar con la misma firma");

  // -------------------------------------------------------------------------
  console.log("\n5) borrar_mi_cuenta sin rastro");
  await yo(U.ana, "select public.borrar_mi_cuenta()");
  check((await valor(`select count(*)::int from public.networking_intereses where de = $1 or a = $1`, [ana])) === 0, "no quedan intereses de networking (enviados ni recibidos)");
  check((await valor(`select count(*)::int from public.evento_consentimientos where perfil_id = $1`, [ana])) === 0, "no queda el consentimiento");
  check((await conexiones(U.beto)).length === 0, "beto ya no ve el match con ana");

  // -------------------------------------------------------------------------
  console.log("\n6) Rollback");
  await sistema(`update public.perfiles set busca = $2, ofrece = $3 where id = $1`,
    [vieja, ["inversion_angel", "capital_riesgo", "pilotos", "mvp", "ia", "laboratorio", "universidad_empresa", "exponer", "prensa", "empleo"], ["contable", "mentoria"]]);
  await aplicar(ROLLBACK);
  const r = (await sistema(`select busca, ofrece from public.perfiles where id = $1`, [vieja])).rows[0];
  check(JSON.stringify(r.busca) === JSON.stringify(["inversion", "clientes", "talento", "proveedores", "alianzas", "networking"]),
    "las opciones nuevas pasan a la vieja de su categoría, sin repetir y hasta 6", r.busca);
  check(JSON.stringify(r.ofrece) === JSON.stringify(["mentoria"]), "sin repetidos", r.ofrece);
  check((await valor(`select count(*)::int from public.perfiles where cardinality(busca) > 6 or cardinality(ofrece) > 6`)) === 0, "nadie queda con más de 6");
  await espera("vuelve la regla de antes", () =>
    yo(U.beto, `update public.perfiles set busca = '{pilotos}' where usuario_id = $1`, [U.beto]), "perfiles_busca_valido");
  check((await valor(`select count(*)::int from information_schema.columns where table_name = 'perfiles' and column_name in ('busca_detalle', 'ofrece_detalle', 'busca_como', 'ofrece_como')`)) === 0, "sin las columnas nuevas");
  check((await valor(`select count(*)::int from pg_proc where proname in ('networking_interesar', 'networking_responder', 'networking_retirar', 'mis_networking_conexiones', 'mi_consentimiento_evento', 'guardar_consentimiento_evento', 'necesidades_validas', 'etiquetas_cortas_validas')`)) === 0, "sin las funciones nuevas");
  check((await valor(`select count(*)::int from information_schema.tables where table_name in ('networking_intereses', 'evento_consentimientos')`)) === 0, "sin las tablas nuevas");
  await aplicar(NUEVA);
  bien("se vuelve a aplicar la migración");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
