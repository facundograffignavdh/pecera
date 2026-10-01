// Harness de las migraciones pitch_build_producto_newsletter, dataroom, portfolio y logos sobre PGlite (Postgres en
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
  "20261004120000_dataroom.sql",
  "20261005120000_portfolio.sql",
  "20261006120000_logos.sql",
  "20261007120000_feria_pro.sql",
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

  console.log("\n4) Newsletter (link a Substack)");
  await como("authenticated", U.ana, `select public.guardar_newsletter('https://raizverde.substack.com', 'Diario de una huerta')`);
  const linkAnon = (await como("anon", null, `select url, titulo from public.perfil_newsletter`)).rows;
  chequear(linkAnon.length === 1 && linkAnon[0].url === "https://raizverde.substack.com", "anon ve el link de la newsletter de un perfil visible", linkAnon);
  await espera("link sin https", () => como("authenticated", U.ana, `select public.guardar_newsletter('http://raizverde.substack.com', null)`), "url_valida");
  await espera("anon no guarda links", () => como("anon", null, `select public.guardar_newsletter('https://x.substack.com', null)`), "permission denied");
  await espera("anon no escribe la tabla directo", () => como("anon", null, `update public.perfil_newsletter set url = 'https://hack.com'`), "permission denied");
  await como("authenticated", U.beto, `select public.guardar_newsletter('https://beto.substack.com', null)`);
  const deAna = (await db.query(`select url from public.perfil_newsletter where perfil_id = $1`, [ana])).rows[0].url;
  chequear(deAna === "https://raizverde.substack.com", "beto guarda la suya sin tocar la de ana", deAna);
  await como("authenticated", U.ana, `update public.perfiles set oculto = true where id = $1`, [ana]);
  const oculto = (await como("anon", null, `select count(*)::int n from public.perfil_newsletter where perfil_id = $1`, [ana])).rows[0].n;
  chequear(oculto === 0, "perfil oculto: su link deja de verse", oculto);
  const linkPropio = (await como("authenticated", U.ana, `select count(*)::int n from public.perfil_newsletter where perfil_id = $1`, [ana])).rows[0].n;
  chequear(linkPropio === 1, "la dueña lo sigue viendo con el perfil oculto", linkPropio);
  await como("authenticated", U.beto, `select public.guardar_newsletter('', null)`);
  const sinLink = (await db.query(`select count(*)::int n from public.perfil_newsletter where perfil_id = $1`, [beto])).rows[0].n;
  chequear(sinLink === 0, "guardar vacío saca el link", sinLink);

  console.log("\n5) Dataroom");
  await como("authenticated", U.ana, `update public.perfiles set oculto = false where id = $1`, [ana]);
  const guardar = (uid, id, plantilla, tipo, titulo, campos = {}, cuerpo = null, url = null, completo = false) =>
    como("authenticated", uid, `select public.guardar_documento($1, $2, 'mercado', $3, $4, $5::jsonb, $6, $7, $8) id`,
      [id, plantilla, tipo, titulo, JSON.stringify(campos), cuerpo, url, completo]);
  await espera("sin empresa no hay Dataroom", () => guardar(U.caro, null, "tam-sam-som", "plantilla", "TAM"), "primero sumate");
  const doc = (await guardar(U.ana, null, "tam-sam-som", "plantilla", "TAM, SAM y SOM", { metodo: "bottom_up" })).rows[0].id;
  const mismo = (await guardar(U.beto, null, "tam-sam-som", "plantilla", "TAM, SAM y SOM", { metodo: "bottom_up", supuestos: "x" }, null, null, true)).rows[0].id;
  chequear(doc === mismo, "el autosave de un template sin id actualiza el mismo documento (no duplica)", { doc, mismo });
  const docsAnon = (await como("anon", null, `select count(*)::int n from public.empresa_documentos`)).rows[0].n;
  chequear(docsAnon === 0, "nace privado: anon no lo ve", docsAnon);
  const docsBeto = (await como("authenticated", U.beto, `select campos->>'supuestos' s, completo from public.empresa_documentos where id = $1`, [doc])).rows[0];
  chequear(docsBeto?.s === "x" && docsBeto.completo === true, "los miembros lo leen con lo último guardado", docsBeto);
  const docsCaro = (await como("authenticated", U.caro, `select count(*)::int n from public.empresa_documentos`)).rows[0].n;
  chequear(docsCaro === 0, "alguien de afuera (caro) no lo ve", docsCaro);
  await como("authenticated", U.ana, `select public.visibilidad_documento($1, true)`, [doc]);
  const visibleAnon = (await como("anon", null, `select titulo from public.empresa_documentos`)).rows;
  chequear(visibleAnon.length === 1, "transparente: anon lo ve", visibleAnon);
  await como("authenticated", U.ana, `select public.visibilidad_documento($1, false)`, [doc]);
  const revocado = (await como("anon", null, `select count(*)::int n from public.empresa_documentos`)).rows[0].n;
  chequear(revocado === 0, "volver a privado revoca la visibilidad", revocado);
  await espera("caro no cambia la visibilidad", () => como("authenticated", U.caro, `select public.visibilidad_documento($1, true)`, [doc]), "primero sumate");
  await espera("link sin url", () => guardar(U.ana, null, null, "link", "Deck"), "link_con_url");
  await espera("link http", () => guardar(U.ana, null, null, "link", "Deck", {}, null, "http://x.com"), "url_valida");
  await espera("plantilla en un escrito", () => guardar(U.ana, null, "tam-sam-som", "escrito", "X"), "plantilla_valida");
  const link = (await guardar(U.ana, null, null, "link", "Pitch deck", {}, null, "https://drive.google.com/x")).rows[0].id;
  await como("authenticated", U.ana, `select public.visibilidad_documento($1, true)`, [link]);
  await como("authenticated", U.ana, `select public.archivar_documento($1, true)`, [link]);
  const archivado = (await como("anon", null, `select count(*)::int n from public.empresa_documentos`)).rows[0].n;
  const filaDoc = (await db.query(`select visible, archivado from public.empresa_documentos where id = $1`, [link])).rows[0];
  chequear(archivado === 0 && filaDoc.visible === false && filaDoc.archivado === true, "archivar lo saca de lo público y lo deja privado", filaDoc);
  await como("authenticated", U.ana, `select public.archivar_documento($1, true)`, [doc]);
  const nuevo = (await guardar(U.ana, null, "tam-sam-som", "plantilla", "TAM, SAM y SOM")).rows[0].id;
  chequear(nuevo !== doc, "con el template archivado, empezar de nuevo crea otro", { nuevo, doc });
  await espera("restaurar el archivado con otro activo", () => como("authenticated", U.ana, `select public.archivar_documento($1, false)`, [doc]), "ya hay otro documento");
  await espera("anon no escribe documentos directo", () => como("anon", null, `update public.empresa_documentos set visible = true`), "permission denied");
  await espera("un miembro no escribe directo (solo por función)", () => como("authenticated", U.ana, `update public.empresa_documentos set visible = true`), "permission denied");

  console.log("\n6) Portfolio de inversores y aliados");
  const guardarP = (uid, o) =>
    como("authenticated", uid, `select public.guardar_portfolio($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) id`, [
      o.id ?? null, o.tipo, o.empresa ?? null, o.nombre ?? "X", o.web ?? null, o.industria ?? null, o.ubicacion ?? null,
      o.estado ?? "actual", o.ronda ?? null, o.lider ?? null, o.anio ?? null, o.rol ?? null, o.descripcion ?? null,
      o.desafio ?? null, o.solucion ?? null, o.resultados ?? [], o.enlace ?? null, o.visibilidad ?? "publico",
    ]);
  const empresaRV = (await db.query(`select id from public.empresas where slug = 'raiz-verde'`)).rows[0].id;
  const inv = (await guardarP(U.caro, { tipo: "inversion", empresa: empresaRV, nombre: "lo que sea", ronda: "pre_seed", lider: true, anio: 2026, industria: "agtech" })).rows[0].id;
  const filaInv = (await db.query(`select nombre, confirmacion from public.portfolio where id = $1`, [inv])).rows[0];
  chequear(filaInv.nombre === "Raíz Verde" && filaInv.confirmacion === "pendiente", "enlazar una empresa de Pecera toma su nombre y queda pendiente de confirmar", filaInv);
  await espera("la misma relación dos veces", () => guardarP(U.caro, { tipo: "inversion", empresa: empresaRV }), "portfolio_sin_duplicados");
  await espera("ronda en algo que no es inversión", () => guardarP(U.caro, { tipo: "asesoria", nombre: "Otra", ronda: "seed" }), "inversion_coherente");
  await espera("beto no edita el portfolio de caro", () => guardarP(U.beto, { id: inv, tipo: "inversion", nombre: "Hack" }), "no es tuya");
  const ext = (await guardarP(U.caro, { tipo: "inversion", nombre: "Startup de afuera", web: "afuera.com", industria: "fintech", estado: "exit", ronda: "seed" })).rows[0].id;
  const privada = (await guardarP(U.caro, { tipo: "asesoria", empresa: empresaRV, visibilidad: "privado" })).rows[0].id;
  const soloMiembros = (await guardarP(U.caro, { tipo: "mentoria", nombre: "Programa X", visibilidad: "miembros" })).rows[0].id;
  const filaExt = (await db.query(`select confirmacion from public.portfolio where id = $1`, [ext])).rows[0];
  chequear(filaExt.confirmacion === "declarada", "sin empresa de Pecera queda como declarada (nunca confirmada)", filaExt);
  const filaPriv = (await db.query(`select confirmacion from public.portfolio where id = $1`, [privada])).rows[0];
  chequear(filaPriv.confirmacion === "declarada", "una relación privada no le pide confirmación a la empresa", filaPriv);

  const anonVe = (await como("anon", null, `select id from public.portfolio order by created_at`)).rows.map((r) => r.id);
  chequear(anonVe.length === 2 && anonVe.includes(inv) && anonVe.includes(ext), "anon ve solo lo público (no lo privado ni lo de miembros)", anonVe);
  const daniVe = (await como("authenticated", U.dani, `select id from public.portfolio`)).rows.map((r) => r.id);
  chequear(daniVe.length === 3 && daniVe.includes(soloMiembros), "una cuenta de Pecera ve también lo de miembros", daniVe);
  const caroVe = (await como("authenticated", U.caro, `select count(*)::int n from public.portfolio where perfil_id = (select id from public.perfiles where usuario_id = $1)`, [U.caro])).rows[0].n;
  chequear(caroVe === 4, "la dueña ve todo su portfolio", caroVe);
  const anaVe = (await como("authenticated", U.ana, `select id from public.portfolio where empresa_id = $1`, [empresaRV])).rows.map((r) => r.id);
  chequear(anaVe.length === 1 && anaVe[0] === inv, "la empresa ve la relación que la nombra, no la privada", anaVe);

  const pendientes = (await como("authenticated", U.ana, `select id, slug from public.relaciones_pendientes()`)).rows;
  chequear(pendientes.length === 1 && pendientes[0].slug === "caro-inversora", "relaciones_pendientes lista la inversión de caro para Raíz Verde", pendientes);
  await espera("caro no se confirma sola", () => como("authenticated", U.caro, `select public.responder_relacion($1, true)`, [inv]), "primero sumate");
  await como("authenticated", U.beto, `select public.responder_relacion($1, true)`, [inv]);
  const confirmada = (await db.query(`select confirmacion from public.portfolio where id = $1`, [inv])).rows[0].confirmacion;
  chequear(confirmada === "confirmada", "beto (miembro) la confirma", confirmada);
  await espera("responder dos veces", () => como("authenticated", U.ana, `select public.responder_relacion($1, false)`, [inv]), "no espera tu respuesta");
  await guardarP(U.caro, { id: inv, tipo: "inversion", empresa: empresaRV, ronda: "seed", estado: "actual" });
  const sigue = (await db.query(`select confirmacion, ronda from public.portfolio where id = $1`, [inv])).rows[0];
  chequear(sigue.confirmacion === "confirmada" && sigue.ronda === "seed", "editar sin cambiar la empresa conserva la confirmación", sigue);
  await guardarP(U.caro, { id: inv, tipo: "inversion", empresa: null, nombre: "Otra empresa", ronda: "seed" });
  const reset = (await db.query(`select confirmacion from public.portfolio where id = $1`, [inv])).rows[0].confirmacion;
  chequear(reset === "declarada", "cambiar la empresa saca la confirmación", reset);
  const propia = (await guardarP(U.ana, { tipo: "fundacion", empresa: empresaRV })).rows[0].id;
  const filaPropia = (await db.query(`select confirmacion from public.portfolio where id = $1`, [propia])).rows[0].confirmacion;
  chequear(filaPropia === "confirmada", "la relación con la propia empresa queda confirmada", filaPropia);
  await espera("anon no escribe portfolio directo", () => como("anon", null, `update public.portfolio set confirmacion = 'confirmada'`), "permission denied");
  await espera("la dueña no se autoconfirma escribiendo directo", () => como("authenticated", U.caro, `update public.portfolio set confirmacion = 'confirmada'`), "permission denied");
  await como("authenticated", U.caro, `select public.borrar_portfolio($1)`, [ext]);
  const trasBorrar = (await db.query(`select count(*)::int n from public.portfolio where id = $1`, [ext])).rows[0].n;
  chequear(trasBorrar === 0, "la dueña borra una entrada", trasBorrar);

  const servicio = (await como("authenticated", U.caro, `select public.guardar_servicio(null, 'Due diligence express', 'finanzas', 'Revisión en 2 semanas', 'remoto', 'Desde USD 500') id`)).rows[0].id;
  await espera("categoría de servicio inválida", () => como("authenticated", U.caro, `select public.guardar_servicio(null, 'X', 'magia', null, null, null)`), "categoria_valida");
  await espera("beto no edita el servicio de caro", () => como("authenticated", U.beto, `select public.guardar_servicio($1, 'Hack', null, null, null, null)`, [servicio]), "no es tuyo");
  const servAnon = (await como("anon", null, `select nombre from public.perfil_servicios`)).rows;
  chequear(servAnon.length === 1, "anon ve los servicios de un perfil visible", servAnon);
  await como("authenticated", U.caro, `select public.guardar_tesis('Agtech y fintech con tracción temprana', '{argentina,latam}', '{b2b}', 'Founders técnicos')`);
  await espera("geografía fuera del vocabulario", () => como("authenticated", U.caro, `select public.guardar_tesis(null, '{marte}', '{}', null)`), "geografias_validas");
  const tesis = (await como("anon", null, `select geografias from public.perfil_tesis`)).rows[0];
  chequear(tesis?.geografias?.length === 2, "anon ve la tesis", tesis);

  console.log("\n7) Logo de la empresa");
  const empresaLogo = (await db.query(`select id from public.empresas where slug = 'raiz-verde'`)).rows[0].id;
  const logo1 = `${empresaLogo}-aaaaaaaa.png`;
  const logo2 = `${empresaLogo}-bbbbbbbb.jpg`;
  await como("authenticated", U.beto, `select public.poner_logo_empresa($1)`, [logo1]);
  const logoAnon = (await como("anon", null, `select clave from public.empresa_logos`)).rows;
  chequear(logoAnon.length === 1 && logoAnon[0].clave === logo1, "un miembro pone el logo y anon lo ve", logoAnon);
  await espera("logo con clave de otra empresa", () => como("authenticated", U.beto, `select public.poner_logo_empresa('99999999-9999-9999-9999-999999999999-cccccccc.png')`), "imagen inválida");
  await espera("logo con otra extensión", () => como("authenticated", U.beto, `select public.poner_logo_empresa($1)`, [`${empresaLogo}-cccccccc.gif`]), "clave_valida");
  await espera("caro (de afuera) no pone logos", () => como("authenticated", U.caro, `select public.poner_logo_empresa($1)`, [logo2]), "primero sumate");
  await como("authenticated", U.beto, `select public.poner_logo_empresa($1)`, [logo2]);
  const enBorrar = (await db.query(`select count(*)::int n from public.r2_borrar where clave = $1`, [logo1])).rows[0].n;
  chequear(enBorrar === 1, "el logo anterior va a r2_borrar", enBorrar);
  await como("authenticated", U.beto, `select public.poner_logo_empresa(null)`);
  const sinLogo = (await db.query(`select count(*)::int n from public.empresa_logos`)).rows[0].n;
  const borrado2 = (await db.query(`select count(*)::int n from public.r2_borrar where clave = $1`, [logo2])).rows[0].n;
  chequear(sinLogo === 0 && borrado2 === 1, "sacar el logo lo borra y anota el archivo", { sinLogo, borrado2 });
  await espera("anon no escribe logos directo", () => como("anon", null, `insert into public.empresa_logos (empresa_id, clave) values ('${empresaLogo}', '${logo1}')`), "permission denied");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
