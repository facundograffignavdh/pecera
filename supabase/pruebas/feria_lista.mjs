// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración feria_lista con roles y JWT simulados (como PostgREST de
// Supabase). No toca ninguna base real.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\feria_lista.mjs .
//   node feria_lista.mjs <ruta al repo>
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

  // Grants base que Supabase da por defecto a las tablas de public.
  await db.exec(`grant select on all tables in schema public to service_role;`);

  // Usuarios de prueba.
  const U = {
    ana: "11111111-1111-1111-1111-111111111111",
    beto: "22222222-2222-2222-2222-222222222222",
    caro: "33333333-3333-3333-3333-333333333333",
    admin: "44444444-4444-4444-4444-444444444444",
  };
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${U.ana}', 'ana@mail.com', now()),
      ('${U.beto}', 'beto@mail.com', now()),
      ('${U.caro}', 'caro@mail.com', now()),
      ('${U.admin}', 'Equipo@Pecera.com', now());
    insert into public.admins (email) values ('equipo@pecera.com');
    update public.ajustes set autopublicar = true;
  `);

  console.log("\n1) Perfiles con los campos nuevos");
  const insertar = (uid, slug, extra = "") =>
    como("authenticated", uid, `
      insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at, usuario_id ${extra ? "," + extra.split("=")[0] : ""})
      values ($1, 'Nombre ' || $1, 'startup', 'emprendedor', 'Descripción de prueba', now(), $2 ${extra ? "," + extra.split("=")[1] : ""})
      returning id`, [slug, uid]);

  const ana = (await insertar(U.ana, "ana-startup")).rows[0].id;
  bien("ana crea su perfil (autopublicar = publicado)");
  await como("authenticated", U.ana, `update public.perfiles set etapa = 'mvp', ronda = 'pre_seed', cargo = 'ceo', industrias = '{fintech,ia}' where id = $1`, [ana]);
  bien("ana guarda etapa, ronda, cargo e industrias válidos");
  await espera("etapa inválida", () => como("authenticated", U.ana, `update public.perfiles set etapa = 'unicornio' where id = $1`, [ana]), "perfiles_etapa_valida");
  await espera("industria fuera del vocabulario", () => como("authenticated", U.ana, `update public.perfiles set industrias = '{fintech,cripto}' where id = $1`, [ana]), "perfiles_industrias_validas");
  await espera("más de 5 especialidades", () => como("authenticated", U.ana, `update public.perfiles set especialidades = '{legal,finanzas,marketing,ventas,producto,diseno}' where id = $1`, [ana]), "perfiles_especialidades_validas");

  const beto = (await insertar(U.beto, "beto-labs")).rows[0].id;
  const caro = (await insertar(U.caro, "caro-inversora")).rows[0].id;
  await como("authenticated", U.caro, `update public.perfiles set rol = 'inversor', tipo = 'angel', ticket = '10k_50k', rondas_interes = '{pre_seed,seed}', industrias = '{fintech,agtech,edtech}' where id = $1`, [caro]);
  bien("caro (inversora) guarda ticket, rondas de interés e industrias");

  console.log("\n2) Empresas");
  await espera("ana no puede escribir empresa_id directo", async () => {
    await db.exec(`insert into public.empresas (id, slug, nombre, descripcion) values ('99999999-9999-9999-9999-999999999999', 'ajena', 'Ajena', 'Empresa ajena')`);
    await como("authenticated", U.ana, `update public.perfiles set empresa_id = '99999999-9999-9999-9999-999999999999' where id = $1`, [ana]);
  }, "campo no editable: empresa");

  const slug = (await como("authenticated", U.ana, `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato para huertas con borra de café', 'raizverde.com.ar', '{agtech,impacto}', 'mvp', 'pre_seed', 'ceo') as s`)).rows[0].s;
  slug === "raiz-verde" ? bien("ana crea la empresa raiz-verde y queda como miembro") : mal(`slug inesperado ${slug}`);

  const mia = (await como("authenticated", U.ana, `select * from public.mi_empresa()`)).rows[0];
  mia?.es_dueno && /^[0-9A-F]{8}$/.test(mia.codigo) && mia.miembros === 1
    ? bien(`mi_empresa devuelve código ${mia.codigo} y es_dueno`) : mal(`mi_empresa: ${JSON.stringify(mia)}`);

  await espera("ana no puede crear una segunda empresa", () => como("authenticated", U.ana, `select public.crear_empresa('Otra', 'otra-mas', 'Otra empresa')`), "ya tenés empresa");
  const invalido = (await como("authenticated", U.beto, `select public.unirse_empresa('ZZZZZZZZ') as s`)).rows[0].s;
  invalido === null ? bien("código inválido devuelve null (y el intento queda contado)") : mal(`código inválido devolvió ${invalido}`);
  const unido = (await como("authenticated", U.beto, `select public.unirse_empresa($1, 'cto') as s`, [mia.codigo.slice(0, 4) + "-" + mia.codigo.slice(4)])).rows[0].s;
  unido === "raiz-verde" ? bien("beto se une con el código (con guion) como CTO") : mal("beto no se unió");

  const codigoAnon = await como("anon", null, `select * from public.empresas_codigos`).then(() => "leyó", (e) => e.message);
  /permission denied/.test(codigoAnon) ? bien("anon no puede leer empresas_codigos") : mal(`anon y códigos: ${codigoAnon}`);

  const visibleAnon = (await como("anon", null, `select slug from public.empresas`)).rows.map((r) => r.slug);
  JSON.stringify(visibleAnon) === JSON.stringify(["raiz-verde"]) ? bien("anon ve solo la empresa visible (no la 'ajena' sin miembros)") : mal(`anon ve: ${visibleAnon}`);

  await espera("beto (no dueño) no edita la empresa", () => como("authenticated", U.beto, `select public.editar_empresa('Hack', 'Hackeada')`), "solo el dueño");
  await como("authenticated", U.ana, `select public.editar_empresa('Raíz Verde', 'Sustrato para huertas urbanas', 'raizverde.com.ar', null, null, '{agtech}', 'funcionando', 'seed')`);
  bien("ana (dueña) edita la empresa");

  console.log("\n3) Transparencia");
  await como("authenticated", U.beto, `select public.guardar_dato_empresa('mrr', 'USD 4.200', null, true)`);
  await como("authenticated", U.beto, `select public.guardar_dato_empresa('churn', '3% mensual', null, false)`);
  await como("authenticated", U.ana, `select public.guardar_dato_empresa('pitch_deck', null, 'https://drive.google.com/deck', true)`);
  const publicos = (await como("anon", null, `select clave from public.empresa_datos order by clave`)).rows.map((r) => r.clave);
  JSON.stringify(publicos) === JSON.stringify(["mrr", "pitch_deck"]) ? bien("anon ve solo los datos compartidos (mrr, pitch_deck), no el churn privado") : mal(`anon ve: ${publicos}`);
  const todos = (await como("authenticated", U.ana, `select clave from public.mis_datos_empresa() order by clave`)).rows.map((r) => r.clave);
  todos.length === 3 ? bien("los miembros ven los 3 datos (incluido el privado)") : mal(`miembros ven: ${todos}`);
  await espera("url sin https", () => como("authenticated", U.ana, `select public.guardar_dato_empresa('cap_table', null, 'http://inseguro.com', false)`), "empresa_datos_url_valida");
  await como("authenticated", U.ana, `select public.guardar_dato_empresa('mrr', '', '', true)`);
  const trasBorrar = (await como("authenticated", U.ana, `select count(*)::int n from public.mis_datos_empresa()`)).rows[0].n;
  trasBorrar === 2 ? bien("guardar vacío borra el dato") : mal(`quedaron ${trasBorrar}`);

  console.log("\n4) Evento y votación");
  await como("authenticated", U.ana, `select public.participar_evento('feria-21', true)`);
  await como("authenticated", U.caro, `select public.participar_evento('feria-21', true)`);
  const part = (await como("anon", null, `select slug, empresa_nombre from public.participantes_evento('feria-21')`)).rows;
  part.length === 2 && part[0].empresa_nombre === "Raíz Verde" ? bien("participantes_evento lista 2, con la empresa de ana") : mal(`participantes: ${JSON.stringify(part)}`);

  await espera("votar con la votación cerrada", () => como("authenticated", U.caro, `select public.votar('feria-21', $1)`, [ana]), "votación cerrada");
  await espera("beto (no admin) no abre la votación", () => como("authenticated", U.beto, `select public.admin_configurar_evento('feria-21', true, false)`), "no autorizado");
  await como("authenticated", U.admin, `select public.admin_configurar_evento('feria-21', true, false)`);
  bien("el admin abre la votación");

  await espera("ana no se vota a sí misma", () => como("authenticated", U.ana, `select public.votar('feria-21', $1)`, [ana]), "no podés votarte");
  await espera("beto no vota a su propia empresa", () => como("authenticated", U.beto, `select public.votar('feria-21', $1)`, [ana]), "tu empresa");
  await espera("votar a alguien que no participa", () => como("authenticated", U.caro, `select public.votar('feria-21', $1)`, [beto]), "participante inexistente");
  await espera("anon no puede votar", () => como("anon", null, `select public.votar('feria-21', $1)`, [ana]), "permission denied");
  await como("authenticated", U.caro, `select public.votar('feria-21', $1)`, [ana]);
  await como("authenticated", U.caro, `select public.votar('feria-21', $1)`, [ana]);
  await espera("un inversor participa pero no se vota", () => como("authenticated", U.beto, `select public.votar('feria-21', $1)`, [caro]), "participante inexistente");
  const total = (await como("anon", null, `select public.total_votos_evento('feria-21') t`)).rows[0].t;
  total === 1 ? bien("un voto por cuenta: votar dos veces no suma (total 1)") : mal(`total ${total}`);

  const ocultos = (await como("anon", null, `select * from public.resultados_evento('feria-21')`)).rows;
  ocultos.length === 0 ? bien("con resultados ocultos, anon no ve el detalle") : mal(`anon ve resultados: ${JSON.stringify(ocultos)}`);
  const paraAdmin = (await como("authenticated", U.admin, `select * from public.resultados_evento('feria-21')`)).rows;
  paraAdmin.length === 1 ? bien("el admin sí ve el detalle") : mal(`admin ve: ${JSON.stringify(paraAdmin)}`);
  const miVoto = (await como("authenticated", U.caro, `select * from public.mi_evento('feria-21')`)).rows[0];
  miVoto?.voto === ana && miVoto.participa ? bien("mi_evento: caro participa y votó a ana") : mal(`mi_evento: ${JSON.stringify(miVoto)}`);

  console.log("\n5) Admin");
  await espera("beto no ve el resumen", () => como("authenticated", U.beto, `select public.admin_resumen()`), "no autorizado");
  await espera("anon no ve el resumen", () => como("anon", null, `select public.admin_resumen()`), "permission denied");
  const resumen = (await como("authenticated", U.admin, `select public.admin_resumen() r`)).rows[0].r;
  resumen.perfiles === 3 && resumen.votos === 1 ? bien(`resumen: ${JSON.stringify(resumen)}`) : mal(`resumen: ${JSON.stringify(resumen)}`);

  await espera("ana no puede publicarse a mano (guardián de v2)", () => como("authenticated", U.ana, `update public.perfiles set publicado = false where id = $1`, [ana]), "campo no editable");
  await como("authenticated", U.admin, `select public.admin_publicar_perfil($1, false)`, [beto]);
  const pub = (await db.query(`select publicado from public.perfiles where id = $1`, [beto])).rows[0].publicado;
  pub === false ? bien("el admin despublica a beto (pasa el guardián como sistema)") : mal("no despublicó");
  // El "como sistema" es local a la transacción: el pedido siguiente vuelve a tener su sesión.
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [U.admin]);
  await db.exec("set role authenticated");
  await db.query(`select public.admin_publicar_perfil($1, true)`, [beto]);
  const despues = (await db.query(`select auth.uid() u`)).rows[0].u;
  await db.exec("reset role");
  despues === U.admin ? bien("el modo sistema no se filtra al pedido siguiente (auth.uid() vuelve)") : mal(`auth.uid() después: ${despues}`);

  const listado = (await como("authenticated", U.admin, `select slug, participa, empresa from public.admin_perfiles() order by slug`)).rows;
  listado.length === 3 ? bien(`admin_perfiles lista 3 (${listado.map((l) => l.slug + (l.participa ? "*" : "")).join(", ")})`) : mal(`admin_perfiles: ${JSON.stringify(listado)}`);

  await como("authenticated", U.admin, `select public.admin_ocultar_empresa(id, true) from public.empresas where slug = 'raiz-verde'`);
  const trasOcultar = (await como("anon", null, `select count(*)::int n from public.empresas`)).rows[0].n;
  trasOcultar === 0 ? bien("empresa oculta por el admin: anon ya no la ve") : mal(`anon ve ${trasOcultar}`);
  const partSinEmpresa = (await como("anon", null, `select empresa_nombre from public.participantes_evento('feria-21') where slug = 'ana-startup'`)).rows[0];
  partSinEmpresa?.empresa_nombre === null ? bien("participantes_evento no expone una empresa oculta") : mal(`expone: ${JSON.stringify(partSinEmpresa)}`);

  console.log("\n6) Salir de la empresa y traspaso de dueño");
  await como("authenticated", U.admin, `select public.admin_ocultar_empresa(id, false) from public.empresas where slug = 'raiz-verde'`);
  await como("authenticated", U.ana, `select public.salir_empresa()`);
  const dueno = (await db.query(`select dueno_id from public.empresas where slug = 'raiz-verde'`)).rows[0].dueno_id;
  dueno === U.beto ? bien("ana sale y el dueño pasa a beto") : mal(`dueño: ${dueno}`);

  console.log("\n7) Límite de intentos con código");
  await espera("beto (ya en una empresa) no se une a otra sin salir", () => como("authenticated", U.beto, `select public.unirse_empresa('00000000')`), "ya tenés empresa");
  for (let i = 0; i < 10; i++) {
    await como("authenticated", U.caro, `select public.unirse_empresa('00000000')`);
  }
  await espera("el intento 11 queda bloqueado", () => como("authenticated", U.caro, `select public.unirse_empresa('00000000')`), "demasiados intentos");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
