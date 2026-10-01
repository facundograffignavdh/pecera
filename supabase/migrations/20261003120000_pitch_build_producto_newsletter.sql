-- Pecera: Pitch del dueño, Build in Public, Producto/Servicio y Newsletter.
-- Corre DESPUÉS de feria_lista y medicion.
--
-- Base compartida con producción: todo es ADITIVO. Una columna nueva en pitches,
-- una política restrictiva nueva (se suma a las que hay, no las reemplaza), tablas
-- y funciones nuevas. No cambia ninguna función ni política existente.
--
-- Qué suma:
--   1. Pitch: la persona edita la descripción de sus pitches y los oculta o los
--      vuelve a mostrar (`pitches.oculto`, como `perfiles.oculto`). `publicado`
--      sigue siendo del equipo y de la ingesta.
--   2. Build in Public: hitos (logrados, el actual con su progreso, próximos) y
--      avances cortos de la empresa. Lo edita cualquier miembro; es público si la
--      empresa es visible.
--   3. Producto / Servicio: qué ofrece la empresa, con brief e imágenes (R2).
--   4. Newsletter: cada perfil abre la suya, publica ediciones y otras cuentas se
--      suscriben. Las suscripciones son privadas: el dueño solo ve cuántas hay.
--
-- Toda escritura pasa por funciones `security definer` con `search_path` vacío. La
-- app nunca escribe estas tablas directo.

-- ---------------------------------------------------------------------------
-- 0) Ayudas
-- ---------------------------------------------------------------------------

-- Lista de textos cortos: hasta `p_max` elementos de 1 a `p_largo` caracteres.
create function public.textos_cortos_validos(p_textos text[], p_max integer, p_largo integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_textos) <= p_max
    and not exists (
      select 1 from unnest(p_textos) t
      where t is null or char_length(btrim(t)) not between 1 and p_largo
    );
$$;

-- Hasta 4 claves de R2 con la forma `<uuid>-<hash8>.jpg`.
create function public.claves_imagen_validas(p_claves text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_claves) <= 4
    and not exists (
      select 1 from unnest(p_claves) k
      where k is null or k !~ '^[0-9a-f-]{36}-[0-9a-f]{8}\.jpg$'
    );
$$;

-- Empresa del perfil de la sesión (o error si no tiene).
create function public.empresa_de_sesion()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  if v_perfil.empresa_id is null then
    raise exception 'primero sumate a una empresa' using errcode = '22023';
  end if;
  return v_perfil.empresa_id;
end;
$$;

revoke execute on function public.empresa_de_sesion() from public, anon, authenticated;

-- Para las políticas de lectura: ¿la sesión es miembro de esta empresa?
create function public.soy_de_empresa(p_empresa uuid)
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

revoke execute on function public.soy_de_empresa(uuid) from public, anon;
grant execute on function public.soy_de_empresa(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1) Pitch: lo que maneja la persona
-- ---------------------------------------------------------------------------
alter table public.pitches add column oculto boolean not null default false;

-- Restrictiva: se suma (AND) a "anon lee pitches publicados...". Un pitch oculto
-- por su dueño no se ve en el feed ni en los perfiles.
create policy "nadie ve pitches ocultos por su dueño"
  on public.pitches
  as restrictive
  for select
  to anon, authenticated
  using (not oculto);

-- Pitch de la sesión (o error). Uso interno.
create function public.pitch_de_sesion(p_pitch uuid)
returns public.pitches
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_pitch  public.pitches;
begin
  select * into v_pitch from public.pitches where id = p_pitch and perfil_id = v_perfil.id;
  if not found then
    raise exception 'ese pitch no es tuyo' using errcode = '42501';
  end if;
  return v_pitch;
end;
$$;

revoke execute on function public.pitch_de_sesion(uuid) from public, anon, authenticated;

