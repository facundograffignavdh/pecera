// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración borrar_cuenta (borrar_mi_cuenta, guardianes contra pitches que
// resucitan, empresa sola o compartida, originales de Drive en /admin) con roles y
// JWT simulados (como PostgREST de Supabase). No toca ninguna base real. Mismo armado
// que feria_pro.mjs.
//
// La ingesta (vieja y nueva) se simula con lo que escribe con la service key: upsert
// de `ingestas` y `envios` y upsert del pitch por origen_id.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\borrar_cuenta.mjs .
//   node borrar_cuenta.mjs <ruta al repo>
// Tiene que terminar en "N ok · 0 fallas". Si agregás una migración, sumala a MIGRACIONES.
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
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
  "20261004120000_dataroom.sql",
  "20261005120000_portfolio.sql",
  "20261006120000_logos.sql",
  "20261007120000_feria_pro.sql",
  "20261008120000_borrar_cuenta.sql",
];

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

// Lo que escribe la ingesta con la service key (db.ts): registrar, guardarEnvio, guardarPitch.
const ingesta = {
  registrar: (origen, estado, intentosPrevios, bytes) =>
    como(
      "service_role",
      null,
      `insert into public.ingestas (origen_id, estado, error, intentos, bytes, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (origen_id) do update set estado = excluded.estado, error = excluded.error,
         intentos = excluded.intentos, bytes = excluded.bytes, updated_at = excluded.updated_at`,
      [origen, estado, estado === "error" ? "falló" : null, intentosPrevios + 1, bytes]
    ),
  envio: (origen, verificado, escrito, estado, regla, perfil) =>
    como(
      "service_role",
      null,
      `insert into public.envios (origen_id, email_verificado, email_escrito, fecha, estado, regla, perfil_id, updated_at)
       values ($1, $2, $3, now() - interval '1 day', $4, $5, $6, now())
       on conflict (origen_id) do update set email_verificado = excluded.email_verificado,
         email_escrito = excluded.email_escrito, estado = excluded.estado, regla = excluded.regla,
         perfil_id = excluded.perfil_id, updated_at = excluded.updated_at`,
      [origen, verificado, escrito, estado, regla, perfil]
    ),
  pitch: (perfil, origen) =>
    como(
      "service_role",
      null,
      `insert into public.pitches (perfil_id, origen_id, video_url, poster_url, orden, descripcion, publicado)
       values ($1, $2, $2 || '-0a0a0a0a.mp4', $2 || '-0b0b0b0b.jpg', 1, 'Pitch', true)
       on conflict (origen_id) do update set perfil_id = excluded.perfil_id, video_url = excluded.video_url,
         poster_url = excluded.poster_url, publicado = true
       returning id`,
      [perfil, origen]
    ),
};

