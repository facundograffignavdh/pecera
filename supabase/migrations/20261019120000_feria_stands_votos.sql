-- Pecera: Feria 21 con la planilla de stands y voto sin cuenta. Va después de score_switch.
-- Aditiva: dos tablas nuevas y funciones nuevas; las que cuentan votos se redefinen con la
-- MISMA firma (create or replace conserva permisos) para sumar las dos tablas.
--
-- 1) feria_stands (privada): la planilla de stands (código, día, nombre, emprendimiento y
--    slug si lo hay). La carga el equipo desde el SQL editor; NO va al repo (el repo es
--    público y hay nombres de personas sin cuenta). `feria_anotar_stands()` empareja cada
--    stand sin vincular con un perfil visible (slug → nombre de la persona → perfil con el
--    nombre del emprendimiento → empresa con ese nombre) y lo anota en el evento. Corre
--    sola con triggers de perfiles, empresas y empresa_miembros (nunca traba nada: si
--    falla, no hace nada). Un stand se vincula UNA vez: si /admin saca a alguien, no
--    vuelve a entrar solo.
--    `feria_dias(evento)` (anon) devuelve solo perfil_id → días: nunca nombres.
-- 2) votos_dispositivo: un voto por evento y por dispositivo (el uuid anónimo de la
--    medición), cambiable mientras la votación esté abierta. Vale lo mismo que el voto
--    con cuenta (decisión del equipo). Frenos: límite de frecuencia, ni a sí mismo ni a
--    su empresa si el dispositivo está vinculado a esa cuenta, y no si el dispositivo
--    está vinculado a una cuenta que ya votó; si la cuenta vota después, el voto del
--    dispositivo vinculado se borra (trigger en votos). `votar` no cambia.
--    Redefinidas: resultados_evento, total_votos_evento, admin_evento,
--    admin_ranking_evento (sin dispositivos del equipo) y evento_mover_votos.
--    Nueva para /admin: admin_votos_sin_cuenta (auditoría del ganador).
-- Para volver atrás: supabase/rollback-feria-stands-votos.sql (no es migración).
-- Pruebas: supabase/pruebas/feria_stands_votos.mjs (PGlite).

-- ---------------------------------------------------------------------------
-- 1) Planilla de stands
-- ---------------------------------------------------------------------------
create table public.feria_stands (
  codigo         text primary key check (codigo ~ '^[a-z][0-9]{3}$'),
  evento_id      uuid not null references public.eventos (id) on delete cascade,
  dia            date not null,
  stand          integer,
  nombre         text not null,
  emprendimiento text,
  slug           text,
  perfil_id      uuid references public.perfiles (id) on delete set null,
  vinculado_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index feria_stands_perfil_idx on public.feria_stands (perfil_id);

alter table public.feria_stands enable row level security;
revoke all on public.feria_stands from anon, authenticated;

-- "Álvaro Izquierdo" → "alvaroizquierdo". Vacío → null (nunca empareja).
create function public.feria_normalizar(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      lower(translate(coalesce(p_texto, ''), 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ', 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun')),
      '[^a-z0-9]+', '', 'g'
    ),
    ''
  );
$$;

-- Empareja los stands sin vincular y los anota en su evento. Uso interno.
create function public.feria_anotar_stands()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s          record;
  v_ids      uuid[];
  v_perfil   uuid;
  v_empresa  uuid;
  v_nuevos   integer := 0;