create function public.editar_mi_pitch(p_pitch uuid, p_descripcion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pitch public.pitches := public.pitch_de_sesion(p_pitch);
begin
  update public.pitches
  set descripcion = nullif(btrim(p_descripcion), '')
  where id = v_pitch.id;
end;
$$;

create function public.ocultar_mi_pitch(p_pitch uuid, p_oculto boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pitch public.pitches := public.pitch_de_sesion(p_pitch);
begin
  update public.pitches set oculto = coalesce(p_oculto, false) where id = v_pitch.id;
end;
$$;

-- Como mis_pitches() (que queda igual), más los ocultos con estado 'oculto'.
create function public.mis_pitches_detalle()
returns table (
  id          text,
  fecha       timestamptz,
  estado      text,
  poster_url  text,
  descripcion text
)
language sql
stable
security definer
set search_path = ''
as $$
  with yo as (
    select
      lower(u.email)::text as email,
      (select pe.id from public.perfiles pe where pe.usuario_id = u.id) as perfil_id
    from auth.users u
    where u.id = auth.uid()
  )
  select
    pi.id::text,
    pi.created_at,
    case when pi.oculto then 'oculto' else 'publicado' end,
    pi.poster_url,
    pi.descripcion
  from public.pitches pi, yo
  where pi.perfil_id = yo.perfil_id
    and pi.publicado
  union all
  select
    md5(e.origen_id),
    e.fecha,
    case
      when e.estado = 'en_espera' then 'en_espera'
      when e.estado = 'error' and coalesce(i.intentos, 0) >= 3 then 'error'
      else 'procesando'
    end,
    null,
    null
  from public.envios e
  cross join yo
  left join public.ingestas i on i.origen_id = e.origen_id
  where e.estado in ('recibido', 'en_espera', 'error')
    and (e.email_escrito = yo.email or e.perfil_id = yo.perfil_id)
    and not exists (
      select 1 from public.pitches pi
      where pi.origen_id = e.origen_id and pi.publicado
    )
  order by 2 desc;
$$;

revoke execute on function public.editar_mi_pitch(uuid, text) from public, anon;
revoke execute on function public.ocultar_mi_pitch(uuid, boolean) from public, anon;
revoke execute on function public.mis_pitches_detalle() from public, anon;
grant execute on function public.editar_mi_pitch(uuid, text) to authenticated;
grant execute on function public.ocultar_mi_pitch(uuid, boolean) to authenticated;
grant execute on function public.mis_pitches_detalle() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Build in Public: hitos y avances de la empresa
-- ---------------------------------------------------------------------------
-- Las etapas son una guía, no un camino obligatorio: el hito puede no tener etapa.
-- Espejo en lib/build.ts (cambiar una = migración nueva).
create table public.empresa_hitos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo     text not null,
  detalle    text,
  etapa      text,
  estado     text not null,
  -- Solo el hito en curso: cuánto le falta, según el equipo.
  progreso   smallint,
  -- Logrado: cuándo. Próximo: para cuándo (opcional).
  fecha      date,
  autor_id   uuid references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint empresa_hitos_titulo_valido check (char_length(btrim(titulo)) between 1 and 80),
  constraint empresa_hitos_detalle_valido check (detalle is null or char_length(btrim(detalle)) between 1 and 280),
  constraint empresa_hitos_etapa_valida check (etapa is null or etapa in (
    'idea', 'investigacion', 'prototipo', 'mvp', 'lanzamiento', 'primeros_usuarios',
    'traccion', 'crecimiento', 'fundraising', 'expansion'
  )),
  constraint empresa_hitos_estado_valido check (estado in ('logrado', 'en_curso', 'proximo')),
  constraint empresa_hitos_progreso_valido check (
    progreso is null or (estado = 'en_curso' and progreso between 0 and 100)
  )
);

create index empresa_hitos_empresa_idx on public.empresa_hitos (empresa_id, estado);
-- Un solo hito actual por empresa: es el que se muestra en el feed y el perfil.
create unique index empresa_hitos_un_en_curso on public.empresa_hitos (empresa_id)
  where estado = 'en_curso';

create table public.empresa_avances (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  hito_id    uuid references public.empresa_hitos (id) on delete set null,
  autor_id   uuid references public.perfiles (id) on delete set null,
  texto      text not null,
  created_at timestamptz not null default now(),

  constraint empresa_avances_texto_valido check (char_length(btrim(texto)) between 1 and 280)
);

create index empresa_avances_empresa_idx on public.empresa_avances (empresa_id, created_at desc);

alter table public.empresa_hitos   enable row level security;
alter table public.empresa_avances enable row level security;
revoke all on public.empresa_hitos   from anon, authenticated;
revoke all on public.empresa_avances from anon, authenticated;
grant select on public.empresa_hitos   to anon, authenticated;
grant select on public.empresa_avances to anon, authenticated;

create policy "todos leen hitos de empresas visibles"
  on public.empresa_hitos for select
  to anon, authenticated
  using (public.empresa_visible(empresa_id));
create policy "los miembros leen sus hitos"
  on public.empresa_hitos for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));
