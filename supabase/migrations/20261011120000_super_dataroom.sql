-- Pecera: super dataroom (medición de la Feria 21). ADITIVA: solo tablas, funciones y
-- triggers nuevos; no redefine ninguna función existente. Para volver atrás:
-- supabase/rollback-super-dataroom.sql (no es migración). Pruebas sin tocar ninguna
-- base: supabase/pruebas/super_dataroom.mjs (PGlite).
--
-- North Star = CONEXIONES INICIADAS (CI): un toque en un canal de contacto
-- (`contactos`) de un origen a un perfil, sin otro toque del mismo par en las 24 h
-- anteriores. Origen = la cuenta vinculada al dispositivo (si hay) o el dispositivo.
-- El canal no suma. Un toque es una intención, no una reunión: siempre "iniciadas".
--
-- Lo de siempre no cambia: vistas, piques y contactos siguen en sus tablas. Lo nuevo:
--   actividad            eventos append-only (lista cerrada), solo por registrar_actividad
--   dispositivo_cuentas  vínculo dispositivo ↔ cuenta (al iniciar sesión), para el rol del origen
--   dispositivos_equipo  tráfico interno marcado con ?equipo=1
--   feria_franjas        horario de la feria (se edita en el SQL editor)
--   actividad_descartes  lo que frenó el límite (sin dispositivo), para la calidad de datos
--   metricas_hora        agregados por hora (los llena el workflow metricas.yml)
--   demo_day_snapshots   los números congelados para el Demo Day (inmutables)
--
-- Privacidad: nada de IP, geolocalización, user agent (solo la clase celular/compu)
-- ni datos de contacto de quien contacta. Los crudos de `actividad` viven 90 días
-- (podar_actividad, la corre el workflow cada hora). Borrar la cuenta borra el vínculo
-- y, por trigger, todo lo de los dispositivos que quedan sin cuenta.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.feria_franjas (
  desde timestamptz primary key,
  hasta timestamptz not null,
  constraint feria_franjas_orden check (hasta > desde)
);

-- Feria 21: 7 y 8/10 de 9 a 17; 9/10 de 9 a 18 (mañana en la Carpa + Demo Day 14 h).
insert into public.feria_franjas (desde, hasta) values
  ('2026-10-07 09:00:00-03', '2026-10-07 17:00:00-03'),
  ('2026-10-08 09:00:00-03', '2026-10-08 17:00:00-03'),
  ('2026-10-09 09:00:00-03', '2026-10-09 18:00:00-03')
on conflict (desde) do nothing;

create table public.dispositivo_cuentas (
  dispositivo uuid not null,
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  desde       timestamptz not null default now(),
  ultimo      timestamptz not null default now(),
  primary key (dispositivo, usuario_id)
);
create index dispositivo_cuentas_usuario on public.dispositivo_cuentas (usuario_id);

create table public.dispositivos_equipo (
  dispositivo uuid primary key,
  desde       timestamptz not null default now()
);

create table public.actividad (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  nombre      text not null
    constraint actividad_nombre_valido check (nombre in (
      'sesion_iniciada', 'tarjeta_escaneada', 'perfil_abierto', 'pitch_completado',
      'pitch_compartido', 'cuenta_vinculada', 'equipo_marcado', 'motivo_elegido'
    )),
  dispositivo uuid not null,
  sesion      uuid,
  cuenta_id   uuid references auth.users (id) on delete cascade,
  perfil_id   uuid references public.perfiles (id) on delete cascade,
  pitch_id    uuid references public.pitches (id) on delete set null,
  canal       text
    constraint actividad_canal_valido check (canal in (
      'whatsapp', 'email', 'linkedin', 'instagram', 'web', 'nativo', 'copiado'
    )),
  fuente      text constraint actividad_fuente_valida   check (fuente   ~ '^[a-z0-9_.-]{1,40}$'),
  medio       text constraint actividad_medio_valido    check (medio    ~ '^[a-z0-9_.-]{1,40}$'),
  campania    text constraint actividad_campania_valida check (campania ~ '^[a-z0-9_.-]{1,40}$'),
  -- Número de stand: s16.
  tarjeta_id  text constraint actividad_tarjeta_valida  check (tarjeta_id ~ '^s[0-9]{1,4}$'),
  en_feria    boolean not null,
  clase       text constraint actividad_clase_valida check (clase in ('celular', 'compu')),
  props       jsonb not null default '{}'::jsonb
    constraint actividad_props_chicas check (pg_column_size(props) < 256)
);
create index actividad_nombre_ts on public.actividad (nombre, ts);
create index actividad_dispositivo_ts on public.actividad (dispositivo, ts);
create index actividad_cuenta on public.actividad (cuenta_id) where cuenta_id is not null;

create table public.actividad_descartes (
  minuto   timestamptz not null,
  nombre   text not null,
  cantidad integer not null default 1,
  primary key (minuto, nombre)
);

-- Una fila por hora. Las columnas "de la hora" cuentan lo de esa hora; las "_acum" y
-- las de proyectos, desde el inicio de la feria (metrica_inicio) hasta el fin de esa
-- hora. `logica` = versión de las fórmulas: si cambian, las filas viejas no se tocan.
create table public.metricas_hora (
  hora                      timestamptz primary key,
  logica                    integer not null,
  ci                        integer not null,
  ci_q                      integer not null,
  ci_acum                   integer not null,
  ci_q_acum                 integer not null,
  proyectos                 integer not null,
  proyectos_con_ci          integer not null,
  proyectos_con_ciq         integer not null,
  vistas                    integer not null,
  vistas_fuera_horario      integer not null,
  pct_vistas_fuera_horario  numeric,
  dispositivos              integer not null,
  sesiones                  integer not null,
  detalle                   jsonb not null default '{}'::jsonb,
  calculado_at              timestamptz not null default now()
);