begin
  for s in
    select fs.* from public.feria_stands fs
    join public.eventos ev on ev.id = fs.evento_id and ev.activo
    where fs.perfil_id is null
  loop
    v_perfil := null;
    v_empresa := null;

    -- a) slug de la planilla
    if s.slug is not null then
      select p.id into v_perfil from public.perfiles p
      where p.slug = s.slug and p.publicado and not p.oculto;
    end if;

    -- b) nombre de la persona (solo si hay uno)
    if v_perfil is null then
      select array_agg(p.id) into v_ids from public.perfiles p
      where p.publicado and not p.oculto
        and public.feria_normalizar(p.nombre) = public.feria_normalizar(s.nombre);
      if cardinality(v_ids) = 1 then v_perfil := v_ids[1]; end if;
    end if;

    -- c) perfil con el nombre del emprendimiento ("Rodia", "Sistema ARKON")
    if v_perfil is null and s.emprendimiento is not null then
      select array_agg(p.id) into v_ids from public.perfiles p
      where p.publicado and not p.oculto
        and public.feria_normalizar(p.nombre) = public.feria_normalizar(s.emprendimiento);
      if cardinality(v_ids) = 1 then v_perfil := v_ids[1]; end if;
    end if;

    -- d) empresa visible con el nombre del emprendimiento: quien ya participa por ella
    --    o su representante por defecto
    if v_perfil is null and s.emprendimiento is not null then
      select array_agg(e.id) into v_ids from public.empresas e
      where not e.oculta
        and public.feria_normalizar(e.nombre) = public.feria_normalizar(s.emprendimiento);
      if cardinality(v_ids) = 1 then
        v_empresa := v_ids[1];
        select m.perfil_id into v_perfil
        from public.empresa_miembros m
        join public.evento_participantes ep on ep.perfil_id = m.perfil_id and ep.evento_id = s.evento_id
        where m.empresa_id = v_empresa
        limit 1;
        if v_perfil is null then
          v_perfil := public.evento_representante_por_defecto(v_empresa);
        end if;
      end if;
    end if;

    continue when v_perfil is null;

    update public.feria_stands set perfil_id = v_perfil, vinculado_at = now()
    where codigo = s.codigo;
    insert into public.evento_participantes (evento_id, perfil_id)
    values (s.evento_id, v_perfil) on conflict do nothing;
    if v_empresa is not null then
      insert into public.evento_empresas (evento_id, empresa_id, perfil_id)
      values (s.evento_id, v_empresa, v_perfil) on conflict do nothing;
    end if;
    v_nuevos := v_nuevos + 1;
  end loop;
  return v_nuevos;
end;
$$;

-- Trigger: nunca traba el alta ni la edición del perfil.
create function public.feria_stands_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.feria_stands where perfil_id is null) then
    begin
      perform public.feria_anotar_stands();
    exception when others then
      null;
    end;
  end if;
  return null;
end;
$$;

create trigger feria_stands_perfiles
  after insert or update of publicado, oculto, nombre, slug on public.perfiles
  for each statement execute function public.feria_stands_trigger();

create trigger feria_stands_empresas
  after insert or update of nombre, oculta on public.empresas
  for each statement execute function public.feria_stands_trigger();

create trigger feria_stands_miembros
  after insert on public.empresa_miembros
  for each statement execute function public.feria_stands_trigger();

-- Días de cada participante del evento (solo ids y fechas). Además del stand vinculado,
-- vale el mismo slug, el mismo nombre o ser integrante de una empresa de la planilla.
create function public.feria_dias(p_evento text)
returns table (perfil_id uuid, dias date[])
language sql
stable
security definer
set search_path = ''
as $$
  with part as (
    select ep.perfil_id, ev.id as evento_id
    from public.eventos ev
    join public.evento_participantes ep on ep.evento_id = ev.id
    where ev.slug = p_evento and ev.activo
  ),
  m as (
    select part.perfil_id, fs.dia
    from part join public.feria_stands fs on fs.evento_id = part.evento_id and fs.perfil_id = part.perfil_id
    union
    select part.perfil_id, fs.dia
    from part
    join public.perfiles p on p.id = part.perfil_id
    join public.feria_stands fs on fs.evento_id = part.evento_id
      and (fs.slug = p.slug
        or public.feria_normalizar(fs.nombre) = public.feria_normalizar(p.nombre)
        or public.feria_normalizar(fs.emprendimiento) = public.feria_normalizar(p.nombre))
    union
    select part.perfil_id, fs.dia
    from part
    join public.empresa_miembros em on em.perfil_id = part.perfil_id
    join public.empresas e on e.id = em.empresa_id and not e.oculta
    join public.feria_stands fs on fs.evento_id = part.evento_id
      and public.feria_normalizar(fs.emprendimiento) = public.feria_normalizar(e.nombre)
  )
  select m.perfil_id, array_agg(distinct m.dia order by m.dia) from m group by m.perfil_id;
$$;

-- ---------------------------------------------------------------------------
-- 2) Voto sin cuenta
-- ---------------------------------------------------------------------------
create table public.votos_dispositivo (
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  dispositivo uuid not null,
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (evento_id, dispositivo)
);

create index votos_dispositivo_perfil_idx on public.votos_dispositivo (evento_id, perfil_id);

alter table public.votos_dispositivo enable row level security;
revoke all on public.votos_dispositivo from anon, authenticated;