create policy "todos leen avances de empresas visibles"
  on public.empresa_avances for select
  to anon, authenticated
  using (public.empresa_visible(empresa_id));
create policy "los miembros leen sus avances"
  on public.empresa_avances for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));

-- Crea (p_id null) o edita un hito. Cualquier miembro. Devuelve el id.
create function public.guardar_hito(
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
  v_empresa uuid := public.empresa_de_sesion();
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

create function public.borrar_hito(p_id uuid)
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

-- Un avance corto. Hasta 5 por empresa cada 24 h (evita llenar la página).
create function public.publicar_avance(p_texto text, p_hito uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
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

create function public.borrar_avance(p_id uuid)
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

revoke execute on function public.guardar_hito(uuid, text, text, text, text, integer, date) from public, anon;
revoke execute on function public.borrar_hito(uuid) from public, anon;
revoke execute on function public.publicar_avance(text, uuid) from public, anon;
revoke execute on function public.borrar_avance(uuid) from public, anon;
grant execute on function public.guardar_hito(uuid, text, text, text, text, integer, date) to authenticated;
grant execute on function public.borrar_hito(uuid) to authenticated;
grant execute on function public.publicar_avance(text, uuid) to authenticated;
grant execute on function public.borrar_avance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Producto / Servicio de la empresa
-- ---------------------------------------------------------------------------
create table public.empresa_productos (
  empresa_id      uuid primary key references public.empresas (id) on delete cascade,
  tipo            text not null,
  nombre          text not null,
  -- Una línea: qué es y para quién. Es lo primero que se lee.
  propuesta       text not null,
  problema        text,
  solucion        text,
  para_quien      text,
  caracteristicas text[] not null default '{}',
  como_usar       text,
  demo_url        text,
  -- Claves de R2 `<empresaId>-<hash8>.jpg`; las pone solo poner_imagenes_producto.
  imagenes        text[] not null default '{}',
  updated_at      timestamptz not null default now(),

  constraint empresa_productos_tipo_valido check (tipo in ('producto', 'servicio')),
  constraint empresa_productos_nombre_valido check (char_length(btrim(nombre)) between 1 and 80),
  constraint empresa_productos_propuesta_valida check (char_length(btrim(propuesta)) between 1 and 140),
  constraint empresa_productos_problema_valido check (problema is null or char_length(btrim(problema)) between 1 and 400),
  constraint empresa_productos_solucion_valida check (solucion is null or char_length(btrim(solucion)) between 1 and 400),
  constraint empresa_productos_para_quien_valido check (para_quien is null or char_length(btrim(para_quien)) between 1 and 280),
  constraint empresa_productos_caracteristicas_validas check (public.textos_cortos_validos(caracteristicas, 6, 80)),
  constraint empresa_productos_como_usar_valido check (como_usar is null or char_length(btrim(como_usar)) between 1 and 400),
  constraint empresa_productos_demo_valida check (
    demo_url is null or (char_length(demo_url) <= 300 and demo_url ~* '^https://\S+$')
  ),
  constraint empresa_productos_imagenes_validas check (public.claves_imagen_validas(imagenes))
);

alter table public.empresa_productos enable row level security;
revoke all on public.empresa_productos from anon, authenticated;
grant select on public.empresa_productos to anon, authenticated;

create policy "todos leen productos de empresas visibles"
  on public.empresa_productos for select
  to anon, authenticated
  using (public.empresa_visible(empresa_id));
create policy "los miembros leen su producto"
  on public.empresa_productos for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));

