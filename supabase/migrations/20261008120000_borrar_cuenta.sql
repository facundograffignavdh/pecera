-- Pecera: cada persona elimina su cuenta desde /cuenta. Corre DESPUÉS de feria_pro.
--
-- Base compartida con producción: todo es ADITIVO salvo una cosa compatible. Los
-- CHECK de `ingestas.estado` y `envios.estado` se vuelven a crear con un valor más
-- ('borrado'); no se borra ningún dato y lo que escribe el código de main sigue
-- valiendo.
--
-- Objetivo: después de borrar no queda nada de la persona, y con el mismo email
-- puede crear una cuenta nueva que arranca vacía. Lo único que queda:
--   - `origenes_borrados`: el ID de Drive de cada video (sin datos personales), para
--     que la ingesta no lo vuelva a publicar y para que el equipo borre el original.
--   - `emails_borrados`: el sha256 del email y la fecha, para saltear las respuestas
--     del Form anteriores al borrado que la ingesta todavía no había leído.
--   - Las filas de `ingestas` y `envios`, en estado 'borrado' y sin emails.
--   - `emails_bloqueados`, si la persona estaba bloqueada (borrar no lo saltea).
--
-- Que los pitches no resuciten, aunque corra la ingesta vieja de main (que no conoce
-- 'borrado'):
--   - Las filas de `ingestas` quedan con `intentos` = 1000: la ingesta vieja las da
--     por agotadas y las saltea ANTES de bajar el video de Drive.
--   - Triggers que fuerzan 'borrado' (y sin emails) en todo lo que se escriba con ese
--     origen_id, y que rechazan cualquier pitch con un origen borrado, venga de donde
--     venga (reprocesar, asignar, SQL editor).

-- ---------------------------------------------------------------------------
-- 1) Estado 'borrado'
-- ---------------------------------------------------------------------------
-- Los CHECK se crearon en línea (sin nombre fijo): se buscan por tabla y columna.
do $$
declare
  v record;
begin
  for v in
    select c.conrelid::regclass as tabla, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.ingestas'::regclass, 'public.envios'::regclass)
      and pg_get_constraintdef(c.oid) like '%estado%'
  loop
    execute format('alter table %s drop constraint %I', v.tabla, v.conname);
  end loop;
end;
$$;

alter table public.ingestas add constraint ingestas_estado_check
  check (estado in ('ok', 'error', 'borrado'));
alter table public.envios add constraint envios_estado_check
  check (estado in ('recibido', 'en_espera', 'ok', 'error', 'rechazado', 'borrado'));

-- ---------------------------------------------------------------------------
-- 2) Lo que queda después de borrar
-- ---------------------------------------------------------------------------
-- Solo el ID de Drive. `drive_borrado_at` lo marca el equipo desde /admin cuando
-- borró el original en Drive (la base no puede hacerlo).
create table public.origenes_borrados (
  origen_id        text primary key,
  drive_borrado_at timestamptz,
  created_at       timestamptz not null default now()
);

-- sha256 del email en minúsculas. La ingesta saltea las respuestas del Form con ese
-- email y marca temporal anterior a `borrado_at` (lo posterior se procesa normal).
create table public.emails_borrados (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  borrado_at timestamptz not null default now()
);

-- RLS sin políticas: anon y authenticated no leen ni escriben. La service key sí.
alter table public.origenes_borrados enable row level security;
alter table public.emails_borrados   enable row level security;
revoke all on public.origenes_borrados from anon, authenticated;
revoke all on public.emails_borrados   from anon, authenticated;

create function public.hash_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex');
$$;

