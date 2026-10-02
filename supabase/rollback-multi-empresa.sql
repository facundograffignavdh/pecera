-- Pecera: VOLVER ATRÁS la migración 20261010120000_multi_empresa.sql. NO es una
-- migración: se corre a mano, una sola vez, en el SQL editor, solo si multi_empresa
-- rompió algo en producción (por ejemplo, el curl de verificación devolvió PGRST201).
--
-- Qué hace, en una transacción:
--   1. Muestra cuántas membresías se pierden: las que NO son la empresa principal de
--      su perfil. `perfiles.empresa_id` (la principal) no se toca, así que main
--      encuentra lo que espera; las demás empresas de cada persona quedan sin ella.
--      Una empresa que se queda sin nadie deja de ser visible (como antes en main).
--   2. Vuelve a poner las definiciones de main de cada función que la migración
--      redefinió (copiadas tal cual de su migración de origen; mismas firmas, así que
--      los permisos se conservan).
--   3. Borra lo nuevo: triggers, funciones y la tabla empresa_miembros.
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.
-- Probado en PGlite: supabase/pruebas/multi_empresa.mjs (sección "Rollback").

begin;

-- 1) Lo que se pierde (mirarlo antes de confirmar).
select
  count(*) filter (where p.empresa_id is distinct from m.empresa_id) as membresias_que_se_pierden,
  count(distinct m.perfil_id) filter (where p.empresa_id is distinct from m.empresa_id) as personas_afectadas,
  count(*) as membresias_totales
from public.empresa_miembros m
join public.perfiles p on p.id = m.perfil_id;

-- ---------------------------------------------------------------------------
-- 2) Definiciones de main
-- ---------------------------------------------------------------------------
-- De 20261001120000_feria_lista.sql
create or replace function public.empresa_visible(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empresas e
    where e.id = p_empresa and not e.oculta
  ) and exists (
    select 1 from public.perfiles p
    where p.empresa_id = p_empresa and p.publicado and not p.oculto
  );
$$;