-- Crea o edita el producto (sin tocar las imágenes). Cualquier miembro.
create function public.guardar_producto(
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
  v_empresa uuid := public.empresa_de_sesion();
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

-- Reemplaza la lista de imágenes. Solo claves de la propia empresa; las que salen
-- van a r2_borrar con una hora de gracia (el ISR puede seguir sirviéndolas).
create function public.poner_imagenes_producto(p_imagenes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
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

revoke execute on function public.guardar_producto(text, text, text, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.poner_imagenes_producto(text[]) from public, anon;
grant execute on function public.guardar_producto(text, text, text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.poner_imagenes_producto(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Newsletter
-- ---------------------------------------------------------------------------
create table public.newsletters (
  perfil_id   uuid primary key references public.perfiles (id) on delete cascade,
  titulo      text not null,
  descripcion text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint newsletters_titulo_valido check (char_length(btrim(titulo)) between 1 and 80),
  constraint newsletters_descripcion_valida check (descripcion is null or char_length(btrim(descripcion)) between 1 and 280)
);

create table public.newsletter_ediciones (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references public.newsletters (perfil_id) on delete cascade,
  titulo       text not null,
  cuerpo       text not null,
  publicada_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint newsletter_ediciones_titulo_valido check (char_length(btrim(titulo)) between 1 and 120),
  constraint newsletter_ediciones_cuerpo_valido check (char_length(btrim(cuerpo)) between 1 and 6000)
);

create index newsletter_ediciones_perfil_idx on public.newsletter_ediciones (perfil_id, publicada_at desc);

-- Privada: nadie la lee directo. El dueño solo ve el total.
create table public.newsletter_suscripciones (
  perfil_id  uuid not null references public.newsletters (perfil_id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (perfil_id, usuario_id)
);

create index newsletter_suscripciones_usuario_idx on public.newsletter_suscripciones (usuario_id);

alter table public.newsletters              enable row level security;
alter table public.newsletter_ediciones     enable row level security;
alter table public.newsletter_suscripciones enable row level security;
revoke all on public.newsletters              from anon, authenticated;
revoke all on public.newsletter_ediciones     from anon, authenticated;
revoke all on public.newsletter_suscripciones from anon, authenticated;
grant select on public.newsletters          to anon, authenticated;
grant select on public.newsletter_ediciones to anon, authenticated;

-- Perfil visible = publicado y no oculto (como en "anon lee perfiles publicados").
create function public.perfil_visible(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = p_perfil and p.publicado and not p.oculto
  );
$$;

revoke execute on function public.perfil_visible(uuid) from public;
grant execute on function public.perfil_visible(uuid) to anon, authenticated;

create function public.es_mi_perfil(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p where p.id = p_perfil and p.usuario_id = auth.uid()
  );
$$;

revoke execute on function public.es_mi_perfil(uuid) from public, anon;
grant execute on function public.es_mi_perfil(uuid) to authenticated;

create policy "todos leen newsletters de perfiles visibles"
  on public.newsletters for select
  to anon, authenticated
  using (public.perfil_visible(perfil_id));
create policy "el dueño lee su newsletter"
  on public.newsletters for select
  to authenticated
  using (public.es_mi_perfil(perfil_id));
create policy "todos leen ediciones de perfiles visibles"
  on public.newsletter_ediciones for select
  to anon, authenticated
  using (public.perfil_visible(perfil_id));
create policy "el dueño lee sus ediciones"
  on public.newsletter_ediciones for select
  to authenticated
  using (public.es_mi_perfil(perfil_id));

-- Abre o edita la newsletter del perfil de la sesión.
create function public.guardar_newsletter(p_titulo text, p_descripcion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  insert into public.newsletters (perfil_id, titulo, descripcion)
  values (v_perfil.id, btrim(p_titulo), nullif(btrim(p_descripcion), ''))
  on conflict (perfil_id) do update set
    titulo      = excluded.titulo,
    descripcion = excluded.descripcion,
    updated_at  = now();
end;
$$;

-- Publica (p_id null) o corrige una edición. Hasta 3 nuevas cada 24 h.
create function public.guardar_edicion(p_id uuid, p_titulo text, p_cuerpo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_id     uuid;
begin
  if not exists (select 1 from public.newsletters where perfil_id = v_perfil.id) then
    raise exception 'primero abrí tu newsletter' using errcode = '22023';
  end if;

  if p_id is null then
    if (
      select count(*) from public.newsletter_ediciones
      where perfil_id = v_perfil.id and publicada_at > now() - interval '24 hours'
    ) >= 3 then
      raise exception 'demasiadas ediciones' using errcode = '22023';
    end if;
    insert into public.newsletter_ediciones (perfil_id, titulo, cuerpo)
    values (v_perfil.id, btrim(p_titulo), btrim(p_cuerpo))
    returning id into v_id;
    return v_id;
  end if;

  update public.newsletter_ediciones
  set titulo = btrim(p_titulo), cuerpo = btrim(p_cuerpo), updated_at = now()
  where id = p_id and perfil_id = v_perfil.id
  returning id into v_id;
  if v_id is null then
    raise exception 'esa edición no es tuya' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create function public.borrar_edicion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  delete from public.newsletter_ediciones where id = p_id and perfil_id = v_perfil.id;
end;
$$;

-- Suscribirse (p_activa) o darse de baja de la newsletter de un perfil visible.
-- Devuelve el total de suscripciones. No hace falta tener perfil para suscribirse.
create function public.suscribirme(p_slug text, p_activa boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid;
  v_dueno  uuid;
begin
  if auth.uid() is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  select p.id, p.usuario_id into v_perfil, v_dueno
  from public.perfiles p
  join public.newsletters n on n.perfil_id = p.id
  where p.slug = p_slug and p.publicado and not p.oculto;
  if v_perfil is null then
    raise exception 'newsletter inexistente' using errcode = '22023';
  end if;
  if v_dueno = auth.uid() then
    raise exception 'es tu newsletter' using errcode = '22023';
  end if;

  if coalesce(p_activa, true) then
    insert into public.newsletter_suscripciones (perfil_id, usuario_id)
    values (v_perfil, auth.uid())
    on conflict do nothing;
  else
    delete from public.newsletter_suscripciones
    where perfil_id = v_perfil and usuario_id = auth.uid();
  end if;

  return (select count(*)::integer from public.newsletter_suscripciones where perfil_id = v_perfil);
end;
$$;

-- Total público de suscripciones (sin identidades).
create function public.suscriptores_newsletter(p_slug text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(s.*)::integer
  from public.perfiles p
  join public.newsletter_suscripciones s on s.perfil_id = p.id
  where p.slug = p_slug and p.publicado and not p.oculto;
$$;

create function public.mi_suscripcion(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    join public.newsletter_suscripciones s on s.perfil_id = p.id
    where p.slug = p_slug and s.usuario_id = auth.uid()
  );
$$;

-- La newsletter propia con su total (aunque el perfil no esté publicado todavía).
create function public.mi_newsletter()
returns table (titulo text, descripcion text, suscriptores integer, ediciones integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.titulo,
    n.descripcion,
    (select count(*)::integer from public.newsletter_suscripciones s where s.perfil_id = n.perfil_id),
    (select count(*)::integer from public.newsletter_ediciones e where e.perfil_id = n.perfil_id)
  from public.newsletters n
  join public.perfiles p on p.id = n.perfil_id
  where p.usuario_id = auth.uid();
$$;

-- Últimas ediciones de las newsletters a las que la sesión está suscripta.
create function public.novedades_suscripciones()
returns table (
  id           uuid,
  slug         text,
  nombre       text,
  newsletter   text,
  titulo       text,
  publicada_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, p.slug, p.nombre, n.titulo, e.titulo, e.publicada_at
  from public.newsletter_suscripciones s
  join public.newsletters n on n.perfil_id = s.perfil_id
  join public.perfiles p on p.id = n.perfil_id and p.publicado and not p.oculto
  join public.newsletter_ediciones e on e.perfil_id = n.perfil_id
  where s.usuario_id = auth.uid()
  order by e.publicada_at desc
  limit 20;
$$;

revoke execute on function public.guardar_newsletter(text, text) from public, anon;
revoke execute on function public.guardar_edicion(uuid, text, text) from public, anon;
revoke execute on function public.borrar_edicion(uuid) from public, anon;
revoke execute on function public.suscribirme(text, boolean) from public, anon;
revoke execute on function public.suscriptores_newsletter(text) from public;
revoke execute on function public.mi_suscripcion(text) from public, anon;
revoke execute on function public.mi_newsletter() from public, anon;
revoke execute on function public.novedades_suscripciones() from public, anon;
grant execute on function public.guardar_newsletter(text, text) to authenticated;
grant execute on function public.guardar_edicion(uuid, text, text) to authenticated;
grant execute on function public.borrar_edicion(uuid) to authenticated;
grant execute on function public.suscribirme(text, boolean) to authenticated;
grant execute on function public.suscriptores_newsletter(text) to anon, authenticated;
grant execute on function public.mi_suscripcion(text) to authenticated;
grant execute on function public.mi_newsletter() to authenticated;
grant execute on function public.novedades_suscripciones() to authenticated;