/**
 * Busca rastros: cualquier columna uuid de public o auth con alguno de `ids`, y
 * cualquier columna de texto con alguno de `textos`. Devuelve "tabla.columna" de cada hallazgo.
 * `emails_bloqueados` queda afuera: se mantiene a propósito (borrar no saltea un bloqueo).
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
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to service_role;
    grant execute on function public.ingesta_cuentas(text[]) to service_role;
  `);

  const U = {
    ana: "11111111-1111-4111-8111-111111111111",
    beto: "22222222-2222-4222-8222-222222222222",
    caro: "33333333-3333-4333-8333-333333333333",
    dani: "44444444-4444-4444-8444-444444444444",
    admin: "55555555-5555-4555-8555-555555555555",
  };
  const DISPO = {
    ana: "aaaaaaaa-0000-4000-8000-000000000001",
    otro: "aaaaaaaa-0000-4000-8000-000000000002",
  };
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${U.ana}', 'Ana@Mail.com', now()), ('${U.beto}', 'beto@mail.com', now()),
      ('${U.caro}', 'caro@mail.com', now()), ('${U.dani}', 'dani@mail.com', now()),
      ('${U.admin}', 'admin@mail.com', now());
    insert into public.admins (email) values ('admin@mail.com'), ('ana@mail.com');
    insert into public.equipo_ingesta (email) values ('dani@mail.com'), ('ana@mail.com');
    insert into public.emails_bloqueados (email, motivo) values ('ana@mail.com', 'prueba');
    update public.ajustes set autopublicar = true;
  `);

  const alta = async (uid, slug, extra = {}) => {
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
    const r = await como(
      "authenticated",
      uid,
      `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`,
      Object.values(campos)
    );
    return r.rows[0].id;
  };
  const empresaDe = async (slug) => valor(`select id from public.empresas where slug = $1`, [slug]);

  // -------------------------------------------------------------------------
  console.log("\n0) Armado: Ana con todo, Beto y Caro con empresa compartida");
  const ana = await alta(U.ana, "ana-startup");
  await db.query(`update public.perfiles set avatar_url = $1 where id = $2`, [`${U.ana}-a1a1a1a1.jpg`, ana]);
  // Foto anterior que todavía esperaba su hora.
  await db.query(`insert into public.r2_borrar (clave, bytes, borrar_despues) values ($1, 10, now() + interval '1 hour')`, [
    `${U.ana}-a0a0a0a0.jpg`,
  ]);

  await como("authenticated", U.ana, `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato', null, '{agtech}', 'mvp', 'seed', 'ceo')`);
  const raiz = await empresaDe("raiz-verde");
  await como("authenticated", U.ana, `select public.poner_logo_empresa($1)`, [`${raiz}-c1c1c1c1.png`]);
  await como("authenticated", U.ana, `select public.cambiar_logo_empresa($1)`, [`empresa-${raiz}-c2c2c2c2.jpg`]);
  await como(
    "authenticated",
    U.ana,
    `select public.guardar_producto('producto', 'Sustrato', 'Para cultivar', null, null, null, '{}', null, null)`
  );
  await como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [[`${raiz}-d1d1d1d1.jpg`, `${raiz}-d2d2d2d2.jpg`]]);
  await db.exec(
    `insert into public.empresa_hitos (empresa_id, titulo, estado, autor_id) values ($1, 'Primer cliente', 'logrado', $2);
     insert into public.empresa_avances (empresa_id, autor_id, texto) values ($1, $2, 'Arrancamos');
     insert into public.empresa_datos (empresa_id, clave, valor) values ($1, 'mrr', '100');
     insert into public.empresa_documentos (empresa_id, categoria, tipo, titulo, cuerpo, autor_id)
       values ($1, 'empresa', 'escrito', 'Visión', 'Texto', $2);`.replaceAll("$1", `'${raiz}'`).replaceAll("$2", `'${ana}'`)
  );

  // Pitch publicado por la ingesta (Form nuevo) + otro envío todavía en espera.
  await ingesta.envio("drvA1", "ana@mail.com", "ana@mail.com", "recibido", "mismo_email", ana);
  const pitchAna = (await ingesta.pitch(ana, "drvA1")).rows[0].id;
  await ingesta.registrar("drvA1", "ok", 0, 5000);
  await ingesta.envio("drvA1", "ana@mail.com", "ana@mail.com", "ok", "mismo_email", ana);
  await ingesta.envio("drvA2", "dani@mail.com", "ana@mail.com", "en_espera", "equipo_espera", null);

  // Datos del perfil (todos por cascada).
  await db.exec(`
    insert into public.perfil_newsletter (perfil_id, url) values ('${ana}', 'https://ana.substack.com');
    insert into public.portafolio (perfil_id, tipo, titulo, url) values ('${ana}', 'prensa', 'Nota', 'https://diario.com/x');
    insert into public.portfolio (perfil_id, tipo, nombre) values ('${ana}', 'mentoria', 'Otra');
    insert into public.perfil_servicios (perfil_id, nombre) values ('${ana}', 'Mentoría');
    insert into public.perfil_tesis (perfil_id, texto) values ('${ana}', 'Agro');
    insert into public.seguidos (perfil_id, dispositivo) values ('${ana}', '${DISPO.otro}');
    insert into public.piques (pitch_id, dispositivo) values ('${pitchAna}', '${DISPO.otro}');
    insert into public.vistas (pitch_id, dispositivo) values ('${pitchAna}', '${DISPO.otro}');
    insert into public.contactos (perfil_id, pitch_id, canal, dispositivo) values ('${ana}', '${pitchAna}', 'email', '${DISPO.otro}');
    insert into public.empresas_intentos (usuario, ventana, intentos) values ('${U.ana}', now(), 1);
  `);

  // Beto y Caro: empresa compartida (Beto es el dueño). Beto tiene un pitch.
  const beto = await alta(U.beto, "beto-agro");
  const caro = await alta(U.caro, "caro-agro");
  await como("authenticated", U.beto, `select public.crear_empresa('Agro Uno', 'agro-uno', 'Agro', null, '{agtech}', 'mvp', 'seed', 'ceo')`);
  const agro = await empresaDe("agro-uno");
  const codigo = await valor(`select codigo from public.empresas_codigos where empresa_id = $1`, [agro]);
  await como("authenticated", U.caro, `select public.unirse_empresa($1, 'cto')`, [codigo]);
  await como("authenticated", U.beto, `select public.poner_logo_empresa($1)`, [`${agro}-e1e1e1e1.png`]);
  await db.query(
    `insert into public.empresa_avances (empresa_id, autor_id, texto) values ('${agro}', '${beto}', 'Escrito por Beto')`
  );
  await ingesta.envio("drvB1", "beto@mail.com", "beto@mail.com", "ok", "mismo_email", beto);
  await ingesta.pitch(beto, "drvB1");
  await ingesta.registrar("drvB1", "ok", 0, 3000);
  // Un envío que Ana escribió a su nombre pero quedó en el perfil de Beto: es de Beto.
  await ingesta.envio("drvB9", "beto@mail.com", "ana@mail.com", "ok", "respaldo_verificado", beto);

  // Votación: Ana vota a Beto, Caro vota a Ana. Ana participa.
  await db.query(`update public.eventos set votacion_abierta = true where slug = 'feria-21'`);
  const evento = await valor(`select id from public.eventos where slug = 'feria-21'`);
  await db.exec(`
    insert into public.evento_participantes (evento_id, perfil_id) values ('${evento}', '${ana}'), ('${evento}', '${beto}');
    insert into public.votos (evento_id, votante, perfil_id) values ('${evento}', '${U.ana}', '${beto}'), ('${evento}', '${U.caro}', '${ana}');
  `);

  // Lo que Ana hizo desde su navegador.
  await db.exec(`
    insert into public.piques (pitch_id, dispositivo) values ((select id from public.pitches where origen_id = 'drvB1'), '${DISPO.ana}');
    insert into public.vistas (pitch_id, dispositivo) values ((select id from public.pitches where origen_id = 'drvB1'), '${DISPO.ana}');
    insert into public.seguidos (perfil_id, dispositivo) values ('${beto}', '${DISPO.ana}');
    insert into public.contactos (perfil_id, canal, dispositivo) values ('${beto}', 'web', '${DISPO.ana}');
    insert into public.piques_frecuencia (dispositivo, ventana, acciones) values ('${DISPO.ana}', now(), 1);
  `);
  bien("datos armados");

  // -------------------------------------------------------------------------
  console.log("\n1) Permisos");
  await espera("anon no puede borrar", () => como("anon", null, `select public.borrar_mi_cuenta(null)`), "permission denied");
  await espera("sin sesión no se borra nada", () => como("authenticated", null, `select public.borrar_mi_cuenta(null)`), "sin sesión");
  await espera(
    "authenticated no lee origenes_borrados",
    () => como("authenticated", U.beto, `select * from public.origenes_borrados`),
    "permission denied"
  );
  await espera(
    "authenticated no lee emails_borrados",
    () => como("authenticated", U.beto, `select * from public.emails_borrados`),
    "permission denied"
  );
  await espera(
    "un no-admin no ve los originales de Drive",
    () => como("authenticated", U.beto, `select * from public.admin_originales_drive()`),
    "no autorizado"
  );

  // -------------------------------------------------------------------------
  console.log("\n2) Pantalla de confirmación (antes_de_borrar)");
  const previaAna = (await como("authenticated", U.ana, `select * from public.antes_de_borrar()`)).rows[0];
  check(
    previaAna.empresa_slug === "raiz-verde" && previaAna.otros_miembros === 0 && previaAna.pitches === 1,
    "Ana: única integrante de Raíz Verde, 1 pitch",
    previaAna
  );
  const previaBeto = (await como("authenticated", U.beto, `select * from public.antes_de_borrar()`)).rows[0];
  check(previaBeto.otros_miembros === 1, "Beto: la empresa tiene 1 integrante más", previaBeto);
  await espera("anon no puede usarla", () => como("anon", null, `select * from public.antes_de_borrar()`), "permission denied");

  // -------------------------------------------------------------------------
  console.log("\n3) Ana borra su cuenta (única integrante de su empresa)");
  const resAna = (await como("authenticated", U.ana, `select public.borrar_mi_cuenta($1) r`, [DISPO.ana])).rows[0].r;
  check(
    resAna.perfil === "ana-startup" && resAna.empresa === "raiz-verde" && resAna.empresa_borrada === true,
    "devuelve los slugs para revalidar",
    resAna
  );

  const quedan = await rastros(
    [U.ana, ana, raiz, DISPO.ana, pitchAna],
    ["ana@mail.com", "Ana@Mail.com", "ana-startup", "raiz-verde"]
  );
  check(quedan.length === 0, "no queda ninguna fila con su id, perfil, empresa, pitch, dispositivo, email ni slug", quedan);
  check(
    (await valor(`select count(*)::int from public.votos where perfil_id = '${beto}'`)) === 0,
    "el voto que dio Ana ya no cuenta"
  );

  const r2 = Object.fromEntries(
    (await db.query(`select clave, bytes, borrar_despues <= now() vence from public.r2_borrar`)).rows.map((f) => [f.clave, f])
  );
  const esperadas = [
    "drvA1-0a0a0a0a.mp4",
    "drvA1-0b0b0b0b.jpg",
    `${U.ana}-a1a1a1a1.jpg`,
    `${U.ana}-a0a0a0a0.jpg`,
    `${raiz}-c1c1c1c1.png`,
    `empresa-${raiz}-c2c2c2c2.jpg`,
    `${raiz}-d1d1d1d1.jpg`,
    `${raiz}-d2d2d2d2.jpg`,
  ];
  const faltan = esperadas.filter((k) => !r2[k] || !r2[k].vence);
  check(faltan.length === 0, "todas sus claves de R2 van a r2_borrar con borrar_despues = ahora", faltan);
  check(Number(r2["drvA1-0a0a0a0a.mp4"]?.bytes) === 5000, "los bytes de la ingesta pasan al video (tope de 8 GB)", r2["drvA1-0a0a0a0a.mp4"]);
  check(!r2[`${agro}-e1e1e1e1.png`], "el logo de otra empresa no se toca");
  check(!r2["drvB1-0a0a0a0a.mp4"], "el pitch de Beto no se toca");

  const ing = Object.fromEntries((await db.query(`select * from public.ingestas`)).rows.map((f) => [f.origen_id, f]));
  check(
    ing.drvA1?.estado === "borrado" && ing.drvA1.intentos >= 1000 && Number(ing.drvA1.bytes) === 0,
    "ingestas del pitch: 'borrado', intentos 1000, sin bytes",
    ing.drvA1
  );
  check(ing.drvA2?.estado === "borrado" && ing.drvA2.intentos >= 1000, "el envío en espera también tiene su fila 'borrado'", ing.drvA2);
  check(ing.drvB1?.estado === "ok", "la ingesta de Beto sigue ok");

  const env = Object.fromEntries((await db.query(`select * from public.envios`)).rows.map((f) => [f.origen_id, f]));
  check(
    ["drvA1", "drvA2"].every(
      (o) => env[o]?.estado === "borrado" && env[o].email_escrito === "" && env[o].email_verificado === "" && env[o].perfil_id === null
    ),
    "envíos de Ana: 'borrado', sin emails y sin perfil (no se borran)",
    [env.drvA1, env.drvA2]
  );
  check(
    env.drvB9?.estado === "ok" && env.drvB9.perfil_id === beto && env.drvB9.email_escrito === "" && env.drvB9.email_verificado === "beto@mail.com",
    "el envío que quedó en el perfil de Beto es de Beto: se queda, sin el email de Ana",
    env.drvB9
  );

  const origenes = (await db.query(`select origen_id from public.origenes_borrados order by 1`)).rows.map((f) => f.origen_id);
  check(JSON.stringify(origenes) === '["drvA1","drvA2"]', "origenes_borrados: solo los IDs de Drive de Ana", origenes);

  const hash = createHash("sha256").update("ana@mail.com").digest("hex");
  check((await valor(`select count(*)::int from public.emails_borrados where email_hash = $1`, [hash])) === 1, "emails_borrados: sha256 del email en minúsculas (igual que en Node)");
  check((await valor(`select count(*)::int from public.emails_bloqueados where email = 'ana@mail.com'`)) === 1, "emails_bloqueados se mantiene");
  check((await valor(`select count(*)::int from public.admins where email = 'ana@mail.com'`)) === 0, "sale de admins");
  check((await valor(`select count(*)::int from public.equipo_ingesta where email = 'ana@mail.com'`)) === 0, "sale de equipo_ingesta");
  check(
    (await valor(`select count(*)::int from public.piques where dispositivo = '${DISPO.ana}'`)) === 0 &&
      (await valor(`select count(*)::int from public.contactos where dispositivo = '${DISPO.ana}'`)) === 0,
    "lo hecho desde su navegador se borra"
  );
  check((await valor(`select count(*)::int from public.piques where dispositivo = '${DISPO.otro}'`)) === 0, "los piques que recibió su pitch se van con el pitch");

  // -------------------------------------------------------------------------
  console.log("\n4) Cuenta nueva con el mismo email: arranca vacía y el pitch viejo no vuelve");
  const ana2Uid = "66666666-6666-4666-8666-666666666666";
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'ana@mail.com', now())`, [ana2Uid]);
  const ana2 = await alta(ana2Uid, "ana-de-nuevo");
  const mis = (await como("authenticated", ana2Uid, `select * from public.mis_pitches()`)).rows;
  check(mis.length === 0, "mis_pitches de la cuenta nueva: vacío", mis);
  const empresa2 = (await como("authenticated", ana2Uid, `select * from public.mi_empresa()`)).rows;
  check(empresa2.length === 0, "sin empresa");
  const cuentas = (await como("service_role", null, `select * from public.ingesta_cuentas($1)`, [["ana@mail.com"]])).rows;
  check(cuentas[0]?.perfil_id === ana2, "la ingesta ve la cuenta nueva (así se pondría a prueba el guardián)");

  // Ingesta VIEJA (main): no conoce 'borrado'. Ve intentos ≥ 3 y la saltea; si igual
  // escribiera (reprocesar/asignar), la base no la deja resucitar.
  check(ing.drvA1.intentos >= 3 && ing.drvA2.intentos >= 3, "la ingesta vieja las da por agotadas antes de bajar el video");
  await ingesta.envio("drvA1", "ana@mail.com", "ana@mail.com", "recibido", "mismo_email", ana2);
  await ingesta.registrar("drvA1", "error", 0, 999);
  await ingesta.envio("drvA2", "dani@mail.com", "ana@mail.com", "recibido", "equipo", ana2);
  const ing2 = await uno(`select * from public.ingestas where origen_id = 'drvA1'`);
  const env2 = await uno(`select * from public.envios where origen_id = 'drvA2'`);
  check(
    ing2.estado === "borrado" && ing2.intentos >= 1000 && Number(ing2.bytes) === 0 && ing2.error === null,
    "un upsert de ingestas no pisa 'borrado'",
    ing2
  );
  check(
    env2.estado === "borrado" && env2.email_escrito === "" && env2.email_verificado === "" && env2.perfil_id === null,
    "un upsert de envíos no pisa 'borrado' ni vuelve a guardar los emails",
    env2
  );
  await espera("el pitch viejo no se puede volver a publicar", () => ingesta.pitch(ana2, "drvA1"), "cuenta borrada");
  await espera("ni el otro envío", () => ingesta.pitch(ana2, "drvA2"), "cuenta borrada");
  const drvB1 = await valor(`select id from public.pitches where origen_id = 'drvB1'`);
  await espera(
    "ni mover un pitch existente a un origen borrado",
    () => db.query(`update public.pitches set origen_id = 'drvA1' where id = $1`, [drvB1]),
    "cuenta borrada"
  );
  check((await valor(`select count(*)::int from public.pitches where perfil_id = $1`, [ana2])) === 0, "la cuenta nueva no tiene pitches");
  // Un pitch nuevo de la cuenta nueva sí entra.
  await ingesta.envio("drvA3", "ana@mail.com", "ana@mail.com", "ok", "mismo_email", ana2);
  await ingesta.pitch(ana2, "drvA3");
  await ingesta.registrar("drvA3", "ok", 0, 100);
  check((await valor(`select estado from public.ingestas where origen_id = 'drvA3'`)) === "ok", "un pitch nuevo de la cuenta nueva se publica normal");

  // -------------------------------------------------------------------------
  console.log("\n5) Beto borra su cuenta (empresa con más integrantes)");
  const resBeto = (await como("authenticated", U.beto, `select public.borrar_mi_cuenta(null) r`)).rows[0].r;
  check(resBeto.empresa === "agro-uno" && resBeto.empresa_borrada === false, "la empresa se queda", resBeto);
  const agroDespues = await uno(`select * from public.empresas where id = $1`, [agro]);
  check(agroDespues?.dueno_id === U.caro, "la titularidad pasa a Caro", agroDespues?.dueno_id);
  check((await valor(`select count(*)::int from public.perfiles where empresa_id = $1`, [agro])) === 1, "solo queda Caro en el equipo");
  const avance = await uno(`select autor_id, texto from public.empresa_avances where empresa_id = $1`, [agro]);
  check(avance?.texto === "Escrito por Beto" && avance.autor_id === null, "lo que escribió en la empresa queda, sin autor", avance);
  check((await valor(`select count(*)::int from public.empresa_logos where empresa_id = $1`, [agro])) === 1, "el logo de la empresa se queda");
  check(!(await uno(`select 1 from public.r2_borrar where clave = $1`, [`${agro}-e1e1e1e1.png`])), "y no va a r2_borrar");
  check((await valor(`select count(*)::int from public.r2_borrar where clave = 'drvB1-0a0a0a0a.mp4' and bytes = 3000`)) === 1, "su video sí va a r2_borrar con sus bytes");
  check((await valor(`select count(*)::int from public.envios where origen_id = 'drvB9' and estado = 'borrado' and email_escrito = ''`)) === 1, "el envío que quedó en su perfil ahora es 'borrado'");
  const quedanBeto = await rastros([U.beto, beto], ["beto@mail.com", "beto-agro"]);
  check(quedanBeto.length === 0, "no queda nada de Beto", quedanBeto);
  const caroVe = (await como("authenticated", U.caro, `select es_dueno, miembros from public.mi_empresa()`)).rows[0];
  check(caroVe?.es_dueno === true && caroVe.miembros === 1, "Caro ve la empresa como dueña", caroVe);

  // -------------------------------------------------------------------------
  console.log("\n6) Alguien del equipo de ingesta borra su cuenta");
  // Dani cargó un pitch para Eva (sin cuenta todavía): es de Eva, no de Dani.
  await ingesta.envio("drvE1", "dani@mail.com", "eva@mail.com", "en_espera", "equipo_espera", null);
  await como("authenticated", U.dani, `select public.borrar_mi_cuenta(null)`);
  const eva = await uno(`select estado, email_escrito from public.envios where origen_id = 'drvE1'`);
  const evaFila = await uno(`select email_verificado from public.envios where origen_id = 'drvE1'`);
  check(eva.estado === "en_espera" && eva.email_escrito === "eva@mail.com", "lo que cargó para otra persona sigue en espera para Eva", eva);
  check(evaFila.email_verificado === "", "pero sin el email de Dani", evaFila);
  check((await valor(`select count(*)::int from auth.users where id = $1`, [U.dani])) === 0, "una cuenta sin perfil también se borra");

  // -------------------------------------------------------------------------
  console.log("\n7) /admin: originales para borrar en Drive");
  const lista = (await como("authenticated", U.admin, `select origen_id from public.admin_originales_drive()`)).rows.map((f) => f.origen_id);
  check(JSON.stringify(lista) === '["drvA1","drvA2","drvB1","drvB9"]', "lista los IDs de Drive pendientes", lista);
  await como("authenticated", U.admin, `select public.admin_marcar_original_borrado('drvA1')`);
  const lista2 = (await como("authenticated", U.admin, `select origen_id from public.admin_originales_drive()`)).rows.map((f) => f.origen_id);
  check(!lista2.includes("drvA1") && lista2.length === 3, "marcado como borrado, sale de la lista", lista2);
  check(
    (await valor(`select count(*)::int from public.origenes_borrados where origen_id = 'drvA1'`)) === 1,
    "pero sigue en origenes_borrados (la ingesta lo sigue salteando)"
  );
  await espera(
    "un no-admin no puede marcar",
    () => como("authenticated", U.caro, `select public.admin_marcar_original_borrado('drvA2')`),
    "no autorizado"
  );

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
