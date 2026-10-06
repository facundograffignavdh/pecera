-- Panel de la organización de la Feria 21 (autoridades de la Universidad Siglo 21): /organizacion.
--
-- Va después de 20261015120000_networking_feria.sql. ADITIVA: una tabla y funciones nuevas; no
-- toca tablas, reglas ni funciones existentes. Vuelta atrás (no es migración):
--   drop function public.organizacion_networking(text);
--   drop function public.admin_organizadores(text);
--   drop function public.admin_organizador(text, text, boolean);
--   drop function public.puede_ver_organizacion(text);
--   drop table public.evento_organizadores;
--
-- Quién entra: las cuentas de Google cuyo email está en evento_organizadores para ese evento
-- (las carga el equipo desde /admin), y los admins de Pecera (para revisar). Nadie más: la
-- Universidad no ve nada del resto de /admin.
--
-- Qué ve (ver /privacidad#universidad):
--  - NÚMEROS de networking de la feria, sin el equipo ni perfiles de prueba: personas, intereses,
--    matches (por par), por día, entre roles, lo más buscado y ofrecido, el cómo y cuántos
--    aceptaron compartir.
--  - Con nombre, SOLO quienes tildaron la casilla de consentimiento (acepta = true, última
--    elección) y tienen el perfil visible: su perfil público y lo que buscan y ofrecen. Retirar
--    el consentimiento los saca de la lista al instante.
--  - Nunca: mensajes, quién le mostró interés a quién, emails de cuenta, ni nada de quien no aceptó.
--  - Solo para admins (no para la Universidad): quién de la feria todavía no completó qué busca y
--    qué ofrece (para empujar en el stand; es dato público del perfil).

create table public.evento_organizadores (
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now(),

  primary key (evento_id, email),
  constraint evento_organizadores_email_valido check (
    email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200
  )
);

alter table public.evento_organizadores enable row level security;
revoke all on public.evento_organizadores from anon, authenticated;
-- Sin políticas: solo por las funciones de abajo.

-- ¿La sesión puede ver el panel de la organización de ese evento? Admin o email habilitado.
create function public.puede_ver_organizacion(p_evento text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public.es_admin()
    or exists (
      select 1
      from auth.users u
      join public.evento_organizadores o on o.email = lower(btrim(u.email))
      join public.eventos ev on ev.id = o.evento_id
      where u.id = auth.uid() and u.email_confirmed_at is not null and ev.slug = p_evento
    )
  )
$$;

create function public.organizacion_networking(p_evento text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v_admin  boolean := public.es_admin();
  v        jsonb;
begin
  if not public.puede_ver_organizacion(p_evento) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;

  with equipo as (
    select x as id from public.metrica_perfiles_equipo() x
  ),
  -- Personas de la feria: anotadas, visibles y sin el equipo.
  base as (
    select p.id, p.slug, p.nombre, p.rol, p.busca, p.ofrece, p.busca_como, p.ofrece_como
    from public.perfiles p
    join public.evento_participantes ep on ep.perfil_id = p.id and ep.evento_id = v_evento
    where p.publicado and not p.oculto and p.id not in (select id from equipo)
  ),
  -- Intereses hechos con el filtro de la feria, entre personas que no son del equipo.
  inter as (
    select i.de, i.a, i.estado, i.created_at, pd.rol as rol_de, pa.rol as rol_a
    from public.networking_intereses i
    join public.perfiles pd on pd.id = i.de
    join public.perfiles pa on pa.id = i.a
    where i.evento_id = v_evento
      and i.de not in (select id from equipo)
      and i.a not in (select id from equipo)
  ),
  -- Quienes aceptaron compartir (última elección) y tienen el perfil visible.
  consentidos as (
    select p.*, c.decidido_at
    from public.evento_consentimientos c
    join public.perfiles p on p.id = c.perfil_id
    where c.evento_id = v_evento and c.acepta
      and p.publicado and not p.oculto
      and p.id not in (select id from equipo)
  )
  select jsonb_build_object(
    'personas', (select count(*) from base),
    'con_busca', (select count(*) from base where cardinality(busca) > 0),
    'con_ofrece', (select count(*) from base where cardinality(ofrece) > 0),
    'completos', (select count(*) from base where cardinality(busca) > 0 and cardinality(ofrece) > 0),
    'con_interes', (select count(distinct de) from inter),

    'intereses', (select count(*) from inter),
    'pendientes', (select count(*) from inter where estado = 'pendiente'),
    'rechazados', (select count(*) from inter where estado = 'rechazado'),
    'retirados', (select count(*) from inter where estado = 'retirado'),
    'aceptados', (select count(*) from inter where estado = 'aceptado'),
    -- Un match puede ser una fila (aceptó quien recibió) o dos (se eligieron los dos): por par.
    'matches', (
      select count(distinct (least(de::text, a::text), greatest(de::text, a::text)))
      from inter where estado = 'aceptado'
    ),

    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'intereses', d.intereses, 'aceptados', d.aceptados) order by d.dia)
      from (
        select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as dia,
               count(*) as intereses,
               count(*) filter (where estado = 'aceptado') as aceptados
        from inter group by 1
      ) d
    ), '[]'::jsonb),

    'por_roles', coalesce((
      select jsonb_agg(jsonb_build_object('de', r.rol_de, 'a', r.rol_a, 'intereses', r.n, 'aceptados', r.ok) order by r.n desc)
      from (
        select rol_de, rol_a, count(*) as n, count(*) filter (where estado = 'aceptado') as ok
        from inter group by 1, 2
      ) r
    ), '[]'::jsonb),

    'busca', coalesce((
      select jsonb_object_agg(o.v, o.n) from (select unnest(busca) as v, count(*) as n from base group by 1) o
    ), '{}'::jsonb),
    'ofrece', coalesce((
      select jsonb_object_agg(o.v, o.n) from (select unnest(ofrece) as v, count(*) as n from base group by 1) o
    ), '{}'::jsonb),
    'busca_como', coalesce((
      select jsonb_object_agg(o.v, o.n) from (select unnest(busca_como) as v, count(*) as n from base group by 1) o
    ), '{}'::jsonb),
    'ofrece_como', coalesce((
      select jsonb_object_agg(o.v, o.n) from (select unnest(ofrece_como) as v, count(*) as n from base group by 1) o
    ), '{}'::jsonb),

    'consentimiento', jsonb_build_object(
      'aceptan', (select count(*) from public.evento_consentimientos c
                  where c.evento_id = v_evento and c.acepta and c.perfil_id in (select id from base)),
      'retiraron', (select count(*) from public.evento_consentimientos c
                    where c.evento_id = v_evento and not c.acepta and c.perfil_id in (select id from base)),
      'sin_decidir', (select count(*) from base b
                      where not exists (select 1 from public.evento_consentimientos c
                                        where c.evento_id = v_evento and c.perfil_id = b.id))
    ),

    -- Con nombre: solo quienes aceptaron. Perfil público y lo que buscan y ofrecen.
    'consentidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'nombre', c.nombre, 'rol', c.rol, 'descripcion', c.descripcion,
        'ubicacion', c.ubicacion,
        'busca', c.busca, 'ofrece', c.ofrece,
        'busca_detalle', c.busca_detalle, 'ofrece_detalle', c.ofrece_detalle,
        'busca_como', c.busca_como, 'ofrece_como', c.ofrece_como,
        'participa', exists (select 1 from public.evento_participantes ep
                             where ep.evento_id = v_evento and ep.perfil_id = c.id),
        'empresas', (select string_agg(e.nombre, ', ' order by (e.id = c.empresa_id) desc, m.created_at)
                     from public.empresa_miembros m
                     join public.empresas e on e.id = m.empresa_id
                     where m.perfil_id = c.id and not e.oculta),
        'acepto_at', c.decidido_at
      ) order by c.nombre)
      from consentidos c
    ), '[]'::jsonb),

    -- Solo admins: quién de la feria no completó busca y ofrece (dato público, para el stand).
    'sin_completar', case when not v_admin then null else coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'nombre', s.nombre, 'rol', s.rol,
        'falta', case
          when cardinality(s.busca) = 0 and cardinality(s.ofrece) = 0 then 'ambos'
          when cardinality(s.busca) = 0 then 'busca'
          else 'ofrece'
        end
      ) order by s.nombre)
      from (select * from base where cardinality(busca) = 0 or cardinality(ofrece) = 0 order by nombre limit 150) s
    ), '[]'::jsonb) end,

    'es_admin', v_admin
  ) into v;

  return v;