create or replace function public.crear_empresa(
  p_nombre      text,
  p_slug        text,
  p_descripcion text,
  p_web         text default null,
  p_industrias  text[] default '{}',
  p_etapa       text default null,
  p_ronda       text default null,
  p_cargo       text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_id     uuid;
begin
  if v_perfil.empresa_id is not null then
    raise exception 'ya tenés empresa' using errcode = '22023';
  end if;

  insert into public.empresas (slug, nombre, descripcion, web, industrias, etapa, ronda, dueno_id)
  values (
    lower(btrim(p_slug)),
    btrim(p_nombre),
    btrim(p_descripcion),
    nullif(btrim(p_web), ''),
    coalesce(p_industrias, '{}'),
    nullif(p_etapa, ''),
    nullif(p_ronda, ''),
    auth.uid()
  )
  returning id into v_id;

  insert into public.empresas_codigos (empresa_id, codigo)
  values (v_id, public.codigo_nuevo());

  perform set_config('pecera.empresa_rpc', 'on', true);
  update public.perfiles
  set empresa_id = v_id,
      cargo = coalesce(nullif(p_cargo, ''), cargo)
  where id = v_perfil.id;

  return lower(btrim(p_slug));
end;
$$;

create or replace function public.unirse_empresa(p_codigo text, p_cargo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil   public.perfiles := public.perfil_de_sesion();
  v_empresa  uuid;
  v_slug     text;
  v_intentos integer;
begin
  if v_perfil.empresa_id is not null then
    raise exception 'ya tenés empresa' using errcode = '22023';
  end if;

  insert into public.empresas_intentos as i (usuario, ventana, intentos)
  values (auth.uid(), now(), 1)
  on conflict (usuario) do update set
    ventana  = case when i.ventana < now() - interval '1 hour' then now() else i.ventana end,
    intentos = case when i.ventana < now() - interval '1 hour' then 1 else i.intentos + 1 end
  returning intentos into v_intentos;

  if v_intentos > 10 then
    raise exception 'demasiados intentos' using errcode = 'P0001';
  end if;

  select c.empresa_id, e.slug into v_empresa, v_slug
  from public.empresas_codigos c
  join public.empresas e on e.id = c.empresa_id
  where c.codigo = upper(replace(btrim(p_codigo), '-', ''));

  if v_empresa is null then
    return null;
  end if;

  perform set_config('pecera.empresa_rpc', 'on', true);
  update public.perfiles
  set empresa_id = v_empresa,
      cargo = coalesce(nullif(p_cargo, ''), cargo)
  where id = v_perfil.id;

  return v_slug;
end;
$$;

create or replace function public.salir_empresa()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfiles := public.perfil_de_sesion();
  v_empresa uuid := v_perfil.empresa_id;
  v_nuevo   uuid;
begin
  if v_empresa is null then
    return;
  end if;

  perform set_config('pecera.empresa_rpc', 'on', true);
  update public.perfiles set empresa_id = null where id = v_perfil.id;

  if exists (select 1 from public.empresas where id = v_empresa and dueno_id = auth.uid()) then
    select p.usuario_id into v_nuevo
    from public.perfiles p
    where p.empresa_id = v_empresa and p.usuario_id is not null
    order by p.created_at
    limit 1;

    update public.empresas set dueno_id = v_nuevo, updated_at = now() where id = v_empresa;
  end if;
end;
$$;

create or replace function public.mi_empresa()
returns table (
  id          uuid,
  slug        text,
  nombre      text,
  descripcion text,
  web         text,
  linkedin    text,
  instagram   text,
  industrias  text[],
  etapa       text,
  ronda       text,
  codigo      text,
  es_dueno    boolean,
  visible     boolean,
  miembros    integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.slug, e.nombre, e.descripcion, e.web, e.linkedin, e.instagram,
    e.industrias, e.etapa, e.ronda, c.codigo,
    e.dueno_id = auth.uid(),
    public.empresa_visible(e.id),
    (select count(*)::integer from public.perfiles m where m.empresa_id = e.id)
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  left join public.empresas_codigos c on c.empresa_id = e.id
  where p.usuario_id = auth.uid();
$$;

create or replace function public.votar(p_evento text, p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento     uuid;
  v_abierta    boolean;
  v_mi_empresa uuid;
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

  select empresa_id into v_mi_empresa from public.perfiles where usuario_id = auth.uid();
  if v_mi_empresa is not null and v_mi_empresa = v_objetivo.empresa_id then
    raise exception 'no podés votar a tu empresa' using errcode = '22023';
  end if;

  insert into public.votos (evento_id, votante, perfil_id)
  values (v_evento, auth.uid(), p_perfil)
  on conflict (evento_id, votante) do update set
    perfil_id  = excluded.perfil_id,
    updated_at = now();
end;
$$;

create or replace function public.admin_perfiles()
returns table (
  id          uuid,
  slug        text,
  nombre      text,
  rol         text,
  tipo        text,
  publicado   boolean,
  oculto      boolean,
  con_cuenta  boolean,
  empresa     text,
  pitches     integer,
  piques      integer,
  participa   boolean,
  created_at  timestamptz
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
    e.nombre,
    (select count(*)::integer from public.pitches x where x.perfil_id = p.id and x.publicado),
    (select count(*)::integer from public.piques q join public.pitches x on x.id = q.pitch_id where x.perfil_id = p.id),
    exists (
      select 1 from public.evento_participantes ep
      join public.eventos ev on ev.id = ep.evento_id
      where ep.perfil_id = p.id and ev.slug = 'feria-21'
    ),
    p.created_at
  from public.perfiles p
  left join public.empresas e on e.id = p.empresa_id
  where p.slug not like 'test-%'
  order by p.publicado, p.created_at desc;
end;
$$;

create or replace function public.admin_empresas()
returns table (
  id         uuid,
  slug       text,
  nombre     text,
  oculta     boolean,
  visible    boolean,
  miembros   integer,
  created_at timestamptz
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
    e.id, e.slug, e.nombre, e.oculta, public.empresa_visible(e.id),
    (select count(*)::integer from public.perfiles m where m.empresa_id = e.id),
    e.created_at
  from public.empresas e
  order by e.created_at desc;
end;
$$;

-- De 20261003120000_pitch_build_producto_newsletter.sql
create or replace function public.soy_de_empresa(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.usuario_id = auth.uid() and p.empresa_id = p_empresa
  );
$$;

create or replace function public.borrar_hito(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
begin
  delete from public.empresa_hitos where id = p_id and empresa_id = v_empresa;
end;
$$;

create or replace function public.borrar_avance(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
begin
  delete from public.empresa_avances where id = p_id and empresa_id = v_empresa;
end;
$$;

-- De 20261004120000_dataroom.sql
create or replace function public.visibilidad_documento(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
begin
  update public.empresa_documentos
  set visible = coalesce(p_visible, false), updated_at = now()
  where id = p_id and empresa_id = v_empresa;
  if not found then
    raise exception 'ese documento no es de tu empresa' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.archivar_documento(p_id uuid, p_archivado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
begin
  if not coalesce(p_archivado, true) and exists (
    select 1 from public.empresa_documentos a
    join public.empresa_documentos b
      on b.empresa_id = a.empresa_id and b.plantilla = a.plantilla and not b.archivado and b.id <> a.id
    where a.id = p_id
  ) then
    raise exception 'ya hay otro documento de ese template' using errcode = '22023';
  end if;

  update public.empresa_documentos
  set archivado = coalesce(p_archivado, true),
      visible = case when coalesce(p_archivado, true) then false else visible end,
      updated_at = now()
  where id = p_id and empresa_id = v_empresa;
  if not found then
    raise exception 'ese documento no es de tu empresa' using errcode = '42501';
  end if;
end;
$$;

-- De 20261005120000_portfolio.sql
create or replace function public.relaciones_pendientes()
returns table (id uuid, tipo text, rol_perfil text, slug text, nombre text, descripcion text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select po.id, po.tipo, pe.rol, pe.slug, pe.nombre, po.descripcion, po.created_at
  from public.portfolio po
  join public.perfiles pe on pe.id = po.perfil_id
  join public.perfiles yo on yo.usuario_id = auth.uid() and yo.empresa_id = po.empresa_id
  where po.confirmacion = 'pendiente' and po.visibilidad <> 'privado'
  order by po.created_at desc;
$$;

create or replace function public.responder_relacion(p_id uuid, p_confirmar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
begin
  update public.portfolio
  set confirmacion = case when coalesce(p_confirmar, false) then 'confirmada' else 'rechazada' end,
      updated_at = now()
  where id = p_id and empresa_id = v_empresa and confirmacion = 'pendiente' and visibilidad <> 'privado';
  if not found then
    raise exception 'esa relación no espera tu respuesta' using errcode = '22023';
  end if;
end;
$$;

-- De 20261007120000_feria_pro.sql
create or replace function public.mi_empresa_v2()
returns table (
  id          uuid,
  slug        text,
  nombre      text,
  descripcion text,
  web         text,
  linkedin    text,
  instagram   text,
  industrias  text[],
  etapa       text,
  ronda       text,
  logo_url    text,
  ubicacion   text,
  codigo      text,
  es_dueno    boolean,
  visible     boolean,
  miembros    integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.slug, e.nombre, e.descripcion, e.web, e.linkedin, e.instagram,
    e.industrias, e.etapa, e.ronda, e.logo_url, e.ubicacion, c.codigo,
    e.dueno_id = auth.uid(),
    public.empresa_visible(e.id),
    (select count(*)::integer from public.perfiles m where m.empresa_id = e.id)
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  left join public.empresas_codigos c on c.empresa_id = e.id
  where p.usuario_id = auth.uid();
$$;

create or replace function public.miembros_mi_empresa()
returns table (
  slug        text,
  nombre      text,
  cargo       text,
  avatar_url  text,
  rol         text,
  visible     boolean,
  es_dueno    boolean,
  soy_yo      boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.slug, m.nombre, m.cargo, m.avatar_url, m.rol,
    m.publicado and not m.oculto,
    e.dueno_id = m.usuario_id,
    m.usuario_id = auth.uid()
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  join public.perfiles m on m.empresa_id = e.id
  where p.usuario_id = auth.uid()
  order by (e.dueno_id = m.usuario_id) desc, m.created_at;
$$;

-- De 20261008120000_borrar_cuenta.sql
create or replace function public.antes_de_borrar()
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

create or replace function public.borrar_mi_cuenta(p_dispositivo uuid default null)
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

-- ---------------------------------------------------------------------------
-- 3) Lo nuevo de multi_empresa
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'empresa_miembros'
  ) then
    execute 'alter publication supabase_realtime drop table public.empresa_miembros';
  end if;
end;
$$;

drop trigger if exists perfiles_empresa_espejo on public.perfiles;
drop trigger if exists empresa_miembros_principal on public.empresa_miembros;
drop trigger if exists empresa_miembros_tope on public.empresa_miembros;

drop function if exists public.mis_empresas();
drop function if exists public.crear_empresa_v2(text, text, text, text, text[], text, text, text, text);
drop function if exists public.unirse_empresa_v2(text, text);
drop function if exists public.salir_de_empresa(uuid, boolean);
drop function if exists public.elegir_empresa_principal(uuid);
drop function if exists public.cambiar_cargo_en(uuid, text);
drop function if exists public.editar_empresa_en(uuid, text, text, text, text, text, text[], text, text, text);
drop function if exists public.renovar_codigo_en(uuid);
drop function if exists public.miembros_de_empresa(uuid);
drop function if exists public.mis_datos_en(uuid);
drop function if exists public.guardar_dato_en(uuid, text, text, text, boolean);
drop function if exists public.guardar_hito_en(uuid, uuid, text, text, text, text, integer, date);
drop function if exists public.publicar_avance_en(uuid, text, uuid);
drop function if exists public.guardar_producto_en(uuid, text, text, text, text, text, text, text[], text, text);
drop function if exists public.poner_imagenes_producto_en(uuid, text[]);
drop function if exists public.poner_logo_en(uuid, text);
drop function if exists public.guardar_documento_en(uuid, uuid, text, text, text, text, jsonb, text, text, boolean);
drop function if exists public.relaciones_pendientes_v2();
drop function if exists public.antes_de_borrar_v2();
drop function if exists public.empresa_mia(uuid);
drop function if exists public.salir_interno(uuid, uuid);
drop function if exists public.borrar_empresa_entera(uuid);

-- Con sus políticas e índices.
drop table if exists public.empresa_miembros;

drop function if exists public.empresa_miembros_tope();
drop function if exists public.empresa_miembros_principal();
drop function if exists public.perfiles_empresa_espejo();

commit;
