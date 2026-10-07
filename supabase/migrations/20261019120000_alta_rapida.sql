-- Pecera: alta rápida en la feria, edición desde /admin y reclamo del perfil. Va después de
-- 20261018120000_score_switch.sql.
--
-- Base compartida con producción: ADITIVA. Tres tablas privadas y funciones nuevas; ninguna
-- función existente se redefine y no se toca ninguna columna. Vuelta atrás:
-- supabase/rollback-alta-rapida.sql (no es migración; con pérdida del registro y los emails
-- de reclamo, los perfiles quedan).
--
-- Qué suma:
--   1. Alta rápida (/admin/alta): el equipo crea en el stand el perfil de una persona (y su
--      empresa) SIN cuenta, con su consentimiento. Pasa por funciones security definer: un
--      insert con el cliente normal le pondría como dueña a quien lo carga (perfiles_guardian).
--   2. Edición desde /admin: completa para perfiles sin cuenta; con cuenta, solo nombre y
--      descripción. Empresas: editar, agregar a un perfil o sumarlo a una existente.
--   3. Reclamo: el equipo puede guardar el email de Google de la persona (privado, nunca en
--      perfiles.email). Cuando entra con esa cuenta (email verificado), /cuenta le ofrece el
--      perfil y, si confirma, queda como dueña. Nada se fusiona solo.
--
-- Regla PostgREST: ninguna tabla nueva tiene FK a `perfiles` y a `empresas` a la vez (abriría
-- un camino perfiles↔empresas y el embed `empresa:empresas(...)` daría PGRST201).

-- ---------------------------------------------------------------------------
-- 1) Tablas (privadas: RLS sin políticas, solo las funciones las tocan)
-- ---------------------------------------------------------------------------

-- Quién y cuándo creó cada perfil desde el alta rápida. Aparte de `perfiles` porque anon lee
-- las filas de perfiles: quién del equipo lo cargó no es público.
create table public.perfiles_alta_equipo (
  perfil_id              uuid primary key references public.perfiles (id) on delete cascade,
  creado_por             uuid references auth.users (id) on delete set null,
  consentimiento_at      timestamptz not null,
  consentimiento_version text not null check (char_length(consentimiento_version) between 1 and 40),
  -- La empresa que creó o a la que lo sumó el alta. Sin FK a propósito (ver arriba).
  empresa_id             uuid,
  created_at             timestamptz not null default now()
);

create index perfiles_alta_equipo_creado_idx on public.perfiles_alta_equipo (creado_por, created_at desc);

