-- "Quién vio tu perfil y tus pitches" (Mi CRM), la pared de pitches y el traspaso de la sesión.
--
-- Va después de 20261016120000_panel_organizacion.sql. ADITIVA: tablas y funciones nuevas; no
-- toca tablas, reglas ni funciones existentes (actividad, vistas, piques y las métricas siguen
-- igual: solo se LEE metrica_cuentas_equipo() para no registrar al equipo). Vuelta atrás:
-- supabase/rollback-quien-vio-perfil.sql (NO es migración, con pérdida).
--
-- Todo arranca APAGADO (funciones_config): se prende desde /admin, sin deploy.
--
-- Reglas (ver /privacidad#visitas):
--  - Solo con sesión iniciada. Quien no entra queda en la medición anónima de siempre.
--  - Como VISITANTE, una cuenta cuenta recién desde que vio el aviso (visitas_ajustes). Visible
--    por defecto; en modo privado no se guarda su identidad: solo un contador por día, tipo y
--    perfil visitado. Al pasar a privado, sus visitas ya guardadas se vuelven contador.
--  - Se guarda la CUENTA (auth.users), nunca el dispositivo. Quien no tiene perfil figura "sin
--    perfil"; si después arma un perfil visible, aparece con su nombre (unión en la lectura).
--  - Reciprocidad: quien está en modo privado no ve quién lo visitó.
--  - Una fila por visitante → visitado → tipo → día (hora de Buenos Aires). El dueño ve el día,
--    nunca la hora. 30 días: las lecturas filtran y podar_visitas() borra lo viejo.
--  - Nunca autovisitas ni cuentas del equipo. Nada anterior a la función: no se cruza actividad,
--    vistas, piques ni dispositivo_cuentas. El traspaso solo acredita la lista de ESA sesión que
--    manda el navegador, con consentimiento, validada acá.
--
-- PostgREST: visitas tiene UNA sola FK a perfiles (el visitado) y el visitante apunta a auth.users
-- (esquema no expuesto); PK id propia y sin FK a empresas. Así no aparece ningún muchos-a-muchos
-- nuevo y el embed empresa:empresas(...) de perfiles no se vuelve ambiguo (PGRST201).

-- ---------------------------------------------------------------------------
-- 1) Configuración (una fila, como ajustes): interruptores de emergencia
-- ---------------------------------------------------------------------------
create table public.funciones_config (
  id               boolean primary key default true check (id),
  visitas_activas  boolean not null default false,
  -- La primera vez que se prende: "contamos desde" en Mi CRM.
  visitas_desde    timestamptz,
  pared_activa     boolean not null default false,
  pared_libres     integer not null default 2 constraint funciones_config_libres_valido check (pared_libres between 0 and 20),
  traspaso_activo  boolean not null default false
);
insert into public.funciones_config default values;

alter table public.funciones_config enable row level security;
revoke all on public.funciones_config from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Tablas de visitas
-- ---------------------------------------------------------------------------
-- Aviso y modo privado, por cuenta (mismo patrón que evento_consentimientos: la última elección).
create table public.visitas_ajustes (
  usuario_id      uuid primary key references auth.users (id) on delete cascade,
  mostrar         boolean not null default true,
  aviso_version   text not null constraint visitas_ajustes_version_valida check (aviso_version ~ '^[a-z0-9-]{1,20}$'),
  aviso_visto_at  timestamptz not null default now(),
  decidido_at     timestamptz not null default now(),
  -- Último traspaso acreditado (uno por hora).
  traspaso_at     timestamptz
);

create table public.visitas (
  id            bigint generated always as identity primary key,
  visitado_id   uuid not null references public.perfiles (id) on delete cascade,
  visitante_id  uuid not null references auth.users (id) on delete cascade,
  tipo          text not null constraint visitas_tipo_valido check (tipo in ('perfil', 'pitch', 'pique')),
  dia           date not null,
  origen        text not null default 'directo' constraint visitas_origen_valido check (origen in ('directo', 'traspaso')),
  created_at    timestamptz not null default now(),
  constraint visitas_una_por_dia unique (visitado_id, visitante_id, tipo, dia)
);
create index visitas_visitado_dia on public.visitas (visitado_id, dia desc);
create index visitas_visitante on public.visitas (visitante_id);

