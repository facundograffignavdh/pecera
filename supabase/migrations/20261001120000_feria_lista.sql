-- Pecera: feria lista (rama v2-feria-lista). Corre DESPUÉS de las tres migraciones
-- de v2-cuentas.
--
-- Base compartida con producción: todo es ADITIVO. Tablas, columnas, funciones y
-- un trigger nuevos. No reemplaza ni borra nada de v2-cuentas (el guardián de
-- perfiles queda igual; se suma uno chico solo para `empresa_id`).
--
-- Qué suma:
--   1. Perfil más rico: etapa, ronda, industrias, cargo, especialidades, ticket y
--      rondas de interés. Vocabularios cerrados con CHECK (la ingesta no escribe
--      estas columnas, así que no la traban). Espejo en lib/etiquetas.ts.
--   2. Empresas: página propia (/e/slug) que junta a sus miembros y sus pitches.
--      Se crean y se unen SOLO por funciones; el código de invitación vive aparte.
--   3. Transparencia: métricas y documentos de cada empresa, privados por defecto
--      y compartibles uno por uno.
--   4. Eventos (Feria 21): participantes y votación, un voto por cuenta.
--   5. Admin: lista de emails del equipo y funciones de gestión. Sin service key
--      en la app: cada función verifica `es_admin()` con la sesión de Google.

-- ---------------------------------------------------------------------------
-- 0) Empresas (antes que la columna empresa_id de perfiles, por la FK)
-- ---------------------------------------------------------------------------
create table public.empresas (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  nombre      text not null,
  descripcion text not null,
  web         text,
  linkedin    text,
  instagram   text,
  industrias  text[] not null default '{}',
  etapa       text,
  ronda       text,
  dueno_id    uuid references auth.users (id) on delete set null,
  -- La maneja el equipo (admin): una empresa oculta no se ve aunque tenga miembros.
  oculta      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint empresas_slug_valido check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 60
    and slug not like 'test-%'
  ),
  constraint empresas_nombre_valido check (char_length(btrim(nombre)) between 1 and 80),
  constraint empresas_descripcion_valida check (char_length(btrim(descripcion)) between 1 and 280),
  constraint empresas_web_valida check (
    web is null or (
      char_length(web) <= 200
      and regexp_replace(web, '^https?://', '', 'i') ~ '^[\w-]+(\.[\w-]+)+(/\S*)?$'
    )
  ),
  constraint empresas_linkedin_valido check (
    linkedin is null or (char_length(linkedin) <= 200 and linkedin ~* 'linkedin\.com')
  ),
  constraint empresas_instagram_valido check (instagram is null or char_length(instagram) <= 100),
  constraint empresas_industrias_validas check (
    cardinality(industrias) <= 3
    and industrias <@ array[
      'fintech', 'agtech', 'healthtech', 'biotech', 'edtech', 'foodtech', 'climatech',
      'energia', 'govtech', 'legaltech', 'proptech', 'retail', 'logistica', 'industria',
      'saas', 'ia', 'ciberseguridad', 'gaming', 'blockchain', 'turismo', 'impacto', 'otra'
    ]::text[]
  ),
  constraint empresas_etapa_valida check (
    etapa is null or etapa in ('idea', 'prototipo', 'mvp', 'funcionando', 'escalando')
  ),
  constraint empresas_ronda_valida check (
    ronda is null or ronda in ('no_busca', 'pre_seed', 'seed', 'serie_a', 'serie_b')
  )
);

-- Código de invitación: fuera de `empresas` para que la lectura pública nunca lo vea.
create table public.empresas_codigos (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  codigo     text not null unique check (codigo ~ '^[0-9A-F]{8}$'),
  created_at timestamptz not null default now()
);

-- Límite de intentos para unirse con código (evita adivinar códigos).
create table public.empresas_intentos (
  usuario  uuid primary key,
  ventana  timestamptz not null,
  intentos integer not null
);

