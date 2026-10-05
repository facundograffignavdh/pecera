-- Persona y empresa por separado (modelo tipo LinkedIn): la cuenta es de una persona y
-- las empresas o proyectos se suman después, con su tipo y el cargo de la persona.
--
-- Va después de 20261013120000_feria_todos_los_roles.sql. Aditiva en datos: no se borra
-- ni se renombra ninguna columna ni fila. Un CHECK se AMPLÍA (perfiles.tipo suma
-- 'persona') y otro se AFLOJA (empresas.descripcion puede quedar vacía: todo lo que
-- valía sigue valiendo). Funciones nuevas, ninguna redefinida: la app de main sigue
-- funcionando con esta base. Vuelta atrás: supabase/rollback-persona-empresa.sql.

-- ---------------------------------------------------------------------------
-- 1) Perfiles: 'persona' = cuenta personal, sin tipo de entidad
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
    'profesional', 'empresa', 'institucion', 'persona'
  ));

-- ---------------------------------------------------------------------------
-- 2) Empresas: tipo (opcional) y descripción opcional
-- ---------------------------------------------------------------------------
alter table public.empresas add column if not exists tipo text;

alter table public.empresas
  add constraint empresas_tipo_valido check (tipo is null or tipo in (
    'startup', 'emprendimiento', 'aceleradora', 'incubadora', 'fondo', 'empresa', 'institucion'
  ));

alter table public.empresas alter column descripcion drop not null;
alter table public.empresas drop constraint empresas_descripcion_valida;
alter table public.empresas
  add constraint empresas_descripcion_valida check (
    descripcion is null or char_length(btrim(descripcion)) between 1 and 280
  );

-- ---------------------------------------------------------------------------
-- 3) Funciones
-- ---------------------------------------------------------------------------

-- Crea una empresa con lo mínimo (nombre, tipo y cargo propio). Mismas reglas que
-- crear_empresa_v2: hasta 5 por persona, quien la crea la administra y, si es la
-- primera, pasa a ser la principal (lo hace el trigger de empresa_miembros).
create function public.crear_empresa_basica(
  p_nombre text,
  p_slug   text,
  p_tipo   text default null,
  p_cargo  text default null
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

  insert into public.empresas (slug, nombre, tipo, dueno_id)
  values (lower(btrim(p_slug)), btrim(p_nombre), nullif(p_tipo, ''), auth.uid())
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

-- Edita una empresa con su tipo; la descripción vacía queda en null. Solo quien la
-- administra (igual que editar_empresa_en).
create function public.editar_empresa_v3_en(
  p_empresa     uuid,
  p_nombre      text,
  p_tipo        text default null,
  p_descripcion text default null,
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
      tipo        = nullif(p_tipo, ''),
      descripcion = nullif(btrim(p_descripcion), ''),
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

-- mis_empresas() más el tipo de cada empresa.
create function public.mis_empresas_v2()
returns table (
  id          uuid,
  slug        text,
  nombre      text,
  tipo        text,
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
    e.id, e.slug, e.nombre, e.tipo, e.descripcion, e.web, e.linkedin, e.instagram,
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

revoke execute on function public.crear_empresa_basica(text, text, text, text) from public, anon;
revoke execute on function public.editar_empresa_v3_en(uuid, text, text, text, text, text, text, text[], text, text, text) from public, anon;
revoke execute on function public.mis_empresas_v2() from public, anon;
grant execute on function public.crear_empresa_basica(text, text, text, text) to authenticated;
grant execute on function public.editar_empresa_v3_en(uuid, text, text, text, text, text, text, text[], text, text, text) to authenticated;
grant execute on function public.mis_empresas_v2() to authenticated;
