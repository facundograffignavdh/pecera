-- Vuelta atrás de 20261019120000_feria_stands_votos.sql (NO es migración: se corre a mano
-- en el SQL editor). CON PÉRDIDA: borra la planilla de stands y los votos sin cuenta.
-- Restaura, textuales, las funciones de antes (los conteos vuelven a ser solo con cuenta).
-- Los participantes que anotó la planilla siguen anotados (sacalos en /admin si hace falta).

create or replace function public.resultados_evento(p_evento text)
returns table (perfil_id uuid, votos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select v.perfil_id, count(*)::integer
  from public.votos v
  join public.eventos ev on ev.id = v.evento_id
  where ev.slug = p_evento and ev.activo
    and (ev.resultados_visibles or public.es_admin())
  group by v.perfil_id
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
  from public.votos v
  join public.eventos ev on ev.id = v.evento_id
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
    (select count(*)::integer from public.votos v where v.evento_id = ev.id)
  from public.eventos ev
  where ev.slug = p_evento;
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
$$;

drop trigger if exists votos_sin_doble on public.votos;
drop trigger if exists feria_stands_perfiles on public.perfiles;
drop trigger if exists feria_stands_empresas on public.empresas;
drop trigger if exists feria_stands_miembros on public.empresa_miembros;

drop function if exists public.admin_votos_sin_cuenta(text);
drop function if exists public.votos_evento_todos(uuid);
drop function if exists public.votos_sin_doble();
drop function if exists public.mi_voto_dispositivo(text, uuid);
drop function if exists public.quitar_voto_dispositivo(text, uuid);
drop function if exists public.votar_dispositivo(text, uuid, uuid);
drop function if exists public.feria_dias(text);
drop function if exists public.feria_stands_trigger();
drop function if exists public.feria_anotar_stands();
drop function if exists public.feria_normalizar(text);

drop table if exists public.votos_dispositivo;
drop table if exists public.feria_stands;
