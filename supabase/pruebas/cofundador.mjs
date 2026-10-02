// Harness de la migración cofundador_conexiones sobre PGlite (Postgres en WASM), con roles y JWT
// simulados como PostgREST de Supabase. No toca ninguna base real. Mismo armado que feria_pro.mjs.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\cofundador.mjs .
//   node cofundador.mjs <ruta al repo>
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
  "20261004120000_dataroom.sql",
  "20261005120000_portfolio.sql",
  "20261006120000_logos.sql",
  "20261007120000_feria_pro.sql",
  "20261008120000_borrar_cuenta.sql",
  "20261009120000_cofundador_conexiones.sql",
];

let ok = 0;
let fallas = 0;
function bien(msg) { ok++; console.log(`  ✔ ${msg}`); }
function mal(msg) { fallas++; console.log(`  ✘ ${msg}`); }
function chequear(cond, msg, detalle) { cond ? bien(msg) : mal(`${msg} ${detalle ? JSON.stringify(detalle) : ""}`); }

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
    ana: "11111111-1111-4111-8111-111111111111",
    beto: "22222222-2222-4222-8222-222222222222",
    caro: "33333333-3333-4333-8333-333333333333",
    dani: "44444444-4444-4444-8444-444444444444",
    eli: "55555555-5555-4555-8555-555555555555",
    fede: "66666666-6666-4666-8666-666666666666",
  };
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ${Object.entries(U).map(([n, id]) => `('${id}', '${n}@mail.com', now())`).join(",\n      ")};
    update public.ajustes set autopublicar = true;
  `);

  const alta = (uid, slug, extra = {}) => {
    const campos = {
      slug,
      nombre: "Nombre " + slug,
      tipo: "startup",
      rol: "emprendedor",
      descripcion: "Descripción",
      whatsapp: "3515550000",
      email: `${slug}@mail.com`,
      consentimiento_at: new Date().toISOString(),
      ...extra,
    };
    const cols = Object.keys(campos);
    return como(
      "authenticated",
      uid,
      `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`,
      Object.values(campos)
    );
  };
  const busca = { busca_cofundador: true, cofundador_aporta: "producto", cofundador_busca: ["tecnico"], cofundador_dedicacion: "full" };

  const ana = (await alta(U.ana, "ana", busca)).rows[0].id;
  const beto = (await alta(U.beto, "beto", { ...busca, cofundador_aporta: "tecnico", cofundador_busca: ["producto"] })).rows[0].id;
  const caro = (await alta(U.caro, "caro", busca)).rows[0].id;
  const dani = (await alta(U.dani, "dani", busca)).rows[0].id;
  const eli = (await alta(U.eli, "eli", busca)).rows[0].id;
  const fede = (await alta(U.fede, "fede")).rows[0].id; // no busca cofundador

  const interesar = (uid, a, msg = "") => como("authenticated", uid, "select public.cofundador_interesar($1, $2) r", [a, msg]).then((r) => r.rows[0].r);
  const responder = (uid, de, si) => como("authenticated", uid, "select public.cofundador_responder($1, $2) r", [de, si]).then((r) => r.rows[0].r);
  const conexiones = (uid) => como("authenticated", uid, "select * from public.mis_cofundador_conexiones()").then((r) => r.rows);
  const retirar = (uid, a) => como("authenticated", uid, "select public.cofundador_retirar($1)", [a]);
  // La fila tal cual está en la tabla (como superusuario del harness).
  const fila = async (de, a) => (await db.query("select * from public.cofundador_intereses where de = $1 and a = $2", [de, a])).rows[0];

  console.log("\n1) Quién puede mostrar interés");
  await espera("sin sesión no se puede", () => como("anon", null, "select public.cofundador_interesar($1, '')", [beto]), "permission denied");
  await espera("quien no busca cofundador/a no puede mostrar interés", () => interesar(U.fede, ana), "activá");
  await espera("no a uno mismo", () => interesar(U.ana, ana), "inválido");
  await espera("no a alguien que no busca cofundador/a", () => interesar(U.ana, fede), "no está buscando");
  await espera("el mensaje largo se rechaza", () => interesar(U.ana, beto, "x".repeat(281)), "muy largo");

  console.log("\n2) Interés, respuesta y match");
  chequear((await interesar(U.ana, beto, "Hola, soy de producto.")) === "pendiente", "ana le muestra interés a beto → pendiente");
  chequear((await interesar(U.ana, beto)) === "ya_enviado", "repetirlo no duplica → ya_enviado");
  const deBeto = await conexiones(U.beto);
  chequear(deBeto.length === 1 && deBeto[0].tipo === "recibido" && deBeto[0].nombre === "Nombre ana", "beto ve el interés como «recibido»", deBeto);
  chequear(deBeto[0]?.whatsapp === null && deBeto[0]?.email === null, "antes del match NO se entrega WhatsApp ni email");
  chequear(deBeto[0]?.mensaje === "Hola, soy de producto.", "beto lee el mensaje");
  const deAna = await conexiones(U.ana);
  chequear(deAna.length === 1 && deAna[0].tipo === "enviado", "ana lo ve como «enviado»", deAna);
  await espera("ana no puede responder su propio interés", () => responder(U.ana, beto, true), "no hay un interés pendiente");
  chequear((await responder(U.beto, ana, true)) === "aceptado", "beto acepta → aceptado");
  const matchBeto = await conexiones(U.beto);
  const matchAna = await conexiones(U.ana);
  chequear(matchBeto.length === 1 && matchBeto[0].tipo === "match" && matchBeto[0].whatsapp === "3515550000", "beto ve el match con el contacto de ana", matchBeto);
  chequear(matchAna.length === 1 && matchAna[0].tipo === "match" && matchAna[0].email === "beto@mail.com", "ana ve el match con el contacto de beto (quien aceptó y quien pidió lo ven)", matchAna);
  await espera("no se puede responder dos veces", () => responder(U.beto, ana, false), "no hay un interés pendiente");

  console.log("\n3) Pasar y reintentar");
  await interesar(U.caro, ana, "Hola ana, soy caro");
  chequear((await responder(U.ana, caro, false)) === "rechazado", "ana pasa de caro → rechazado");
  const rechazada = await fila(caro, ana);
  chequear(rechazada?.estado === "rechazado" && rechazada.mensaje === "", "al pasar se vacía el mensaje (queda el registro)", rechazada);
  chequear((await conexiones(U.caro)).length === 0, "caro no ve nada de lo rechazado (no se notifica)");
  chequear((await interesar(U.caro, ana)) === "rechazado", "caro no puede volver a pedir → rechazado");

  console.log("\n4) Interés mutuo = match inmediato");
  chequear((await interesar(U.dani, eli, "Hola eli")) === "pendiente", "dani → eli pendiente");
  chequear((await interesar(U.eli, dani, "Hola dani")) === "match", "eli → dani, que ya la había elegido → match");
  const mutDani = await conexiones(U.dani);
  const mutEli = await conexiones(U.eli);
  chequear(mutDani.length === 1 && mutDani[0].tipo === "match", "dani ve UN solo match (hay dos filas, se muestra una)", mutDani);
  chequear(mutEli.length === 1 && mutEli[0].tipo === "match", "eli ve UN solo match", mutEli);

  console.log("\n5) Retirar");
  await interesar(U.beto, caro, "Hola caro, soy beto");
  chequear((await conexiones(U.caro)).filter((c) => c.tipo === "recibido").length === 1, "caro recibe el interés de beto");
  await retirar(U.beto, caro);
  chequear((await conexiones(U.caro)).filter((c) => c.tipo === "recibido").length === 0, "beto lo retira y desaparece para caro");
  chequear((await conexiones(U.beto)).every((c) => c.perfil_id !== caro), "y para beto tampoco aparece");
  const retirada = await fila(beto, caro);
  chequear(retirada?.estado === "retirado" && retirada.mensaje === "", "la fila queda como 'retirado' y sin mensaje", retirada);
  chequear((await interesar(U.beto, caro)) === "retirado", "beto no puede volver a pedirle → retirado");
  chequear((await fila(beto, caro))?.estado === "retirado", "y la fila sigue 'retirado'");
  await retirar(U.ana, beto);
  chequear((await conexiones(U.ana)).filter((c) => c.tipo === "match").length === 1, "retirar no borra un match ya aceptado");

  console.log("\n6) Privacidad y acceso directo");
  await espera("la tabla no se lee directo (authenticated)", () => como("authenticated", U.ana, "select * from public.cofundador_intereses"), "permission denied");
  await espera("la tabla no se lee directo (anon)", () => como("anon", null, "select * from public.cofundador_intereses"), "permission denied");
  await espera("la tabla no se escribe directo", () => como("authenticated", U.ana, "insert into public.cofundador_intereses (de, a) values ($1, $2)", [ana, fede]), "permission denied");
  await espera("anon no ve conexiones", () => como("anon", null, "select * from public.mis_cofundador_conexiones()"), "permission denied");
  const ocultarlo = await como("authenticated", U.eli, "update public.perfiles set oculto = true where id = $1 returning id", [eli]);
  chequear(ocultarlo.rows.length === 1, "eli oculta su perfil");
  chequear((await conexiones(U.dani)).length === 0, "un perfil oculto desaparece de las conexiones del otro lado");
  await como("authenticated", U.eli, "update public.perfiles set oculto = false where id = $1", [eli]);

  console.log("\n7) Tope diario");
  // ana ya tiene uno de hoy (a beto); 18 más a perfiles de relleno (se insertan como superusuario del harness,
  // sin sesión: si no, el guardián les asignaría la sesión anterior como dueña). El 20 lo pide y
  // lo retira: retirar no devuelve el cupo.
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);");
  for (let i = 0; i < 18; i++) {
    const rel = (await db.query(
      `insert into public.perfiles (slug, nombre, tipo, rol, descripcion, consentimiento_at, publicado) values ($1, 'Relleno', 'startup', 'emprendedor', 'x', now(), true) returning id`,
      ["relleno-" + i]
    )).rows[0].id;
    await db.query(`insert into public.cofundador_intereses (de, a) values ($1, $2)`, [ana, rel]);
  }
  chequear((await interesar(U.ana, caro)) === "pendiente", "ana le pide a caro (el 20 del día)");
  await retirar(U.ana, caro);
  await espera("retirarlo no libera el cupo: el siguiente se frena", () => interesar(U.ana, dani), "mucho interés hoy");
  await db.query(`update public.cofundador_intereses set created_at = now() - interval '2 days' where de = $1`, [ana]);
  chequear((await interesar(U.ana, dani)) === "pendiente", "pasado el día, puede volver a pedir");

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
