// Harness de la migración pitch_build_producto_newsletter sobre PGlite (Postgres en
// WASM), con roles y JWT simulados como PostgREST de Supabase. No toca ninguna base.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\pitch_build_producto_newsletter.mjs .
//   node pitch_build_producto_newsletter.mjs <ruta al repo>
// Tiene que terminar en "N ok · 0 fallas".
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
function chequear(cond, msg, detalle) { cond ? bien(msg) : mal(`${msg} → ${JSON.stringify(detalle)}`); }

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
  await db.exec(`grant select on all tables in schema public to service_role;`);

  const U = {
    ana: "11111111-1111-1111-1111-111111111111",
    beto: "22222222-2222-2222-2222-222222222222",
    caro: "33333333-3333-3333-3333-333333333333",
    dani: "55555555-5555-5555-5555-555555555555",
  };
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${U.ana}', 'ana@mail.com', now()),
      ('${U.beto}', 'beto@mail.com', now()),
      ('${U.caro}', 'caro@mail.com', now()),
      ('${U.dani}', 'dani@mail.com', now());
    update public.ajustes set autopublicar = true;
  `);
  const insertar = (uid, slug, rol = "emprendedor", tipo = "startup") =>
    como("authenticated", uid, `
      insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at, usuario_id)
      values ($1, 'Nombre ' || $1, $3, $4, 'Descripción de prueba', now(), $2) returning id`, [slug, uid, tipo, rol]);
  const ana = (await insertar(U.ana, "ana-startup")).rows[0].id;
  const beto = (await insertar(U.beto, "beto-labs")).rows[0].id;
  await insertar(U.caro, "caro-inversora", "inversor", "angel");

  console.log("\n1) Pitch: editar y ocultar el propio");
  const pitch = (await db.query(`
    insert into public.pitches (perfil_id, video_url, orden, publicado, descripcion)
    values ($1, 'a.mp4', 100, true, 'Original') returning id`, [ana])).rows[0].id;
  await db.query(`insert into public.pitches (perfil_id, video_url, orden, publicado) values ($1, 'b.mp4', 101, true)`, [beto]);

  await como("authenticated", U.ana, `select public.editar_mi_pitch($1, '  Nueva descripción  ')`, [pitch]);
  const desc = (await db.query(`select descripcion from public.pitches where id = $1`, [pitch])).rows[0].descripcion;
  chequear(desc === "Nueva descripción", "ana edita la descripción de su pitch (recortada)", desc);
  await espera("beto no edita el pitch de ana", () => como("authenticated", U.beto, `select public.editar_mi_pitch($1, 'hack')`, [pitch]), "no es tuyo");
  await espera("descripción de más de 150", () => como("authenticated", U.ana, `select public.editar_mi_pitch($1, repeat('x', 151))`, [pitch]), "check");
  await espera("anon no edita pitches", () => como("anon", null, `select public.editar_mi_pitch($1, 'x')`, [pitch]), "permission denied");

  const antes = (await como("anon", null, `select count(*)::int n from public.pitches`)).rows[0].n;
  await como("authenticated", U.ana, `select public.ocultar_mi_pitch($1, true)`, [pitch]);
  const despues = (await como("anon", null, `select count(*)::int n from public.pitches`)).rows[0].n;
  chequear(antes === 2 && despues === 1, "un pitch oculto por su dueño deja de verse para anon", { antes, despues });
  const detalle = (await como("authenticated", U.ana, `select estado from public.mis_pitches_detalle()`)).rows;
  chequear(detalle.length === 1 && detalle[0].estado === "oculto", "mis_pitches_detalle lo muestra como oculto", detalle);
  const viejo = (await como("authenticated", U.ana, `select estado from public.mis_pitches()`)).rows;
  chequear(viejo.length === 1 && viejo[0].estado === "publicado", "mis_pitches() de siempre no cambió", viejo);
  await como("authenticated", U.ana, `select public.ocultar_mi_pitch($1, false)`, [pitch]);
  const otraVez = (await como("anon", null, `select count(*)::int n from public.pitches`)).rows[0].n;
  chequear(otraVez === 2, "mostrarlo de nuevo lo devuelve al feed", otraVez);

  console.log("\n2) Build in Public");
  await espera("sin empresa no hay hitos", () => como("authenticated", U.ana, `select public.guardar_hito(null, 'MVP', null, 'mvp', 'logrado', null, '2026-09-01')`), "primero sumate");
  await como("authenticated", U.ana, `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato para huertas', null, '{agtech}', 'mvp', 'pre_seed', 'ceo')`);
  const codigo = (await como("authenticated", U.ana, `select codigo from public.mi_empresa()`)).rows[0].codigo;
  await como("authenticated", U.beto, `select public.unirse_empresa($1, 'cto')`, [codigo]);

  const logrado = (await como("authenticated", U.ana, `select public.guardar_hito(null, 'MVP en producción', 'Con 3 huertas piloto', 'mvp', 'logrado', 80, '2026-09-01') id`)).rows[0].id;
  const fila = (await db.query(`select progreso from public.empresa_hitos where id = $1`, [logrado])).rows[0];
  chequear(fila.progreso === null, "el progreso solo se guarda en el hito en curso", fila);
  const actual = (await como("authenticated", U.beto, `select public.guardar_hito(null, 'Beta pública', null, 'lanzamiento', 'en_curso', 60, null) id`)).rows[0].id;
  bien("beto (miembro) crea el hito en curso al 60%");
  await espera("un segundo hito en curso", () => como("authenticated", U.ana, `select public.guardar_hito(null, 'Otro', null, null, 'en_curso', 10, null)`), "ya hay un hito en curso");
  await como("authenticated", U.ana, `select public.guardar_hito(null, '100 usuarios beta', null, 'primeros_usuarios', 'proximo', null, '2026-12-01')`);
  await espera("etapa fuera del vocabulario", () => como("authenticated", U.ana, `select public.guardar_hito(null, 'X', null, 'unicornio', 'proximo', null, null)`), "empresa_hitos_etapa_valida");
  await espera("progreso de 120", () => como("authenticated", U.ana, `select public.guardar_hito($1, 'Beta pública', null, 'lanzamiento', 'en_curso', 120, null)`, [actual]), "progreso_valido");
  await como("authenticated", U.ana, `select public.guardar_hito($1, 'Beta pública', null, 'lanzamiento', 'en_curso', 75, null)`, [actual]);
  const prog = (await db.query(`select progreso from public.empresa_hitos where id = $1`, [actual])).rows[0].progreso;
  chequear(prog === 75, "editar el hito actual actualiza el progreso", prog);
  await espera("caro (ajena) no edita hitos de Raíz Verde", () => como("authenticated", U.caro, `select public.guardar_hito($1, 'Hack', null, null, 'logrado', null, null)`, [actual]), "primero sumate");

  const hitosAnon = (await como("anon", null, `select titulo from public.empresa_hitos order by created_at`)).rows;
  chequear(hitosAnon.length === 3, "anon ve los 3 hitos de la empresa visible", hitosAnon);

  await espera("avance vacío", () => como("authenticated", U.ana, `select public.publicar_avance('   ', null)`), "texto_valido");
  for (let i = 0; i < 5; i++) {
    await como("authenticated", U.ana, `select public.publicar_avance($1, $2)`, [`Avance ${i + 1}`, i === 0 ? actual : null]);
  }
  bien("5 avances en el día");
  await espera("el sexto avance del día", () => como("authenticated", U.beto, `select public.publicar_avance('Uno más', null)`), "demasiados avances");
  const avancesAnon = (await como("anon", null, `select count(*)::int n from public.empresa_avances`)).rows[0].n;
  chequear(avancesAnon === 5, "anon ve los avances", avancesAnon);
  await espera("anon no escribe avances directo", () => como("anon", null, `insert into public.empresa_avances (empresa_id, texto) select id, 'x' from public.empresas`), "permission denied");

  console.log("\n3) Producto / Servicio");
  const empresaId = (await db.query(`select id from public.empresas where slug = 'raiz-verde'`)).rows[0].id;
  await espera("imágenes antes del producto", () => como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [[`${empresaId}-aaaaaaaa.jpg`]]), "primero guardá el producto");
  await como("authenticated", U.beto, `select public.guardar_producto('producto', 'Sustrato Raíz', 'Sustrato con borra de café para huertas urbanas', 'Las huertas urbanas usan tierra cara', null, 'Huertas de balcón', $1, null, 'https://raizverde.com.ar/demo')`, [["Orgánico", "  ", "Entrega en 48 h"]]);
  const prod = (await como("anon", null, `select nombre, caracteristicas from public.empresa_productos`)).rows[0];
  chequear(prod?.nombre === "Sustrato Raíz" && prod.caracteristicas.length === 2, "el producto se guarda y descarta características vacías", prod);
  await espera("demo sin https", () => como("authenticated", U.ana, `select public.guardar_producto('producto', 'X', 'Y', null, null, null, '{}', null, 'http://inseguro.com')`), "demo_valida");
  await espera("tipo inválido", () => como("authenticated", U.ana, `select public.guardar_producto('cosa', 'X', 'Y', null, null, null, '{}', null, null)`), "tipo_valido");
  await espera("más de 6 características", () => como("authenticated", U.ana, `select public.guardar_producto('producto', 'X', 'Y', null, null, null, '{a,b,c,d,e,f,g}', null, null)`), "caracteristicas_validas");

  const img1 = `${empresaId}-aaaaaaaa.jpg`;
  const img2 = `${empresaId}-bbbbbbbb.jpg`;
  await como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [[img1, img2]]);
  await espera("imagen con clave de otra empresa", () => como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [["99999999-9999-9999-9999-999999999999-cccccccc.jpg"]]), "imagen inválida");
  await espera("clave con otra forma", () => como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [[`${empresaId}-x.png`]]), "imagen inválida|imagenes_validas");
  await como("authenticated", U.ana, `select public.poner_imagenes_producto($1)`, [[img2]]);
  const aBorrar = (await db.query(`select clave from public.r2_borrar`)).rows.map((r) => r.clave);
  chequear(aBorrar.length === 1 && aBorrar[0] === img1, "la imagen que sale queda en r2_borrar", aBorrar);
  await espera("anon no escribe el producto directo", () => como("anon", null, `update public.empresa_productos set nombre = 'hack'`), "permission denied");

  console.log("\n4) Newsletter");
  await espera("publicar sin abrir la newsletter", () => como("authenticated", U.ana, `select public.guardar_edicion(null, 'Hola', 'Primera')`), "primero abrí");
  await como("authenticated", U.ana, `select public.guardar_newsletter('Diario de una huerta', 'Cómo construimos Raíz Verde')`);
  const ed = (await como("authenticated", U.ana, `select public.guardar_edicion(null, 'Edición 1', 'Arrancamos la beta') id`)).rows[0].id;
  await como("authenticated", U.ana, `select public.guardar_edicion(null, 'Edición 2', 'Segunda')`);
  await como("authenticated", U.ana, `select public.guardar_edicion(null, 'Edición 3', 'Tercera')`);
  await espera("la cuarta edición del día", () => como("authenticated", U.ana, `select public.guardar_edicion(null, 'Edición 4', 'Cuarta')`), "demasiadas ediciones");
  await como("authenticated", U.ana, `select public.guardar_edicion($1, 'Edición 1 (corregida)', 'Arrancamos la beta pública')`, [ed]);
  await como("authenticated", U.beto, `select public.guardar_newsletter('Notas de Beto', null)`);
  await espera("beto no corrige la edición de ana", () => como("authenticated", U.beto, `select public.guardar_edicion($1, 'Hack', 'Hack')`, [ed]), "no es tuya");

  const edAnon = (await como("anon", null, `select titulo from public.newsletter_ediciones where perfil_id = $1 order by publicada_at`, [ana])).rows;
  chequear(edAnon.length === 3 && edAnon[0].titulo === "Edición 1 (corregida)", "anon lee las ediciones de un perfil visible", edAnon);

  await espera("anon no se suscribe", () => como("anon", null, `select public.suscribirme('ana-startup', true)`), "permission denied");
  await espera("ana no se suscribe a la suya", () => como("authenticated", U.ana, `select public.suscribirme('ana-startup', true)`), "es tu newsletter");
  await espera("suscribirse a quien no tiene newsletter", () => como("authenticated", U.beto, `select public.suscribirme('caro-inversora', true)`), "newsletter inexistente");
  const t1 = (await como("authenticated", U.caro, `select public.suscribirme('ana-startup', true) t`)).rows[0].t;
  const t2 = (await como("authenticated", U.caro, `select public.suscribirme('ana-startup', true) t`)).rows[0].t;
  const t3 = (await como("authenticated", U.dani, `select public.suscribirme('ana-startup', true) t`)).rows[0].t;
  chequear(t1 === 1 && t2 === 1 && t3 === 2, "suscribirse dos veces no suma; dani (sin perfil) también puede", { t1, t2, t3 });
  const publico = (await como("anon", null, `select public.suscriptores_newsletter('ana-startup') t`)).rows[0].t;
  chequear(publico === 2, "el total es público", publico);
  await espera("anon no lee quiénes se suscribieron", () => como("anon", null, `select * from public.newsletter_suscripciones`), "permission denied");
  await espera("ana tampoco lee las identidades", () => como("authenticated", U.ana, `select * from public.newsletter_suscripciones`), "permission denied");
  const mia = (await como("authenticated", U.ana, `select * from public.mi_newsletter()`)).rows[0];
  chequear(mia?.suscriptores === 2 && mia.ediciones === 3, "mi_newsletter devuelve total y ediciones", mia);
  const suscripta = (await como("authenticated", U.caro, `select public.mi_suscripcion('ana-startup') s`)).rows[0].s;
  chequear(suscripta === true, "mi_suscripcion: caro está suscripta", suscripta);
  const nov = (await como("authenticated", U.caro, `select * from public.novedades_suscripciones()`)).rows;
  chequear(nov.length === 3 && nov[0].slug === "ana-startup", "novedades: caro ve las 3 ediciones de ana", nov.length);
  const baja = (await como("authenticated", U.caro, `select public.suscribirme('ana-startup', false) t`)).rows[0].t;
  chequear(baja === 1, "darse de baja resta una", baja);

  await como("authenticated", U.ana, `update public.perfiles set oculto = true where id = $1`, [ana]);
  const ocultas = (await como("anon", null, `select count(*)::int n from public.newsletter_ediciones`)).rows[0].n;
  chequear(ocultas === 0, "perfil oculto: su newsletter deja de verse", ocultas);
  const propias = (await como("authenticated", U.ana, `select count(*)::int n from public.newsletter_ediciones`)).rows[0].n;
  chequear(propias === 3, "la dueña sigue viendo sus ediciones con el perfil oculto", propias);

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