create function public.votar_dispositivo(p_evento text, p_perfil uuid, p_dispositivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento   uuid;
  v_abierta  boolean;
  v_objetivo public.perfiles;
begin
  if auth.uid() is not null then
    raise exception 'con sesión se vota con la cuenta' using errcode = '22023';
  end if;
  if p_dispositivo is null or p_perfil is null then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'voto', 10);

  select id, votacion_abierta into v_evento, v_abierta
  from public.eventos where slug = p_evento and activo;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;
  if not v_abierta then
    raise exception 'votación cerrada' using errcode = 'P0001';
  end if;

  select p.* into v_objetivo
  from public.evento_participantes ep
  join public.perfiles p on p.id = ep.perfil_id
  where ep.evento_id = v_evento and ep.perfil_id = p_perfil
    and p.publicado and not p.oculto;
  if not found then
    raise exception 'participante inexistente' using errcode = '22023';
  end if;

  -- Un dispositivo vinculado a una cuenta que ya votó no vota de nuevo.
  if exists (
    select 1 from public.votos v
    join public.dispositivo_cuentas dc on dc.usuario_id = v.votante
    where v.evento_id = v_evento and dc.dispositivo = p_dispositivo
  ) then
    raise exception 'ya votaste con tu cuenta' using errcode = '22023';
  end if;

  -- Si el dispositivo es de la persona o de alguien de su empresa, no.
  if exists (
    select 1 from public.dispositivo_cuentas dc
    where dc.dispositivo = p_dispositivo and dc.usuario_id = v_objetivo.usuario_id
  ) then
    raise exception 'no podés votarte' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.dispositivo_cuentas dc
    join public.perfiles yo on yo.usuario_id = dc.usuario_id
    join public.empresa_miembros mia on mia.perfil_id = yo.id
    join public.empresa_miembros suya on suya.empresa_id = mia.empresa_id
    where dc.dispositivo = p_dispositivo and suya.perfil_id = v_objetivo.id
  ) then
    raise exception 'no podés votar a tu empresa' using errcode = '22023';
  end if;

  insert into public.votos_dispositivo (evento_id, dispositivo, perfil_id)
  values (v_evento, p_dispositivo, p_perfil)
  on conflict (evento_id, dispositivo) do update set
    perfil_id  = excluded.perfil_id,
    updated_at = now();
end;
$$;

