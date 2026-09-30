-- Feria 21, segunda vuelta: aliados profesionales, WhatsApp de otros países, logo de
-- empresa, cofounder match y portafolio para los tres roles.
--
-- Aditiva en datos: no se borra ni se renombra ninguna columna ni fila. Dos CHECK se
-- AMPLÍAN (se agregan valores; todo lo que valía sigue valiendo) y el guardián de
-- perfiles se redefine con la misma lógica, sumando el formato internacional de
-- WhatsApp. La app de main sigue funcionando con esta base.

-- ---------------------------------------------------------------------------
-- 1) "¿Qué sos?": profesionales, empresas e instituciones también son aliados
-- ---------------------------------------------------------------------------
do $$
declare
  v_nombre text;
begin
  for v_nombre in
    select conname from pg_constraint
    where conrelid = 'public.perfiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tipo%'
      and pg_get_constraintdef(oid) ilike '%startup%'
  loop
    execute format('alter table public.perfiles drop constraint %I', v_nombre);
  end loop;
end;
$$;

alter table public.perfiles
  add constraint perfiles_tipo_check check (tipo in (
    'startup', 'emprendimiento', 'aceleradora', 'incubadora', 'angel', 'fondo', 'coach',
    'profesional', 'empresa', 'institucion'
  ));

-- Especialidades nuevas para aliados profesionales.
alter table public.perfiles drop constraint perfiles_especialidades_validas;
alter table public.perfiles
  add constraint perfiles_especialidades_validas check (
    cardinality(especialidades) <= 5
    and especialidades <@ array[
      'mentoria', 'coaching', 'legal', 'finanzas', 'marketing', 'ventas', 'producto',
      'tecnologia', 'diseno', 'fundraising', 'rrhh', 'internacionalizacion', 'impacto',
      'comunicacion', 'ia_datos', 'contabilidad', 'operaciones', 'audiovisual'
    ]::text[]
  );

-- ---------------------------------------------------------------------------
-- 2) Cofounder match (estilo YC): quién busca socio, qué aporta y qué busca
-- ---------------------------------------------------------------------------
alter table public.perfiles
  add column busca_cofundador      boolean not null default false,
  add column cofundador_aporta     text,
  add column cofundador_busca      text[] not null default '{}',
  add column cofundador_dedicacion text,
  add column cofundador_nota       text;

alter table public.perfiles
  add constraint perfiles_cofundador_aporta_valido check (
    cofundador_aporta is null
    or cofundador_aporta in ('tecnico', 'negocio', 'producto', 'diseno', 'ciencia')
  ),
  add constraint perfiles_cofundador_busca_valido check (
    cardinality(cofundador_busca) <= 5
    and cofundador_busca <@ array['tecnico', 'negocio', 'producto', 'diseno', 'ciencia']::text[]
  ),
  add constraint perfiles_cofundador_dedicacion_valida check (
    cofundador_dedicacion is null
    or cofundador_dedicacion in ('full', 'part', 'explorando')
  ),
  add constraint perfiles_cofundador_nota_valida check (
    cofundador_nota is null or char_length(cofundador_nota) <= 200
  );

create index perfiles_busca_cofundador_idx on public.perfiles (busca_cofundador)
  where busca_cofundador;

