-- Vuelta atrás de 20261013120000_feria_todos_los_roles.sql (NO es migración: se corre a
-- mano en el SQL editor). Restaura, textuales, las versiones anteriores: votar de
-- multi_empresa y las cinco de vivo_feria (solo emprendedores compiten). No toca datos:
-- los votos ya dados a inversores o aliados quedan guardados, pero no se pueden repetir
-- y el ranking del stand deja de mostrarlos.

create or replace function public.votar(p_evento text, p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento     uuid;
  v_abierta    boolean;
  v_objetivo   public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

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
    and p.publicado and not p.oculto
    -- Compiten los proyectos; inversores y aliados participan pero no se votan.
    and p.rol = 'emprendedor';
  if not found then
    raise exception 'participante inexistente' using errcode = '22023';
  end if;

  if v_objetivo.usuario_id = auth.uid() then
    raise exception 'no podés votarte' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.empresa_miembros mia
    join public.perfiles yo on yo.id = mia.perfil_id
    join public.empresa_miembros suya on suya.empresa_id = mia.empresa_id
    where yo.usuario_id = auth.uid() and suya.perfil_id = v_objetivo.id
  ) then
    raise exception 'no podés votar a tu empresa' using errcode = '22023';
  end if;

  insert into public.votos (evento_id, votante, perfil_id)
  values (v_evento, auth.uid(), p_perfil)
  on conflict (evento_id, votante) do update set
    perfil_id  = excluded.perfil_id,
    updated_at = now();
end;
$$;

create or replace function public.metrica_proyectos_en(p_alcance text)
returns table (perfil_id uuid, rol text, industria text)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.metrica_proyectos() where p_alcance = 'plataforma'
  union all
  select p.id, p.rol,
    coalesce(
      (select e.industrias[1] from public.empresas e where e.id = public.evento_empresa_de(ev.id, p.id)),
      p.industrias[1],
      (select e.industrias[1] from public.empresas e where e.id = p.empresa_id)
    )
  from public.eventos ev
  join public.evento_participantes ep on ep.evento_id = ev.id
  join public.perfiles p on p.id = ep.perfil_id
  where p_alcance <> 'plataforma' and ev.slug = p_alcance
    and p.publicado and not p.oculto and p.rol = 'emprendedor'
    and p.id not in (select public.metrica_perfiles_equipo());
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
    select vt.perfil_id, count(*)::integer as votos
    from public.votos vt
    where vt.evento_id = v_evento
      and vt.votante not in (select public.metrica_cuentas_equipo())
    group by vt.perfil_id
  ),
  filas as (
    select p.id as perfil_id, c.votos,
      public.evento_empresa_de(v_evento, p.id) as empresa_id,
      p.nombre as perfil_nombre, p.avatar_url
    from conteo c
    join public.evento_participantes ep on ep.evento_id = v_evento and ep.perfil_id = c.perfil_id
    join public.perfiles p on p.id = c.perfil_id
    where p.publicado and not p.oculto and p.rol = 'emprendedor'
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

create or replace function public.evento_representante_por_defecto(p_empresa uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.empresa_miembros m
  join public.perfiles p on p.id = m.perfil_id
  join public.empresas e on e.id = m.empresa_id
  where m.empresa_id = p_empresa
    and p.publicado and not p.oculto and p.rol = 'emprendedor'
  order by (p.usuario_id is not distinct from e.dueno_id and p.usuario_id is not null) desc,
    m.created_at, m.id
  limit 1;
$$;

create or replace function public.admin_empresa_participante(p_evento text, p_empresa uuid, p_participa boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v_perfil uuid;
begin
  perform public.admin_como_sistema();
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;

  if not p_participa then
    select perfil_id into v_perfil from public.evento_empresas
    where evento_id = v_evento and empresa_id = p_empresa;
    if v_perfil is not null then
      -- El trigger borra la fila de evento_empresas.
      delete from public.evento_participantes where evento_id = v_evento and perfil_id = v_perfil;
    end if;
    return;
  end if;

  if exists (select 1 from public.evento_empresas where evento_id = v_evento and empresa_id = p_empresa) then
    return;
  end if;
  v_perfil := public.evento_representante_por_defecto(p_empresa);
  if v_perfil is null then
    raise exception 'la empresa no tiene una integrante emprendedora visible' using errcode = '22023';
  end if;
  if exists (select 1 from public.evento_empresas where evento_id = v_evento and perfil_id = v_perfil) then
    raise exception 'esa persona ya representa a otra empresa' using errcode = '22023';
  end if;

  insert into public.evento_participantes (evento_id, perfil_id)
  values (v_evento, v_perfil) on conflict do nothing;
  insert into public.evento_empresas (evento_id, empresa_id, perfil_id)
  values (v_evento, p_empresa, v_perfil);
end;
$$;

create or replace function public.admin_representante(p_evento text, p_empresa uuid, p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v_previo uuid;
begin
  perform public.admin_como_sistema();
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;
  select perfil_id into v_previo from public.evento_empresas
  where evento_id = v_evento and empresa_id = p_empresa;
  if v_previo is null then
    raise exception 'la empresa no participa' using errcode = '22023';
  end if;
  if v_previo = p_perfil then
    return;
  end if;
  if not exists (
    select 1 from public.empresa_miembros m
    join public.perfiles p on p.id = m.perfil_id
    where m.empresa_id = p_empresa and m.perfil_id = p_perfil
      and p.publicado and not p.oculto and p.rol = 'emprendedor'
  ) then
    raise exception 'tiene que ser una integrante emprendedora visible' using errcode = '22023';
  end if;
  if exists (select 1 from public.evento_empresas where evento_id = v_evento and perfil_id = p_perfil) then
    raise exception 'esa persona ya representa a otra empresa' using errcode = '22023';
  end if;

  update public.evento_empresas set perfil_id = p_perfil
  where evento_id = v_evento and empresa_id = p_empresa;
  insert into public.evento_participantes (evento_id, perfil_id)
  values (v_evento, p_perfil) on conflict do nothing;
  perform public.evento_mover_votos(v_evento, v_previo, p_perfil);
  -- La anterior ya no representa a nadie: deja de participar.
  delete from public.evento_participantes where evento_id = v_evento and perfil_id = v_previo;
end;
$$;
