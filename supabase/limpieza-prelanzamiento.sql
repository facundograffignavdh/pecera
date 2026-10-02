-- Pecera: limpieza prelanzamiento. NO es una migración: se corre a mano, una sola
-- vez, en el SQL editor. Borra TODOS los datos de prueba y todas las cuentas.
-- Conserva: eventos, admins, equipo_ingesta, emails_bloqueados, ajustes y r2_borrar.
--
-- ANTES de correrlo: en la hoja "Pecera — Pitches v2" borrar todas las filas de
-- respuestas y dejar solo la de títulos. La ingesta lee la hoja, no el Form, y
-- borrar respuestas en el Form no borra las filas de la hoja. Procesa toda fila sin
-- ingesta 'ok': si quedan filas, la próxima corrida las vuelve a cargar.
-- DESPUÉS: correr la ingesta (manual) para que borre de R2 lo anotado en r2_borrar.
--
-- Prueba en seco: cambiar el `commit` del final por `rollback` y mirar el conteo.

begin;

-- 1) Anotar en r2_borrar todas las claves de R2 (no "/..." del seed ni "http...").
--    Vencen ya: la próxima corrida las borra al arrancar. Si una clave ya estaba
--    anotada, se adelanta su vencimiento y se conservan sus bytes.
insert into public.r2_borrar (clave, bytes, borrar_despues)
select distinct clave, 0, now()
from (
  select video_url  as clave from public.pitches
  union all
  select poster_url from public.pitches
  union all
  select avatar_url from public.perfiles
) c
where clave is not null
  and btrim(clave) <> ''
  and clave !~ '^(/|https?:)'
on conflict (clave) do update
  set borrar_despues = least(public.r2_borrar.borrar_despues, excluded.borrar_despues);

-- 2) Tablas de v2-feria-lista, solo si existen (hijas antes que padres).
--    DELETE (no TRUNCATE) para respetar las FK y no tocar eventos.
do $$
declare
  t text;
begin
  foreach t in array array[
    'public.cofundador_intereses',
    'public.contactos',
    'public.vistas',
    'public.medicion_frecuencia',
    'public.votos',
    'public.evento_participantes',
    'public.empresa_datos',
    'public.empresas_codigos',
    'public.empresas_intentos'
  ] loop
    if to_regclass(t) is not null then
      execute format('delete from %s', t);
    end if;
  end loop;
end;
$$;

-- 3) Datos del feed: hijas antes que padres.
delete from public.piques;
delete from public.piques_frecuencia;
delete from public.envios;
delete from public.pitches;
delete from public.perfiles;
delete from public.ingestas;

-- 4) Empresas (después de perfiles, que las referencian), si existe.
do $$
begin
  if to_regclass('public.empresas') is not null then
    delete from public.empresas;
  end if;
end;
$$;

-- 5) Todas las cuentas. Supabase arrastra por cascada identities, sesiones,
--    refresh tokens y MFA. Lo de public que apuntaba acá ya está vacío.
delete from auth.users;

-- 6) Conteo final: lo borrado debe dar 0; lo conservado muestra lo que quedó.
--    query_to_xml permite contar tablas que quizá no existen sin que falle.
select t as tabla,
       (xpath('/row/n/text()',
              query_to_xml(format('select count(*) as n from %s', t), false, true, '')
       ))[1]::text::bigint as filas
from unnest(array[
  'auth.users', 'public.perfiles', 'public.pitches', 'public.piques',
  'public.piques_frecuencia', 'public.envios', 'public.ingestas',
  'public.empresas', 'public.empresas_codigos', 'public.empresas_intentos',
  'public.empresa_datos', 'public.evento_participantes', 'public.votos',
  'public.cofundador_intereses',
  -- conservadas
  'public.r2_borrar', 'public.eventos', 'public.admins', 'public.equipo_ingesta',
  'public.emails_bloqueados', 'public.ajustes'
]) as t
where to_regclass(t) is not null;

commit;
