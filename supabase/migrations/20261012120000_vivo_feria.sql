-- Pecera: la Feria 21 en vivo. ADITIVA: una tabla, una columna, triggers y funciones
-- nuevas; no redefine ninguna función existente. Va después de super_dataroom.
-- Pruebas sin tocar ninguna base: supabase/pruebas/vivo_feria.mjs (PGlite).
--
--   1. Ranking en vivo de la votación para /admin/vivo (solo agregados, sin los votos
--      de las cuentas del equipo). resultados_evento y la página pública no cambian.
--   2. Empresas participantes: sumar una empresa anota a UNA persona (quien la
--      administra) en evento_participantes, así votar() sigue igual y los votos no se
--      reparten. evento_empresas recuerda a quién representa; el ranking muestra el
--      nombre y el logo de la empresa. El equipo puede cambiar quién la representa.
--   3. Pitches de la feria: el mecanismo sigue siendo "#feria21" en la descripción
--      (lo pide el Form y lo lee /t/feria21). El equipo lo agrega o lo quita.
--   4. Métricas con alcance: 'plataforma' (lo de siempre) o el slug de un evento
--      ('feria-21'). Con un evento, "proyectos" (el denominador de la liquidez y de
--      la CI por participante) son sus participantes emprendedores visibles, sin los
--      del equipo. CI de hoy, vistas y la curva por hora no cambian.

-- ---------------------------------------------------------------------------
-- 1) Empresas participantes
-- ---------------------------------------------------------------------------

-- Una empresa participa a través de una persona (la que la representa), que está en
-- evento_participantes. Una persona representa a lo sumo una empresa por evento.
create table public.evento_empresas (
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evento_id, empresa_id),
  unique (evento_id, perfil_id)
);

alter table public.evento_empresas enable row level security;
revoke all on public.evento_empresas from anon, authenticated;

-- Si la representante deja de participar (se saca sola, "Sacar" en /admin, borra la
-- cuenta), la empresa deja de participar.
create function public.evento_empresas_sin_participante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.evento_empresas
  where evento_id = old.evento_id and perfil_id = old.perfil_id;
  return old;
end;
$$;

create trigger evento_empresas_limpiar
  after delete on public.evento_participantes
  for each row execute function public.evento_empresas_sin_participante();

-- Si la representante sale de la empresa, la empresa deja de participar (la persona
-- sigue anotada por su cuenta).
create function public.evento_empresas_sin_miembro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.evento_empresas
  where empresa_id = old.empresa_id and perfil_id = old.perfil_id;
  return old;
end;
$$;

create trigger evento_empresas_sin_miembro
  after delete on public.empresa_miembros
  for each row execute function public.evento_empresas_sin_miembro();

-- La empresa de cada participante, para mostrar: la que representa o, si no, su
-- principal visible. Uso interno.
create function public.evento_empresa_de(p_evento uuid, p_perfil uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ee.empresa_id from public.evento_empresas ee
      where ee.evento_id = p_evento and ee.perfil_id = p_perfil),
    (select e.id from public.perfiles p join public.empresas e on e.id = p.empresa_id
      where p.id = p_perfil and public.empresa_visible(e.id))
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Métricas con alcance
-- ---------------------------------------------------------------------------

-- Proyectos según el alcance: 'plataforma' = metrica_proyectos() de siempre; el slug
-- de un evento = sus participantes emprendedores visibles, sin los del equipo (no
-- hace falta pitch: un stand sin reel también es un proyecto de la feria).
create function public.metrica_proyectos_en(p_alcance text)
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