-- Modo privado: sin identidad, solo cuántas.
create table public.visitas_anonimas (
  visitado_id  uuid not null references public.perfiles (id) on delete cascade,
  dia          date not null,
  tipo         text not null constraint visitas_anonimas_tipo_valido check (tipo in ('perfil', 'pitch', 'pique')),
  cantidad     integer not null default 1 check (cantidad >= 0),
  primary key (visitado_id, dia, tipo)
);

-- Frecuencia por cuenta (mismo algoritmo que medicion_limitar, tabla propia).
create table public.visitas_frecuencia (
  usuario_id  uuid primary key references auth.users (id) on delete cascade,
  ventana     timestamptz not null,
  acciones    integer not null
);

alter table public.visitas_ajustes enable row level security;
alter table public.visitas enable row level security;
alter table public.visitas_anonimas enable row level security;
alter table public.visitas_frecuencia enable row level security;
revoke all on public.visitas_ajustes from anon, authenticated;
revoke all on public.visitas from anon, authenticated;
revoke all on public.visitas_anonimas from anon, authenticated;
revoke all on public.visitas_frecuencia from anon, authenticated;
-- Sin políticas: solo por las funciones de abajo.

-- ---------------------------------------------------------------------------
-- 3) Internas
-- ---------------------------------------------------------------------------
-- Hoy en Buenos Aires.
create function public.visitas_hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date
$$;