-- ---------------------------------------------------------------------------
-- 3) Guardián de perfiles: igual que antes + WhatsApp de otros países
-- ---------------------------------------------------------------------------
-- Argentina se sigue guardando como 10 dígitos (código de área + número); el resto,
-- en formato internacional con "+" (E.164: + código de país y hasta 15 dígitos).
create or replace function public.perfiles_guardian()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.consentimiento_at is null then
      raise exception 'falta el consentimiento' using errcode = '22023';
    end if;
    if new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(new.slug) not between 3 and 60
       or new.slug like 'test-%' then
      raise exception 'slug inválido' using errcode = '22023';
    end if;

    new.usuario_id        := v_uid;
    new.origen_id         := null;
    new.consentimiento_at := now();
    new.publicado         := coalesce(
      (select a.autopublicar from public.ajustes a where a.id), false
    );
  else
    if new.id is distinct from old.id
       or new.slug is distinct from old.slug
       or new.publicado is distinct from old.publicado
       or new.usuario_id is distinct from old.usuario_id
       or new.origen_id is distinct from old.origen_id
       or new.consentimiento_at is distinct from old.consentimiento_at
       or new.created_at is distinct from old.created_at then
      raise exception 'campo no editable' using errcode = '42501';
    end if;
  end if;

  -- Opcionales vacíos = null.
  new.whatsapp   := nullif(btrim(new.whatsapp), '');
  new.email      := nullif(btrim(new.email), '');
  new.linkedin   := nullif(btrim(new.linkedin), '');
  new.instagram  := nullif(btrim(new.instagram), '');
  new.web        := nullif(btrim(new.web), '');
  new.avatar_url := nullif(btrim(new.avatar_url), '');

  -- Validaciones del formulario, una por campo.
  if new.nombre is null or char_length(btrim(new.nombre)) not between 1 and 80 then
    raise exception 'dato inválido: nombre' using errcode = '22023';
  end if;
  if new.descripcion is null or char_length(btrim(new.descripcion)) not between 1 and 150 then
    raise exception 'dato inválido: descripcion' using errcode = '22023';
  end if;
  if new.whatsapp is not null
     and new.whatsapp !~ '^([1-9][0-9]{9}|\+[1-9][0-9]{7,14})$' then
    raise exception 'dato inválido: whatsapp' using errcode = '22023';
  end if;
  if new.email is not null and (char_length(new.email) > 200
     or new.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise exception 'dato inválido: email' using errcode = '22023';
  end if;
  if new.linkedin is not null and (char_length(new.linkedin) > 200
     or new.linkedin !~* 'linkedin\.com') then
    raise exception 'dato inválido: linkedin' using errcode = '22023';
  end if;
  if new.instagram is not null and char_length(new.instagram) > 100 then
    raise exception 'dato inválido: instagram' using errcode = '22023';
  end if;
  if new.web is not null and (char_length(new.web) > 200
     or regexp_replace(new.web, '^https?://', '', 'i') !~ '^[\w-]+(\.[\w-]+)+(/\S*)?$') then
    raise exception 'dato inválido: web' using errcode = '22023';
  end if;

  -- La foto solo puede ser una subida por este mismo usuario (<uid>-<hash8>.jpg).
  if new.avatar_url is not null
     and not (tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url)
     and new.avatar_url !~ ('^' || v_uid::text || '-[0-9a-f]{8}\.jpg$') then
    raise exception 'foto inválida' using errcode = '22023';
  end if;

  -- La foto anterior (si era una clave de R2) se borra en diferido: el ISR puede
  -- seguir sirviéndola un rato. La ingesta de main borra las vencidas.
  if tg_op = 'UPDATE'
     and old.avatar_url is not null
     and new.avatar_url is distinct from old.avatar_url
     and old.avatar_url !~ '^(/|https?:)' then
    insert into public.r2_borrar (clave, bytes, borrar_despues)
    values (old.avatar_url, 0, now() + interval '1 hour')
    on conflict (clave) do nothing;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Logo de la empresa y gestión del equipo
-- ---------------------------------------------------------------------------
alter table public.empresas add column logo_url text;
alter table public.empresas
  add constraint empresas_logo_valido check (
    logo_url is null or logo_url ~ '^empresa-[0-9a-f-]{36}-[0-9a-f]{8}\.jpg$'
  );

-- Cambia (o saca, con null) el logo. Lo puede hacer cualquier miembro: en la feria
-- el que tiene el logo a mano no siempre es quien creó la empresa. La clave tiene que
-- ser de ESTA empresa (la sube el servidor con el id). El logo viejo se borra de R2
-- en diferido, como las fotos de perfil.
create function public.cambiar_logo_empresa(p_logo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_viejo  text;
begin
  if v_perfil.empresa_id is null then
    raise exception 'primero sumate a una empresa' using errcode = 'P0001';
  end if;
  if p_logo is not null
     and p_logo !~ ('^empresa-' || v_perfil.empresa_id::text || '-[0-9a-f]{8}\.jpg$') then
    raise exception 'logo inválido' using errcode = '22023';
  end if;

  select logo_url into v_viejo from public.empresas where id = v_perfil.empresa_id;
  update public.empresas set logo_url = p_logo where id = v_perfil.empresa_id;

  if v_viejo is not null and v_viejo is distinct from p_logo then
    insert into public.r2_borrar (clave, bytes, borrar_despues)
    values (v_viejo, 0, now() + interval '1 hour')
    on conflict (clave) do nothing;
  end if;
end;
$$;

-- Lo mismo que mi_empresa() más el logo. Se crea aparte porque cambiar las columnas
-- que devuelve una función exige borrarla, y main todavía la usa.
create function public.mi_empresa_v2()
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
    e.industrias, e.etapa, e.ronda, e.logo_url, c.codigo,
    e.dueno_id = auth.uid(),
    public.empresa_visible(e.id),
    (select count(*)::integer from public.perfiles m where m.empresa_id = e.id)
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id
  left join public.empresas_codigos c on c.empresa_id = e.id
  where p.usuario_id = auth.uid();
$$;

-- El equipo completo, para la cuenta de empresa (incluye perfiles sin publicar, que
-- en la página pública no se ven). Sin emails ni contactos.
create function public.miembros_mi_empresa()
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

revoke execute on function public.cambiar_logo_empresa(text) from public, anon;
revoke execute on function public.mi_empresa_v2() from public, anon;
revoke execute on function public.miembros_mi_empresa() from public, anon;
grant execute on function public.cambiar_logo_empresa(text) to authenticated;
grant execute on function public.mi_empresa_v2() to authenticated;
grant execute on function public.miembros_mi_empresa() to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Portafolio: inversiones, casos, servicios, logros, prensa y documentos
-- ---------------------------------------------------------------------------
-- Para los tres roles: el inversor muestra en qué invirtió, el aliado sus casos y
-- servicios, el founder sus logros y documentos. Son links (https), no archivos.
create table public.portafolio (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  tipo        text not null check (tipo in (
                'inversion', 'caso', 'servicio', 'logro', 'prensa', 'documento'
              )),
  titulo      text not null check (char_length(btrim(titulo)) between 1 and 80),
  descripcion text check (descripcion is null or char_length(descripcion) <= 200),
  url         text check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 300)),
  visible     boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index portafolio_perfil_idx on public.portafolio (perfil_id, orden);

alter table public.portafolio enable row level security;
revoke all on public.portafolio from anon, authenticated;
grant select on public.portafolio to anon, authenticated;

-- Público: lo visible de perfiles visibles. Lo propio (incluso lo oculto) se lee con
-- mi_portafolio().
create policy "todos leen el portafolio visible"
  on public.portafolio for select
  to anon, authenticated
  using (
    visible and exists (
      select 1 from public.perfiles p
      where p.id = perfil_id and p.publicado and not p.oculto
    )
  );

create function public.mi_portafolio()
returns table (
  id          uuid,
  tipo        text,
  titulo      text,
  descripcion text,
  url         text,
  visible     boolean,
  orden       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.id, x.tipo, x.titulo, x.descripcion, x.url, x.visible, x.orden
  from public.portafolio x
  join public.perfiles p on p.id = x.perfil_id
  where p.usuario_id = auth.uid()
  order by x.orden, x.created_at;
$$;

-- Crea (p_id null) o edita un ítem propio. Hasta 12 por perfil.
create function public.guardar_portafolio(
  p_id          uuid,
  p_tipo        text,
  p_titulo      text,
  p_descripcion text,
  p_url         text,
  p_visible     boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
  v_id     uuid;
begin
  if p_id is null then
    if (select count(*) from public.portafolio where perfil_id = v_perfil.id) >= 12 then
      raise exception 'portafolio lleno' using errcode = 'P0001';
    end if;
    insert into public.portafolio (perfil_id, tipo, titulo, descripcion, url, visible, orden)
    values (
      v_perfil.id, p_tipo, btrim(p_titulo), nullif(btrim(p_descripcion), ''),
      nullif(btrim(p_url), ''), coalesce(p_visible, true),
      coalesce((select max(orden) + 1 from public.portafolio where perfil_id = v_perfil.id), 0)
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.portafolio set
    tipo        = p_tipo,
    titulo      = btrim(p_titulo),
    descripcion = nullif(btrim(p_descripcion), ''),
    url         = nullif(btrim(p_url), ''),
    visible     = coalesce(p_visible, true),
    updated_at  = now()
  where id = p_id and perfil_id = v_perfil.id
  returning id into v_id;

  if v_id is null then
    raise exception 'ítem inexistente' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

create function public.borrar_portafolio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  delete from public.portafolio where id = p_id and perfil_id = v_perfil.id;
end;
$$;

revoke execute on function public.mi_portafolio() from public, anon;
revoke execute on function public.guardar_portafolio(uuid, text, text, text, text, boolean) from public, anon;
revoke execute on function public.borrar_portafolio(uuid) from public, anon;
grant execute on function public.mi_portafolio() to authenticated;
grant execute on function public.guardar_portafolio(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.borrar_portafolio(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Seguir perfiles (feed "Stakeholding" y "Mi red")
-- ---------------------------------------------------------------------------
-- Como los piques: por dispositivo anónimo (uuid al azar), sin cuenta ni datos
-- personales. En la feria se sigue gente sin haber entrado. La lista de a quién
-- seguís vive en el celular; la base guarda el par para contar seguidores.
create table public.seguidos (
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  dispositivo uuid not null,
  created_at  timestamptz not null default now(),
  primary key (perfil_id, dispositivo)
);

alter table public.seguidos enable row level security;
revoke all on public.seguidos from anon, authenticated;

create function public.seguir(p_perfil uuid, p_dispositivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_perfil is null or p_dispositivo is null then
    raise exception 'seguir inválido' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.perfiles p where p.id = p_perfil and p.publicado and not p.oculto
  ) then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'seguir', 30);
  insert into public.seguidos (perfil_id, dispositivo) values (p_perfil, p_dispositivo)
  on conflict do nothing;
end;
$$;

create function public.dejar_de_seguir(p_perfil uuid, p_dispositivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_dispositivo is null then
    raise exception 'seguir inválido' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'seguir', 30);
  delete from public.seguidos where perfil_id = p_perfil and dispositivo = p_dispositivo;
end;
$$;

-- Solo el total por perfil visible: nunca quién sigue a quién.
create function public.seguidores_de(p_slug text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.seguidos s
  join public.perfiles p on p.id = s.perfil_id
  where p.slug = p_slug and p.publicado and not p.oculto;
$$;

revoke execute on function public.seguir(uuid, uuid) from public;
revoke execute on function public.dejar_de_seguir(uuid, uuid) from public;
revoke execute on function public.seguidores_de(text) from public;
grant execute on function public.seguir(uuid, uuid) to anon, authenticated;
grant execute on function public.dejar_de_seguir(uuid, uuid) to anon, authenticated;
grant execute on function public.seguidores_de(text) to anon, authenticated;
