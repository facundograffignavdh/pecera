-- Pecera: una persona en varias empresas (hasta 5). Corre DESPUÉS de
-- cofundador_conexiones.
--
-- Base compartida con producción: ADITIVA. Una tabla nueva (membresías), triggers y
-- funciones nuevas, y `create or replace` de funciones existentes con la misma firma y
-- el mismo retorno (como el guardián en feria_pro). No se borra ni renombra nada. Para
-- volver atrás: supabase/rollback-multi-empresa.sql (no es una migración).
--
-- El modelo:
--   - `empresa_miembros` (empresa, perfil, cargo, desde cuándo) es la verdad.
--   - `perfiles.empresa_id` queda como la EMPRESA PRINCIPAL: una de las membresías, o
--     null si no tiene ninguna. La mantienen los triggers de abajo. El código de main
--     la sigue leyendo y escribiendo con las funciones de siempre, que ahora también
--     pasan por las membresías.
--   - Las funciones que operaban sobre `empresa_id` (editar, código, transparencia,
--     hitos, producto, logo, documentos) quedan igual: trabajan sobre la principal.
--     La app nueva usa las versiones `_en(p_empresa, …)`, que verifican la membresía.
--   - El tope de 5 lo pone un trigger: vale venga de donde venga la fila.
--
-- La PK de `empresa_miembros` es un `id` propio a propósito: si (empresa_id, perfil_id)
-- fuera la PK, PostgREST vería un muchos-a-muchos perfiles↔empresas y el embed
-- `empresa:empresas(...)` que usa main desde `perfiles` pasaría a ser ambiguo.

-- ---------------------------------------------------------------------------
-- 1) Membresías
-- ---------------------------------------------------------------------------
create table public.empresa_miembros (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  cargo      text,
  created_at timestamptz not null default now(),

  constraint empresa_miembros_unico unique (empresa_id, perfil_id),
  constraint empresa_miembros_cargo_valido check (
    cargo is null or cargo in (
      'ceo', 'cto', 'cfo', 'coo', 'cmo', 'cpo', 'fundador', 'cofundador', 'equipo', 'asesor'
    )
  )
);

create index empresa_miembros_perfil_idx on public.empresa_miembros (perfil_id, created_at);

alter table public.empresa_miembros enable row level security;
revoke all on public.empresa_miembros from anon, authenticated;
grant select on public.empresa_miembros to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Triggers: tope, principal y espejo
-- ---------------------------------------------------------------------------

-- Hasta 5 empresas por persona. Bloquea la fila del perfil: dos altas en paralelo no
-- pasan el tope las dos.
create function public.empresa_miembros_tope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.perfiles where id = new.perfil_id for update;
  if (select count(*) from public.empresa_miembros where perfil_id = new.perfil_id) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function public.empresa_miembros_tope() from public, anon, authenticated;

create trigger empresa_miembros_tope
  before insert on public.empresa_miembros
  for each row execute function public.empresa_miembros_tope();

-- La principal: la primera membresía pasa a ser la principal; si se va la principal,
-- pasa a la membresía más antigua que quede (o null). Prende `pecera.empresa_rpc` solo
-- para su update (el guardián de empresa_id lo exige) y lo deja como estaba.
create function public.empresa_miembros_principal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flag text := current_setting('pecera.empresa_rpc', true);
begin
  perform set_config('pecera.empresa_rpc', 'on', true);
  if tg_op = 'INSERT' then
    update public.perfiles set empresa_id = new.empresa_id
    where id = new.perfil_id and empresa_id is null;
  else
    update public.perfiles p
    set empresa_id = (
      select m.empresa_id from public.empresa_miembros m
      where m.perfil_id = old.perfil_id
      order by m.created_at, m.id
      limit 1
    )
    where p.id = old.perfil_id
      -- null: la FK ya la vació (se borró la empresa).
      and (p.empresa_id = old.empresa_id or p.empresa_id is null);
  end if;
  perform set_config('pecera.empresa_rpc', coalesce(v_flag, ''), true);
  return null;
end;
$$;

revoke execute on function public.empresa_miembros_principal() from public, anon, authenticated;

create trigger empresa_miembros_principal
  after insert or delete on public.empresa_miembros
  for each row execute function public.empresa_miembros_principal();

-- Red de seguridad: si `perfiles.empresa_id` apunta a una empresa sin membresía (SQL
-- editor, código viejo), la membresía se crea. Nunca quedan desparejos.
create function public.perfiles_empresa_espejo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.empresa_id is not null and not exists (
    select 1 from public.empresa_miembros m
    where m.perfil_id = new.id and m.empresa_id = new.empresa_id
  ) then
    insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
    values (new.empresa_id, new.id, new.cargo)
    on conflict (empresa_id, perfil_id) do nothing;
  end if;
  return null;
end;
$$;

revoke execute on function public.perfiles_empresa_espejo() from public, anon, authenticated;

create trigger perfiles_empresa_espejo
  after insert or update of empresa_id on public.perfiles
  for each row execute function public.perfiles_empresa_espejo();