-- ---------------------------------------------------------------------------
-- 1) Perfil más rico
-- ---------------------------------------------------------------------------
alter table public.perfiles
  add column etapa          text,
  add column ronda          text,
  add column industrias     text[] not null default '{}',
  add column cargo          text,
  add column especialidades text[] not null default '{}',
  add column ticket         text,
  add column rondas_interes text[] not null default '{}',
  add column empresa_id     uuid references public.empresas (id) on delete set null;

alter table public.perfiles
  add constraint perfiles_etapa_valida check (
    etapa is null or etapa in ('idea', 'prototipo', 'mvp', 'funcionando', 'escalando')
  ),
  add constraint perfiles_ronda_valida check (
    ronda is null or ronda in ('no_busca', 'pre_seed', 'seed', 'serie_a', 'serie_b')
  ),
  add constraint perfiles_industrias_validas check (
    cardinality(industrias) <= 6
    and industrias <@ array[
      'fintech', 'agtech', 'healthtech', 'biotech', 'edtech', 'foodtech', 'climatech',
      'energia', 'govtech', 'legaltech', 'proptech', 'retail', 'logistica', 'industria',
      'saas', 'ia', 'ciberseguridad', 'gaming', 'blockchain', 'turismo', 'impacto', 'otra'
    ]::text[]
  ),
  add constraint perfiles_cargo_valido check (
    cargo is null or cargo in (
      'ceo', 'cto', 'cfo', 'coo', 'cmo', 'cpo', 'fundador', 'cofundador', 'equipo', 'asesor'
    )
  ),
  add constraint perfiles_especialidades_validas check (
    cardinality(especialidades) <= 5
    and especialidades <@ array[
      'mentoria', 'coaching', 'legal', 'finanzas', 'marketing', 'ventas', 'producto',
      'tecnologia', 'diseno', 'fundraising', 'rrhh', 'internacionalizacion', 'impacto',
      'comunicacion'
    ]::text[]
  ),
  add constraint perfiles_ticket_valido check (
    ticket is null or ticket in ('hasta_10k', '10k_50k', '50k_250k', '250k_1m', 'mas_1m')
  ),
  add constraint perfiles_rondas_interes_validas check (
    rondas_interes <@ array['pre_seed', 'seed', 'serie_a', 'serie_b']::text[]
  );

create index perfiles_empresa_id_idx on public.perfiles (empresa_id);

-- Guardián de `empresa_id`: con sesión de usuario solo cambia desde las funciones
-- de empresas (que prenden `pecera.empresa_rpc` para su transacción). Así nadie se
-- mete en una empresa ajena escribiendo la columna con su JWT. La ingesta y el SQL
-- editor (sin auth.uid()) pasan derecho, como en el guardián de v2.
create function public.perfiles_empresa_guardian()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.empresa_id is not null)
     or (tg_op = 'UPDATE' and new.empresa_id is distinct from old.empresa_id) then
    if coalesce(current_setting('pecera.empresa_rpc', true), '') <> 'on' then
      raise exception 'campo no editable: empresa' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.perfiles_empresa_guardian() from public, anon, authenticated;

create trigger perfiles_empresa_guardian
  before insert or update on public.perfiles
  for each row execute function public.perfiles_empresa_guardian();

-- ---------------------------------------------------------------------------
-- 2) Empresas: lectura pública y funciones de escritura
-- ---------------------------------------------------------------------------

-- Visible = no la ocultó el equipo y tiene al menos un miembro visible.
create function public.empresa_visible(p_empresa uuid)
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

revoke execute on function public.empresa_visible(uuid) from public;
grant execute on function public.empresa_visible(uuid) to anon, authenticated;

alter table public.empresas          enable row level security;
alter table public.empresas_codigos  enable row level security;
alter table public.empresas_intentos enable row level security;

revoke all on public.empresas          from anon, authenticated;
revoke all on public.empresas_codigos  from anon, authenticated;
revoke all on public.empresas_intentos from anon, authenticated;
grant select on public.empresas to anon, authenticated;