create table public.demo_day_snapshots (
  id                        bigint generated always as identity primary key,
  creado_at                 timestamptz not null default now(),
  logica                    integer not null,
  desde                     timestamptz not null,
  hasta                     timestamptz not null,
  ci                        integer not null,
  ci_q                      integer not null,
  proyectos                 integer not null,
  ci_por_participante       numeric,
  liquidez                  numeric,
  liquidez_q                numeric,
  pct_vistas_fuera_horario  numeric,
  detalle                   jsonb not null default '{}'::jsonb
);

-- RLS sin políticas: anon y authenticated no leen ni escriben. Las funciones sí.
alter table public.feria_franjas        enable row level security;
alter table public.dispositivo_cuentas  enable row level security;
alter table public.dispositivos_equipo  enable row level security;
alter table public.actividad            enable row level security;
alter table public.actividad_descartes  enable row level security;
alter table public.metricas_hora        enable row level security;
alter table public.demo_day_snapshots   enable row level security;
revoke all on public.feria_franjas        from anon, authenticated;
revoke all on public.dispositivo_cuentas  from anon, authenticated;
revoke all on public.dispositivos_equipo  from anon, authenticated;
revoke all on public.actividad            from anon, authenticated;
revoke all on public.actividad_descartes  from anon, authenticated;
revoke all on public.metricas_hora        from anon, authenticated;
revoke all on public.demo_day_snapshots   from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- actividad es append-only: se agrega o se borra (poda, cuenta borrada), nunca se cambia.
create function public.actividad_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'actividad no se modifica' using errcode = '42501';
end;
$$;

create trigger actividad_sin_update
  before update on public.actividad
  for each row execute function public.actividad_inmutable();

-- Los snapshots del Demo Day no se cambian ni se borran (TRUNCATE en
-- limpieza-prelanzamiento.sql sí, porque no dispara triggers de fila).
create function public.demo_day_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'el snapshot del Demo Day no se modifica' using errcode = '42501';
end;
$$;

create trigger demo_day_sin_cambios
  before update or delete on public.demo_day_snapshots
  for each row execute function public.demo_day_inmutable();

-- Al borrarse un vínculo (en cascada desde auth.users, o sea borrar_mi_cuenta): si el
-- dispositivo ya no tiene ninguna cuenta, se borra todo lo hecho desde él.
create function public.dispositivo_cuentas_al_borrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.dispositivo_cuentas where dispositivo = old.dispositivo) then
    delete from public.actividad           where dispositivo = old.dispositivo;
    delete from public.dispositivos_equipo where dispositivo = old.dispositivo;
    delete from public.piques              where dispositivo = old.dispositivo;
    delete from public.piques_frecuencia   where dispositivo = old.dispositivo;
    delete from public.vistas              where dispositivo = old.dispositivo;
    delete from public.contactos           where dispositivo = old.dispositivo;
    delete from public.seguidos            where dispositivo = old.dispositivo;
    delete from public.medicion_frecuencia where dispositivo = old.dispositivo;
  end if;
  return null;
end;
$$;

create trigger dispositivo_cuentas_limpiar
  after delete on public.dispositivo_cuentas
  for each row execute function public.dispositivo_cuentas_al_borrar();

-- ---------------------------------------------------------------------------
-- Ayudantes internos (sin grant)
-- ---------------------------------------------------------------------------

create function public.en_horario_feria(p_ts timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.feria_franjas f where p_ts >= f.desde and p_ts < f.hasta);
$$;