-- El cargo del perfil (el del formulario, el que ve main) es el de la principal: si
-- cambia, cambia el de esa membresía. El de las otras empresas se elige en cada una.
create function public.perfiles_cargo_espejo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.empresa_id is not null then
    update public.empresa_miembros
    set cargo = new.cargo
    where perfil_id = new.id and empresa_id = new.empresa_id
      and cargo is distinct from new.cargo;
  end if;
  return null;
end;
$$;

revoke execute on function public.perfiles_cargo_espejo() from public, anon, authenticated;

create trigger perfiles_cargo_espejo
  after update of cargo on public.perfiles
  for each row execute function public.perfiles_cargo_espejo();

-- ---------------------------------------------------------------------------
-- 3) Los datos de hoy: cada perfil con empresa pasa a tener su membresía
-- ---------------------------------------------------------------------------
-- Se puede volver a correr sin duplicar. `created_at` = el del perfil, así "la
-- integrante más antigua" da lo mismo que antes.
insert into public.empresa_miembros (empresa_id, perfil_id, cargo, created_at)
select p.empresa_id, p.id, p.cargo, p.created_at
from public.perfiles p
where p.empresa_id is not null
on conflict (empresa_id, perfil_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Visibilidad y membresía (las usan todas las políticas de empresas)
-- ---------------------------------------------------------------------------
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
    select 1 from public.empresa_miembros m
    join public.perfiles p on p.id = m.perfil_id
    where m.empresa_id = p_empresa and p.publicado and not p.oculto
  );
$$;

create or replace function public.soy_de_empresa(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empresa_miembros m
    join public.perfiles p on p.id = m.perfil_id
    where p.usuario_id = auth.uid() and m.empresa_id = p_empresa
  );
$$;

create policy "todos leen membresías de perfiles y empresas visibles"
  on public.empresa_miembros for select
  to anon, authenticated
  using (public.perfil_visible(perfil_id) and public.empresa_visible(empresa_id));
create policy "los miembros leen a su equipo"
  on public.empresa_miembros for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));