-- metrica_resumen con alcance: mismas fórmulas, otro conjunto de proyectos.
create function public.metrica_resumen_en(p_desde timestamptz, p_hasta timestamptz, p_alcance text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ci as (select * from public.metrica_ci(p_desde, p_hasta)),
  pr as (select * from public.metrica_proyectos_en(p_alcance)),
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
    'alcance', p_alcance,
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

-- admin_vivo con alcance: igual que admin_vivo, con los proyectos del alcance para el
-- % con al menos una CI y para las industrias del ticker.
create function public.admin_vivo_en(p_alcance text)
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

  with pr as (select * from public.metrica_proyectos_en(p_alcance)),
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
    'alcance', p_alcance,
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

-- admin_dataroom con alcance: el mismo dataroom, con el resumen y la liquidez de los
-- proyectos del alcance. Embudo, curva, matriz, atribución y cohortes no dependen
-- de qué es un proyecto.
create function public.admin_dataroom_en(
  p_desde   timestamptz default null,
  p_hasta   timestamptz default null,
  p_fuente  text default null,
  p_alcance text default 'plataforma'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v        jsonb := public.admin_dataroom(p_desde, p_hasta, p_fuente);
  v_desde  timestamptz := coalesce(p_desde, public.metrica_inicio());
  v_hasta  timestamptz := coalesce(p_hasta, now());
  v_liquidez jsonb;
begin
  -- admin_dataroom ya exigió admin.
  if p_alcance = 'plataforma' then
    return v || jsonb_build_object('alcance', p_alcance);
  end if;

  with pr as (select * from public.metrica_proyectos_en(p_alcance)),
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

  return v || jsonb_build_object(
    'alcance', p_alcance,
    'resumen', public.metrica_resumen_en(v_desde, v_hasta, p_alcance),
    'liquidez', v_liquidez
  );
end;
$$;

-- El snapshot del Demo Day guarda su alcance. Las filas de antes son de la plataforma.
-- (Agregar una columna no dispara el trigger que impide modificar filas.)
alter table public.demo_day_snapshots
  add column alcance text not null default 'plataforma'
  constraint demo_day_snapshots_alcance check (alcance ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- "Congelar": dos filas inmutables en el mismo instante, la de la plataforma y la del
-- evento (la Feria 21 por defecto).
create function public.admin_congelar_demo_day_en(p_evento text default 'feria-21')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := public.metrica_inicio();
  v_ahora  timestamptz := now();
  v_alc    text;
  v_r      jsonb;
  v_filas  jsonb := '[]'::jsonb;
  v_fila   public.demo_day_snapshots;
begin
  perform public.exigir_admin();
  if not exists (select 1 from public.eventos where slug = p_evento) then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;

  foreach v_alc in array array['plataforma', p_evento] loop
    v_r := public.metrica_resumen_en(v_inicio, v_ahora, v_alc);
    insert into public.demo_day_snapshots (
      logica, desde, hasta, ci, ci_q, proyectos, ci_por_participante,
      liquidez, liquidez_q, pct_vistas_fuera_horario, detalle, alcance
    ) values (
      1, v_inicio, v_ahora, (v_r ->> 'ci')::integer, (v_r ->> 'ci_q')::integer,
      (v_r ->> 'proyectos')::integer, (v_r ->> 'ci_por_participante')::numeric,
      (v_r ->> 'liquidez')::numeric, (v_r ->> 'liquidez_q')::numeric,
      (v_r ->> 'pct_vistas_fuera_horario')::numeric, v_r, v_alc
    )
    returning * into v_fila;
    v_filas := v_filas || to_jsonb(v_fila);
  end loop;

  return v_filas;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Ranking en vivo (/admin/vivo)
-- ---------------------------------------------------------------------------

-- Votos por participante emprendedor visible, sin los votos de las cuentas del equipo
-- (la misma regla que las métricas) ni los perfiles del equipo. Solo agregados: nunca
-- quién votó. Puesto de competición (1, 2, 2, 4); entran todos los puestos ≤ 10, con
-- un tope de 12 filas si hay empates en el borde. Solo quienes tienen votos.
create function public.admin_ranking_evento(p_evento text)
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

-- ---------------------------------------------------------------------------
-- 4) Gestión de la feria (/admin)
-- ---------------------------------------------------------------------------

-- Quien representa a una empresa por defecto: quien la administra (dueno_id), si es
-- integrante emprendedora visible; si no, la integrante emprendedora visible más antigua.
create function public.evento_representante_por_defecto(p_empresa uuid)
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

-- Pasa los votos de una persona a otra dentro del evento (cambio de representante).
-- No pasa los que la nueva no podría recibir (los suyos o de alguien que comparte una
-- empresa con ella): esos quedan donde estaban, fuera del ranking. Uso interno.
create function public.evento_mover_votos(p_evento uuid, p_de uuid, p_a uuid)
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

-- Suma o saca una empresa del evento. Sumar anota a quien la representa (por
-- defecto, quien la administra); sacar la desanota.
create function public.admin_empresa_participante(p_evento text, p_empresa uuid, p_participa boolean)
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

-- Cambia quién representa a una empresa participante. La nueva tiene que ser
-- integrante emprendedora visible. Sus votos pasan a la nueva (salvo los que ella no
-- podría recibir) y la anterior deja de participar.
create function public.admin_representante(p_evento text, p_empresa uuid, p_perfil uuid)
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

-- Agrega o quita "#feria21" de la descripción de un pitch. Sin descripción propia,
-- parte de la del perfil (la que el feed ya muestra). Si no entra en 150, avisa.
create function public.admin_pitch_feria(p_pitch uuid, p_con boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag   constant text := '(^|[^[:alnum:]_])#feria21($|[^[:alnum:]_])';
  v_texto text;
  v_nuevo text;
begin
  perform public.admin_como_sistema();
  select coalesce(x.descripcion, p.descripcion) into v_texto
  from public.pitches x join public.perfiles p on p.id = x.perfil_id
  where x.id = p_pitch;
  if not found then
    raise exception 'pitch inexistente' using errcode = '22023';
  end if;

  if p_con then
    if coalesce(v_texto, '') ~* v_tag then
      v_nuevo := v_texto;
    else
      v_nuevo := btrim(coalesce(v_texto, '') || ' #feria21');
    end if;
    if char_length(v_nuevo) > 150 then
      raise exception 'el tag no entra en la descripción (máx. 150)' using errcode = '22023';
    end if;
    update public.pitches set descripcion = v_nuevo where id = p_pitch;
  else
    -- Dos pasadas: "#feria21 #feria21" comparte el separador.
    v_nuevo := regexp_replace(coalesce(v_texto, ''), v_tag, '\1\2', 'gi');
    v_nuevo := regexp_replace(v_nuevo, v_tag, '\1\2', 'gi');
    v_nuevo := btrim(regexp_replace(v_nuevo, '\s{2,}', ' ', 'g'));
    update public.pitches set descripcion = nullif(v_nuevo, '') where id = p_pitch;
  end if;
end;
$$;

-- Todo lo de la feria para /admin: perfiles, empresas (con su representante e
-- integrantes elegibles) y pitches (con o sin #feria21). Sin los perfiles test-*.
create function public.admin_feria(p_evento text)
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

  select jsonb_build_object(
    'perfiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'nombre', p.nombre, 'rol', p.rol,
        'visible', p.publicado and not p.oculto,
        'participa', ep.perfil_id is not null,
        'representa', (select e.nombre from public.evento_empresas ee
                        join public.empresas e on e.id = ee.empresa_id
                        where ee.evento_id = v_evento and ee.perfil_id = p.id),
        'empresas', (select string_agg(e.nombre, ', ' order by (e.id = p.empresa_id) desc, m.created_at)
                     from public.empresa_miembros m join public.empresas e on e.id = m.empresa_id
                     where m.perfil_id = p.id),
        'pitches', (select count(*) from public.pitches x
                    where x.perfil_id = p.id and x.publicado and not x.oculto),
        'pitches_feria', (select count(*) from public.pitches x
                          where x.perfil_id = p.id and x.publicado and not x.oculto
                            and coalesce(x.descripcion, '') ~* '(^|[^[:alnum:]_])#feria21($|[^[:alnum:]_])')
      ) order by lower(p.nombre))
      from public.perfiles p
      left join public.evento_participantes ep on ep.evento_id = v_evento and ep.perfil_id = p.id
      where p.slug not like 'test-%'
    ), '[]'::jsonb),
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'slug', e.slug, 'nombre', e.nombre,
        'visible', public.empresa_visible(e.id),
        'representante', ee.perfil_id,
        'integrantes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'perfil_id', p.id, 'nombre', p.nombre, 'rol', p.rol,
            'visible', p.publicado and not p.oculto,
            'administra', p.usuario_id is not null and p.usuario_id = e.dueno_id,
            'participa', exists (select 1 from public.evento_participantes ep
                                 where ep.evento_id = v_evento and ep.perfil_id = p.id)
          ) order by m.created_at, m.id)
          from public.empresa_miembros m join public.perfiles p on p.id = m.perfil_id
          where m.empresa_id = e.id and p.slug not like 'test-%'
        ), '[]'::jsonb)
      ) order by lower(e.nombre))
      from public.empresas e
      left join public.evento_empresas ee on ee.evento_id = v_evento and ee.empresa_id = e.id
    ), '[]'::jsonb),
    'pitches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'perfil_id', p.id, 'perfil', p.nombre, 'slug', p.slug,
        'descripcion', x.descripcion, 'poster_url', x.poster_url,
        'visible', x.publicado and not x.oculto and p.publicado and not p.oculto,
        'con_tag', coalesce(x.descripcion, '') ~* '(^|[^[:alnum:]_])#feria21($|[^[:alnum:]_])'
      ) order by x.created_at desc)
      from public.pitches x join public.perfiles p on p.id = x.perfil_id
      where p.slug not like 'test-%'
    ), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: Postgres da execute a public por defecto; se lo sacamos y abrimos lo justo.