end;
$$;

-- Equipo: quiénes de la Universidad pueden entrar (emails, solo admins).
create function public.admin_organizadores(p_evento text)
returns table (email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select o.email, o.created_at
  from public.evento_organizadores o
  join public.eventos ev on ev.id = o.evento_id
  where ev.slug = p_evento
  order by o.created_at;
end;
$$;

-- Equipo: habilitar (p_habilitar = true) o sacar un email.
create function public.admin_organizador(p_evento text, p_email text, p_habilitar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v_email  text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.exigir_admin();
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;
  if p_habilitar then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then
      raise exception 'email inválido' using errcode = '22023';
    end if;
    insert into public.evento_organizadores (evento_id, email) values (v_evento, v_email)
    on conflict do nothing;
  else
    delete from public.evento_organizadores where evento_id = v_evento and email = v_email;
  end if;
end;
$$;

revoke execute on function public.puede_ver_organizacion(text) from public, anon;
revoke execute on function public.organizacion_networking(text) from public, anon;
revoke execute on function public.admin_organizadores(text) from public, anon;
revoke execute on function public.admin_organizador(text, text, boolean) from public, anon;
grant execute on function public.puede_ver_organizacion(text) to authenticated;
grant execute on function public.organizacion_networking(text) to authenticated;
grant execute on function public.admin_organizadores(text) to authenticated;
grant execute on function public.admin_organizador(text, text, boolean) to authenticated;