-- Saca el voto del dispositivo (también lo usa la app después de votar con la cuenta).
create function public.quitar_voto_dispositivo(p_evento text, p_dispositivo uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.votos_dispositivo vd
  using public.eventos ev
  where ev.id = vd.evento_id and ev.slug = p_evento and ev.votacion_abierta
    and vd.dispositivo = p_dispositivo;
$$;

create function public.mi_voto_dispositivo(p_evento text, p_dispositivo uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select vd.perfil_id
  from public.votos_dispositivo vd
  join public.eventos ev on ev.id = vd.evento_id
  where ev.slug = p_evento and ev.activo and vd.dispositivo = p_dispositivo;
$$;

-- Si la cuenta vota, el voto de sus dispositivos vinculados se borra: nadie cuenta doble.
create function public.votos_sin_doble()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.votos_dispositivo vd
  where vd.evento_id = new.evento_id
    and vd.dispositivo in (select dc.dispositivo from public.dispositivo_cuentas dc where dc.usuario_id = new.votante);
  return null;
end;
$$;

create trigger votos_sin_doble
  after insert or update on public.votos
  for each row execute function public.votos_sin_doble();

-- Todos los votos del evento (con cuenta y sin cuenta). Uso interno.
create function public.votos_evento_todos(p_evento uuid)
returns table (perfil_id uuid, con_cuenta boolean, votante uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select v.perfil_id, true, v.votante from public.votos v where v.evento_id = p_evento
  union all
  select vd.perfil_id, false, vd.dispositivo from public.votos_dispositivo vd where vd.evento_id = p_evento;
$$;

create or replace function public.resultados_evento(p_evento text)
returns table (perfil_id uuid, votos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.perfil_id, count(*)::integer
  from public.eventos ev
  cross join lateral public.votos_evento_todos(ev.id) t
  where ev.slug = p_evento and ev.activo
    and (ev.resultados_visibles or public.es_admin())
  group by t.perfil_id
  order by 2 desc;
$$;

create or replace function public.total_votos_evento(p_evento text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.eventos ev
  cross join lateral public.votos_evento_todos(ev.id) t
  where ev.slug = p_evento and ev.activo;
$$;

create or replace function public.admin_evento(p_evento text)
returns table (
  votacion_abierta    boolean,
  resultados_visibles boolean,
  participantes       integer,
  votos               integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select
    ev.votacion_abierta, ev.resultados_visibles,
    (select count(*)::integer from public.evento_participantes ep where ep.evento_id = ev.id),
    (select count(*)::integer from public.votos_evento_todos(ev.id))
  from public.eventos ev
  where ev.slug = p_evento;
end;
$$;

-- Por participante, cuántos votos vinieron sin cuenta: para auditar al ganador.
create function public.admin_votos_sin_cuenta(p_evento text)
returns table (perfil_id uuid, votos integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select vd.perfil_id, count(*)::integer
  from public.votos_dispositivo vd
  join public.eventos ev on ev.id = vd.evento_id
  where ev.slug = p_evento
  group by vd.perfil_id;
end;
$$;

create or replace function public.admin_ranking_evento(p_evento text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v        jsonb;
begin
  perform public.exigir_admin();
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;

  with conteo as (
    select t.perfil_id, count(*)::integer as votos
    from public.votos_evento_todos(v_evento) t
    where (t.con_cuenta and t.votante not in (select public.metrica_cuentas_equipo()))
       or (not t.con_cuenta and t.votante not in (select public.metrica_dispositivos_equipo()))
    group by t.perfil_id
  ),
  filas as (
    select p.id as perfil_id, c.votos,
      public.evento_empresa_de(v_evento, p.id) as empresa_id,
      p.nombre as perfil_nombre, p.avatar_url
    from conteo c
    join public.evento_participantes ep on ep.evento_id = v_evento and ep.perfil_id = c.perfil_id
    join public.perfiles p on p.id = c.perfil_id
    where p.publicado and not p.oculto
      and p.id not in (select public.metrica_perfiles_equipo())
  ),
  vistas as (
    select f.perfil_id, f.votos,
      coalesce(e.nombre, f.perfil_nombre) as nombre,
      e.id is not null as es_empresa,
      case when e.id is not null then coalesce(l.clave, e.logo_url) else f.avatar_url end as imagen,
      rank() over (order by f.votos desc)::integer as puesto
    from filas f
    left join public.empresas e on e.id = f.empresa_id
    left join public.empresa_logos l on l.empresa_id = e.id
  ),
  marcadas as (
    select vi.*, count(*) over (partition by vi.puesto) > 1 as empate
    from vistas vi
  ),
  arriba as (
    select m.* from marcadas m
    where m.puesto <= 10
    order by m.votos desc, lower(m.nombre), m.perfil_id
    limit 12
  )
  select jsonb_build_object(
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'perfil_id', a.perfil_id, 'nombre', a.nombre, 'es_empresa', a.es_empresa,
        'imagen', a.imagen, 'votos', a.votos, 'puesto', a.puesto, 'empate', a.empate
      ) order by a.votos desc, lower(a.nombre), a.perfil_id)
      from arriba a
    ), '[]'::jsonb),
    'fuera', (select count(*) from marcadas) - (select count(*) from arriba),
    'total', coalesce((select sum(m.votos) from marcadas m), 0)::integer,
    'votacion_abierta', (select ev.votacion_abierta from public.eventos ev where ev.id = v_evento)
  ) into v;
  return v;
end;
$$;

create or replace function public.evento_mover_votos(p_evento uuid, p_de uuid, p_a uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.votos vt
  set perfil_id = p_a, updated_at = now()
  where vt.evento_id = p_evento and vt.perfil_id = p_de
    and vt.votante is distinct from (select usuario_id from public.perfiles where id = p_a)
    and not exists (
      select 1
      from public.empresa_miembros mia
      join public.perfiles yo on yo.id = mia.perfil_id
      join public.empresa_miembros suya on suya.empresa_id = mia.empresa_id
      where yo.usuario_id = vt.votante and suya.perfil_id = p_a
    );
  update public.votos_dispositivo vd
  set perfil_id = p_a, updated_at = now()
  where vd.evento_id = p_evento and vd.perfil_id = p_de;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke execute on function public.feria_normalizar(text)                   from public;
revoke execute on function public.feria_anotar_stands()                    from public, anon, authenticated;
revoke execute on function public.feria_stands_trigger()                   from public, anon, authenticated;
revoke execute on function public.feria_dias(text)                         from public;
revoke execute on function public.votar_dispositivo(text, uuid, uuid)      from public;
revoke execute on function public.quitar_voto_dispositivo(text, uuid)      from public;
revoke execute on function public.mi_voto_dispositivo(text, uuid)          from public;
revoke execute on function public.votos_sin_doble()                        from public, anon, authenticated;
revoke execute on function public.votos_evento_todos(uuid)                 from public, anon, authenticated;
revoke execute on function public.admin_votos_sin_cuenta(text)             from public, anon;

grant execute on function public.feria_normalizar(text)                    to anon, authenticated;
grant execute on function public.feria_anotar_stands()                     to service_role;
grant execute on function public.feria_dias(text)                          to anon, authenticated;
grant execute on function public.votar_dispositivo(text, uuid, uuid)       to anon;
grant execute on function public.quitar_voto_dispositivo(text, uuid)       to anon, authenticated;
grant execute on function public.mi_voto_dispositivo(text, uuid)           to anon, authenticated;
grant execute on function public.admin_votos_sin_cuenta(text)              to authenticated;