create policy "todos leen empresas visibles"
  on public.empresas for select
  to anon, authenticated
  using (public.empresa_visible(id));

-- Perfil de la sesión (o error). Uso interno de las funciones de abajo.
create function public.perfil_de_sesion()
returns public.perfiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  select * into v_perfil from public.perfiles where usuario_id = auth.uid();
  if not found then
    raise exception 'primero creá tu perfil' using errcode = '22023';
  end if;
  return v_perfil;
end;
$$;

revoke execute on function public.perfil_de_sesion() from public, anon, authenticated;

create function public.codigo_nuevo()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

revoke execute on function public.codigo_nuevo() from public, anon, authenticated;

-- Crea la empresa, deja a quien la crea como dueño y miembro, y devuelve el slug.
create function public.crear_empresa(
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

-- Se une con el código que le pasó alguien de la empresa. Máx. 10 intentos por hora.
-- Un código inválido devuelve null en vez de levantar error: así el intento queda
-- contado (un error revierte la transacción, y con ella el contador).
create function public.unirse_empresa(p_codigo text, p_cargo text default null)
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

-- Sale de su empresa. Si era el dueño y quedan miembros, el dueño pasa al más
-- antiguo; si no queda nadie, la empresa deja de ser visible sola.
create function public.salir_empresa()
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

-- Edita los datos de la empresa. Solo el dueño.
create function public.editar_empresa(
  p_nombre      text,
  p_descripcion text,
  p_web         text default null,
  p_linkedin    text default null,
  p_instagram   text default null,
  p_industrias  text[] default '{}',
  p_etapa       text default null,
  p_ronda       text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
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
      updated_at  = now()
  where id = v_perfil.empresa_id
    and dueno_id = auth.uid();

  if not found then
    raise exception 'solo el dueño edita la empresa' using errcode = '42501';
  end if;
end;
$$;

-- Genera un código nuevo (el viejo deja de servir). Solo el dueño.
create function public.renovar_codigo_empresa()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_codigo text := public.codigo_nuevo();
begin
  if not exists (
    select 1 from public.empresas
    where id = v_perfil.empresa_id and dueno_id = auth.uid()
  ) then
    raise exception 'solo el dueño renueva el código' using errcode = '42501';
  end if;

  update public.empresas_codigos set codigo = v_codigo, created_at = now()
  where empresa_id = v_perfil.empresa_id;
  return v_codigo;
end;
$$;

-- La empresa de la sesión, con el código (lo ve cualquier miembro, para invitar).
create function public.mi_empresa()
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

revoke execute on function public.crear_empresa(text, text, text, text, text[], text, text, text) from public, anon;
revoke execute on function public.unirse_empresa(text, text) from public, anon;
revoke execute on function public.salir_empresa() from public, anon;
revoke execute on function public.editar_empresa(text, text, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.renovar_codigo_empresa() from public, anon;
revoke execute on function public.mi_empresa() from public, anon;
grant execute on function public.crear_empresa(text, text, text, text, text[], text, text, text) to authenticated;
grant execute on function public.unirse_empresa(text, text) to authenticated;
grant execute on function public.salir_empresa() to authenticated;
grant execute on function public.editar_empresa(text, text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.renovar_codigo_empresa() to authenticated;
grant execute on function public.mi_empresa() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Transparencia: métricas y documentos de la empresa
-- ---------------------------------------------------------------------------
-- Privados por defecto (`visible = false`): solo los ven los miembros. Cada uno se
-- comparte por separado y aparece en la página pública de la empresa.
create table public.empresa_datos (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  clave      text not null,
  valor      text,
  url        text,
  visible    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (empresa_id, clave),

  constraint empresa_datos_clave_valida check (clave in (
    -- métricas
    'mrr', 'arr', 'clientes', 'usuarios_activos', 'crecimiento_mensual', 'churn',
    'retencion', 'cac', 'ltv', 'ltv_cac', 'payback', 'burn_rate', 'runway',
    'margen_bruto', 'ticket_promedio', 'nps', 'gmv',
    -- estrategia
    'moat', 'tam', 'sam', 'som', 'competencia', 'modelo_negocio', 'go_to_market',
    -- ronda
    'ronda_monto', 'valuacion', 'uso_fondos', 'inversores_actuales',
    -- documentos (links)
    'pitch_deck', 'one_pager', 'video_demo', 'cap_table', 'data_room', 'proyecciones',
    'safe', 'term_sheet', 'pacto_socios', 'vesting', 'estatuto', 'nda', 'cesion_ip',
    'plan_esop'
  )),
  constraint empresa_datos_valor_valido check (
    valor is null or char_length(btrim(valor)) between 1 and 280
  ),
  constraint empresa_datos_url_valida check (
    url is null or (char_length(url) <= 300 and url ~* '^https://\S+$')
  ),
  constraint empresa_datos_con_contenido check (valor is not null or url is not null)
);

alter table public.empresa_datos enable row level security;
revoke all on public.empresa_datos from anon, authenticated;
grant select on public.empresa_datos to anon, authenticated;

create policy "todos leen datos compartidos de empresas visibles"
  on public.empresa_datos for select
  to anon, authenticated
  using (visible and public.empresa_visible(empresa_id));

-- Todos los datos de la empresa de la sesión (compartidos y privados).
create function public.mis_datos_empresa()
returns table (clave text, valor text, url text, visible boolean, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.clave, d.valor, d.url, d.visible, d.updated_at
  from public.perfiles p
  join public.empresa_datos d on d.empresa_id = p.empresa_id
  where p.usuario_id = auth.uid();
$$;

-- Guarda (o borra, si viene vacío) un dato. Cualquier miembro.
create function public.guardar_dato_empresa(
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
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_valor  text := nullif(btrim(p_valor), '');
  v_url    text := nullif(btrim(p_url), '');
begin
  if v_perfil.empresa_id is null then
    raise exception 'primero sumate a una empresa' using errcode = '22023';
  end if;

  if v_valor is null and v_url is null then
    delete from public.empresa_datos
    where empresa_id = v_perfil.empresa_id and clave = p_clave;
    return;
  end if;

  insert into public.empresa_datos (empresa_id, clave, valor, url, visible, updated_at)
  values (v_perfil.empresa_id, p_clave, v_valor, v_url, coalesce(p_visible, false), now())
  on conflict (empresa_id, clave) do update set
    valor      = excluded.valor,
    url        = excluded.url,
    visible    = excluded.visible,
    updated_at = now();
end;
$$;

revoke execute on function public.mis_datos_empresa() from public, anon;
revoke execute on function public.guardar_dato_empresa(text, text, text, boolean) from public, anon;
grant execute on function public.mis_datos_empresa() to authenticated;
grant execute on function public.guardar_dato_empresa(text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Eventos, participantes y votación
-- ---------------------------------------------------------------------------
-- El programa (días, horarios, textos) vive en el código (lib/eventos.ts), así la
-- página se ve aunque esta migración no haya corrido. Acá solo el estado.
create table public.eventos (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre              text not null,
  votacion_abierta    boolean not null default false,
  -- Mientras está en false, nadie (salvo el equipo) ve cuántos votos lleva cada uno.
  resultados_visibles boolean not null default false,
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);

create table public.evento_participantes (
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evento_id, perfil_id)
);

-- Un voto por cuenta y por evento; se puede cambiar mientras la votación está abierta.
create table public.votos (
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  votante    uuid not null references auth.users (id) on delete cascade,
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evento_id, votante)
);

create index votos_evento_perfil_idx on public.votos (evento_id, perfil_id);
create index evento_participantes_perfil_idx on public.evento_participantes (perfil_id);

alter table public.eventos              enable row level security;
alter table public.evento_participantes enable row level security;
alter table public.votos                enable row level security;
revoke all on public.eventos              from anon, authenticated;
revoke all on public.evento_participantes from anon, authenticated;
revoke all on public.votos                from anon, authenticated;
grant select on public.eventos to anon, authenticated;

create policy "todos leen eventos activos"
  on public.eventos for select
  to anon, authenticated
  using (activo);

insert into public.eventos (slug, nombre) values ('feria-21', 'Feria 21')
on conflict (slug) do nothing;

-- Participantes visibles del evento, con su empresa y su primer pitch.
create function public.participantes_evento(p_evento text)
returns table (
  perfil_id      uuid,
  slug           text,
  nombre         text,
  rol            text,
  tipo           text,
  descripcion    text,
  avatar_url     text,
  etapa          text,
  industrias     text[],
  cargo          text,
  empresa_slug   text,
  empresa_nombre text,
  pitch_id       uuid,
  poster_url     text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.slug, p.nombre, p.rol, p.tipo, p.descripcion, p.avatar_url,
    coalesce(e.etapa, p.etapa), p.industrias, p.cargo,
    case when public.empresa_visible(e.id) then e.slug end,
    case when public.empresa_visible(e.id) then e.nombre end,
    pi.id, pi.poster_url
  from public.eventos ev
  join public.evento_participantes ep on ep.evento_id = ev.id
  join public.perfiles p on p.id = ep.perfil_id
  left join public.empresas e on e.id = p.empresa_id
  left join lateral (
    select x.id, x.poster_url from public.pitches x
    where x.perfil_id = p.id and x.publicado
    order by x.orden, x.id
    limit 1
  ) pi on true
  where ev.slug = p_evento and ev.activo
    and p.publicado and not p.oculto
  order by ep.created_at;
$$;

-- Estado del evento para la sesión: si participa y a quién votó.
create function public.mi_evento(p_evento text)
returns table (participa boolean, voto uuid, con_perfil boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.evento_participantes ep
      join public.perfiles p on p.id = ep.perfil_id
      where ep.evento_id = ev.id and p.usuario_id = auth.uid()
    ),
    (select v.perfil_id from public.votos v where v.evento_id = ev.id and v.votante = auth.uid()),
    exists (select 1 from public.perfiles p where p.usuario_id = auth.uid())
  from public.eventos ev
  where ev.slug = p_evento and ev.activo and auth.uid() is not null;
$$;

-- La persona anota (o saca) su perfil como participante.
create function public.participar_evento(p_evento text, p_participa boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_evento uuid;
begin
  select id into v_evento from public.eventos where slug = p_evento and activo;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;

  if p_participa then
    insert into public.evento_participantes (evento_id, perfil_id)
    values (v_evento, v_perfil.id)
    on conflict do nothing;
  else
    delete from public.evento_participantes
    where evento_id = v_evento and perfil_id = v_perfil.id;
  end if;
end;
$$;

-- Vota (o cambia el voto). Reglas: votación abierta, a un proyecto participante
-- visible, y nunca a uno mismo ni a alguien de la propia empresa.
create function public.votar(p_evento text, p_perfil uuid)
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

create function public.quitar_voto(p_evento text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  delete from public.votos v
  using public.eventos ev
  where ev.id = v.evento_id and ev.slug = p_evento and ev.votacion_abierta
    and v.votante = auth.uid();
end;
$$;

-- Total de votos: siempre público (prueba social). El detalle, solo con resultados
-- visibles o para el equipo.
create function public.total_votos_evento(p_evento text)
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

-- ---------------------------------------------------------------------------
-- 5) Admin
-- ---------------------------------------------------------------------------
-- Emails del equipo con acceso a /admin. Solo service key / SQL editor:
--   insert into public.admins (email) values ('persona@gmail.com');
create table public.admins (
  email      text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- Después de verificar `es_admin()`, la función sigue "como el SQL editor": sin
-- auth.uid() para el resto de la transacción, así los guardianes (que solo frenan
-- a usuarios) dejan publicar y mover lo que el equipo decide. Uso interno.
create function public.admin_como_sistema()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

revoke execute on function public.admin_como_sistema() from public, anon, authenticated;

create function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.exigir_admin() from public, anon, authenticated;

create function public.admin_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return jsonb_build_object(
    'perfiles', (select count(*) from public.perfiles where slug not like 'test-%'),
    'perfiles_visibles', (select count(*) from public.perfiles where publicado and not oculto and slug not like 'test-%'),
    'perfiles_pendientes', (select count(*) from public.perfiles where not publicado and usuario_id is not null),
    'perfiles_ocultos', (select count(*) from public.perfiles where oculto),
    'por_rol', (
      select coalesce(jsonb_object_agg(rol, n), '{}'::jsonb)
      from (select rol, count(*) n from public.perfiles where publicado and not oculto group by rol) r
    ),
    'pitches_publicados', (select count(*) from public.pitches where publicado),
    'piques', (select count(*) from public.piques),
    'envios_en_espera', (select count(*) from public.envios where estado = 'en_espera'),
    'envios_con_error', (select count(*) from public.envios where estado = 'error'),
    'ingestas_con_error', (select count(*) from public.ingestas where estado = 'error'),
    'empresas', (select count(*) from public.empresas),
    'participantes', (
      select count(*) from public.evento_participantes ep
      join public.eventos ev on ev.id = ep.evento_id where ev.slug = 'feria-21'
    ),
    'votos', (
      select count(*) from public.votos v
      join public.eventos ev on ev.id = v.evento_id where ev.slug = 'feria-21'
    ),
    'autopublicar', (select autopublicar from public.ajustes where id)
  );
end;
$$;

create function public.admin_perfiles()
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

create function public.admin_publicar_perfil(p_perfil uuid, p_publicado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_como_sistema();
  update public.perfiles set publicado = p_publicado where id = p_perfil;
end;
$$;

create function public.admin_pitches()
returns table (
  id          uuid,
  perfil_slug text,
  perfil      text,
  descripcion text,
  poster_url  text,
  publicado   boolean,
  piques      integer,
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
    x.id, p.slug, p.nombre, x.descripcion, x.poster_url, x.publicado,
    (select count(*)::integer from public.piques q where q.pitch_id = x.id),
    x.created_at
  from public.pitches x
  join public.perfiles p on p.id = x.perfil_id
  where p.slug not like 'test-%'
  order by x.created_at desc;
end;
$$;

create function public.admin_publicar_pitch(p_pitch uuid, p_publicado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_como_sistema();
  update public.pitches set publicado = p_publicado where id = p_pitch;
end;
$$;

-- Envíos del Form que necesitan una mano. Incluye emails: solo para el equipo.
create function public.admin_envios()
returns table (
  origen_id        text,
  email_escrito    text,
  email_verificado text,
  estado           text,
  regla            text,
  fecha            timestamptz,
  perfil_slug      text,
  error            text,
  intentos         integer
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
    e.origen_id, e.email_escrito, e.email_verificado, e.estado, e.regla, e.fecha,
    p.slug, i.error, coalesce(i.intentos, 0)
  from public.envios e
  left join public.perfiles p on p.id = e.perfil_id
  left join public.ingestas i on i.origen_id = e.origen_id
  where e.estado in ('recibido', 'en_espera', 'error', 'rechazado')
  order by e.fecha desc
  limit 200;
end;
$$;

create function public.admin_autopublicar(p_valor boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_como_sistema();
  update public.ajustes set autopublicar = p_valor where id;
end;
$$;

create function public.admin_empresas()
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

create function public.admin_ocultar_empresa(p_empresa uuid, p_oculta boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_como_sistema();
  update public.empresas set oculta = p_oculta, updated_at = now() where id = p_empresa;
end;
$$;

-- Estado del evento + resultados completos (con votos) para el equipo.
create function public.admin_evento(p_evento text)
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

create function public.admin_configurar_evento(
  p_evento              text,
  p_votacion_abierta    boolean,
  p_resultados_visibles boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_como_sistema();
  update public.eventos
  set votacion_abierta    = p_votacion_abierta,
      resultados_visibles = p_resultados_visibles
  where slug = p_evento;
end;
$$;

create function public.admin_participante(p_evento text, p_perfil uuid, p_participa boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
begin
  perform public.admin_como_sistema();
  select id into v_evento from public.eventos where slug = p_evento;
  if v_evento is null then
    raise exception 'evento inexistente' using errcode = '22023';
  end if;
  if p_participa then
    insert into public.evento_participantes (evento_id, perfil_id)
    values (v_evento, p_perfil) on conflict do nothing;
  else
    delete from public.evento_participantes where evento_id = v_evento and perfil_id = p_perfil;
  end if;
end;
$$;

-- Votos por participante: públicos solo con resultados visibles; el equipo, siempre.
create function public.resultados_evento(p_evento text)
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

-- Permisos de ejecución: nada para public; lo justo para cada rol.
revoke execute on function public.participantes_evento(text) from public;
revoke execute on function public.mi_evento(text) from public, anon;
revoke execute on function public.participar_evento(text, boolean) from public, anon;
revoke execute on function public.votar(text, uuid) from public, anon;
revoke execute on function public.quitar_voto(text) from public, anon;
revoke execute on function public.total_votos_evento(text) from public;
revoke execute on function public.resultados_evento(text) from public;
revoke execute on function public.admin_resumen() from public, anon;
revoke execute on function public.admin_perfiles() from public, anon;
revoke execute on function public.admin_publicar_perfil(uuid, boolean) from public, anon;
revoke execute on function public.admin_pitches() from public, anon;
revoke execute on function public.admin_publicar_pitch(uuid, boolean) from public, anon;
revoke execute on function public.admin_envios() from public, anon;
revoke execute on function public.admin_autopublicar(boolean) from public, anon;
revoke execute on function public.admin_empresas() from public, anon;
revoke execute on function public.admin_ocultar_empresa(uuid, boolean) from public, anon;
revoke execute on function public.admin_evento(text) from public, anon;
revoke execute on function public.admin_configurar_evento(text, boolean, boolean) from public, anon;
revoke execute on function public.admin_participante(text, uuid, boolean) from public, anon;

grant execute on function public.participantes_evento(text) to anon, authenticated;
grant execute on function public.total_votos_evento(text) to anon, authenticated;
grant execute on function public.resultados_evento(text) to anon, authenticated;
grant execute on function public.mi_evento(text) to authenticated;
grant execute on function public.participar_evento(text, boolean) to authenticated;
grant execute on function public.votar(text, uuid) to authenticated;
grant execute on function public.quitar_voto(text) to authenticated;
grant execute on function public.admin_resumen() to authenticated;
grant execute on function public.admin_perfiles() to authenticated;
grant execute on function public.admin_publicar_perfil(uuid, boolean) to authenticated;
grant execute on function public.admin_pitches() to authenticated;
grant execute on function public.admin_publicar_pitch(uuid, boolean) to authenticated;
grant execute on function public.admin_envios() to authenticated;
grant execute on function public.admin_autopublicar(boolean) to authenticated;
grant execute on function public.admin_empresas() to authenticated;
grant execute on function public.admin_ocultar_empresa(uuid, boolean) to authenticated;
grant execute on function public.admin_evento(text) to authenticated;
grant execute on function public.admin_configurar_evento(text, boolean, boolean) to authenticated;
grant execute on function public.admin_participante(text, uuid, boolean) to authenticated;

-- Primer admin (correr a mano en el SQL editor, con el email real de Google):
--   insert into public.admins (email) values ('tu-email@gmail.com');