revoke execute on function public.hash_email(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Guardianes: lo borrado no vuelve
-- ---------------------------------------------------------------------------
create function public.origen_borrado(p_origen text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_origen is not null
    and exists (select 1 from public.origenes_borrados o where o.origen_id = p_origen);
$$;

revoke execute on function public.origen_borrado(text) from public, anon, authenticated;

-- Ningún pitch con un origen borrado, ni nuevo ni movido.
create function public.pitches_no_resucitar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.origen_borrado(new.origen_id) then
    raise exception 'pitch de una cuenta borrada' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.pitches_no_resucitar() from public, anon, authenticated;

create trigger pitches_no_resucitar
  before insert or update on public.pitches
  for each row execute function public.pitches_no_resucitar();

-- Lo que la ingesta (vieja o nueva) escriba de un origen borrado queda borrado:
-- intentos altos para que la vieja lo dé por agotado, sin bytes ni errores.
create function public.ingestas_borradas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.origen_borrado(new.origen_id) then
    new.estado              := 'borrado';
    new.error               := null;
    new.intentos            := greatest(coalesce(new.intentos, 0), 1000);
    new.bytes               := 0;
    new.subtitulos_intentos := greatest(coalesce(new.subtitulos_intentos, 0), 1000);
    new.subtitulos_error    := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.ingestas_borradas() from public, anon, authenticated;

create trigger ingestas_borradas
  before insert or update on public.ingestas
  for each row execute function public.ingestas_borradas();

-- Ídem envíos: sin emails (la columna es not null: quedan vacíos) y sin perfil.
create function public.envios_borrados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.origen_borrado(new.origen_id) then
    new.estado           := 'borrado';
    new.email_verificado := '';
    new.email_escrito    := '';
    new.regla            := null;
    new.perfil_id        := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.envios_borrados() from public, anon, authenticated;

create trigger envios_borrados
  before insert or update on public.envios
  for each row execute function public.envios_borrados();

-- ---------------------------------------------------------------------------
-- 4) Qué pasaría con la empresa (para la pantalla de confirmación)
-- ---------------------------------------------------------------------------
create function public.antes_de_borrar()
returns table (
  empresa_slug   text,
  empresa_nombre text,
  otros_miembros integer,
  pitches        integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.slug,
    e.nombre,
    (select count(*)::integer from public.perfiles m
      where e.id is not null and m.empresa_id = e.id and m.id <> p.id),
    (select count(*)::integer from public.pitches x where x.perfil_id = p.id)
  from (select auth.uid() as uid) s
  left join public.perfiles p on p.usuario_id = s.uid
  left join public.empresas e on e.id = p.empresa_id
  where s.uid is not null;
$$;

revoke execute on function public.antes_de_borrar() from public, anon;
grant execute on function public.antes_de_borrar() to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Borrar mi cuenta
-- ---------------------------------------------------------------------------
-- Solo la persona con sesión, sobre lo suyo, en una transacción (si algo falla, no
-- se borra nada). `p_dispositivo` es el uuid anónimo del navegador desde el que
-- borra: se van también los piques, vistas, contactos y seguidos que hizo desde ahí.
-- Devuelve los slugs para revalidar las páginas.
create function public.borrar_mi_cuenta(p_dispositivo uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_email    text;
  v_equipo   boolean;
  v_perfil   public.perfiles;
  v_empresa  public.empresas;
  v_otros    integer := 0;
  v_borrar_empresa boolean := false;
  v_origenes text[];
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

  select lower(btrim(u.email)) into v_email from auth.users u where u.id = v_uid;
  if not found then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  v_email  := coalesce(v_email, '');
  v_equipo := exists (select 1 from public.equipo_ingesta q where q.email = v_email);

  select * into v_perfil from public.perfiles where usuario_id = v_uid;
  if v_perfil.empresa_id is not null then
    select * into v_empresa from public.empresas where id = v_perfil.empresa_id;
    select count(*) into v_otros
    from public.perfiles m
    where m.empresa_id = v_perfil.empresa_id and m.id <> v_perfil.id;
    v_borrar_empresa := v_otros = 0;
  end if;

  -- Videos de la persona: sus pitches, el origen de su perfil (Form viejo) y sus
  -- envíos. Un envío es suyo si quedó en su perfil, o si no quedó en ningún perfil
  -- y lo mandó (email verificado; salvo que sea del equipo, que carga para otros) o
  -- lo mandaron para su cuenta (email escrito). Lo que quedó en el perfil de otra
  -- persona es de esa persona.
  select coalesce(array_agg(distinct o), '{}') into v_origenes
  from (
    select x.origen_id as o from public.pitches x
    where v_perfil.id is not null and x.perfil_id = v_perfil.id and x.origen_id is not null
    union all
    select v_perfil.origen_id where v_perfil.origen_id is not null
    union all
    select e.origen_id from public.envios e
    where (v_perfil.id is not null and e.perfil_id = v_perfil.id)
       or (e.perfil_id is null and v_email <> '' and (
             e.email_escrito = v_email
             or (e.email_verificado = v_email and not v_equipo)
          ))
  ) t;

  -- Archivos de R2: se borran en la próxima corrida de la ingesta. Los bytes de la
  -- fila de ingestas pasan al video, así el tope de 8 GB sigue bien contado.
  insert into public.r2_borrar as r (clave, bytes, borrar_despues)
  select k.clave, max(k.bytes), now()
  from (
    select x.video_url as clave, coalesce(i.bytes, 0) as bytes
    from public.pitches x
    left join public.ingestas i on i.origen_id = x.origen_id
    where v_perfil.id is not null and x.perfil_id = v_perfil.id
    union all
    select x.poster_url, 0 from public.pitches x
    where v_perfil.id is not null and x.perfil_id = v_perfil.id
    union all
    select v_perfil.avatar_url, 0
    union all
    select l.clave, 0 from public.empresa_logos l
    where v_borrar_empresa and l.empresa_id = v_empresa.id
    union all
    select v_empresa.logo_url, 0 where v_borrar_empresa
    union all
    select unnest(pr.imagenes), 0 from public.empresa_productos pr
    where v_borrar_empresa and pr.empresa_id = v_empresa.id
  ) k
  where k.clave is not null and k.clave <> '' and k.clave !~ '^(/|https?:)'
  group by k.clave
  on conflict (clave) do update set
    bytes          = greatest(r.bytes, excluded.bytes),
    borrar_despues = least(r.borrar_despues, excluded.borrar_despues);

  -- Versiones viejas que ya esperaban su hora: se adelantan.
  update public.r2_borrar r
  set borrar_despues = now()
  where r.borrar_despues > now()
    and (
      starts_with(r.clave, v_uid::text || '-')
      or exists (select 1 from unnest(v_origenes) o where starts_with(r.clave, o || '-'))
      or (v_borrar_empresa and (
            starts_with(r.clave, v_empresa.id::text || '-')
            or starts_with(r.clave, 'empresa-' || v_empresa.id::text || '-')
         ))
    );

  -- Los videos quedan anotados (para la ingesta y para Drive) y sus filas de
  -- ingestas y envíos pasan a 'borrado' sin emails (lo hacen los triggers).
  insert into public.origenes_borrados (origen_id)
  select unnest(v_origenes)
  on conflict (origen_id) do nothing;

  insert into public.ingestas (origen_id, estado, intentos, bytes)
  select unnest(v_origenes), 'borrado', 1000, 0
  on conflict (origen_id) do update set estado = 'borrado', updated_at = now();

  update public.envios
  set estado = 'borrado', updated_at = now()
  where origen_id = any (v_origenes);

  -- En envíos de otras personas (los que cargó para alguien del equipo, o los que
  -- quedaron en otro perfil) la fila se queda, pero sin su email.
  if v_email <> '' then
    update public.envios
    set email_escrito    = case when email_escrito = v_email then '' else email_escrito end,
        email_verificado = case when email_verificado = v_email then '' else email_verificado end,
        updated_at       = now()
    where email_escrito = v_email or email_verificado = v_email;
  end if;

  -- Empresa: si es la única integrante se borra con todo (cascada); si no, se queda,
  -- la titularidad pasa al integrante más antiguo con cuenta y lo que escribió la
  -- persona queda sin autor (las FK de autor_id son `on delete set null`).
  if v_empresa.id is not null and not v_borrar_empresa and v_empresa.dueno_id = v_uid then
    update public.empresas
    set dueno_id = (
          select m.usuario_id from public.perfiles m
          where m.empresa_id = v_empresa.id and m.id <> v_perfil.id and m.usuario_id is not null
          order by m.created_at
          limit 1
        ),
        updated_at = now()
    where id = v_empresa.id;
  end if;

  -- El perfil (y en cascada: pitches, piques y vistas recibidos, contactos, seguidores,
  -- participación en eventos, votos recibidos, newsletter, links, portfolio, servicios
  -- y tesis).
  if v_perfil.id is not null then
    delete from public.perfiles where id = v_perfil.id;
  end if;

  if v_borrar_empresa then
    delete from public.empresas where id = v_empresa.id;
  end if;

  -- Lo hecho desde este navegador (anónimo, por dispositivo).
  if p_dispositivo is not null then
    delete from public.piques              where dispositivo = p_dispositivo;
    delete from public.piques_frecuencia   where dispositivo = p_dispositivo;
    delete from public.vistas              where dispositivo = p_dispositivo;
    delete from public.contactos           where dispositivo = p_dispositivo;
    delete from public.seguidos            where dispositivo = p_dispositivo;
    delete from public.medicion_frecuencia where dispositivo = p_dispositivo;
  end if;

  delete from public.empresas_intentos where usuario = v_uid;
  if v_email <> '' then
    delete from public.admins         where email = v_email;
    delete from public.equipo_ingesta where email = v_email;

    insert into public.emails_borrados as b (email_hash, borrado_at)
    values (public.hash_email(v_email), now())
    on conflict (email_hash) do update set borrado_at = greatest(b.borrado_at, excluded.borrado_at);
  end if;

  -- La cuenta: el email queda libre. En cascada: identidades, sesiones y votos dados.
  delete from auth.users where id = v_uid;

  return jsonb_build_object(
    'perfil', v_perfil.slug,
    'empresa', v_empresa.slug,
    'empresa_borrada', v_borrar_empresa
  );
end;
$$;

revoke execute on function public.borrar_mi_cuenta(uuid) from public, anon;
grant execute on function public.borrar_mi_cuenta(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Admin: originales para borrar en Drive
-- ---------------------------------------------------------------------------
create function public.admin_originales_drive()
returns table (origen_id text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select o.origen_id, o.created_at
  from public.origenes_borrados o
  where o.drive_borrado_at is null
  order by o.created_at;
end;
$$;

create function public.admin_marcar_original_borrado(p_origen text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  update public.origenes_borrados
  set drive_borrado_at = now()
  where origen_id = p_origen and drive_borrado_at is null;
end;
$$;

revoke execute on function public.admin_originales_drive() from public, anon;
revoke execute on function public.admin_marcar_original_borrado(text) from public, anon;
grant execute on function public.admin_originales_drive() to authenticated;
grant execute on function public.admin_marcar_original_borrado(text) to authenticated;
