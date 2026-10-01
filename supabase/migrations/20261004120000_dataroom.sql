-- Pecera: Dataroom (documentos de la empresa) para Academy. Corre DESPUÉS de
-- pitch_build_producto_newsletter.
--
-- Base compartida con producción: todo es ADITIVO (una tabla, funciones y, si
-- existe, sumar la tabla a la publicación de Realtime).
--
-- Un documento es de la empresa y lo edita cualquier miembro. Puede ser:
--   - plantilla: las respuestas de un template de Academy (los templates viven en
--     lib/plantillas.ts; acá solo las respuestas, en `campos`). Uno por template.
--   - escrito: un texto propio.
--   - link: un documento que vive en otro lado (Drive, Notion, Docsend…).
-- Nace privado (`visible = false`): solo lo ve el equipo. "Transparente" lo muestra
-- en la página pública de la empresa, como los datos de Transparencia. Borrar es
-- archivar (se puede recuperar).

create table public.empresa_documentos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  plantilla  text,
  categoria  text not null,
  tipo       text not null,
  titulo     text not null,
  campos     jsonb not null default '{}'::jsonb,
  cuerpo     text,
  url        text,
  completo   boolean not null default false,
  visible    boolean not null default false,
  archivado  boolean not null default false,
  autor_id   uuid references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint empresa_documentos_categoria_valida check (categoria in (
    'empresa', 'fundadores', 'producto', 'mercado', 'modelo', 'finanzas', 'traccion',
    'fundraising', 'legal', 'otros'
  )),
  constraint empresa_documentos_tipo_valido check (tipo in ('plantilla', 'escrito', 'link')),
  constraint empresa_documentos_plantilla_valida check (
    (tipo = 'plantilla') = (plantilla is not null)
    and (plantilla is null or plantilla ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
  ),
  constraint empresa_documentos_titulo_valido check (char_length(btrim(titulo)) between 1 and 120),
  constraint empresa_documentos_campos_validos check (
    jsonb_typeof(campos) = 'object' and octet_length(campos::text) <= 40000
  ),
  constraint empresa_documentos_cuerpo_valido check (cuerpo is null or char_length(cuerpo) <= 20000),
  constraint empresa_documentos_url_valida check (
    url is null or (char_length(url) <= 500 and url ~* '^https://\S+$')
  ),
  constraint empresa_documentos_link_con_url check (tipo <> 'link' or url is not null)
);

create index empresa_documentos_empresa_idx on public.empresa_documentos (empresa_id, categoria);
-- Un documento por template y empresa (los archivados no cuentan).
create unique index empresa_documentos_una_plantilla on public.empresa_documentos (empresa_id, plantilla)
  where plantilla is not null and not archivado;

alter table public.empresa_documentos enable row level security;
revoke all on public.empresa_documentos from anon, authenticated;
grant select on public.empresa_documentos to anon, authenticated;

create policy "todos leen documentos transparentes de empresas visibles"
  on public.empresa_documentos for select
  to anon, authenticated
  using (visible and not archivado and public.empresa_visible(empresa_id));
create policy "los miembros leen sus documentos"
  on public.empresa_documentos for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));

-- Crea o actualiza un documento (el autosave llama seguido). Con p_id null y un
-- template que la empresa ya tiene, actualiza ese. Devuelve el id.
create function public.guardar_documento(
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
  v_empresa uuid := public.empresa_de_sesion();
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

create function public.visibilidad_documento(p_id uuid, p_visible boolean)
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

-- Archivar = sacar del Dataroom (y de lo público) sin perder lo escrito.
create function public.archivar_documento(p_id uuid, p_archivado boolean)
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

revoke execute on function public.guardar_documento(uuid, text, text, text, text, jsonb, text, text, boolean) from public, anon;
revoke execute on function public.visibilidad_documento(uuid, boolean) from public, anon;
revoke execute on function public.archivar_documento(uuid, boolean) from public, anon;
grant execute on function public.guardar_documento(uuid, text, text, text, text, jsonb, text, text, boolean) to authenticated;
grant execute on function public.visibilidad_documento(uuid, boolean) to authenticated;
grant execute on function public.archivar_documento(uuid, boolean) to authenticated;

-- Realtime: el equipo ve los cambios de sus compañeros sin recargar. La política de
-- miembros decide qué eventos le llegan a cada sesión. Solo si la publicación existe
-- (en Supabase sí; en una base de prueba, no).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.empresa_documentos;
  end if;
end;
$$;