-- La empresa, si la sesión es parte (o error). Uso interno de las funciones `_en`.
create function public.empresa_mia(p_empresa uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  if p_empresa is null or not exists (
    select 1 from public.empresa_miembros m
    where m.perfil_id = v_perfil.id and m.empresa_id = p_empresa
  ) then
    raise exception 'no sos parte de esa empresa' using errcode = '42501';
  end if;
  return p_empresa;
end;
$$;

revoke execute on function public.empresa_mia(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Salir y borrar (internas)
-- ---------------------------------------------------------------------------

-- Saca al perfil de la empresa. Si administraba, la administración pasa a la
-- integrante más antigua (con cuenta) que quede. La principal la mueve el trigger.
create function public.salir_interno(p_perfil uuid, p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select usuario_id from public.perfiles where id = p_perfil);
begin
  if exists (select 1 from public.empresas where id = p_empresa and dueno_id = v_usuario) then
    update public.empresas
    set dueno_id = (
          select p.usuario_id
          from public.empresa_miembros m
          join public.perfiles p on p.id = m.perfil_id
          where m.empresa_id = p_empresa and m.perfil_id <> p_perfil and p.usuario_id is not null
          order by m.created_at, m.id
          limit 1
        ),
        updated_at = now()
    where id = p_empresa;
  end if;

  delete from public.empresa_miembros where empresa_id = p_empresa and perfil_id = p_perfil;
end;
$$;

revoke execute on function public.salir_interno(uuid, uuid) from public, anon, authenticated;

-- Borra la empresa con todo. Sus archivos de R2 (logos e imágenes del producto) van a
-- r2_borrar para la próxima corrida, y las versiones viejas que esperaban su hora se
-- adelantan. Las relaciones de portfolio de otras personas que la nombraban vuelven a
-- 'declarada': ya no hay empresa que las confirme. En cascada: código, transparencia,
-- hitos, avances, producto, documentos, logo y membresías.
create function public.borrar_empresa_entera(p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flag text := current_setting('pecera.empresa_rpc', true);
begin
  insert into public.r2_borrar as r (clave, bytes, borrar_despues)
  select k.clave, 0, now()
  from (
    select l.clave from public.empresa_logos l where l.empresa_id = p_empresa
    union all
    select e.logo_url from public.empresas e where e.id = p_empresa
    union all
    select unnest(pr.imagenes) from public.empresa_productos pr where pr.empresa_id = p_empresa
  ) k
  where k.clave is not null and k.clave <> '' and k.clave !~ '^(/|https?:)'
  group by k.clave
  on conflict (clave) do update set borrar_despues = least(r.borrar_despues, excluded.borrar_despues);

  update public.r2_borrar r
  set borrar_despues = now()
  where r.borrar_despues > now()
    and (
      starts_with(r.clave, p_empresa::text || '-')
      or starts_with(r.clave, 'empresa-' || p_empresa::text || '-')
    );

  update public.portfolio
  set confirmacion = 'declarada', updated_at = now()
  where empresa_id = p_empresa and confirmacion <> 'declarada';

  -- Por si quedara un perfil con esta principal (la FK lo pone en null).
  perform set_config('pecera.empresa_rpc', 'on', true);
  delete from public.empresas where id = p_empresa;
  perform set_config('pecera.empresa_rpc', coalesce(v_flag, ''), true);
end;
$$;

revoke execute on function public.borrar_empresa_entera(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Funciones de siempre (main): misma firma, ahora sobre membresías
-- ---------------------------------------------------------------------------

-- Igual que antes: una sola empresa ("ya tenés empresa"). La de varias es crear_empresa_v2.
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
  if v_perfil.empresa_id is not null
     or exists (select 1 from public.empresa_miembros where perfil_id = v_perfil.id) then
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

  insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
  values (v_id, v_perfil.id, coalesce(nullif(p_cargo, ''), v_perfil.cargo));

  update public.perfiles
  set cargo = coalesce(nullif(p_cargo, ''), cargo)
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
  if v_perfil.empresa_id is not null
     or exists (select 1 from public.empresa_miembros where perfil_id = v_perfil.id) then
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

  insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
  values (v_empresa, v_perfil.id, coalesce(nullif(p_cargo, ''), v_perfil.cargo));

  update public.perfiles
  set cargo = coalesce(nullif(p_cargo, ''), cargo)
  where id = v_perfil.id;

  return v_slug;
end;
$$;

-- Sale de la principal. Si es la última integrante, no: borrar la empresa necesita la
-- confirmación de la pantalla nueva (salir_de_empresa).
create or replace function public.salir_empresa()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfiles := public.perfil_de_sesion();
  v_empresa uuid := v_perfil.empresa_id;
begin
  if v_empresa is null then
    return;
  end if;
  if not exists (
    select 1 from public.empresa_miembros
    where empresa_id = v_empresa and perfil_id <> v_perfil.id
  ) then
    raise exception 'sos la única integrante' using errcode = 'P0001';
  end if;
  perform public.salir_interno(v_perfil.id, v_empresa);
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
    (select count(*)::integer from public.empresa_miembros m where m.empresa_id = e.id)
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  left join public.empresas_codigos c on c.empresa_id = e.id
  where p.usuario_id = auth.uid();
$$;

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
    (select count(*)::integer from public.empresa_miembros m where m.empresa_id = e.id)
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
    x.slug, x.nombre, mm.cargo, x.avatar_url, x.rol,
    x.publicado and not x.oculto,
    e.dueno_id = x.usuario_id,
    x.usuario_id = auth.uid()
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  join public.empresa_miembros mm on mm.empresa_id = e.id
  join public.perfiles x on x.id = mm.perfil_id
  where p.usuario_id = auth.uid()
  order by (e.dueno_id = x.usuario_id) desc, mm.created_at;
$$;

-- Las que reciben el id de una fila: autorizan por la empresa de esa fila (cualquiera
-- de las de la sesión). Sin ninguna empresa, el error de siempre.
create or replace function public.borrar_hito(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.empresa_de_sesion();
  delete from public.empresa_hitos where id = p_id and public.soy_de_empresa(empresa_id);
end;
$$;

create or replace function public.borrar_avance(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.empresa_de_sesion();
  delete from public.empresa_avances where id = p_id and public.soy_de_empresa(empresa_id);
end;
$$;

create or replace function public.visibilidad_documento(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.empresa_de_sesion();
  update public.empresa_documentos
  set visible = coalesce(p_visible, false), updated_at = now()
  where id = p_id and public.soy_de_empresa(empresa_id);
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
begin
  perform public.empresa_de_sesion();
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
  where id = p_id and public.soy_de_empresa(empresa_id);
  if not found then
    raise exception 'ese documento no es de tu empresa' using errcode = '42501';
  end if;
end;
$$;

-- Relaciones que nombran a cualquiera de las empresas de la sesión.
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
  where po.confirmacion = 'pendiente' and po.visibilidad <> 'privado'
    and po.empresa_id is not null and public.soy_de_empresa(po.empresa_id)
  order by po.created_at desc;
$$;

create or replace function public.responder_relacion(p_id uuid, p_confirmar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.empresa_de_sesion();
  update public.portfolio
  set confirmacion = case when coalesce(p_confirmar, false) then 'confirmada' else 'rechazada' end,
      updated_at = now()
  where id = p_id and empresa_id is not null and public.soy_de_empresa(empresa_id)
    and confirmacion = 'pendiente' and visibilidad <> 'privado';
  if not found then
    raise exception 'esa relación no espera tu respuesta' using errcode = '22023';
  end if;
end;
$$;

-- Nadie vota a alguien con quien comparte una empresa (cualquiera).
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

-- La principal (como antes), con los demás integrantes contados por membresía.
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
    (select count(*)::integer from public.empresa_miembros m
      where e.id is not null and m.empresa_id = e.id and m.perfil_id <> p.id),
    (select count(*)::integer from public.pitches x where x.perfil_id = p.id)
  from (select auth.uid() as uid) s
  left join public.perfiles p on p.usuario_id = s.uid
  left join public.empresas e on e.id = p.empresa_id
  where s.uid is not null;
$$;

-- Como antes, pero con la regla de la empresa aplicada a CADA una de sus empresas: si
-- es la única integrante, la empresa se borra con todo (borrar_empresa_entera); si no,
-- se queda y, si la administraba, la administración pasa a la integrante más antigua.
-- Devuelve además `empresas`: [{slug, borrada}] para revalidar cada página.
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
  v_principal public.empresas;
  v_origenes text[];
  v_m        record;
  v_borrar   uuid[] := '{}';
  v_empresas jsonb := '[]'::jsonb;
  v_id       uuid;
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
    select * into v_principal from public.empresas where id = v_perfil.empresa_id;
  end if;

  -- Sus empresas: cuáles se borran y cuáles pasan la administración.
  for v_m in
    select e.id, e.slug, e.dueno_id,
      not exists (
        select 1 from public.empresa_miembros o
        where o.empresa_id = e.id and o.perfil_id <> v_perfil.id
      ) as sola
    from public.empresa_miembros m
    join public.empresas e on e.id = m.empresa_id
    where v_perfil.id is not null and m.perfil_id = v_perfil.id
    order by m.created_at
  loop
    v_empresas := v_empresas || jsonb_build_object('slug', v_m.slug, 'borrada', v_m.sola);
    if v_m.sola then
      v_borrar := v_borrar || v_m.id;
    elsif v_m.dueno_id = v_uid then
      update public.empresas
      set dueno_id = (
            select p.usuario_id
            from public.empresa_miembros x
            join public.perfiles p on p.id = x.perfil_id
            where x.empresa_id = v_m.id and x.perfil_id <> v_perfil.id and p.usuario_id is not null
            order by x.created_at, x.id
            limit 1
          ),
          updated_at = now()
      where id = v_m.id;
    end if;
  end loop;

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

  -- Archivos de R2 de la persona: se borran en la próxima corrida de la ingesta. Los
  -- bytes de la fila de ingestas pasan al video, así el tope de 8 GB sigue bien
  -- contado. Los de sus empresas los anota borrar_empresa_entera.
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

  -- El perfil (y en cascada: membresías, pitches, piques y vistas recibidos, contactos,
  -- seguidores, participación en eventos, votos recibidos, newsletter, links,
  -- portfolio, servicios y tesis). Lo que escribió en empresas que siguen queda sin
  -- autor (las FK de autor_id son `on delete set null`).
  if v_perfil.id is not null then
    delete from public.perfiles where id = v_perfil.id;
  end if;

  foreach v_id in array v_borrar loop
    perform public.borrar_empresa_entera(v_id);
  end loop;

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
    'empresa', v_principal.slug,
    'empresa_borrada', v_principal.id is not null and v_principal.id = any (v_borrar),
    'empresas', v_empresas
  );
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
    -- Todas sus empresas, la principal primero.
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
    p.created_at
  from public.perfiles p
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
    (select count(*)::integer from public.empresa_miembros m where m.empresa_id = e.id),
    e.created_at
  from public.empresas e
  order by e.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Funciones nuevas: varias empresas
-- ---------------------------------------------------------------------------

-- Todas las empresas de la sesión, la principal primero. `logo` es la clave de
-- empresa_logos (la que se lee primero); `logo_url`, la de feria_pro (respaldo).
create function public.mis_empresas()
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
  logo        text,
  logo_url    text,
  ubicacion   text,
  codigo      text,
  cargo       text,
  es_dueno    boolean,
  es_principal boolean,
  visible     boolean,
  miembros    integer,
  desde       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.slug, e.nombre, e.descripcion, e.web, e.linkedin, e.instagram,
    e.industrias, e.etapa, e.ronda, l.clave, e.logo_url, e.ubicacion, c.codigo,
    m.cargo,
    e.dueno_id = auth.uid(),
    e.id = p.empresa_id,
    public.empresa_visible(e.id),
    (select count(*)::integer from public.empresa_miembros x where x.empresa_id = e.id),
    m.created_at
  from public.perfiles p
  join public.empresa_miembros m on m.perfil_id = p.id
  join public.empresas e on e.id = m.empresa_id
  left join public.empresas_codigos c on c.empresa_id = e.id
  left join public.empresa_logos l on l.empresa_id = e.id
  where p.usuario_id = auth.uid()
  order by (e.id = p.empresa_id) desc, m.created_at;
$$;

-- Crea otra empresa (hasta 5 en total) y deja a quien la crea como integrante y quien
-- la administra. Si es la primera, pasa a ser la principal.
create function public.crear_empresa_v2(
  p_nombre      text,
  p_slug        text,
  p_descripcion text,
  p_web         text default null,
  p_industrias  text[] default '{}',
  p_etapa       text default null,
  p_ronda       text default null,
  p_cargo       text default null,
  p_ubicacion   text default null
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
  if (select count(*) from public.empresa_miembros where perfil_id = v_perfil.id) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
  end if;

  insert into public.empresas (slug, nombre, descripcion, web, industrias, etapa, ronda, ubicacion, dueno_id)
  values (
    lower(btrim(p_slug)),
    btrim(p_nombre),
    btrim(p_descripcion),
    nullif(btrim(p_web), ''),
    coalesce(p_industrias, '{}'),
    nullif(p_etapa, ''),
    nullif(p_ronda, ''),
    nullif(btrim(p_ubicacion), ''),
    auth.uid()
  )
  returning id into v_id;

  insert into public.empresas_codigos (empresa_id, codigo)
  values (v_id, public.codigo_nuevo());

  insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
  values (v_id, v_perfil.id, nullif(p_cargo, ''));

  -- El cargo del perfil (el que ve main) es el de la principal.
  if v_perfil.empresa_id is null and nullif(p_cargo, '') is not null then
    update public.perfiles set cargo = p_cargo where id = v_perfil.id;
  end if;

  return lower(btrim(p_slug));
end;
$$;

-- Se suma a otra empresa con el código. Máx. 10 intentos por hora; un código que no
-- existe devuelve null (así el intento queda contado).
create function public.unirse_empresa_v2(p_codigo text, p_cargo text default null)
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
  if (select count(*) from public.empresa_miembros where perfil_id = v_perfil.id) >= 5 then
    raise exception 'tope de empresas' using errcode = '22023';
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

  if exists (
    select 1 from public.empresa_miembros
    where empresa_id = v_empresa and perfil_id = v_perfil.id
  ) then
    raise exception 'ya sos parte de esa empresa' using errcode = '22023';
  end if;

  insert into public.empresa_miembros (empresa_id, perfil_id, cargo)
  values (v_empresa, v_perfil.id, nullif(p_cargo, ''));

  if v_perfil.empresa_id is null and nullif(p_cargo, '') is not null then
    update public.perfiles set cargo = p_cargo where id = v_perfil.id;
  end if;

  return v_slug;
end;
$$;

-- Sale de una empresa. Si es la última integrante, la empresa se borra con todo, y
-- solo con `p_borrar` = true (la pantalla pide confirmarlo). Devuelve {slug, borrada}.
create function public.salir_de_empresa(p_empresa uuid, p_borrar boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfiles := public.perfil_de_sesion();
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_slug    text := (select slug from public.empresas where id = p_empresa);
  v_sola    boolean;
begin
  v_sola := not exists (
    select 1 from public.empresa_miembros
    where empresa_id = v_empresa and perfil_id <> v_perfil.id
  );
  if v_sola and not coalesce(p_borrar, false) then
    raise exception 'confirmá el borrado' using errcode = 'P0001';
  end if;

  perform public.salir_interno(v_perfil.id, v_empresa);
  if v_sola then
    perform public.borrar_empresa_entera(v_empresa);
  end if;
  return jsonb_build_object('slug', v_slug, 'borrada', v_sola);
end;
$$;

-- Cuál es la principal (la que va primero en el perfil y el reel). El cargo del
-- perfil pasa a ser el de esa empresa (o ninguno).
create function public.elegir_empresa_principal(p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfiles := public.perfil_de_sesion();
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  perform set_config('pecera.empresa_rpc', 'on', true);
  update public.perfiles p
  set empresa_id = v_empresa,
      cargo = (select m.cargo from public.empresa_miembros m where m.empresa_id = v_empresa and m.perfil_id = p.id)
  where p.id = v_perfil.id;
end;
$$;

-- El cargo en una empresa (vacío = sin cargo). Si es la principal, también el del
-- perfil (y el trigger perfiles_cargo_espejo no tiene nada que cambiar).
create function public.cambiar_cargo_en(p_empresa uuid, p_cargo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil  public.perfiles := public.perfil_de_sesion();
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  update public.empresa_miembros
  set cargo = nullif(p_cargo, '')
  where empresa_id = v_empresa and perfil_id = v_perfil.id;
  if v_perfil.empresa_id = v_empresa then
    update public.perfiles set cargo = nullif(p_cargo, '') where id = v_perfil.id;
  end if;
end;
$$;

-- Edita los datos de una empresa. Solo quien la administra.
create function public.editar_empresa_en(
  p_empresa     uuid,
  p_nombre      text,
  p_descripcion text,
  p_web         text default null,
  p_linkedin    text default null,
  p_instagram   text default null,
  p_industrias  text[] default '{}',
  p_etapa       text default null,
  p_ronda       text default null,
  p_ubicacion   text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  update public.empresas
  set nombre      = btrim(p_nombre),
      descripcion = btrim(p_descripcion),
      web         = nullif(btrim(p_web), ''),
      linkedin    = nullif(btrim(p_linkedin), ''),
      instagram   = nullif(btrim(p_instagram), ''),
      industrias  = coalesce(p_industrias, '{}'),
      etapa       = nullif(p_etapa, ''),
      ronda       = nullif(p_ronda, ''),
      ubicacion   = nullif(btrim(p_ubicacion), ''),
      updated_at  = now()
  where id = v_empresa
    and dueno_id = auth.uid();

  if not found then
    raise exception 'solo el dueño edita la empresa' using errcode = '42501';
  end if;
end;
$$;

-- Código nuevo para una empresa (el viejo deja de servir). Solo quien la administra.
create function public.renovar_codigo_en(p_empresa uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_codigo  text := public.codigo_nuevo();
begin
  if not exists (
    select 1 from public.empresas where id = v_empresa and dueno_id = auth.uid()
  ) then
    raise exception 'solo el dueño renueva el código' using errcode = '42501';
  end if;

  update public.empresas_codigos set codigo = v_codigo, created_at = now()
  where empresa_id = v_empresa;
  return v_codigo;
end;
$$;

-- El equipo completo de una empresa de la sesión (incluye perfiles sin publicar).
-- Sin emails ni contactos.
create function public.miembros_de_empresa(p_empresa uuid)
returns table (
  slug        text,
  nombre      text,
  cargo       text,
  avatar_url  text,
  rol         text,
  visible     boolean,
  es_dueno    boolean,
  soy_yo      boolean,
  desde       timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  return query
  select
    x.slug, x.nombre, m.cargo, x.avatar_url, x.rol,
    x.publicado and not x.oculto,
    e.dueno_id is not distinct from x.usuario_id and x.usuario_id is not null,
    x.usuario_id is not distinct from auth.uid(),
    m.created_at
  from public.empresa_miembros m
  join public.empresas e on e.id = m.empresa_id
  join public.perfiles x on x.id = m.perfil_id
  where m.empresa_id = v_empresa
  order by (e.dueno_id = x.usuario_id) desc nulls last, m.created_at;
end;
$$;

-- Transparencia de una empresa de la sesión.
create function public.mis_datos_en(p_empresa uuid)
returns table (clave text, valor text, url text, visible boolean, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  return query
  select d.clave, d.valor, d.url, d.visible, d.updated_at
  from public.empresa_datos d
  where d.empresa_id = v_empresa;
end;
$$;

create function public.guardar_dato_en(
  p_empresa uuid,
  p_clave   text,
  p_valor   text,
  p_url     text,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_valor   text := nullif(btrim(p_valor), '');
  v_url     text := nullif(btrim(p_url), '');
begin
  if v_valor is null and v_url is null then
    delete from public.empresa_datos
    where empresa_id = v_empresa and clave = p_clave;
    return;
  end if;

  insert into public.empresa_datos (empresa_id, clave, valor, url, visible, updated_at)
  values (v_empresa, p_clave, v_valor, v_url, coalesce(p_visible, false), now())
  on conflict (empresa_id, clave) do update set
    valor      = excluded.valor,
    url        = excluded.url,
    visible    = excluded.visible,
    updated_at = now();
end;
$$;

-- Build in Public de una empresa de la sesión.
create function public.guardar_hito_en(
  p_empresa  uuid,
  p_id       uuid,
  p_titulo   text,
  p_detalle  text,
  p_etapa    text,
  p_estado   text,
  p_progreso integer,
  p_fecha    date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_autor   uuid := (public.perfil_de_sesion()).id;
  v_id      uuid;
begin
  if p_estado = 'en_curso' and exists (
    select 1 from public.empresa_hitos
    where empresa_id = v_empresa and estado = 'en_curso' and id is distinct from p_id
  ) then
    raise exception 'ya hay un hito en curso' using errcode = '22023';
  end if;

  if p_id is null then
    if (select count(*) from public.empresa_hitos where empresa_id = v_empresa) >= 40 then
      raise exception 'demasiados hitos' using errcode = '22023';
    end if;
    insert into public.empresa_hitos (empresa_id, titulo, detalle, etapa, estado, progreso, fecha, autor_id)
    values (
      v_empresa, btrim(p_titulo), nullif(btrim(p_detalle), ''), nullif(p_etapa, ''), p_estado,
      case when p_estado = 'en_curso' then p_progreso end, p_fecha, v_autor
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.empresa_hitos set
    titulo     = btrim(p_titulo),
    detalle    = nullif(btrim(p_detalle), ''),
    etapa      = nullif(p_etapa, ''),
    estado     = p_estado,
    progreso   = case when p_estado = 'en_curso' then p_progreso end,
    fecha      = p_fecha,
    updated_at = now()
  where id = p_id and empresa_id = v_empresa
  returning id into v_id;
  if v_id is null then
    raise exception 'ese hito no es de tu empresa' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create function public.publicar_avance_en(p_empresa uuid, p_texto text, p_hito uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_autor   uuid := (public.perfil_de_sesion()).id;
  v_id      uuid;
begin
  if (
    select count(*) from public.empresa_avances
    where empresa_id = v_empresa and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'demasiados avances' using errcode = '22023';
  end if;
  if p_hito is not null and not exists (
    select 1 from public.empresa_hitos where id = p_hito and empresa_id = v_empresa
  ) then
    raise exception 'ese hito no es de tu empresa' using errcode = '42501';
  end if;

  insert into public.empresa_avances (empresa_id, hito_id, autor_id, texto)
  values (v_empresa, p_hito, v_autor, btrim(p_texto))
  returning id into v_id;
  return v_id;
end;
$$;

-- Producto o servicio de una empresa de la sesión.
create function public.guardar_producto_en(
  p_empresa         uuid,
  p_tipo            text,
  p_nombre          text,
  p_propuesta       text,
  p_problema        text,
  p_solucion        text,
  p_para_quien      text,
  p_caracteristicas text[],
  p_como_usar       text,
  p_demo_url        text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
begin
  insert into public.empresa_productos (
    empresa_id, tipo, nombre, propuesta, problema, solucion, para_quien,
    caracteristicas, como_usar, demo_url
  )
  values (
    v_empresa, p_tipo, btrim(p_nombre), btrim(p_propuesta), nullif(btrim(p_problema), ''),
    nullif(btrim(p_solucion), ''), nullif(btrim(p_para_quien), ''),
    coalesce(array(select btrim(c) from unnest(p_caracteristicas) c where nullif(btrim(c), '') is not null), '{}'),
    nullif(btrim(p_como_usar), ''), nullif(btrim(p_demo_url), '')
  )
  on conflict (empresa_id) do update set
    tipo            = excluded.tipo,
    nombre          = excluded.nombre,
    propuesta       = excluded.propuesta,
    problema        = excluded.problema,
    solucion        = excluded.solucion,
    para_quien      = excluded.para_quien,
    caracteristicas = excluded.caracteristicas,
    como_usar       = excluded.como_usar,
    demo_url        = excluded.demo_url,
    updated_at      = now();
end;
$$;

create function public.poner_imagenes_producto_en(p_empresa uuid, p_imagenes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_previas text[];
  v_nuevas  text[] := coalesce(p_imagenes, '{}');
begin
  select imagenes into v_previas from public.empresa_productos where empresa_id = v_empresa;
  if not found then
    raise exception 'primero guardá el producto' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_nuevas) k
    where k not like v_empresa::text || '-%'
  ) then
    raise exception 'imagen inválida' using errcode = '22023';
  end if;

  update public.empresa_productos
  set imagenes = v_nuevas, updated_at = now()
  where empresa_id = v_empresa;

  insert into public.r2_borrar (clave, borrar_despues)
  select k, now() + interval '1 hour'
  from unnest(v_previas) k
  where not (k = any (v_nuevas))
  on conflict (clave) do nothing;
end;
$$;

-- Pone (o saca, con null) el logo de una empresa de la sesión. Cualquier integrante.
-- Un solo logo: también vacía el de la columna vieja (feria_pro), y los que salen van
-- a r2_borrar con una hora de gracia.
create function public.poner_logo_en(p_empresa uuid, p_clave text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_previa  text;
  v_vieja   text;
begin
  if p_clave is not null and p_clave not like v_empresa::text || '-%' then
    raise exception 'imagen inválida' using errcode = '22023';
  end if;

  select clave into v_previa from public.empresa_logos where empresa_id = v_empresa;
  select logo_url into v_vieja from public.empresas where id = v_empresa;

  if p_clave is null then
    delete from public.empresa_logos where empresa_id = v_empresa;
  else
    insert into public.empresa_logos (empresa_id, clave)
    values (v_empresa, p_clave)
    on conflict (empresa_id) do update set clave = excluded.clave, updated_at = now();
  end if;
  if v_vieja is not null then
    update public.empresas set logo_url = null where id = v_empresa;
  end if;

  insert into public.r2_borrar (clave, borrar_despues)
  select k, now() + interval '1 hour'
  from unnest(array[v_previa, v_vieja]) k
  where k is not null and k is distinct from p_clave
  on conflict (clave) do nothing;
end;
$$;

-- Dataroom de una empresa de la sesión. Con p_id null y un template que la empresa ya
-- tiene, actualiza ese. Devuelve el id.
create function public.guardar_documento_en(
  p_empresa   uuid,
  p_id        uuid,
  p_plantilla text,
  p_categoria text,
  p_tipo      text,
  p_titulo    text,
  p_campos    jsonb,
  p_cuerpo    text,
  p_url       text,
  p_completo  boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_mia(p_empresa);
  v_autor   uuid := (public.perfil_de_sesion()).id;
  v_id      uuid := p_id;
begin
  if v_id is null and p_tipo = 'plantilla' and p_plantilla is not null then
    select id into v_id from public.empresa_documentos
    where empresa_id = v_empresa and plantilla = p_plantilla and not archivado;
  end if;

  if v_id is null then
    if (select count(*) from public.empresa_documentos where empresa_id = v_empresa) >= 100 then
      raise exception 'demasiados documentos' using errcode = '22023';
    end if;
    insert into public.empresa_documentos (
      empresa_id, plantilla, categoria, tipo, titulo, campos, cuerpo, url, completo, autor_id
    )
    values (
      v_empresa, nullif(p_plantilla, ''), p_categoria, p_tipo, btrim(p_titulo),
      coalesce(p_campos, '{}'::jsonb), nullif(p_cuerpo, ''), nullif(btrim(p_url), ''),
      coalesce(p_completo, false), v_autor
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.empresa_documentos set
    categoria  = p_categoria,
    titulo     = btrim(p_titulo),
    campos     = coalesce(p_campos, '{}'::jsonb),
    cuerpo     = nullif(p_cuerpo, ''),
    url        = nullif(btrim(p_url), ''),
    completo   = coalesce(p_completo, false),
    updated_at = now()
  where id = v_id and empresa_id = v_empresa and not archivado
    -- El tipo y el template de un documento no cambian.
    and tipo = p_tipo and plantilla is not distinct from nullif(p_plantilla, '')
  returning id into v_id;
  if v_id is null then
    raise exception 'ese documento no es de tu empresa' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

-- Como relaciones_pendientes, con la empresa que nombra cada una.
create function public.relaciones_pendientes_v2()
returns table (
  id             uuid,
  tipo           text,
  rol_perfil     text,
  slug           text,
  nombre         text,
  descripcion    text,
  created_at     timestamptz,
  empresa_id     uuid,
  empresa_slug   text,
  empresa_nombre text
)
language sql
stable
security definer
set search_path = ''
as $$
  select po.id, po.tipo, pe.rol, pe.slug, pe.nombre, po.descripcion, po.created_at,
    e.id, e.slug, e.nombre
  from public.portfolio po
  join public.perfiles pe on pe.id = po.perfil_id
  join public.empresas e on e.id = po.empresa_id
  where po.confirmacion = 'pendiente' and po.visibilidad <> 'privado'
    and public.soy_de_empresa(po.empresa_id)
  order by po.created_at desc;
$$;

-- Qué pasaría con cada empresa si la persona borra su cuenta (o sale de ella).
create function public.antes_de_borrar_v2()
returns table (
  empresa_id     uuid,
  empresa_slug   text,
  empresa_nombre text,
  otros_miembros integer,
  es_dueno       boolean,
  se_borra       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.slug, e.nombre, o.n, e.dueno_id = auth.uid(), o.n = 0
  from public.perfiles p
  join public.empresa_miembros m on m.perfil_id = p.id
  join public.empresas e on e.id = m.empresa_id
  cross join lateral (
    select count(*)::integer n from public.empresa_miembros x
    where x.empresa_id = e.id and x.perfil_id <> p.id
  ) o
  where p.usuario_id = auth.uid()
  order by (e.id = p.empresa_id) desc, m.created_at;
$$;

revoke execute on function public.mis_empresas() from public, anon;
revoke execute on function public.crear_empresa_v2(text, text, text, text, text[], text, text, text, text) from public, anon;
revoke execute on function public.unirse_empresa_v2(text, text) from public, anon;
revoke execute on function public.salir_de_empresa(uuid, boolean) from public, anon;
revoke execute on function public.elegir_empresa_principal(uuid) from public, anon;
revoke execute on function public.cambiar_cargo_en(uuid, text) from public, anon;
revoke execute on function public.editar_empresa_en(uuid, text, text, text, text, text, text[], text, text, text) from public, anon;
revoke execute on function public.renovar_codigo_en(uuid) from public, anon;
revoke execute on function public.miembros_de_empresa(uuid) from public, anon;
revoke execute on function public.mis_datos_en(uuid) from public, anon;
revoke execute on function public.guardar_dato_en(uuid, text, text, text, boolean) from public, anon;
revoke execute on function public.guardar_hito_en(uuid, uuid, text, text, text, text, integer, date) from public, anon;
revoke execute on function public.publicar_avance_en(uuid, text, uuid) from public, anon;
revoke execute on function public.guardar_producto_en(uuid, text, text, text, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.poner_imagenes_producto_en(uuid, text[]) from public, anon;
revoke execute on function public.poner_logo_en(uuid, text) from public, anon;
revoke execute on function public.guardar_documento_en(uuid, uuid, text, text, text, text, jsonb, text, text, boolean) from public, anon;
revoke execute on function public.relaciones_pendientes_v2() from public, anon;
revoke execute on function public.antes_de_borrar_v2() from public, anon;

grant execute on function public.mis_empresas() to authenticated;
grant execute on function public.crear_empresa_v2(text, text, text, text, text[], text, text, text, text) to authenticated;
grant execute on function public.unirse_empresa_v2(text, text) to authenticated;
grant execute on function public.salir_de_empresa(uuid, boolean) to authenticated;
grant execute on function public.elegir_empresa_principal(uuid) to authenticated;
grant execute on function public.cambiar_cargo_en(uuid, text) to authenticated;
grant execute on function public.editar_empresa_en(uuid, text, text, text, text, text, text[], text, text, text) to authenticated;
grant execute on function public.renovar_codigo_en(uuid) to authenticated;
grant execute on function public.miembros_de_empresa(uuid) to authenticated;
grant execute on function public.mis_datos_en(uuid) to authenticated;
grant execute on function public.guardar_dato_en(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.guardar_hito_en(uuid, uuid, text, text, text, text, integer, date) to authenticated;
grant execute on function public.publicar_avance_en(uuid, text, uuid) to authenticated;
grant execute on function public.guardar_producto_en(uuid, text, text, text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.poner_imagenes_producto_en(uuid, text[]) to authenticated;
grant execute on function public.poner_logo_en(uuid, text) to authenticated;
grant execute on function public.guardar_documento_en(uuid, uuid, text, text, text, text, jsonb, text, text, boolean) to authenticated;
grant execute on function public.relaciones_pendientes_v2() to authenticated;
grant execute on function public.antes_de_borrar_v2() to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Realtime: el equipo de /cuenta/empresa se actualiza en vivo
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'empresa_miembros'
     ) then
    execute 'alter publication supabase_realtime add table public.empresa_miembros';
  end if;
end;
$$;
