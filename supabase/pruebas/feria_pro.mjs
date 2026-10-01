// Harness: aplica schema + migraciones de Pecera sobre PGlite (Postgres en WASM) y
// prueba la migración feria_pro (aliados profesionales, WhatsApp internacional, logo
// de empresa, cofounder match y portafolio) con roles y JWT simulados (como
// PostgREST de Supabase). No toca ninguna base real. Mismo armado que feria_lista.mjs.
//
// PGlite no es dependencia de la app: se instala en una carpeta aparte.
//   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
//   copy <repo>\supabase\pruebas\feria_pro.mjs .
//   node feria_pro.mjs <ruta al repo>
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
  "20261003120000_feria_pro.sql",
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
  await db.exec(`grant select on all tables in schema public to service_role;`);

  const U = {
    ana: "11111111-1111-4111-8111-111111111111",
    beto: "22222222-2222-4222-8222-222222222222",
    caro: "33333333-3333-4333-8333-333333333333",
  };
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${U.ana}', 'ana@mail.com', now()), ('${U.beto}', 'beto@mail.com', now()),
      ('${U.caro}', 'caro@mail.com', now());
    update public.ajustes set autopublicar = true;
  `);

  // Alta como lo hace la app (con sesión: pasa por el guardián).
  const alta = (uid, slug, extra = {}) => {
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
    return como(
      "authenticated",
      uid,
      `insert into public.perfiles (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`,
      Object.values(campos)
    );
  };

  console.log("\n1) Aliados profesionales y especialidades nuevas");
  const caro = (
    await alta(U.caro, "caro-mkt", {
      tipo: "profesional",
      rol: "aliado",
      especialidades: ["marketing", "ia_datos", "audiovisual"],
    })
  ).rows[0].id;
  caro ? bien("un aliado puede ser «profesional» con especialidades nuevas") : mal("no se creó");
  await espera("un tipo inventado sigue sin valer", () => alta(U.beto, "beto-x", { tipo: "astronauta" }), "perfiles_tipo_check");
  await espera(
    "una especialidad inventada sigue sin valer",
    () => como("authenticated", U.caro, `update public.perfiles set especialidades = '{magia}' where id = $1`, [caro]),
    "perfiles_especialidades_validas"
  );

  console.log("\n2) WhatsApp de otros países");
  const ana = (await alta(U.ana, "ana-startup", { whatsapp: "3516123456" })).rows[0].id;
  ana ? bien("Argentina sigue con 10 dígitos") : mal("no se creó ana");
  await como("authenticated", U.ana, `update public.perfiles set whatsapp = '+59899123456' where id = $1`, [ana]);
  bien("Uruguay con + y código de país");
  await espera(
    "sin + y con 11 dígitos no vale",
    () => como("authenticated", U.ana, `update public.perfiles set whatsapp = '59899123456' where id = $1`, [ana]),
    "whatsapp"
  );
  await espera(
    "+ con letras no vale",
    () => como("authenticated", U.ana, `update public.perfiles set whatsapp = '+5989912abc' where id = $1`, [ana]),
    "whatsapp"
  );
  await espera(
    "el guardián sigue bloqueando publicado",
    () => como("authenticated", U.ana, `update public.perfiles set publicado = false where id = $1`, [ana]),
    "campo no editable"
  );

  console.log("\n3) Cofounder match");
  await como(
    "authenticated",
    U.ana,
    `update public.perfiles set busca_cofundador = true, cofundador_aporta = 'negocio',
       cofundador_busca = '{tecnico,producto}', cofundador_dedicacion = 'full',
       cofundador_nota = 'Busco CTO para escalar' where id = $1`,
    [ana]
  );
  const pub = (await como("anon", null, `select busca_cofundador, cofundador_busca from public.perfiles where id = $1`, [ana])).rows[0];
  pub?.busca_cofundador && pub.cofundador_busca.length === 2
    ? bien("se guarda y anon lo lee en el perfil visible")
    : mal(`anon ve ${JSON.stringify(pub)}`);
  await espera(
    "aporte inventado no vale",
    () => como("authenticated", U.ana, `update public.perfiles set cofundador_aporta = 'magia' where id = $1`, [ana]),
    "cofundador_aporta"
  );
  await espera(
    "nota de más de 200 no vale",
    () => como("authenticated", U.ana, `update public.perfiles set cofundador_nota = repeat('x', 201) where id = $1`, [ana]),
    "cofundador_nota"
  );

  console.log("\n4) Logo de empresa");
  const slugEmpresa = (
    await como(
      "authenticated",
      U.ana,
      `select public.crear_empresa('Raíz Verde', 'raiz-verde', 'Sustrato de café', null, '{agtech}', 'mvp', 'seed', 'ceo') s`
    )
  ).rows[0].s;
  const empresaId = (await db.query(`select id from public.empresas where slug = $1`, [slugEmpresa])).rows[0].id;
  await como("authenticated", U.ana, `select public.cambiar_logo_empresa($1)`, [`empresa-${empresaId}-0a1b2c3d.jpg`]);
  const logo = (await como("anon", null, `select logo_url from public.empresas where id = $1`, [empresaId])).rows[0]?.logo_url;
  logo === `empresa-${empresaId}-0a1b2c3d.jpg` ? bien("el miembro cambia el logo y anon lo ve") : mal(`logo: ${logo}`);
  await espera(
    "logo con clave de otra empresa no vale",
    () =>
      como("authenticated", U.ana, `select public.cambiar_logo_empresa($1)`, [
        "empresa-00000000-0000-4000-8000-000000000000-0a1b2c3d.jpg",
      ]),
    "logo inválido"
  );
  await espera(
    "quien no está en una empresa no cambia logos",
    () => como("authenticated", U.caro, `select public.cambiar_logo_empresa(null)`),
    "primero sumate"
  );
  await como("authenticated", U.ana, `select public.cambiar_logo_empresa($1)`, [`empresa-${empresaId}-99999999.jpg`]);
  const aBorrar = (
    await db.query(`select count(*)::int n from public.r2_borrar where clave = $1`, [`empresa-${empresaId}-0a1b2c3d.jpg`])
  ).rows[0].n;
  aBorrar === 1 ? bien("el logo viejo queda en r2_borrar") : mal(`r2_borrar: ${aBorrar}`);
  const v2 = (await como("authenticated", U.ana, `select logo_url, es_dueno, miembros from public.mi_empresa_v2()`)).rows[0];
  v2?.logo_url && v2.es_dueno && v2.miembros === 1 ? bien("mi_empresa_v2 devuelve el logo") : mal(`v2: ${JSON.stringify(v2)}`);
  const miembros = (await como("authenticated", U.ana, `select * from public.miembros_mi_empresa()`)).rows;
  miembros.length === 1 && miembros[0].soy_yo && miembros[0].es_dueno
    ? bien("miembros_mi_empresa lista al equipo")
    : mal(`miembros: ${JSON.stringify(miembros)}`);
  const ajenos = (await como("authenticated", U.caro, `select * from public.miembros_mi_empresa()`)).rows;
  ajenos.length === 0 ? bien("quien no es del equipo no ve miembros") : mal("se filtraron miembros");
  await espera("anon no llama mi_empresa_v2", () => como("anon", null, `select * from public.mi_empresa_v2()`), "permission denied");

  console.log("\n5) Portafolio");
  const item = (
    await como(
      "authenticated",
      U.caro,
      `select public.guardar_portafolio(null, 'caso', 'Lanzamiento de Raíz Verde', 'Campaña de 3 meses', 'https://ejemplo.com/caso', true) id`
    )
  ).rows[0].id;
  item ? bien("el aliado carga un caso") : mal("no se cargó");
  await como(
    "authenticated",
    U.caro,
    `select public.guardar_portafolio(null, 'documento', 'Tarifario', null, 'https://ejemplo.com/tarifas.pdf', false)`
  );
  const publico = (await como("anon", null, `select titulo from public.portafolio`)).rows.map((r) => r.titulo);
  publico.length === 1 && publico[0].startsWith("Lanzamiento") ? bien("anon ve solo lo visible") : mal(`anon ve: ${publico}`);
  const propio = (await como("authenticated", U.caro, `select titulo from public.mi_portafolio()`)).rows;
  propio.length === 2 ? bien("el dueño ve también lo oculto") : mal(`propio: ${propio.length}`);
  await espera(
    "no se edita un ítem ajeno",
    () => como("authenticated", U.ana, `select public.guardar_portafolio($1, 'caso', 'hack', null, null, true)`, [item]),
    "ítem inexistente"
  );
  await como("authenticated", U.ana, `select public.borrar_portafolio($1)`, [item]);
  (await db.query(`select count(*)::int n from public.portafolio where id = $1`, [item])).rows[0].n === 1
    ? bien("no se borra un ítem ajeno")
    : mal("se borró un ítem ajeno");
  await espera(
    "url sin https no vale",
    () => como("authenticated", U.caro, `select public.guardar_portafolio(null, 'caso', 'x', null, 'http://inseguro.com', true)`),
    "portafolio_url_check"
  );
  await espera(
    "tipo inventado no vale",
    () => como("authenticated", U.caro, `select public.guardar_portafolio(null, 'magia', 'x', null, null, true)`),
    "portafolio_tipo_check"
  );
  await espera(
    "anon no escribe directo",
    () => como("anon", null, `insert into public.portafolio (perfil_id, tipo, titulo) values ($1, 'caso', 'x')`, [caro]),
    "permission denied"
  );
  for (let i = 0; i < 10; i++) {
    await como("authenticated", U.caro, `select public.guardar_portafolio(null, 'servicio', $1, null, null, true)`, [`S${i}`]);
  }
  await espera(
    "el ítem 13 no entra",
    () => como("authenticated", U.caro, `select public.guardar_portafolio(null, 'servicio', 'extra', null, null, true)`),
    "portafolio lleno"
  );
  await db.exec(`update public.perfiles set oculto = true where id = '${caro}'`);
  const trasOcultar = (await como("anon", null, `select count(*)::int n from public.portafolio`)).rows[0].n;
  trasOcultar === 0 ? bien("si el perfil se oculta, su portafolio deja de verse") : mal(`anon ve ${trasOcultar}`);

  console.log("\n6) Seguir perfiles");
  const D1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const D2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await como("anon", null, `select public.seguir($1, $2)`, [ana, D1]);
  await como("anon", null, `select public.seguir($1, $2)`, [ana, D1]);
  await como("anon", null, `select public.seguir($1, $2)`, [ana, D2]);
  const seguidores = (await como("anon", null, `select public.seguidores_de('ana-startup') n`)).rows[0].n;
  seguidores === 2 ? bien("dos dispositivos siguen a ana (seguir dos veces no suma)") : mal(`seguidores: ${seguidores}`);
  await como("anon", null, `select public.dejar_de_seguir($1, $2)`, [ana, D2]);
  (await como("anon", null, `select public.seguidores_de('ana-startup') n`)).rows[0].n === 1
    ? bien("dejar de seguir resta")
    : mal("dejar de seguir no restó");
  await espera("no se sigue un perfil oculto", () => como("anon", null, `select public.seguir($1, $2)`, [caro, D1]), "perfil inexistente");
  await espera("anon no lee quién sigue a quién", () => como("anon", null, `select * from public.seguidos`), "permission denied");
  for (let i = 0; i < 28; i++) await como("anon", null, `select public.seguir($1, $2)`, [ana, D1]);
  await espera("el seguir 31 del minuto se corta", () => como("anon", null, `select public.seguir($1, $2)`, [ana, D1]), "demasiadas acciones");

  console.log("\n7) Perfil profesional, preferencias y empresa con ubicación");
  await como(
    "authenticated",
    U.ana,
    `update public.perfiles set ubicacion = 'Córdoba, Argentina', experiencia = '5 años en agro',
       educacion = 'Ing. Agrónoma, UNC', skills = '{ventas,agronomia}', busca = '{inversion,cofundador}',
       ofrece = '{mentoria}' where id = $1`,
    [ana]
  );
  const prof = (await como("anon", null, `select ubicacion, skills, busca from public.perfiles where id = $1`, [ana])).rows[0];
  prof?.ubicacion && prof.skills.length === 2 && prof.busca.length === 2
    ? bien("ubicación, skills y qué busca se guardan y se leen")
    : mal(`perfil: ${JSON.stringify(prof)}`);
  await espera(
    "qué busca con un valor inventado no vale",
    () => como("authenticated", U.ana, `update public.perfiles set busca = '{magia}' where id = $1`, [ana]),
    "perfiles_busca_valido"
  );
  await espera(
    "más de 10 skills no vale",
    () => como("authenticated", U.ana, `update public.perfiles set skills = '{a,b,c,d,e,f,g,h,i,j,k}' where id = $1`, [ana]),
    "perfiles_skills_validas"
  );
  await como(
    "authenticated",
    U.ana,
    `select public.editar_empresa_v2('Raíz Verde', 'Sustrato de café', null, null, null, '{agtech}', 'mvp', 'seed', 'Córdoba')`
  );
  const ubic = (await como("authenticated", U.ana, `select ubicacion from public.mi_empresa_v2()`)).rows[0]?.ubicacion;
  ubic === "Córdoba" ? bien("editar_empresa_v2 guarda la ubicación") : mal(`ubicacion: ${ubic}`);
  await espera(
    "quien no es dueño no edita con v2",
    () => como("authenticated", U.caro, `select public.editar_empresa_v2('X', 'Y')`),
    "solo el dueño"
  );

  console.log(`\n${ok} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