-- Comienzo del día (hora argentina) de un momento.
create function public.metrica_dia(p_ts timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((p_ts at time zone 'America/Argentina/Buenos_Aires')::date)::timestamp
         at time zone 'America/Argentina/Buenos_Aires';
$$;

-- Desde cuándo se cuenta lo acumulado: el comienzo del primer día de la feria.
create function public.metrica_inicio()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select public.metrica_dia(coalesce(
    (select min(f.desde) from public.feria_franjas f),
    timestamptz '2026-10-07 00:00:00-03'
  ));
$$;

-- Cuentas del equipo: admins, equipo de la ingesta y dueñas de perfiles de prueba o
-- del perfil oficial de Pecera.
create function public.metrica_cuentas_equipo()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u
  where exists (select 1 from public.admins a where a.email = lower(btrim(u.email)))
     or exists (select 1 from public.equipo_ingesta e where e.email = lower(btrim(u.email)))
  union
  select p.usuario_id from public.perfiles p
  where p.usuario_id is not null and (p.slug like 'test-%' or p.slug = 'pecera');
$$;

-- Dispositivos internos: marcados con ?equipo=1 o vinculados alguna vez a una cuenta del equipo.
create function public.metrica_dispositivos_equipo()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select q.dispositivo from public.dispositivos_equipo q
  union
  select dc.dispositivo from public.dispositivo_cuentas dc
  where dc.usuario_id in (select public.metrica_cuentas_equipo());
$$;

-- Perfiles que no son participantes: los de prueba, el oficial de Pecera y los del equipo.
create function public.metrica_perfiles_equipo()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.perfiles p
  where p.slug like 'test-%' or p.slug = 'pecera'
     or (p.usuario_id is not null and p.usuario_id in (select public.metrica_cuentas_equipo()));
$$;

-- Proyectos (participantes): perfiles visibles con al menos un pitch publicado y no
-- oculto, sin los del equipo.
create function public.metrica_proyectos()
returns table (perfil_id uuid, rol text, industria text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.rol,
    coalesce(p.industrias[1], (select e.industrias[1] from public.empresas e where e.id = p.empresa_id))
  from public.perfiles p
  where p.publicado and not p.oculto
    and p.id not in (select public.metrica_perfiles_equipo())
    and exists (
      select 1 from public.pitches x
      where x.perfil_id = p.id and x.publicado and not x.oculto
    );
$$;

-- Las conexiones iniciadas en [p_desde, p_hasta), una fila por CI. Mira los toques
-- desde 24 h antes para saber si cada uno abre una conexión nueva.
--   origen: 'c:<cuenta>' o 'd:<dispositivo>'
--   calificada (CI-Q): origen = cuenta con perfil inversor o aliado, destino emprendedor
--   fuente/tarjeta: la última sesión o tarjeta del dispositivo antes del toque (last-touch)
create function public.metrica_ci(p_desde timestamptz, p_hasta timestamptz)
returns table (
  ts timestamptz, origen text, cuenta uuid, dispositivo uuid, destino uuid, canal text,
  pitch_id uuid, rol_origen text, rol_destino text, calificada boolean,
  fuente text, tarjeta text, en_feria boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with cuentas_equipo as (select public.metrica_cuentas_equipo() as id),
  disp_equipo as (select public.metrica_dispositivos_equipo() as dispositivo),
  perfiles_equipo as (select public.metrica_perfiles_equipo() as id),
  toques as (
    select c.created_at as ts, c.perfil_id as destino, c.canal, c.pitch_id, c.dispositivo,
      coalesce(
        (select dc.usuario_id from public.dispositivo_cuentas dc
          where dc.dispositivo = c.dispositivo and dc.desde <= c.created_at
          order by dc.desde desc limit 1),
        (select dc.usuario_id from public.dispositivo_cuentas dc
          where dc.dispositivo = c.dispositivo
          order by dc.desde limit 1)
      ) as cuenta
    from public.contactos c
    where c.created_at >= p_desde - interval '24 hours' and c.created_at < p_hasta
      and c.perfil_id not in (select id from perfiles_equipo)
      and c.dispositivo not in (select dispositivo from disp_equipo)
  ),
  limpios as (
    select t.*, coalesce('c:' || t.cuenta::text, 'd:' || t.dispositivo::text) as origen
    from toques t
    where (t.cuenta is null or t.cuenta not in (select id from cuentas_equipo))
      -- Tocar los canales del perfil propio no es una conexión.
      and not exists (
        select 1 from public.perfiles p where p.id = t.destino and p.usuario_id = t.cuenta
      )
  ),
  marcados as (
    select l.*, lag(l.ts) over (partition by l.origen, l.destino order by l.ts) as previo
    from limpios l
  )
  select m.ts, m.origen, m.cuenta, m.dispositivo, m.destino, m.canal, m.pitch_id,
    o.rol, d.rol,
    coalesce(o.rol in ('inversor', 'aliado') and d.rol = 'emprendedor', false),
    coalesce(f.fuente, 'directo'), f.tarjeta_id,
    coalesce(f.fuente = 'nfc', false) or public.en_horario_feria(m.ts)
  from marcados m
  join public.perfiles d on d.id = m.destino
  left join public.perfiles o on m.cuenta is not null and o.usuario_id = m.cuenta
  left join lateral (
    select a.fuente, a.tarjeta_id from public.actividad a
    where a.dispositivo = m.dispositivo
      and a.nombre in ('sesion_iniciada', 'tarjeta_escaneada')
      and a.ts <= m.ts
    order by a.ts desc, (a.nombre = 'tarjeta_escaneada') desc
    limit 1
  ) f on true
  where m.ts >= p_desde
    and (m.previo is null or m.ts - m.previo >= interval '24 hours');
$$;

-- Vistas en [p_desde, p_hasta) sin tráfico interno ni perfiles del equipo.
create function public.metrica_vistas(p_desde timestamptz, p_hasta timestamptz)
returns table (ts timestamptz, pitch_id uuid, perfil_id uuid, dispositivo uuid, fuera_horario boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.created_at, v.pitch_id, x.perfil_id, v.dispositivo, not public.en_horario_feria(v.created_at)
  from public.vistas v
  join public.pitches x on x.id = v.pitch_id
  where v.created_at >= p_desde and v.created_at < p_hasta
    and x.perfil_id not in (select public.metrica_perfiles_equipo())
    and v.dispositivo not in (select public.metrica_dispositivos_equipo());
$$;

-- Actividad en [p_desde, p_hasta) sin tráfico interno.
create function public.metrica_actividad(p_desde timestamptz, p_hasta timestamptz)
returns setof public.actividad
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.actividad a
  where a.ts >= p_desde and a.ts < p_hasta
    and a.dispositivo not in (select public.metrica_dispositivos_equipo())
    and (a.cuenta_id is null or a.cuenta_id not in (select public.metrica_cuentas_equipo()));
$$;

-- Los números principales en [p_desde, p_hasta). Liquidez y proyectos: proyectos de
-- hoy (los visibles ahora) con al menos una CI (o CI-Q) en el período.
create function public.metrica_resumen(p_desde timestamptz, p_hasta timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ci as (select * from public.metrica_ci(p_desde, p_hasta)),
  pr as (select * from public.metrica_proyectos()),
  vi as (select * from public.metrica_vistas(p_desde, p_hasta)),
  n as (
    select
      (select count(*) from ci)::integer as ci,
      (select count(*) from ci where calificada)::integer as ci_q,
      (select count(*) from pr)::integer as proyectos,
      (select count(*) from pr where pr.perfil_id in (select destino from ci))::integer as con_ci,
      (select count(*) from pr where pr.perfil_id in (select destino from ci where calificada))::integer as con_ciq,
      (select count(*) from ci where ci.destino in (select perfil_id from pr))::integer as ci_participantes,
      (select count(*) from vi)::integer as vistas,
      (select count(*) from vi where fuera_horario)::integer as vistas_fuera
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'ci', n.ci,
    'ci_q', n.ci_q,
    'proyectos', n.proyectos,
    'proyectos_con_ci', n.con_ci,
    'proyectos_con_ciq', n.con_ciq,
    'ci_por_participante', case when n.proyectos > 0 then round(n.ci_participantes::numeric / n.proyectos, 2) end,
    'liquidez', case when n.proyectos > 0 then round(n.con_ci::numeric / n.proyectos, 4) end,
    'liquidez_q', case when n.proyectos > 0 then round(n.con_ciq::numeric / n.proyectos, 4) end,
    'vistas', n.vistas,
    'vistas_fuera_horario', n.vistas_fuera,
    'pct_vistas_fuera_horario', case when n.vistas > 0 then round(n.vistas_fuera::numeric / n.vistas, 4) end
  )
  from n;
$$;

-- ---------------------------------------------------------------------------
-- Escritura desde la app
-- ---------------------------------------------------------------------------

-- Registra un evento de la lista cerrada. Devuelve false si el límite (60 por minuto
-- por dispositivo) lo descartó; los descartes se cuentan sin dispositivo. cuenta_id y
-- en_feria los decide el servidor. fuente/medio/campania/clase que no cumplen el
-- formato se guardan vacíos (el evento vale igual).
create function public.registrar_actividad(
  p_nombre      text,
  p_dispositivo uuid,
  p_sesion      uuid default null,
  p_perfil      uuid default null,
  p_pitch       uuid default null,
  p_canal       text default null,
  p_fuente      text default null,
  p_medio       text default null,
  p_campania    text default null,
  p_tarjeta     text default null,
  p_clase       text default null,
  p_props       jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_props    jsonb := coalesce(p_props, '{}'::jsonb);
  v_claves   text[];
  v_perfil   uuid := p_perfil;
  v_fuente   text := case when p_fuente   ~ '^[a-z0-9_.-]{1,40}$' then p_fuente end;
  v_medio    text := case when p_medio    ~ '^[a-z0-9_.-]{1,40}$' then p_medio end;
  v_campania text := case when p_campania ~ '^[a-z0-9_.-]{1,40}$' then p_campania end;
  v_tarjeta  text := case when p_tarjeta  ~ '^s[0-9]{1,4}$' then p_tarjeta end;
  v_clase    text := case when p_clase in ('celular', 'compu') then p_clase end;
  v_cuenta   uuid;
  v_acciones integer;
begin
  -- cuenta_vinculada y equipo_marcado los escriben vincular_dispositivo y marcar_equipo.
  if p_dispositivo is null or p_nombre is null or p_nombre not in (
    'sesion_iniciada', 'tarjeta_escaneada', 'perfil_abierto',
    'pitch_completado', 'pitch_compartido', 'motivo_elegido'
  ) then
    raise exception 'evento inválido' using errcode = '22023';
  end if;

  -- props: un objeto chico con claves de una lista blanca por evento y valores cortos.
  v_claves := case p_nombre
    when 'sesion_iniciada' then array['primera_fuente', 'primera_medio', 'primera_campania', 'primera_tarjeta']
    when 'perfil_abierto'  then array['desde']
    when 'motivo_elegido'  then array['motivo']
    else array[]::text[]
  end;
  if jsonb_typeof(v_props) <> 'object' or pg_column_size(v_props) >= 256 or exists (
    select 1 from jsonb_each(v_props) e
    where not (e.key = any (v_claves))
       or jsonb_typeof(e.value) <> 'string'
       or (e.value #>> '{}') !~ '^[a-z0-9_.-]{1,40}$'
  ) then
    raise exception 'props inválidas' using errcode = '22023';
  end if;
  if (p_nombre = 'perfil_abierto' and coalesce(v_props ->> 'desde', 'otro')
        not in ('feed', 'explorar', 'tarjeta', 'directo', 'otro'))
     or (p_nombre = 'motivo_elegido' and coalesce(v_props ->> 'motivo', '')
        not in ('inversion', 'alianza', 'cliente', 'cofundador', 'otro'))
     or (v_props ? 'primera_tarjeta' and (v_props ->> 'primera_tarjeta') !~ '^s[0-9]{1,4}$') then
    raise exception 'props inválidas' using errcode = '22023';
  end if;

  -- El canal: compartir (nativo/copiado) o el canal del contacto en el motivo.
  if p_canal is not null and not (
    (p_nombre = 'pitch_compartido' and p_canal in ('nativo', 'copiado'))
    or (p_nombre = 'motivo_elegido' and p_canal in ('whatsapp', 'email', 'linkedin', 'instagram', 'web'))
  ) then
    raise exception 'canal inválido' using errcode = '22023';
  end if;

  -- Perfil y pitch tienen que ser visibles. El pitch completado trae su perfil.
  if p_pitch is not null then
    select x.perfil_id into v_perfil
    from public.pitches x
    join public.perfiles pe on pe.id = x.perfil_id
    where x.id = p_pitch and x.publicado and not x.oculto and pe.publicado and not pe.oculto
      and (p_perfil is null or x.perfil_id = p_perfil);
    if v_perfil is null then
      raise exception 'pitch inexistente' using errcode = '22023';
    end if;
  elsif v_perfil is not null and not exists (
    select 1 from public.perfiles where id = v_perfil and publicado and not oculto
  ) then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;

  if (p_nombre in ('tarjeta_escaneada', 'perfil_abierto', 'pitch_compartido', 'motivo_elegido') and v_perfil is null)
     or (p_nombre = 'pitch_completado' and p_pitch is null)
     or (p_nombre = 'tarjeta_escaneada' and (v_tarjeta is null or v_fuente is distinct from 'nfc')) then
    raise exception 'evento incompleto' using errcode = '22023';
  end if;

  -- Límite sin error: lo que pasa el tope se cuenta en actividad_descartes.
  insert into public.medicion_frecuencia as f (dispositivo, tipo, ventana, acciones)
  values (p_dispositivo, 'actividad', now(), 1)
  on conflict (dispositivo, tipo) do update set
    ventana  = case when f.ventana < now() - interval '1 minute' then now() else f.ventana end,
    acciones = case when f.ventana < now() - interval '1 minute' then 1 else f.acciones + 1 end
  returning acciones into v_acciones;

  if v_acciones > 60 then
    insert into public.actividad_descartes as d (minuto, nombre, cantidad)
    values (date_trunc('minute', now()), p_nombre, 1)
    on conflict (minuto, nombre) do update set cantidad = d.cantidad + 1;
    return false;
  end if;

  v_cuenta := coalesce(
    auth.uid(),
    (select dc.usuario_id from public.dispositivo_cuentas dc
      where dc.dispositivo = p_dispositivo order by dc.desde desc limit 1)
  );

  insert into public.actividad (
    nombre, dispositivo, sesion, cuenta_id, perfil_id, pitch_id, canal,
    fuente, medio, campania, tarjeta_id, en_feria, clase, props
  ) values (
    p_nombre, p_dispositivo, p_sesion, v_cuenta, v_perfil, p_pitch, p_canal,
    v_fuente, v_medio, v_campania, v_tarjeta,
    coalesce(v_fuente = 'nfc', false) or public.en_horario_feria(now()),
    v_clase, v_props
  );
  return true;
end;
$$;

-- Vincula el dispositivo con la cuenta de la sesión (se llama al iniciar sesión).
-- Nunca falla por datos: sin dispositivo devuelve false. Devuelve true si es nuevo.
create function public.vincular_dispositivo(p_dispositivo uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_nuevo boolean;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_dispositivo is null then
    return false;
  end if;

  perform public.medicion_limitar(p_dispositivo, 'vincular', 10);

  insert into public.dispositivo_cuentas as dc (dispositivo, usuario_id)
  values (p_dispositivo, v_uid)
  on conflict (dispositivo, usuario_id) do update set ultimo = now()
  returning (xmax = 0) into v_nuevo;

  if v_nuevo then
    insert into public.actividad (nombre, dispositivo, cuenta_id, en_feria)
    values ('cuenta_vinculada', p_dispositivo, v_uid, public.en_horario_feria(now()));
  end if;
  return v_nuevo;
end;
$$;

-- ?equipo=1: este dispositivo deja de contar en las métricas. Solo marca el propio
-- (hay que conocer el uuid), así que no sirve para sacar a nadie más.
create function public.marcar_equipo(p_dispositivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_dispositivo is null then
    raise exception 'dispositivo inválido' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'equipo', 10);

  insert into public.dispositivos_equipo (dispositivo) values (p_dispositivo)
  on conflict (dispositivo) do nothing;
  if found then
    insert into public.actividad (nombre, dispositivo, cuenta_id, en_feria)
    values ('equipo_marcado', p_dispositivo, auth.uid(), public.en_horario_feria(now()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Snapshots por hora y retención (solo service_role: workflow metricas.yml)
-- ---------------------------------------------------------------------------

-- Borra la actividad cruda y los descartes de más de 90 días. Quedan los agregados.
create function public.podar_actividad()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  delete from public.actividad where ts < now() - interval '90 days';
  get diagnostics v_n = row_count;
  delete from public.actividad_descartes where minuto < now() - interval '90 days';
  return v_n;
end;
$$;

-- Calcula (o recalcula) las últimas 26 horas: así tapa las corridas atrasadas o
-- salteadas del cron de GitHub. La hora en curso queda parcial hasta la próxima.
create function public.snapshot_metricas_hora()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := public.metrica_inicio();
  v_hora   timestamptz;
  v_fin    timestamptz;
  v_horas  integer := 0;
  v_acum   jsonb;
  v_podadas integer;
begin
  for v_hora in
    select generate_series(date_trunc('hour', now()) - interval '25 hours', date_trunc('hour', now()), interval '1 hour')
  loop
    v_fin := v_hora + interval '1 hour';
    v_acum := case when v_fin > v_inicio then public.metrica_resumen(v_inicio, v_fin) end;

    with h as (select * from public.metrica_ci(v_hora, v_fin))
    insert into public.metricas_hora as m (
      hora, logica, ci, ci_q, ci_acum, ci_q_acum, proyectos, proyectos_con_ci, proyectos_con_ciq,
      vistas, vistas_fuera_horario, pct_vistas_fuera_horario, dispositivos, sesiones, detalle, calculado_at
    )
    select
      v_hora, 1,
      (select count(*) from h)::integer,
      (select count(*) from h where h.calificada)::integer,
      coalesce((v_acum ->> 'ci')::integer, 0),
      coalesce((v_acum ->> 'ci_q')::integer, 0),
      coalesce((v_acum ->> 'proyectos')::integer, 0),
      coalesce((v_acum ->> 'proyectos_con_ci')::integer, 0),
      coalesce((v_acum ->> 'proyectos_con_ciq')::integer, 0),
      (select count(*) from public.metrica_vistas(v_hora, v_fin))::integer,
      (select count(*) from public.metrica_vistas(v_hora, v_fin) w where w.fuera_horario)::integer,
      (v_acum ->> 'pct_vistas_fuera_horario')::numeric,
      (select count(distinct x.d) from (
         select a.dispositivo d from public.metrica_actividad(v_hora, v_fin) a
         union all
         select w.dispositivo from public.metrica_vistas(v_hora, v_fin) w
       ) x)::integer,
      (select count(*) from public.metrica_actividad(v_hora, v_fin) a where a.nombre = 'sesion_iniciada')::integer,
      jsonb_build_object(
        'por_fuente', coalesce((select jsonb_object_agg(k.fuente, k.n) from (
            select h.fuente, count(*) n from h group by h.fuente) k), '{}'::jsonb),
        'por_tarjeta', coalesce((select jsonb_object_agg(k.tarjeta, k.n) from (
            select h.tarjeta, count(*) n from h where h.tarjeta is not null group by h.tarjeta) k), '{}'::jsonb),
        'roles', coalesce((select jsonb_object_agg(k.par, k.n) from (
            select coalesce(h.rol_origen, 'anonimo') || '>' || h.rol_destino as par, count(*) n
            from h group by 1) k), '{}'::jsonb)
      ),
      now()
    on conflict (hora) do update set
      logica = excluded.logica, ci = excluded.ci, ci_q = excluded.ci_q,
      ci_acum = excluded.ci_acum, ci_q_acum = excluded.ci_q_acum,
      proyectos = excluded.proyectos, proyectos_con_ci = excluded.proyectos_con_ci,
      proyectos_con_ciq = excluded.proyectos_con_ciq, vistas = excluded.vistas,
      vistas_fuera_horario = excluded.vistas_fuera_horario,
      pct_vistas_fuera_horario = excluded.pct_vistas_fuera_horario,
      dispositivos = excluded.dispositivos, sesiones = excluded.sesiones,
      detalle = excluded.detalle, calculado_at = excluded.calculado_at;
    v_horas := v_horas + 1;
  end loop;

  v_podadas := public.podar_actividad();
  return jsonb_build_object('horas', v_horas, 'podadas', v_podadas);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lectura para el equipo (/admin)
-- ---------------------------------------------------------------------------

-- Pantalla del stand (/admin/vivo): solo agregados. El ticker dice la industria del
-- proyecto solo si esa industria tiene 5 proyectos o más, nada de quién contactó, y
-- con 2 minutos de demora. Con menos de 5 proyectos, el % va vacío.
create function public.admin_vivo()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoy    timestamptz := public.metrica_dia(now());
  v_inicio timestamptz := least(public.metrica_inicio(), public.metrica_dia(now()));
  v        jsonb;
begin
  perform public.exigir_admin();

  with pr as (select * from public.metrica_proyectos()),
  industrias as (
    select pr.industria, count(*) as n from pr where pr.industria is not null group by pr.industria
  ),
  con_ci as (select distinct c.destino from public.metrica_ci(v_inicio, now()) c),
  ticker as (
    select c.ts, case when i.n >= 5 then p.industria end as industria
    from public.metrica_ci(now() - interval '2 hours', now() - interval '2 minutes') c
    join pr p on p.perfil_id = c.destino
    left join industrias i on i.industria = p.industria
    order by c.ts desc
    limit 8
  )
  select jsonb_build_object(
    'ci_hoy', (select count(*) from public.metrica_ci(v_hoy, now()))::integer,
    'proyectos', (select count(*) from pr)::integer,
    'proyectos_con_ci', case when (select count(*) from pr) >= 5
      then (select count(*) from pr where pr.perfil_id in (select destino from con_ci))::integer end,
    'pitches_vistos_hoy', (select count(distinct w.pitch_id) from public.metrica_vistas(v_hoy, now()) w)::integer,
    'ticker', coalesce((
      select jsonb_agg(jsonb_build_object(
        'minutos', floor(extract(epoch from now() - t.ts) / 60)::integer,
        'industria', t.industria
      ) order by t.ts desc)
      from ticker t
    ), '[]'::jsonb),
    'actualizado', now()
  ) into v;
  return v;
end;
$$;

-- El dataroom de /admin, por secciones. p_fuente filtra el embudo (null = todas;
-- 'directo' = sin fuente).
create function public.admin_dataroom(
  p_desde  timestamptz default null,
  p_hasta  timestamptz default null,
  p_fuente text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := coalesce(p_desde, public.metrica_inicio());
  v_hasta timestamptz := coalesce(p_hasta, now());
  v_curva jsonb;
  v_embudo jsonb;
  v_liquidez jsonb;
  v_matriz jsonb;
  v_atribucion jsonb;
  v_cohortes jsonb;
  v_calidad jsonb;
begin
  perform public.exigir_admin();

  -- Curva por hora (de los snapshots).
  select coalesce(jsonb_agg(jsonb_build_object(
    'hora', m.hora, 'ci', m.ci, 'ci_q', m.ci_q, 'ci_acum', m.ci_acum, 'ci_q_acum', m.ci_q_acum,
    'vistas', m.vistas, 'sesiones', m.sesiones
  ) order by m.hora), '[]'::jsonb)
  into v_curva
  from public.metricas_hora m
  where m.hora >= date_trunc('hour', v_desde) and m.hora < v_hasta;

  -- Embudo por dispositivo y día: visita → vista ≥ 3 s → perfil → contacto (CI). Cada
  -- paso cuenta los dispositivos-día que lo hicieron (no exige el paso anterior: el
  -- contacto del pop-up no pasa por el perfil).
  with act as (select * from public.metrica_actividad(v_desde, v_hasta)),
  vis as (select * from public.metrica_vistas(v_desde, v_hasta)),
  ci as (select * from public.metrica_ci(v_desde, v_hasta)),
  base as (
    select a.dispositivo, public.metrica_dia(a.ts) as dia from act a
    union select w.dispositivo, public.metrica_dia(w.ts) from vis w
    union select c.dispositivo, public.metrica_dia(c.ts) from ci c
  ),
  fuente_dia as (
    select distinct on (a.dispositivo, public.metrica_dia(a.ts))
      a.dispositivo, public.metrica_dia(a.ts) as dia, coalesce(a.fuente, 'directo') as fuente
    from act a
    where a.nombre in ('sesion_iniciada', 'tarjeta_escaneada')
    order by a.dispositivo, public.metrica_dia(a.ts), a.ts
  ),
  b as (
    select base.dispositivo, base.dia from base
    left join fuente_dia f on f.dispositivo = base.dispositivo and f.dia = base.dia
    where p_fuente is null or coalesce(f.fuente, 'directo') = p_fuente
  )
  select jsonb_build_object(
    'fuente', p_fuente,
    'visitas', count(*),
    'con_vista', count(*) filter (where exists (
      select 1 from vis w where w.dispositivo = b.dispositivo and public.metrica_dia(w.ts) = b.dia)),
    'con_perfil', count(*) filter (where exists (
      select 1 from act a where a.nombre = 'perfil_abierto' and a.dispositivo = b.dispositivo
        and public.metrica_dia(a.ts) = b.dia)),
    'con_contacto', count(*) filter (where exists (
      select 1 from ci c where c.dispositivo = b.dispositivo and public.metrica_dia(c.ts) = b.dia))
  )
  into v_embudo
  from b;

  -- Liquidez y concentración.
  with pr as (select * from public.metrica_proyectos()),
  ci as (select * from public.metrica_ci(v_desde, v_hasta)),
  vis as (select * from public.metrica_vistas(v_desde, v_hasta)),
  por as (
    select pr.perfil_id,
      (select count(*) from ci where ci.destino = pr.perfil_id)::integer as n,
      (select count(*) from vis where vis.perfil_id = pr.perfil_id)::integer as v
    from pr
  ),
  orden as (select por.*, row_number() over (order by por.n desc) as puesto from por),
  tope as (select greatest(ceil(count(*) * 0.1), 1)::integer as k from por)
  select jsonb_build_object(
    'histograma', jsonb_build_object(
      '0',    count(*) filter (where o.n = 0),
      '1',    count(*) filter (where o.n = 1),
      '2',    count(*) filter (where o.n = 2),
      '3-5',  count(*) filter (where o.n between 3 and 5),
      '6-10', count(*) filter (where o.n between 6 and 10),
      '11+',  count(*) filter (where o.n > 10)
    ),
    'top10_pct', case when sum(o.n) > 0 then round(
      (coalesce(sum(o.n) filter (where o.puesto <= (select k from tope)), 0))::numeric / sum(o.n), 4) end,
    'ceros', coalesce((
      select jsonb_agg(jsonb_build_object('slug', p.slug, 'nombre', p.nombre, 'vistas', o2.v)
                       order by o2.v desc, p.nombre)
      from orden o2 join public.perfiles p on p.id = o2.perfil_id
      where o2.v > 0 and o2.n = 0
    ), '[]'::jsonb)
  )
  into v_liquidez
  from orden o;

  -- Matriz rol → rol y reciprocidad (entre perfiles con cuenta).
  with ci as (select * from public.metrica_ci(v_desde, v_hasta)),
  pares as (
    select distinct o.id as a, c.destino as b
    from ci c join public.perfiles o on o.usuario_id = c.cuenta
  )
  select jsonb_build_object(
    'roles', coalesce((
      select jsonb_object_agg(k.par, k.n) from (
        select coalesce(c.rol_origen, 'anonimo') || '>' || c.rol_destino as par, count(*) as n
        from ci c group by 1
      ) k
    ), '{}'::jsonb),
    'pares_con_cuenta', (select count(*) from pares),
    'pares_reciprocos', (select count(*) from pares p where p.a < p.b
      and exists (select 1 from pares q where q.a = p.b and q.b = p.a))
  )
  into v_matriz;

  -- Atribución por fuente y por tarjeta.
  with act as (select * from public.metrica_actividad(v_desde, v_hasta)),
  ci as (select * from public.metrica_ci(v_desde, v_hasta))
  select jsonb_build_object(
    'por_fuente', coalesce((
      select jsonb_object_agg(f.fuente, jsonb_build_object('dispositivos', f.d, 'ci', f.n))
      from (
        select x.fuente,
          count(distinct x.dispositivo) filter (where x.es_sesion) as d,
          count(*) filter (where not x.es_sesion) as n
        from (
          select coalesce(a.fuente, 'directo') as fuente, a.dispositivo, true as es_sesion
          from act a where a.nombre = 'sesion_iniciada'
          union all
          select c.fuente, c.dispositivo, false from ci c
        ) x
        group by x.fuente
      ) f
    ), '{}'::jsonb),
    'por_tarjeta', coalesce((
      select jsonb_object_agg(t.tarjeta, jsonb_build_object('escaneos', t.e, 'dispositivos', t.d, 'ci', t.n))
      from (
        select x.tarjeta,
          count(*) filter (where x.es_escaneo) as e,
          count(distinct x.dispositivo) filter (where x.es_escaneo) as d,
          count(*) filter (where not x.es_escaneo) as n
        from (
          select a.tarjeta_id as tarjeta, a.dispositivo, true as es_escaneo
          from act a where a.nombre = 'tarjeta_escaneada'
          union all
          select c.tarjeta, c.dispositivo, false from ci c where c.tarjeta is not null
        ) x
        group by x.tarjeta
      ) t
    ), '{}'::jsonb)
  )
  into v_atribucion;

  -- Cohortes por día de la primera visita en el período.
  with act as (select * from public.metrica_actividad(v_desde, v_hasta)),
  vis as (select * from public.metrica_vistas(v_desde, v_hasta)),
  ci as (select * from public.metrica_ci(v_desde, v_hasta)),
  dias as (
    select a.dispositivo, public.metrica_dia(a.ts) as dia from act a
    union select w.dispositivo, public.metrica_dia(w.ts) from vis w
  ),
  primera as (select d.dispositivo, min(d.dia) as dia from dias d group by d.dispositivo)
  select coalesce(jsonb_agg(jsonb_build_object(
    'dia', k.dia, 'dispositivos', k.n, 'con_contacto', k.c, 'volvieron', k.r
  ) order by k.dia), '[]'::jsonb)
  into v_cohortes
  from (
    select p.dia, count(*) as n,
      count(*) filter (where exists (select 1 from ci c where c.dispositivo = p.dispositivo)) as c,
      count(*) filter (where exists (
        select 1 from dias d where d.dispositivo = p.dispositivo and d.dia > p.dia)) as r
    from primera p
    group by p.dia
  ) k;

  -- Calidad de datos (sobre lo crudo, con tráfico interno incluido).
  select jsonb_build_object(
    'eventos', (select count(*) from public.actividad a where a.ts >= v_desde and a.ts < v_hasta),
    'eventos_por_minuto_max', coalesce((
      select max(k.n) from (
        select count(*) as n from public.actividad a
        where a.ts >= v_desde and a.ts < v_hasta group by date_trunc('minute', a.ts)
      ) k), 0),
    'ultimos_60_min', coalesce((
      select jsonb_agg(jsonb_build_object('minuto', k.m, 'n', k.n) order by k.m) from (
        select date_trunc('minute', a.ts) as m, count(*) as n from public.actividad a
        where a.ts >= now() - interval '60 minutes' group by 1
      ) k), '[]'::jsonb),
    'descartes', coalesce((
      select jsonb_object_agg(k.nombre, k.n) from (
        select d.nombre, sum(d.cantidad) as n from public.actividad_descartes d
        where d.minuto >= v_desde and d.minuto < v_hasta group by d.nombre
      ) k), '{}'::jsonb),
    'dispositivos_anomalos', (
      select count(distinct k.dispositivo) from (
        select a.dispositivo from public.actividad a
        where a.ts >= v_desde and a.ts < v_hasta
        group by a.dispositivo, date_trunc('hour', a.ts) having count(*) > 300
        union
        select c.dispositivo from public.contactos c
        where c.created_at >= v_desde and c.created_at < v_hasta
        group by c.dispositivo, date_trunc('hour', c.created_at) having count(*) > 30
      ) k),
    'dispositivos_equipo', (select count(*) from public.metrica_dispositivos_equipo())
  )
  into v_calidad;

  return jsonb_build_object(
    'desde', v_desde,
    'hasta', v_hasta,
    'resumen', public.metrica_resumen(v_desde, v_hasta),
    'curva', v_curva,
    'embudo', v_embudo,
    'liquidez', v_liquidez,
    'matriz', v_matriz,
    'atribucion', v_atribucion,
    'cohortes', v_cohortes,
    'calidad', v_calidad
  );
end;
$$;

-- "Congelar snapshot para el Demo Day": una fila inmutable con los números desde el
-- inicio de la feria hasta ahora.
create function public.admin_congelar_demo_day()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := public.metrica_inicio();
  v_r      jsonb;
  v_fila   public.demo_day_snapshots;
begin
  perform public.exigir_admin();
  v_r := public.metrica_resumen(v_inicio, now());

  insert into public.demo_day_snapshots (
    logica, desde, hasta, ci, ci_q, proyectos, ci_por_participante,
    liquidez, liquidez_q, pct_vistas_fuera_horario, detalle
  ) values (
    1, v_inicio, now(), (v_r ->> 'ci')::integer, (v_r ->> 'ci_q')::integer,
    (v_r ->> 'proyectos')::integer, (v_r ->> 'ci_por_participante')::numeric,
    (v_r ->> 'liquidez')::numeric, (v_r ->> 'liquidez_q')::numeric,
    (v_r ->> 'pct_vistas_fuera_horario')::numeric, v_r
  )
  returning * into v_fila;

  return to_jsonb(v_fila);
end;
$$;

create function public.admin_demo_day_snapshots()
returns setof public.demo_day_snapshots
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query select * from public.demo_day_snapshots s order by s.creado_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: Postgres da execute a public por defecto; se lo sacamos y abrimos lo justo.
-- ---------------------------------------------------------------------------
revoke execute on function public.actividad_inmutable()                        from public, anon, authenticated;
revoke execute on function public.demo_day_inmutable()                         from public, anon, authenticated;
revoke execute on function public.dispositivo_cuentas_al_borrar()              from public, anon, authenticated;
revoke execute on function public.en_horario_feria(timestamptz)                from public, anon, authenticated;
revoke execute on function public.metrica_dia(timestamptz)                     from public, anon, authenticated;
revoke execute on function public.metrica_inicio()                             from public, anon, authenticated;
revoke execute on function public.metrica_cuentas_equipo()                     from public, anon, authenticated;
revoke execute on function public.metrica_dispositivos_equipo()                from public, anon, authenticated;
revoke execute on function public.metrica_perfiles_equipo()                    from public, anon, authenticated;
revoke execute on function public.metrica_proyectos()                          from public, anon, authenticated;
revoke execute on function public.metrica_ci(timestamptz, timestamptz)         from public, anon, authenticated;
revoke execute on function public.metrica_vistas(timestamptz, timestamptz)     from public, anon, authenticated;
revoke execute on function public.metrica_actividad(timestamptz, timestamptz)  from public, anon, authenticated;
revoke execute on function public.metrica_resumen(timestamptz, timestamptz)    from public, anon, authenticated;
revoke execute on function public.podar_actividad()                            from public, anon, authenticated;
revoke execute on function public.snapshot_metricas_hora()                     from public, anon, authenticated;
revoke execute on function public.registrar_actividad(text, uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb) from public;
revoke execute on function public.vincular_dispositivo(uuid)                   from public, anon;
revoke execute on function public.marcar_equipo(uuid)                          from public;
revoke execute on function public.admin_vivo()                                 from public, anon;
revoke execute on function public.admin_dataroom(timestamptz, timestamptz, text) from public, anon;
revoke execute on function public.admin_congelar_demo_day()                    from public, anon;
revoke execute on function public.admin_demo_day_snapshots()                   from public, anon;

grant execute on function public.registrar_actividad(text, uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.marcar_equipo(uuid)                           to anon, authenticated;
grant execute on function public.vincular_dispositivo(uuid)                    to authenticated;
grant execute on function public.snapshot_metricas_hora()                      to service_role;
grant execute on function public.admin_vivo()                                  to authenticated;
grant execute on function public.admin_dataroom(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_congelar_demo_day()                     to authenticated;
grant execute on function public.admin_demo_day_snapshots()                    to authenticated;