-- ---------------------------------------------------------------------------
revoke execute on function public.evento_empresas_sin_participante()                from public, anon, authenticated;
revoke execute on function public.evento_empresas_sin_miembro()                     from public, anon, authenticated;
revoke execute on function public.evento_empresa_de(uuid, uuid)                     from public, anon, authenticated;
revoke execute on function public.metrica_proyectos_en(text)                        from public, anon, authenticated;
revoke execute on function public.metrica_resumen_en(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.evento_representante_por_defecto(uuid)           from public, anon, authenticated;
revoke execute on function public.evento_mover_votos(uuid, uuid, uuid)              from public, anon, authenticated;
revoke execute on function public.admin_vivo_en(text)                               from public, anon;
revoke execute on function public.admin_dataroom_en(timestamptz, timestamptz, text, text) from public, anon;
revoke execute on function public.admin_congelar_demo_day_en(text)                  from public, anon;
revoke execute on function public.admin_ranking_evento(text)                        from public, anon;
revoke execute on function public.admin_empresa_participante(text, uuid, boolean)   from public, anon;
revoke execute on function public.admin_representante(text, uuid, uuid)            from public, anon;
revoke execute on function public.admin_pitch_feria(uuid, boolean)                  from public, anon;
revoke execute on function public.admin_feria(text)                                 from public, anon;

grant execute on function public.admin_vivo_en(text)                                to authenticated;
grant execute on function public.admin_dataroom_en(timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.admin_congelar_demo_day_en(text)                   to authenticated;
grant execute on function public.admin_ranking_evento(text)                         to authenticated;
grant execute on function public.admin_empresa_participante(text, uuid, boolean)    to authenticated;
grant execute on function public.admin_representante(text, uuid, uuid)             to authenticated;
grant execute on function public.admin_pitch_feria(uuid, boolean)                   to authenticated;
grant execute on function public.admin_feria(text)                                  to authenticated;