-- Email de Google con el que la persona puede reclamar su perfil. Se borra al reclamarlo.
create table public.perfiles_reclamo (
  perfil_id      uuid primary key references public.perfiles (id) on delete cascade,
  email          text not null check (
    email = lower(btrim(email))
    and char_length(email) <= 200
    and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  email_canonico text not null,
  -- La persona entró con ese email y dijo "no es mío": va a "Para revisar".
  rechazado_at   timestamptz,
  cargado_por    uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index perfiles_reclamo_email_idx on public.perfiles_reclamo (email_canonico);

-- Registro de lo que hace el equipo desde /admin: quién, cuándo, qué y qué columnas (nunca
-- los valores). perfil_id y empresa_id son uuid comunes: el registro sobrevive al borrado.
create table public.equipo_acciones (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_id   uuid,
  accion     text not null check (accion in (
    'alta', 'deshacer', 'borrar_perfil', 'editar_perfil', 'editar_perfil_cuenta',
    'editar_empresa', 'agregar_empresa', 'sumar_empresa', 'email_reclamo', 'vincular'
  )),
  perfil_id  uuid,
  empresa_id uuid,
  campos     text[] not null default '{}'
);

create index equipo_acciones_perfil_idx on public.equipo_acciones (perfil_id, created_at desc);

alter table public.perfiles_alta_equipo enable row level security;
alter table public.perfiles_reclamo     enable row level security;
alter table public.equipo_acciones      enable row level security;
revoke all on public.perfiles_alta_equipo from anon, authenticated;
revoke all on public.perfiles_reclamo     from anon, authenticated;
revoke all on public.equipo_acciones      from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Internas
-- ---------------------------------------------------------------------------

-- Email para comparar: minúsculas y sin espacios. En Gmail los puntos y lo que va desde "+"
-- no cambian el buzón (y googlemail.com es gmail.com): se sacan. Otros dominios, exacto.
create function public.email_canonico(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(x.e, '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(x.e, '@', 1), '+', 1), '.', '') || '@gmail.com'
    else x.e
  end
  from (select lower(btrim(coalesce(p_email, ''))) as e) x;
$$;

-- Texto para comparar nombres: minúsculas, sin tildes, solo letras y números separados por
-- un espacio. Sin la extensión unaccent (no está en todas las bases).
create function public.texto_comparable(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p_texto, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

-- Slug libre a partir de un nombre, con las reglas del guardián (^[a-z0-9]+(-[a-z0-9]+)*$,
-- 3 a 60, nunca test-). Si está tomado: -2, -3…
create function public.slug_libre(p_base text, p_tabla text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text := left(replace(public.texto_comparable(p_base), ' ', '-'), 54);
  v_slug text;
  v_n    integer := 1;
begin
  v_base := regexp_replace(v_base, '-+$', '');
  if v_base = 'test' or v_base like 'test-%' then
    v_base := 'p-' || v_base;
  end if;
  if char_length(v_base) < 3 then
    v_base := case when p_tabla = 'empresas' then 'empresa' else 'perfil' end
      || case when v_base <> '' then '-' || v_base else '' end;
  end if;

  v_slug := v_base;
  loop
    exit when not (
      case when p_tabla = 'empresas'
        then exists (select 1 from public.empresas where slug = v_slug)
        else exists (select 1 from public.perfiles where slug = v_slug)
      end
    );
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;

-- Validaciones del alta y la edición: las del guardián para nombre y descripción, una sola
-- línea. `campo` va en el mensaje para que la app diga cuál falló.
create function public.equipo_validar_texto(p_campo text, p_valor text, p_min integer, p_max integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_valor, ''))) not between p_min and p_max
     or coalesce(p_valor, '') ~ '[\r\n]' then
    raise exception 'dato inválido: %', p_campo using errcode = '22023';
  end if;
end;
$$;

create function public.equipo_validar_email(p_email text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(p_email) > 200 or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'email inválido' using errcode = '22023';
  end if;
end;
$$;

create function public.equipo_registrar(
  p_admin   uuid,
  p_accion  text,
  p_perfil  uuid,
  p_empresa uuid,
  p_campos  text[] default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.equipo_acciones (admin_id, accion, perfil_id, empresa_id, campos)
  values (p_admin, p_accion, p_perfil, p_empresa, coalesce(p_campos, '{}'));
$$;

-- Crea una empresa con lo mínimo y suma al perfil (mismas reglas que crear_empresa_basica:
-- hasta 5 por persona, código de invitación, membresía; la principal la fijan los triggers).
-- El dueño va explícito: después de admin_como_sistema no hay auth.uid().
create function public.equipo_crear_empresa(
  p_perfil      uuid,
  p_nombre      text,
  p_descripcion text,
  p_tipo        text,
  p_dueno       uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select count(*) from public.empresa_miembros where perfil_id = p_perfil) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
  end if;

  insert into public.empresas (slug, nombre, descripcion, tipo, dueno_id)
  values (
    public.slug_libre(p_nombre, 'empresas'),
    btrim(p_nombre),
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    coalesce(nullif(p_tipo, ''), 'startup'),
    p_dueno
  )
  returning id into v_id;

  insert into public.empresas_codigos (empresa_id, codigo)
  values (v_id, public.codigo_nuevo());

  insert into public.empresa_miembros (empresa_id, perfil_id)
  values (v_id, p_perfil);

  return v_id;
end;
$$;

create function public.equipo_validar_empresa(p_nombre text, p_descripcion text, p_tipo text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform public.equipo_validar_texto('empresa', p_nombre, 1, 80);
  if nullif(btrim(coalesce(p_descripcion, '')), '') is not null then
    perform public.equipo_validar_texto('empresa_descripcion', p_descripcion, 1, 280);
  end if;
  if coalesce(nullif(p_tipo, ''), 'startup') not in (
    'startup', 'emprendimiento', 'aceleradora', 'incubadora', 'fondo', 'empresa', 'institucion'
  ) then
    raise exception 'dato inválido: empresa_tipo' using errcode = '22023';
  end if;
end;
$$;

-- Anota al perfil en el evento y, si se pasa una empresa que todavía no participa y el perfil
-- no representa a otra, lo deja como su representante. Nunca cambia un representante.
create function public.equipo_anotar_feria(p_evento uuid, p_perfil uuid, p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.evento_participantes (evento_id, perfil_id)
  values (p_evento, p_perfil) on conflict do nothing;

  if p_empresa is not null
     and not exists (select 1 from public.evento_empresas where evento_id = p_evento and empresa_id = p_empresa)
     and not exists (select 1 from public.evento_empresas where evento_id = p_evento and perfil_id = p_perfil) then
    insert into public.evento_empresas (evento_id, empresa_id, perfil_id)
    values (p_evento, p_empresa, p_perfil);
  end if;
end;
$$;

create function public.equipo_evento(p_evento text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_evento is null or p_evento = '' then
    return null;
  end if;
  select id into v_id from public.eventos where slug = p_evento;
  if v_id is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

-- Vincula un perfil sin dueño con una cuenta. Las empresas del perfil que nadie administra
-- pasan a esa cuenta. Con `p_consentimiento`, el consentimiento pasa a ser el de la persona.
-- Se llama sin claims (el guardián frena cambiar usuario_id con sesión de usuario).
create function public.vincular_interno(p_perfil uuid, p_uid uuid, p_consentimiento boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles
  set usuario_id        = p_uid,
      consentimiento_at = case when p_consentimiento then now() else consentimiento_at end
  where id = p_perfil and usuario_id is null;
  if not found then
    raise exception 'ese perfil ya tiene dueña' using errcode = '22023';
  end if;

  update public.empresas e
  set dueno_id = p_uid, updated_at = now()
  where e.dueno_id is null
    and exists (
      select 1 from public.empresa_miembros m
      where m.empresa_id = e.id and m.perfil_id = p_perfil
    );

  delete from public.perfiles_reclamo where perfil_id = p_perfil;
end;
$$;

-- Borra un perfil sin cuenta con lo que tenga: mismo tratamiento que borrar_mi_cuenta para
-- el perfil (R2, orígenes, ingestas y envíos), las empresas donde era la única integrante con
-- borrar_empresa_entera, y el resto en cascada. Uso interno de deshacer y borrar.
create function public.perfil_equipo_borrar(p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil   public.perfiles;
  v_origenes text[];
  v_borrar   uuid[];
  v_id       uuid;
begin
  select * into v_perfil from public.perfiles where id = p_perfil for update;
  if not found then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  if v_perfil.usuario_id is not null then
    raise exception 'el perfil tiene cuenta' using errcode = '22023';
  end if;

  select coalesce(array_agg(m.empresa_id), '{}') into v_borrar
  from public.empresa_miembros m
  where m.perfil_id = p_perfil
    and not exists (
      select 1 from public.empresa_miembros o
      where o.empresa_id = m.empresa_id and o.perfil_id <> p_perfil
    );

  select coalesce(array_agg(distinct o), '{}') into v_origenes
  from (
    select x.origen_id as o from public.pitches x
    where x.perfil_id = p_perfil and x.origen_id is not null
    union all
    select v_perfil.origen_id where v_perfil.origen_id is not null
    union all
    select e.origen_id from public.envios e where e.perfil_id = p_perfil
  ) t;

  insert into public.r2_borrar as r (clave, bytes, borrar_despues)
  select k.clave, max(k.bytes), now()
  from (
    select x.video_url as clave, coalesce(i.bytes, 0) as bytes
    from public.pitches x
    left join public.ingestas i on i.origen_id = x.origen_id
    where x.perfil_id = p_perfil
    union all
    select x.poster_url, 0 from public.pitches x where x.perfil_id = p_perfil
    union all
    select v_perfil.avatar_url, 0
  ) k
  where k.clave is not null and k.clave <> '' and k.clave !~ '^(/|https?:)'
  group by k.clave
  on conflict (clave) do update set
    bytes          = greatest(r.bytes, excluded.bytes),
    borrar_despues = least(r.borrar_despues, excluded.borrar_despues);

  update public.r2_borrar r
  set borrar_despues = now()
  where r.borrar_despues > now()
    and exists (select 1 from unnest(v_origenes) o where starts_with(r.clave, o || '-'));

  insert into public.origenes_borrados (origen_id)
  select unnest(v_origenes)
  on conflict (origen_id) do nothing;

  insert into public.ingestas (origen_id, estado, intentos, bytes)
  select unnest(v_origenes), 'borrado', 1000, 0
  on conflict (origen_id) do update set estado = 'borrado', updated_at = now();

  update public.envios
  set estado = 'borrado', updated_at = now()
  where origen_id = any (v_origenes);

  delete from public.perfiles where id = p_perfil;

  foreach v_id in array v_borrar loop
    perform public.borrar_empresa_entera(v_id);
  end loop;
end;
$$;

revoke execute on function public.email_canonico(text) from public, anon, authenticated;
revoke execute on function public.texto_comparable(text) from public, anon, authenticated;
revoke execute on function public.slug_libre(text, text) from public, anon, authenticated;
revoke execute on function public.equipo_validar_texto(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.equipo_validar_email(text) from public, anon, authenticated;
revoke execute on function public.equipo_registrar(uuid, text, uuid, uuid, text[]) from public, anon, authenticated;
revoke execute on function public.equipo_crear_empresa(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.equipo_validar_empresa(text, text, text) from public, anon, authenticated;
revoke execute on function public.equipo_anotar_feria(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.equipo_evento(text) from public, anon, authenticated;
revoke execute on function public.vincular_interno(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.perfil_equipo_borrar(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Alta rápida (solo admins)
-- ---------------------------------------------------------------------------

-- Crea el perfil SIN cuenta (usuario_id null, tipo 'persona') con el consentimiento que la
-- persona dio en el stand. Empresa opcional: nueva (p_empresa_nombre) o una existente
-- (p_sumar_a). Con evento, la anota y, si corresponde, la deja como representante.
-- Devuelve {id, slug, empresa_id, empresa_slug}.
create function public.admin_alta_rapida(
  p_nombre              text,
  p_descripcion         text,
  p_empresa_nombre      text default null,
  p_empresa_descripcion text default null,
  p_empresa_tipo        text default 'startup',
  p_sumar_a             uuid default null,
  p_email_reclamo       text default null,
  p_evento              text default null,
  p_rol                 text default 'emprendedor',
  p_publicado           boolean default true,
  p_consentimiento      boolean default false,
  p_version             text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_evento  uuid;
  v_email   text := nullif(lower(btrim(coalesce(p_email_reclamo, ''))), '');
  v_perfil  uuid;
  v_slug    text;
  v_empresa uuid;
begin
  perform public.exigir_admin();

  if p_consentimiento is not true or nullif(btrim(coalesce(p_version, '')), '') is null then
    raise exception 'falta el consentimiento' using errcode = '22023';
  end if;
  perform public.equipo_validar_texto('nombre', p_nombre, 1, 80);
  perform public.equipo_validar_texto('descripcion', p_descripcion, 1, 150);
  if coalesce(p_rol, '') not in ('emprendedor', 'inversor', 'aliado') then
    raise exception 'dato inválido: rol' using errcode = '22023';
  end if;
  if v_email is not null then
    perform public.equipo_validar_email(v_email);
  end if;
  if p_sumar_a is not null then
    if not exists (select 1 from public.empresas where id = p_sumar_a) then
      raise exception 'empresa inexistente' using errcode = '22023';
    end if;
  elsif nullif(btrim(coalesce(p_empresa_nombre, '')), '') is not null then
    perform public.equipo_validar_empresa(p_empresa_nombre, p_empresa_descripcion, p_empresa_tipo);
  end if;
  v_evento := public.equipo_evento(p_evento);

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();

  v_slug := public.slug_libre(p_nombre, 'perfiles');
  insert into public.perfiles (slug, nombre, tipo, rol, descripcion, publicado, consentimiento_at)
  values (v_slug, btrim(p_nombre), 'persona', p_rol, btrim(p_descripcion), coalesce(p_publicado, true), now())
  returning id into v_perfil;

  if p_sumar_a is not null then
    v_empresa := p_sumar_a;
    insert into public.empresa_miembros (empresa_id, perfil_id) values (v_empresa, v_perfil);
  elsif nullif(btrim(coalesce(p_empresa_nombre, '')), '') is not null then
    v_empresa := public.equipo_crear_empresa(v_perfil, p_empresa_nombre, p_empresa_descripcion, p_empresa_tipo, null);
  end if;

  insert into public.perfiles_alta_equipo (perfil_id, creado_por, consentimiento_at, consentimiento_version, empresa_id)
  values (v_perfil, v_uid, now(), btrim(p_version), v_empresa);

  if v_email is not null then
    insert into public.perfiles_reclamo (perfil_id, email, email_canonico, cargado_por)
    values (v_perfil, v_email, public.email_canonico(v_email), v_uid);
  end if;

  if v_evento is not null then
    perform public.equipo_anotar_feria(v_evento, v_perfil, v_empresa);
  end if;

  perform public.equipo_registrar(v_uid, 'alta', v_perfil, v_empresa);

  return jsonb_build_object(
    'id', v_perfil,
    'slug', v_slug,
    'empresa_id', v_empresa,
    'empresa_slug', (select slug from public.empresas where id = v_empresa)
  );
end;
$$;

-- Perfiles parecidos (por nombre o por empresa) para no duplicar: hasta 5.
create function public.admin_parecidos(p_nombre text, p_empresa text default null)
returns table (
  id         uuid,
  slug       text,
  nombre     text,
  empresa    text,
  con_cuenta boolean,
  publicado  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_n text := public.texto_comparable(p_nombre);
  v_e text := public.texto_comparable(p_empresa);
begin
  perform public.exigir_admin();
  return query
  select p.id, p.slug, p.nombre,
    (select e.nombre from public.empresas e where e.id = p.empresa_id),
    p.usuario_id is not null, p.publicado
  from public.perfiles p
  cross join lateral (select public.texto_comparable(p.nombre) as n) c
  where (
      v_n <> '' and (
        c.n = v_n
        or (char_length(v_n) >= 5 and char_length(c.n) >= 5
            and (strpos(c.n, v_n) > 0 or strpos(v_n, c.n) > 0))
      )
    )
    or (
      v_e <> '' and exists (
        select 1 from public.empresa_miembros m
        join public.empresas e on e.id = m.empresa_id
        where m.perfil_id = p.id and public.texto_comparable(e.nombre) = v_e
      )
    )
  order by (c.n = v_n) desc, p.created_at
  limit 5;
end;
$$;

-- Empresas parecidas por nombre: hasta 5, con si participan del evento y quién las representa.
create function public.admin_empresas_parecidas(p_nombre text, p_evento text default null)
returns table (
  id            uuid,
  slug          text,
  nombre        text,
  miembros      integer,
  participa     boolean,
  representante text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_n text := public.texto_comparable(p_nombre);
begin
  perform public.exigir_admin();
  if v_n = '' then
    return;
  end if;
  return query
  select e.id, e.slug, e.nombre,
    (select count(*)::integer from public.empresa_miembros m where m.empresa_id = e.id),
    ee.perfil_id is not null,
    (select p.nombre from public.perfiles p where p.id = ee.perfil_id)
  from public.empresas e
  cross join lateral (select public.texto_comparable(e.nombre) as n) c
  left join public.eventos ev on ev.slug = p_evento
  left join public.evento_empresas ee on ee.evento_id = ev.id and ee.empresa_id = e.id
  where c.n = v_n
     or (char_length(v_n) >= 4 and char_length(c.n) >= 4 and (strpos(c.n, v_n) > 0 or strpos(v_n, c.n) > 0))
  order by (c.n = v_n) desc, e.created_at
  limit 5;
end;
$$;

-- Mis últimas 5 altas, con si todavía se pueden deshacer (10 minutos y sin cuenta).
create function public.admin_altas_recientes()
returns table (
  id             uuid,
  slug           text,
  nombre         text,
  empresa        text,
  publicado      boolean,
  created_at     timestamptz,
  puede_deshacer boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select p.id, p.slug, p.nombre,
    (select e.nombre from public.empresas e where e.id = p.empresa_id),
    p.publicado, a.created_at,
    a.created_at > now() - interval '10 minutes' and p.usuario_id is null
  from public.perfiles_alta_equipo a
  join public.perfiles p on p.id = a.perfil_id
  where a.creado_por = auth.uid()
  order by a.created_at desc
  limit 5;
end;
$$;

-- Deshace un alta propia de hace menos de 10 minutos (si todavía no tiene cuenta).
create function public.admin_deshacer_alta(p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.exigir_admin();
  if not exists (
    select 1 from public.perfiles_alta_equipo a
    join public.perfiles p on p.id = a.perfil_id
    where a.perfil_id = p_perfil
      and a.creado_por = v_uid
      and a.created_at > now() - interval '10 minutes'
      and p.usuario_id is null
  ) then
    raise exception 'ya no se puede deshacer' using errcode = '22023';
  end if;
  perform public.admin_como_sistema();
  perform public.perfil_equipo_borrar(p_perfil);
  perform public.equipo_registrar(v_uid, 'deshacer', p_perfil, null);
end;
$$;

-- Derecho de supresión: borra un perfil creado por el equipo que todavía no tiene cuenta.
create function public.admin_borrar_perfil_equipo(p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.exigir_admin();
  if not exists (
    select 1 from public.perfiles_alta_equipo a
    join public.perfiles p on p.id = a.perfil_id
    where a.perfil_id = p_perfil and p.usuario_id is null
  ) then
    raise exception 'solo perfiles del equipo sin cuenta' using errcode = '22023';
  end if;
  perform public.admin_como_sistema();
  perform public.perfil_equipo_borrar(p_perfil);
  perform public.equipo_registrar(v_uid, 'borrar_perfil', p_perfil, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Edición desde /admin
-- ---------------------------------------------------------------------------

-- Todo lo que muestra el editor de /admin/perfil/[id]. Incluye el email de reclamo: solo equipo.
create function public.admin_perfil_detalle(p_perfil uuid, p_evento text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_p      public.perfiles;
  v_evento uuid;
begin
  perform public.exigir_admin();
  select * into v_p from public.perfiles where id = p_perfil;
  if not found then
    return null;
  end if;
  select id into v_evento from public.eventos where slug = p_evento;

  return jsonb_build_object(
    'id', v_p.id,
    'slug', v_p.slug,
    'nombre', v_p.nombre,
    'descripcion', v_p.descripcion,
    'rol', v_p.rol,
    'tipo', v_p.tipo,
    'publicado', v_p.publicado,
    'oculto', v_p.oculto,
    'con_cuenta', v_p.usuario_id is not null,
    'creado_equipo', exists (select 1 from public.perfiles_alta_equipo a where a.perfil_id = v_p.id),
    'email_reclamo', (select r.email from public.perfiles_reclamo r where r.perfil_id = v_p.id),
    'reclamo_rechazado', (select r.rechazado_at is not null from public.perfiles_reclamo r where r.perfil_id = v_p.id),
    'participa', exists (
      select 1 from public.evento_participantes ep where ep.evento_id = v_evento and ep.perfil_id = v_p.id
    ),
    'representa', (
      select e.nombre from public.evento_empresas ee
      join public.empresas e on e.id = ee.empresa_id
      where ee.evento_id = v_evento and ee.perfil_id = v_p.id
    ),
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'slug', e.slug,
        'nombre', e.nombre,
        'descripcion', e.descripcion,
        'tipo', e.tipo,
        'principal', e.id = v_p.empresa_id,
        'con_dueno', e.dueno_id is not null,
        'miembros', (select count(*) from public.empresa_miembros x where x.empresa_id = e.id),
        'participa', exists (select 1 from public.evento_empresas ee where ee.evento_id = v_evento and ee.empresa_id = e.id)
      ) order by (e.id = v_p.empresa_id) desc, m.created_at)
      from public.empresa_miembros m
      join public.empresas e on e.id = m.empresa_id
      where m.perfil_id = v_p.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Edición completa de un perfil SIN cuenta.
create function public.admin_editar_perfil_equipo(
  p_perfil      uuid,
  p_nombre      text,
  p_descripcion text,
  p_rol         text,
  p_tipo        text,
  p_publicado   boolean,
  p_oculto      boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_p      public.perfiles;
  v_campos text[] := '{}';
begin
  perform public.exigir_admin();
  perform public.equipo_validar_texto('nombre', p_nombre, 1, 80);
  perform public.equipo_validar_texto('descripcion', p_descripcion, 1, 150);
  if coalesce(p_rol, '') not in ('emprendedor', 'inversor', 'aliado') then
    raise exception 'dato inválido: rol' using errcode = '22023';
  end if;
  if coalesce(p_tipo, '') not in (
    'startup', 'emprendimiento', 'aceleradora', 'incubadora', 'angel', 'fondo', 'coach',
    'profesional', 'empresa', 'institucion', 'persona'
  ) then
    raise exception 'dato inválido: tipo' using errcode = '22023';
  end if;

  select * into v_p from public.perfiles where id = p_perfil;
  if not found then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  if v_p.usuario_id is not null then
    raise exception 'el perfil tiene cuenta' using errcode = '22023';
  end if;

  if v_p.nombre is distinct from btrim(p_nombre) then v_campos := array_append(v_campos, 'nombre'); end if;
  if v_p.descripcion is distinct from btrim(p_descripcion) then v_campos := array_append(v_campos, 'descripcion'); end if;
  if v_p.rol is distinct from p_rol then v_campos := array_append(v_campos, 'rol'); end if;
  if v_p.tipo is distinct from p_tipo then v_campos := array_append(v_campos, 'tipo'); end if;
  if v_p.publicado is distinct from p_publicado then v_campos := array_append(v_campos, 'publicado'); end if;
  if v_p.oculto is distinct from p_oculto then v_campos := array_append(v_campos, 'oculto'); end if;
  if cardinality(v_campos) = 0 then
    return;
  end if;

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();
  update public.perfiles
  set nombre      = btrim(p_nombre),
      descripcion = btrim(p_descripcion),
      rol         = p_rol,
      tipo        = p_tipo,
      publicado   = coalesce(p_publicado, publicado),
      oculto      = coalesce(p_oculto, oculto)
  where id = p_perfil;
  perform public.equipo_registrar(v_uid, 'editar_perfil', p_perfil, null, v_campos);
end;
$$;

-- Edición limitada de cualquier perfil (también con cuenta): solo nombre y descripción, para
-- corregir. Nunca rol, publicado ni oculto. Queda en el registro.
create function public.admin_editar_perfil_cuenta(p_perfil uuid, p_nombre text, p_descripcion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_p      public.perfiles;
  v_campos text[] := '{}';
begin
  perform public.exigir_admin();
  perform public.equipo_validar_texto('nombre', p_nombre, 1, 80);
  perform public.equipo_validar_texto('descripcion', p_descripcion, 1, 150);

  select * into v_p from public.perfiles where id = p_perfil;
  if not found then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  if v_p.nombre is distinct from btrim(p_nombre) then v_campos := array_append(v_campos, 'nombre'); end if;
  if v_p.descripcion is distinct from btrim(p_descripcion) then v_campos := array_append(v_campos, 'descripcion'); end if;
  if cardinality(v_campos) = 0 then
    return;
  end if;

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();
  update public.perfiles
  set nombre = btrim(p_nombre), descripcion = btrim(p_descripcion)
  where id = p_perfil;
  perform public.equipo_registrar(
    v_uid,
    case when v_p.usuario_id is null then 'editar_perfil' else 'editar_perfil_cuenta' end,
    p_perfil, null, v_campos
  );
end;
$$;

-- Nombre y descripción de cualquier empresa (también con dueña). Queda en el registro.
create function public.admin_editar_empresa_equipo(p_empresa uuid, p_nombre text, p_descripcion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_e      public.empresas;
  v_desc   text := nullif(btrim(coalesce(p_descripcion, '')), '');
  v_campos text[] := '{}';
begin
  perform public.exigir_admin();
  perform public.equipo_validar_empresa(p_nombre, p_descripcion, null);
  select * into v_e from public.empresas where id = p_empresa;
  if not found then
    raise exception 'empresa inexistente' using errcode = '22023';
  end if;
  if v_e.nombre is distinct from btrim(p_nombre) then v_campos := array_append(v_campos, 'nombre'); end if;
  if v_e.descripcion is distinct from v_desc then v_campos := array_append(v_campos, 'descripcion'); end if;
  if cardinality(v_campos) = 0 then
    return;
  end if;

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();
  update public.empresas
  set nombre = btrim(p_nombre), descripcion = v_desc, updated_at = now()
  where id = p_empresa;
  perform public.equipo_registrar(v_uid, 'editar_empresa', null, p_empresa, v_campos);
end;
$$;

-- Crea una empresa para un perfil (con o sin cuenta). La administra la cuenta de la persona
-- (null si no tiene: pasa a ella al reclamar). Con evento: si el perfil ya representa a otra
-- empresa, error antes de escribir nada; si no, queda como representante de la nueva.
create function public.admin_agregar_empresa(
  p_perfil      uuid,
  p_nombre      text,
  p_descripcion text default null,
  p_tipo        text default 'startup',
  p_evento      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_p       public.perfiles;
  v_evento  uuid;
  v_empresa uuid;
begin
  perform public.exigir_admin();
  perform public.equipo_validar_empresa(p_nombre, p_descripcion, p_tipo);
  select * into v_p from public.perfiles where id = p_perfil;
  if not found then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  if (select count(*) from public.empresa_miembros where perfil_id = p_perfil) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
  end if;
  v_evento := public.equipo_evento(p_evento);
  if v_evento is not null
     and exists (select 1 from public.evento_empresas where evento_id = v_evento and perfil_id = p_perfil) then
    raise exception 'esa persona ya representa a otra empresa' using errcode = '22023';
  end if;

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();
  v_empresa := public.equipo_crear_empresa(p_perfil, p_nombre, p_descripcion, p_tipo, v_p.usuario_id);
  if v_evento is not null then
    perform public.equipo_anotar_feria(v_evento, p_perfil, v_empresa);
  end if;
  perform public.equipo_registrar(v_uid, 'agregar_empresa', p_perfil, v_empresa);

  return jsonb_build_object('id', v_empresa, 'slug', (select slug from public.empresas where id = v_empresa));
end;
$$;

-- Suma un perfil a una empresa existente (equipos de varias personas). No cambia quién la
-- administra ni quién la representa en la feria; con evento, anota a la persona.
create function public.admin_sumar_a_empresa(
  p_perfil  uuid,
  p_empresa uuid,
  p_cargo   text default null,
  p_evento  text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_evento uuid;
begin
  perform public.exigir_admin();
  if nullif(p_cargo, '') is not null and p_cargo not in (
    'ceo', 'cto', 'cfo', 'coo', 'cmo', 'cpo', 'fundador', 'cofundador', 'equipo', 'asesor'
  ) then
    raise exception 'dato inválido: cargo' using errcode = '22023';
  end if;
  if not exists (select 1 from public.perfiles where id = p_perfil) then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa) then
    raise exception 'empresa inexistente' using errcode = '22023';
  end if;
  if exists (select 1 from public.empresa_miembros where empresa_id = p_empresa and perfil_id = p_perfil) then
    raise exception 'ya es parte de esa empresa' using errcode = '22023';
  end if;
  if (select count(*) from public.empresa_miembros where perfil_id = p_perfil) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
  end if;
  v_evento := public.equipo_evento(p_evento);

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  perform public.admin_como_sistema();
  insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
  values (p_empresa, p_perfil, nullif(p_cargo, ''));
  if v_evento is not null then
    insert into public.evento_participantes (evento_id, perfil_id)
    values (v_evento, p_perfil) on conflict do nothing;
  end if;
  perform public.equipo_registrar(v_uid, 'sumar_empresa', p_perfil, p_empresa);

  return (select slug from public.empresas where id = p_empresa);
end;
$$;

-- Pone, cambia o borra (vacío) el email de reclamo de un perfil sin cuenta.
create function public.admin_email_reclamo(p_perfil uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  perform public.exigir_admin();
  if v_email is not null then
    perform public.equipo_validar_email(v_email);
  end if;
  if not exists (select 1 from public.perfiles where id = p_perfil and usuario_id is null) then
    raise exception 'el perfil tiene cuenta' using errcode = '22023';
  end if;

  perform public.medicion_limitar(v_uid, 'alta_equipo', 20);
  if v_email is null then
    delete from public.perfiles_reclamo where perfil_id = p_perfil;
  else
    insert into public.perfiles_reclamo as r (perfil_id, email, email_canonico, cargado_por)
    values (p_perfil, v_email, public.email_canonico(v_email), v_uid)
    on conflict (perfil_id) do update set
      email          = excluded.email,
      email_canonico = excluded.email_canonico,
      cargado_por    = excluded.cargado_por,
      rechazado_at   = null,
      updated_at     = now();
  end if;
  perform public.equipo_registrar(v_uid, 'email_reclamo', p_perfil, null);
end;
$$;

-- Vincula a mano un perfil sin dueño con la cuenta de ese email (confirmado y sin perfil).
-- Devuelve false ante cualquier falla, sin decir cuál: así tampoco revela qué emails tienen
-- cuenta, y el intento queda contado (un error revertiría el contador).
create function public.admin_vincular_cuenta(p_perfil uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_cuenta uuid;
  v_n      integer;
begin
  perform public.exigir_admin();
  perform public.medicion_limitar(v_uid, 'vincular', 10);

  if nullif(btrim(coalesce(p_email, '')), '') is null
     or not exists (select 1 from public.perfiles where id = p_perfil and usuario_id is null) then
    return false;
  end if;

  select count(*), min(u.id::text)::uuid into v_n, v_cuenta
  from auth.users u
  where u.email_confirmed_at is not null
    and public.email_canonico(u.email) = public.email_canonico(p_email)
    and not exists (select 1 from public.perfiles p where p.usuario_id = u.id);
  if v_n <> 1 then
    return false;
  end if;

  perform public.admin_como_sistema();
  perform public.vincular_interno(p_perfil, v_cuenta, false);
  perform public.equipo_registrar(v_uid, 'vincular', p_perfil, null);
  return true;
end;
$$;

-- admin_perfiles() + si lo creó el equipo y si tiene un email de reclamo pendiente.
create function public.admin_perfiles_v2()
returns table (
  id            uuid,
  slug          text,
  nombre        text,
  rol           text,
  tipo          text,
  publicado     boolean,
  oculto        boolean,
  con_cuenta    boolean,
  empresa       text,
  pitches       integer,
  piques        integer,
  participa     boolean,
  created_at    timestamptz,
  creado_equipo boolean,
  con_reclamo   boolean
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
    p.id, p.slug, p.nombre, p.rol, p.tipo, p.publicado, p.oculto,
    p.usuario_id is not null,
    (
      select string_agg(e.nombre, ', ' order by (e.id = p.empresa_id) desc, m.created_at)
      from public.empresa_miembros m
      join public.empresas e on e.id = m.empresa_id
      where m.perfil_id = p.id
    ),
    (select count(*)::integer from public.pitches x where x.perfil_id = p.id and x.publicado),
    (select count(*)::integer from public.piques q join public.pitches x on x.id = q.pitch_id where x.perfil_id = p.id),
    exists (
      select 1 from public.evento_participantes ep
      join public.eventos ev on ev.id = ep.evento_id
      where ep.perfil_id = p.id and ev.slug = 'feria-21'
    ),
    p.created_at,
    exists (select 1 from public.perfiles_alta_equipo a where a.perfil_id = p.id),
    exists (select 1 from public.perfiles_reclamo r where r.perfil_id = p.id and p.usuario_id is null)
  from public.perfiles p
  where p.slug not like 'test-%'
  order by p.publicado, p.created_at desc;
end;
$$;

-- "Para revisar": perfiles del equipo cuyo email de reclamo es de una cuenta confirmada que ya
-- tiene su propio perfil, o que la persona dijo que no eran suyos. Nada se fusiona solo.
create function public.admin_reclamos_revisar()
returns table (
  perfil_id     uuid,
  slug          text,
  nombre        text,
  email         text,
  rechazado_at  timestamptz,
  propio_id     uuid,
  propio_slug   text,
  propio_nombre text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select r.perfil_id, p.slug, p.nombre, r.email, r.rechazado_at, pr.id, pr.slug, pr.nombre
  from public.perfiles_reclamo r
  join public.perfiles p on p.id = r.perfil_id
  left join lateral (
    select x.id, x.slug, x.nombre
    from auth.users u
    join public.perfiles x on x.usuario_id = u.id
    where u.email_confirmed_at is not null
      and public.email_canonico(u.email) = r.email_canonico
    limit 1
  ) pr on true
  where p.usuario_id is null
    and (pr.id is not null or r.rechazado_at is not null)
  order by r.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Reclamo (la persona, con su sesión)
-- ---------------------------------------------------------------------------

-- Email verificado de la sesión, o null. Uso interno.
create function public.email_verificado_sesion()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.email_canonico(u.email)
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null and nullif(btrim(u.email), '') is not null;
$$;

revoke execute on function public.email_verificado_sesion() from public, anon, authenticated;

-- El perfil del equipo que espera a esta cuenta, si lo hay. Solo con el email VERIFICADO de la
-- sesión (no recibe ninguno: no sirve para averiguar emails), si la sesión no tiene perfil y el
-- perfil sigue sin dueña y no fue rechazado.
create function public.mi_reclamo_pendiente()
returns table (
  perfil_id   uuid,
  slug        text,
  nombre      text,
  descripcion text,
  empresa     text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := public.email_verificado_sesion();
begin
  if v_uid is null or v_email is null
     or exists (select 1 from public.perfiles where usuario_id = v_uid) then
    return;
  end if;
  perform public.medicion_limitar(v_uid, 'reclamo_ver', 30);
  return query
  select p.id, p.slug, p.nombre, p.descripcion,
    (select e.nombre from public.empresas e where e.id = p.empresa_id)
  from public.perfiles_reclamo r
  join public.perfiles p on p.id = r.perfil_id
  where r.email_canonico = v_email
    and r.rechazado_at is null
    and p.usuario_id is null
  order by r.created_at desc
  limit 3;
end;
$$;

-- La persona confirma que el perfil es suyo (con su consentimiento): queda como dueña y sus
-- empresas sin administradora pasan a ella. Solo cambian usuario_id y consentimiento_at.
-- Devuelve el slug, o null si no corresponde (sin decir por qué; el intento queda contado).
create function public.reclamar_perfil(p_perfil uuid, p_consentimiento boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_sub    text;
  v_claims text;
  v_slug   text;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_consentimiento is not true then
    raise exception 'falta el consentimiento' using errcode = '22023';
  end if;
  perform public.medicion_limitar(v_uid, 'reclamo', 10);

  v_email := public.email_verificado_sesion();
  if v_email is null
     or exists (select 1 from public.perfiles where usuario_id = v_uid) then
    return null;
  end if;
  select p.slug into v_slug
  from public.perfiles_reclamo r
  join public.perfiles p on p.id = r.perfil_id
  where r.perfil_id = p_perfil
    and r.email_canonico = v_email
    and r.rechazado_at is null
    and p.usuario_id is null
  for update of p;
  if v_slug is null then
    return null;
  end if;

  -- Sin claims solo para el update (el guardián frena cambiar usuario_id con sesión), y de
  -- vuelta como estaban: el resto de la transacción sigue con la sesión de la persona.
  v_sub    := current_setting('request.jwt.claim.sub', true);
  v_claims := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform public.vincular_interno(p_perfil, v_uid, true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);

  return v_slug;
end;
$$;

-- "No es mío": el perfil deja de ofrecerse y va a "Para revisar". Devuelve si lo marcó.
create function public.rechazar_reclamo(p_perfil uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  perform public.medicion_limitar(v_uid, 'reclamo', 10);
  v_email := public.email_verificado_sesion();
  if v_email is null then
    return false;
  end if;
  update public.perfiles_reclamo r
  set rechazado_at = now(), updated_at = now()
  where r.perfil_id = p_perfil
    and r.email_canonico = v_email
    and r.rechazado_at is null
    and exists (select 1 from public.perfiles p where p.id = r.perfil_id and p.usuario_id is null);
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Permisos
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_alta_rapida(text, text, text, text, text, uuid, text, text, text, boolean, boolean, text) from public, anon;
revoke execute on function public.admin_parecidos(text, text) from public, anon;
revoke execute on function public.admin_empresas_parecidas(text, text) from public, anon;
revoke execute on function public.admin_altas_recientes() from public, anon;
revoke execute on function public.admin_deshacer_alta(uuid) from public, anon;
revoke execute on function public.admin_borrar_perfil_equipo(uuid) from public, anon;
revoke execute on function public.admin_perfil_detalle(uuid, text) from public, anon;
revoke execute on function public.admin_editar_perfil_equipo(uuid, text, text, text, text, boolean, boolean) from public, anon;
revoke execute on function public.admin_editar_perfil_cuenta(uuid, text, text) from public, anon;
revoke execute on function public.admin_editar_empresa_equipo(uuid, text, text) from public, anon;
revoke execute on function public.admin_agregar_empresa(uuid, text, text, text, text) from public, anon;
revoke execute on function public.admin_sumar_a_empresa(uuid, uuid, text, text) from public, anon;
revoke execute on function public.admin_email_reclamo(uuid, text) from public, anon;
revoke execute on function public.admin_vincular_cuenta(uuid, text) from public, anon;
revoke execute on function public.admin_perfiles_v2() from public, anon;
revoke execute on function public.admin_reclamos_revisar() from public, anon;
revoke execute on function public.mi_reclamo_pendiente() from public, anon;
revoke execute on function public.reclamar_perfil(uuid, boolean) from public, anon;
revoke execute on function public.rechazar_reclamo(uuid) from public, anon;

grant execute on function public.admin_alta_rapida(text, text, text, text, text, uuid, text, text, text, boolean, boolean, text) to authenticated;
grant execute on function public.admin_parecidos(text, text) to authenticated;
grant execute on function public.admin_empresas_parecidas(text, text) to authenticated;
grant execute on function public.admin_altas_recientes() to authenticated;
grant execute on function public.admin_deshacer_alta(uuid) to authenticated;
grant execute on function public.admin_borrar_perfil_equipo(uuid) to authenticated;
grant execute on function public.admin_perfil_detalle(uuid, text) to authenticated;
grant execute on function public.admin_editar_perfil_equipo(uuid, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.admin_editar_perfil_cuenta(uuid, text, text) to authenticated;
grant execute on function public.admin_editar_empresa_equipo(uuid, text, text) to authenticated;
grant execute on function public.admin_agregar_empresa(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_sumar_a_empresa(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_email_reclamo(uuid, text) to authenticated;
grant execute on function public.admin_vincular_cuenta(uuid, text) to authenticated;
grant execute on function public.admin_perfiles_v2() to authenticated;
grant execute on function public.admin_reclamos_revisar() to authenticated;
grant execute on function public.mi_reclamo_pendiente() to authenticated;
grant execute on function public.reclamar_perfil(uuid, boolean) to authenticated;
grant execute on function public.rechazar_reclamo(uuid) to authenticated;