create function public.visitas_limitar(p_uid uuid, p_max integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acciones integer;
begin
  insert into public.visitas_frecuencia as f (usuario_id, ventana, acciones)
  values (p_uid, now(), 1)
  on conflict (usuario_id) do update set
    ventana  = case when f.ventana < now() - interval '1 minute' then now() else f.ventana end,
    acciones = case when f.ventana < now() - interval '1 minute' then 1 else f.acciones + 1 end
  returning acciones into v_acciones;
  if v_acciones > p_max then
    raise exception 'demasiadas acciones' using errcode = 'P0001';
  end if;
end;
$$;

-- Pasa a contador (sin identidad) las visitas que hizo una cuenta y las borra.
create function public.visitas_anonimizar(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.visitas_anonimas as a (visitado_id, dia, tipo, cantidad)
  select v.visitado_id, v.dia, v.tipo, count(*)::integer
  from public.visitas v
  where v.visitante_id = p_uid and v.dia >= public.visitas_hoy() - 29
  group by v.visitado_id, v.dia, v.tipo
  on conflict (visitado_id, dia, tipo) do update set cantidad = a.cantidad + excluded.cantidad;
  delete from public.visitas where visitante_id = p_uid;
end;
$$;

-- ¿Se registra esta cuenta como visitante? null = no (sin aviso o del equipo).
create function public.visitas_ajuste_visitante(p_uid uuid)
returns public.visitas_ajustes
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.visitas_ajustes;
begin
  if p_uid in (select x from public.metrica_cuentas_equipo() x) then
    return null;
  end if;
  select * into v from public.visitas_ajustes where usuario_id = p_uid;
  return v;
end;
$$;

-- Guarda una visita ya validada (visitado visible, sin autovisita).
create function public.visitas_guardar(p_uid uuid, p_mostrar boolean, p_visitado uuid, p_tipo text, p_origen text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not p_mostrar then
    insert into public.visitas_anonimas as a (visitado_id, dia, tipo, cantidad)
    values (p_visitado, public.visitas_hoy(), p_tipo, 1)
    on conflict (visitado_id, dia, tipo) do update set cantidad = a.cantidad + 1;
    return true;
  end if;
  insert into public.visitas (visitado_id, visitante_id, tipo, dia, origen)
  values (p_visitado, p_uid, p_tipo, public.visitas_hoy(), p_origen)
  on conflict (visitado_id, visitante_id, tipo, dia) do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

-- El perfil visible de una cuenta (para la unión en la lectura). null si no tiene.
create function public.visitas_perfil_visible(p_uid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.perfiles p
  where p.usuario_id = p_uid and p.publicado and not p.oculto
$$;

-- ---------------------------------------------------------------------------
-- 4) Públicas
-- ---------------------------------------------------------------------------
-- Interruptores para el navegador (feed, aviso). Nada más.
create function public.config_funciones()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'visitas_activas', c.visitas_activas,
    'visitas_desde', c.visitas_desde,
    'pared_activa', c.pared_activa,
    'pared_libres', c.pared_libres,
    'traspaso_activo', c.traspaso_activo
  )
  from public.funciones_config c where c.id
$$;

-- Registrar una visita: abrir un perfil, ver un pitch (3 s) o darle pique. Nunca falla por
-- reglas de negocio: devuelve false si no corresponde guardar nada.
create function public.registrar_visita(p_tipo text, p_perfil uuid default null, p_pitch uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_visitado uuid;
  v_dueno    uuid;
  v_aj       public.visitas_ajustes;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_tipo is null or p_tipo not in ('perfil', 'pitch', 'pique') then
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
  if not coalesce((select c.visitas_activas from public.funciones_config c where c.id), false) then
    return false;
  end if;

  if p_tipo = 'perfil' then
    select pe.id, pe.usuario_id into v_visitado, v_dueno
    from public.perfiles pe
    where pe.id = p_perfil and pe.publicado and not pe.oculto;
  else
    select pe.id, pe.usuario_id into v_visitado, v_dueno
    from public.pitches pi
    join public.perfiles pe on pe.id = pi.perfil_id
    where pi.id = p_pitch and pi.publicado and not pi.oculto and pe.publicado and not pe.oculto;
  end if;
  if v_visitado is null or v_dueno is not distinct from v_uid then
    return false;
  end if;

  perform public.visitas_limitar(v_uid, 60);
  v_aj := public.visitas_ajuste_visitante(v_uid);
  if v_aj.usuario_id is null then
    return false;
  end if;
  return public.visitas_guardar(v_uid, v_aj.mostrar, v_visitado, p_tipo, 'directo');
end;
$$;

-- Sacar el pique el mismo día borra la fila de hoy (el dueño no ve un pique que ya no existe).
-- En modo privado el contador no se descuenta: sin identidad no se sabe si esa persona sumó.
create function public.quitar_visita_pique(p_pitch uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  perform public.visitas_limitar(v_uid, 60);
  delete from public.visitas v
  using public.pitches pi
  where pi.id = p_pitch and v.visitado_id = pi.perfil_id
    and v.visitante_id = v_uid and v.tipo = 'pique' and v.dia = public.visitas_hoy();
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

-- Estado de la sesión: ¿está prendido?, ¿vio el aviso?, ¿muestra sus visitas?, ¿tiene perfil?
create function public.mi_estado_visitas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_aj  public.visitas_ajustes;
  v_cfg public.funciones_config;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  select * into v_cfg from public.funciones_config c where c.id;
  select * into v_aj from public.visitas_ajustes where usuario_id = v_uid;
  return jsonb_build_object(
    'activa', v_cfg.visitas_activas,
    'desde', v_cfg.visitas_desde,
    'mostrar', coalesce(v_aj.mostrar, true),
    'aviso_version', v_aj.aviso_version,
    'aviso_visto_at', v_aj.aviso_visto_at,
    'decidido_at', v_aj.decidido_at,
    'tiene_perfil', exists (select 1 from public.perfiles p where p.usuario_id = v_uid)
  );
end;
$$;

-- Aviso visto + "Mostrar mis visitas" (el aviso y el interruptor de Mi CRM usan esta misma).
-- Apagarlo vuelve contador las visitas ya hechas: no queda identidad guardada.
create function public.guardar_aviso_visitas(p_version text, p_mostrar boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_fecha timestamptz := now();
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_mostrar is null then
    raise exception 'elección inválida' using errcode = '22023';
  end if;
  if p_version is null or p_version !~ '^[a-z0-9-]{1,20}$' then
    raise exception 'versión inválida' using errcode = '22023';
  end if;
  perform public.visitas_limitar(v_uid, 60);
  insert into public.visitas_ajustes (usuario_id, mostrar, aviso_version, aviso_visto_at, decidido_at)
  values (v_uid, p_mostrar, p_version, v_fecha, v_fecha)
  on conflict (usuario_id) do update
    set mostrar = excluded.mostrar, aviso_version = excluded.aviso_version, decidido_at = excluded.decidido_at;
  if not p_mostrar then
    perform public.visitas_anonimizar(v_uid);
  end if;
  return v_fecha;
end;
$$;

-- Resumen de los últimos 30 días para el dueño. Con el interruptor apagado (o sin haber visto el
-- aviso) no hay nada identificado: reciprocidad.
create function public.mis_visitas_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_yo  public.perfiles;
  v_aj  public.visitas_ajustes;
  v_hoy date := public.visitas_hoy();
begin
  v_yo := public.perfil_de_sesion();
  select * into v_aj from public.visitas_ajustes where usuario_id = v_yo.usuario_id;
  if v_aj.usuario_id is null or not v_aj.mostrar then
    return jsonb_build_object('visible', false);
  end if;

  return (
    with filas as (
      select v.visitante_id, v.tipo, v.dia,
             public.visitas_perfil_visible(v.visitante_id) as perfil,
             coalesce(a.mostrar, true) as mostrar
      from public.visitas v
      left join public.visitas_ajustes a on a.usuario_id = v.visitante_id
      where v.visitado_id = v_yo.id and v.dia >= v_hoy - 29
    ),
    anon as (
      select coalesce(sum(cantidad), 0)::integer as n
      from public.visitas_anonimas
      where visitado_id = v_yo.id and dia >= v_hoy - 29
    )
    select jsonb_build_object(
      'visible', true,
      'personas', (select count(distinct visitante_id) from filas where mostrar and perfil is not null),
      'perfil', (select count(*) from filas where mostrar and perfil is not null and tipo = 'perfil'),
      'pitch', (select count(*) from filas where mostrar and perfil is not null and tipo = 'pitch'),
      'pique', (select count(*) from filas where mostrar and perfil is not null and tipo = 'pique'),
      'sin_perfil', (select count(distinct visitante_id) from filas where mostrar and perfil is null),
      'privado', (select n from anon) + (select count(*) from filas where not mostrar),
      'dias', coalesce((
        select jsonb_agg(d.dia order by d.dia desc)
        from (select distinct dia from filas where mostrar and perfil is not null) d
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- La lista: personas identificadas, de la más reciente a la más antigua, 20 por página.
create function public.mis_visitas(p_tipo text default null, p_dia date default null, p_pagina integer default 1)
returns table (
  slug         text,
  nombre       text,
  rol          text,
  avatar_url   text,
  empresa      text,
  empresa_slug text,
  tipo         text,
  dia          date,
  total        bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_yo  public.perfiles;
  v_aj  public.visitas_ajustes;
  v_hoy date := public.visitas_hoy();
begin
  v_yo := public.perfil_de_sesion();
  select * into v_aj from public.visitas_ajustes where usuario_id = v_yo.usuario_id;
  if v_aj.usuario_id is null or not v_aj.mostrar then
    return;
  end if;
  if p_tipo is not null and p_tipo not in ('perfil', 'pitch', 'pique') then
    raise exception 'tipo inválido' using errcode = '22023';
  end if;

  return query
  select p.slug, p.nombre, p.rol, p.avatar_url,
         case when e.id is not null and public.empresa_visible(e.id) then e.nombre end,
         case when e.id is not null and public.empresa_visible(e.id) then e.slug end,
         v.tipo, v.dia,
         count(*) over ()
  from public.visitas v
  join public.perfiles p on p.usuario_id = v.visitante_id and p.publicado and not p.oculto
  left join public.empresas e on e.id = p.empresa_id
  left join public.visitas_ajustes a on a.usuario_id = v.visitante_id
  where v.visitado_id = v_yo.id
    and v.dia >= v_hoy - 29
    and coalesce(a.mostrar, true)
    and (p_tipo is null or v.tipo = p_tipo)
    and (p_dia is null or v.dia = p_dia)
  order by v.dia desc, v.id desc
  limit 20 offset 20 * (greatest(coalesce(p_pagina, 1), 1) - 1);
end;
$$;

-- "Lo que otros ven de mí": mis visitas guardadas con identidad (últimos 30 días).
create function public.mis_visitas_hechas()
returns table (slug text, nombre text, tipo text, dia date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug, p.nombre, v.tipo, v.dia
  from public.visitas v
  join public.perfiles p on p.id = v.visitado_id
  where auth.uid() is not null and v.visitante_id = auth.uid()
    and v.dia >= public.visitas_hoy() - 29
    and p.publicado and not p.oculto
  order by v.dia desc, v.id desc
  limit 200
$$;

-- Supresión (Ley 25.326, art. 16): borra mis visitas guardadas con identidad.
create function public.borrar_mis_visitas_hechas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  delete from public.visitas where visitante_id = v_uid;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Traspaso de la sesión: al entrar con Google desde la pared, lo que esa sesión hizo antes
-- (lista del navegador, con tope). Guarda el aviso y recién ahí acredita. Destildar = modo privado
-- sin acreditar; si ya estaba en modo privado, no cambia nada.
create function public.acreditar_traspaso(
  p_version  text,
  p_mostrar  boolean,
  p_perfiles uuid[] default '{}',
  p_pitches  uuid[] default '{}',
  p_piques   uuid[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_aj   public.visitas_ajustes;
  v_cfg  public.funciones_config;
  v_n    integer := 0;
  v_par  record;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_mostrar is null or p_version is null or p_version !~ '^[a-z0-9-]{1,20}$' then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_perfiles), 0) > 10 or coalesce(cardinality(p_pitches), 0) > 10
     or coalesce(cardinality(p_piques), 0) > 10 then
    raise exception 'demasiados elementos' using errcode = '22023';
  end if;
  select * into v_cfg from public.funciones_config c where c.id;
  if not (v_cfg.visitas_activas and v_cfg.traspaso_activo) then
    return 0;
  end if;
  perform public.visitas_limitar(v_uid, 60);

  select * into v_aj from public.visitas_ajustes where usuario_id = v_uid;
  if not p_mostrar then
    perform public.guardar_aviso_visitas(p_version, false);
    return 0;
  end if;
  if v_aj.usuario_id is not null and not v_aj.mostrar then
    return 0;
  end if;
  if v_aj.usuario_id is null then
    insert into public.visitas_ajustes (usuario_id, mostrar, aviso_version)
    values (v_uid, true, p_version);
  elsif v_aj.traspaso_at > now() - interval '1 hour' then
    return 0;
  end if;
  update public.visitas_ajustes set traspaso_at = now() where usuario_id = v_uid;

  if (public.visitas_ajuste_visitante(v_uid)).usuario_id is null then
    return 0; -- cuenta del equipo
  end if;

  for v_par in
    select pe.id as visitado, 'perfil'::text as tipo
    from public.perfiles pe
    where pe.id = any (coalesce(p_perfiles, '{}')) and pe.publicado and not pe.oculto
      and pe.usuario_id is distinct from v_uid
    union
    select pe.id, t.tipo
    from (select unnest(coalesce(p_pitches, '{}')) as pitch, 'pitch'::text as tipo
          union all
          select unnest(coalesce(p_piques, '{}')), 'pique') t
    join public.pitches pi on pi.id = t.pitch and pi.publicado and not pi.oculto
    join public.perfiles pe on pe.id = pi.perfil_id and pe.publicado and not pe.oculto
    where pe.usuario_id is distinct from v_uid
  loop
    if public.visitas_guardar(v_uid, true, v_par.visitado, v_par.tipo, 'traspaso') then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Admin y poda
-- ---------------------------------------------------------------------------
create function public.admin_funciones(p_visitas boolean, p_pared boolean, p_libres integer, p_traspaso boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  if p_visitas is null or p_pared is null or p_libres is null or p_traspaso is null then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  if p_libres not between 0 and 20 then
    raise exception 'pitches libres: entre 0 y 20' using errcode = '22023';
  end if;
  update public.funciones_config
  set visitas_activas = p_visitas,
      visitas_desde = coalesce(visitas_desde, case when p_visitas then now() end),
      pared_activa = p_pared,
      pared_libres = p_libres,
      traspaso_activo = p_traspaso
  where id;
end;
$$;

-- La llama .github/workflows/metricas.yml (service key). Borra lo de más de 30 días.
create function public.podar_visitas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
  v_m integer;
begin
  delete from public.visitas where dia < public.visitas_hoy() - 29;
  get diagnostics v_n = row_count;
  delete from public.visitas_anonimas where dia < public.visitas_hoy() - 29;
  get diagnostics v_m = row_count;
  delete from public.visitas_frecuencia where ventana < now() - interval '1 day';
  return v_n + v_m;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Permisos
-- ---------------------------------------------------------------------------
revoke execute on function public.visitas_hoy() from public, anon, authenticated;
revoke execute on function public.visitas_limitar(uuid, integer) from public, anon, authenticated;
revoke execute on function public.visitas_anonimizar(uuid) from public, anon, authenticated;
revoke execute on function public.visitas_ajuste_visitante(uuid) from public, anon, authenticated;
revoke execute on function public.visitas_guardar(uuid, boolean, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.visitas_perfil_visible(uuid) from public, anon, authenticated;

revoke execute on function public.config_funciones() from public;
grant execute on function public.config_funciones() to anon, authenticated;

revoke execute on function public.registrar_visita(text, uuid, uuid) from public, anon;
revoke execute on function public.quitar_visita_pique(uuid) from public, anon;
revoke execute on function public.mi_estado_visitas() from public, anon;
revoke execute on function public.guardar_aviso_visitas(text, boolean) from public, anon;
revoke execute on function public.mis_visitas_resumen() from public, anon;
revoke execute on function public.mis_visitas(text, date, integer) from public, anon;
revoke execute on function public.mis_visitas_hechas() from public, anon;
revoke execute on function public.borrar_mis_visitas_hechas() from public, anon;
revoke execute on function public.acreditar_traspaso(text, boolean, uuid[], uuid[], uuid[]) from public, anon;
revoke execute on function public.admin_funciones(boolean, boolean, integer, boolean) from public, anon;
grant execute on function public.registrar_visita(text, uuid, uuid) to authenticated;
grant execute on function public.quitar_visita_pique(uuid) to authenticated;
grant execute on function public.mi_estado_visitas() to authenticated;
grant execute on function public.guardar_aviso_visitas(text, boolean) to authenticated;
grant execute on function public.mis_visitas_resumen() to authenticated;
grant execute on function public.mis_visitas(text, date, integer) to authenticated;
grant execute on function public.mis_visitas_hechas() to authenticated;
grant execute on function public.borrar_mis_visitas_hechas() to authenticated;
grant execute on function public.acreditar_traspaso(text, boolean, uuid[], uuid[], uuid[]) to authenticated;
grant execute on function public.admin_funciones(boolean, boolean, integer, boolean) to authenticated;

revoke execute on function public.podar_visitas() from public, anon, authenticated;
grant execute on function public.podar_visitas() to service_role;
