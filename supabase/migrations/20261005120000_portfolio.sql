-- Pecera: Portfolio de inversores y aliados. Corre DESPUÉS de dataroom.
--
-- Base compartida con producción: todo es ADITIVO (tablas y funciones nuevas).
--
-- Un solo modelo de relación perfil → organización (`portfolio`), que es la primera
-- arista del grafo del ecosistema: "invirtió en", "asesora a", "trabajó con". Si la
-- organización está en Pecera se enlaza a `empresas` (sin duplicar datos); si no,
-- se carga a mano. El tipo distingue inversión de asesoría, directorio, clientes y
-- alianzas: nunca se da a entender que hubo inversión donde no la hubo.
--
-- Montos, porcentajes, valuaciones y términos NO se guardan: no hace falta exponer
-- información confidencial para mostrar experiencia.
--
-- Visibilidad por entrada: público, solo cuentas de Pecera, o privado.
-- Confirmación: declarada por el perfil → pendiente (si se enlazó una empresa de
-- Pecera) → confirmada o rechazada por un miembro de esa empresa. Nada se muestra
-- como confirmado si la empresa no lo confirmó.

create table public.portfolio (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references public.perfiles (id) on delete cascade,
  tipo         text not null,
  empresa_id   uuid references public.empresas (id) on delete set null,
  nombre       text not null,
  web          text,
  industria    text,
  ubicacion    text,
  estado       text not null default 'actual',
  ronda        text,
  lider        boolean,
  anio         smallint,
  rol          text,
  descripcion  text,
  -- Caso de éxito (aliados): todo opcional.
  desafio      text,
  solucion     text,
  resultados   text[] not null default '{}',
  enlace       text,
  visibilidad  text not null default 'publico',
  confirmacion text not null default 'declarada',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint portfolio_tipo_valido check (tipo in (
    'inversion', 'asesoria', 'directorio', 'mentoria', 'aceleracion', 'fundacion',
    'cliente', 'alianza', 'otro'
  )),
  constraint portfolio_nombre_valido check (char_length(btrim(nombre)) between 1 and 80),
  constraint portfolio_web_valida check (
    web is null or (
      char_length(web) <= 200
      and regexp_replace(web, '^https?://', '', 'i') ~ '^[\w-]+(\.[\w-]+)+(/\S*)?$'
    )
  ),
  constraint portfolio_industria_valida check (industria is null or industria in (
    'fintech', 'agtech', 'healthtech', 'biotech', 'edtech', 'foodtech', 'climatech',
    'energia', 'govtech', 'legaltech', 'proptech', 'retail', 'logistica', 'industria',
    'saas', 'ia', 'ciberseguridad', 'gaming', 'blockchain', 'turismo', 'impacto', 'otra'
  )),
  constraint portfolio_ubicacion_valida check (ubicacion is null or char_length(btrim(ubicacion)) between 1 and 80),
  constraint portfolio_estado_valido check (estado in ('actual', 'pasado', 'exit', 'adquirida', 'cerrada')),
  constraint portfolio_ronda_valida check (ronda is null or ronda in ('pre_seed', 'seed', 'serie_a', 'serie_b', 'otra')),
  -- Ronda y líder solo tienen sentido en una inversión.
  constraint portfolio_inversion_coherente check (tipo = 'inversion' or (ronda is null and lider is null)),
  constraint portfolio_anio_valido check (anio is null or anio between 1980 and 2100),
  constraint portfolio_rol_valido check (rol is null or char_length(btrim(rol)) between 1 and 120),
  constraint portfolio_descripcion_valida check (descripcion is null or char_length(btrim(descripcion)) between 1 and 400),
  constraint portfolio_desafio_valido check (desafio is null or char_length(btrim(desafio)) between 1 and 600),
  constraint portfolio_solucion_valida check (solucion is null or char_length(btrim(solucion)) between 1 and 600),
  constraint portfolio_resultados_validos check (public.textos_cortos_validos(resultados, 5, 140)),
  constraint portfolio_enlace_valido check (enlace is null or (char_length(enlace) <= 300 and enlace ~* '^https://\S+$')),
  constraint portfolio_visibilidad_valida check (visibilidad in ('publico', 'miembros', 'privado')),
  constraint portfolio_confirmacion_valida check (confirmacion in ('declarada', 'pendiente', 'confirmada', 'rechazada'))
);

create index portfolio_perfil_idx on public.portfolio (perfil_id);
create index portfolio_empresa_idx on public.portfolio (empresa_id) where empresa_id is not null;
create index portfolio_industria_idx on public.portfolio (industria) where industria is not null;
-- La misma relación con la misma empresa de Pecera, una sola vez por perfil.
create unique index portfolio_sin_duplicados on public.portfolio (perfil_id, empresa_id, tipo)
  where empresa_id is not null;

-- Servicios (aliados).
create table public.perfil_servicios (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  nombre      text not null,
  categoria   text,
  descripcion text,
  modalidad   text,
  precio      text,
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint perfil_servicios_nombre_valido check (char_length(btrim(nombre)) between 1 and 80),
  constraint perfil_servicios_categoria_valida check (categoria is null or categoria in (
    'mentoria', 'coaching', 'legal', 'finanzas', 'marketing', 'ventas', 'producto',
    'tecnologia', 'diseno', 'fundraising', 'rrhh', 'internacionalizacion', 'impacto',
    'comunicacion'
  )),
  constraint perfil_servicios_descripcion_valida check (descripcion is null or char_length(btrim(descripcion)) between 1 and 400),
  constraint perfil_servicios_modalidad_valida check (modalidad is null or modalidad in ('remoto', 'presencial', 'ambos')),
  constraint perfil_servicios_precio_valido check (precio is null or char_length(btrim(precio)) between 1 and 60)
);

create index perfil_servicios_perfil_idx on public.perfil_servicios (perfil_id, orden);

-- Tesis de inversión (inversores). Industrias, rondas y ticket ya están en perfiles.
create table public.perfil_tesis (
  perfil_id  uuid primary key references public.perfiles (id) on delete cascade,
  texto      text,
  geografias text[] not null default '{}',
  modelos    text[] not null default '{}',
  busca      text,
  updated_at timestamptz not null default now(),

  constraint perfil_tesis_texto_valido check (texto is null or char_length(btrim(texto)) between 1 and 600),
  constraint perfil_tesis_geografias_validas check (
    cardinality(geografias) <= 6
    and geografias <@ array['argentina', 'latam', 'eeuu', 'europa', 'global']::text[]
  ),
  constraint perfil_tesis_modelos_validos check (
    modelos <@ array['b2b', 'b2c', 'b2b2c', 'b2g', 'marketplace']::text[]
  ),
  constraint perfil_tesis_busca_valido check (busca is null or char_length(btrim(busca)) between 1 and 280)
);

-- ---------------------------------------------------------------------------
-- Lectura (RLS). El público ve lo público de perfiles visibles; las cuentas de
-- Pecera, además, lo de "miembros"; el dueño, todo lo suyo; los miembros de una
-- empresa enlazada, las relaciones no privadas que la nombran (para confirmarlas).
-- ---------------------------------------------------------------------------
alter table public.portfolio        enable row level security;
alter table public.perfil_servicios enable row level security;
alter table public.perfil_tesis     enable row level security;
revoke all on public.portfolio        from anon, authenticated;
revoke all on public.perfil_servicios from anon, authenticated;
revoke all on public.perfil_tesis     from anon, authenticated;
grant select on public.portfolio        to anon, authenticated;
grant select on public.perfil_servicios to anon, authenticated;
grant select on public.perfil_tesis     to anon, authenticated;

create policy "todos leen el portfolio público de perfiles visibles"
  on public.portfolio for select
  to anon, authenticated
  using (visibilidad = 'publico' and public.perfil_visible(perfil_id));
create policy "las cuentas leen el portfolio para miembros"
  on public.portfolio for select
  to authenticated
  using (visibilidad = 'miembros' and public.perfil_visible(perfil_id));
create policy "el dueño lee todo su portfolio"
  on public.portfolio for select
  to authenticated
  using (public.es_mi_perfil(perfil_id));
create policy "la empresa ve las relaciones que la nombran"
  on public.portfolio for select
  to authenticated
  using (empresa_id is not null and visibilidad <> 'privado' and public.soy_de_empresa(empresa_id));

create policy "todos leen servicios de perfiles visibles"
  on public.perfil_servicios for select
  to anon, authenticated
  using (public.perfil_visible(perfil_id));
create policy "el dueño lee sus servicios"
  on public.perfil_servicios for select
  to authenticated
  using (public.es_mi_perfil(perfil_id));

create policy "todos leen la tesis de perfiles visibles"
  on public.perfil_tesis for select
  to anon, authenticated
  using (public.perfil_visible(perfil_id));
create policy "el dueño lee su tesis"
  on public.perfil_tesis for select
  to authenticated
  using (public.es_mi_perfil(perfil_id));

-- ---------------------------------------------------------------------------
-- Escritura: solo por funciones.
-- ---------------------------------------------------------------------------

-- Crea (p_id null) o edita una entrada del portfolio propio. Devuelve el id.
create function public.guardar_portfolio(
  p_id          uuid,
  p_tipo        text,
  p_empresa     uuid,
  p_nombre      text,
  p_web         text,
  p_industria   text,
  p_ubicacion   text,
  p_estado      text,
  p_ronda       text,
  p_lider       boolean,
  p_anio        integer,
  p_rol         text,
  p_descripcion text,
  p_desafio     text,
  p_solucion    text,
  p_resultados  text[],
  p_enlace      text,
  p_visibilidad text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil    public.perfiles := public.perfil_de_sesion();
  v_previo    public.portfolio;
  v_nombre    text := btrim(p_nombre);
  v_confirma  text;
  v_id        uuid;
begin
  if p_empresa is not null then
    -- El nombre de una empresa de Pecera sale de su ficha.
    select e.nombre into v_nombre from public.empresas e where e.id = p_empresa;
    if v_nombre is null then
      raise exception 'empresa inexistente' using errcode = '22023';
    end if;
  end if;

  if p_id is not null then
    select * into v_previo from public.portfolio where id = p_id and perfil_id = v_perfil.id;
    if not found then
      raise exception 'esa entrada no es tuya' using errcode = '42501';
    end if;
  elsif (select count(*) from public.portfolio where perfil_id = v_perfil.id) >= 60 then
    raise exception 'demasiadas entradas' using errcode = '22023';
  end if;

  -- Confirmación: sin empresa de Pecera, declarada. Con empresa: si la sesión es
  -- parte de esa empresa, confirmada; si no, pendiente (salvo que sea privada).
  -- Si la empresa no cambió, se conserva lo que respondió.
  if p_empresa is null then
    v_confirma := 'declarada';
  elsif v_previo.id is not null and v_previo.empresa_id is not distinct from p_empresa
        and v_previo.confirmacion in ('confirmada', 'rechazada') then
    v_confirma := v_previo.confirmacion;
  elsif public.soy_de_empresa(p_empresa) then
    v_confirma := 'confirmada';
  elsif p_visibilidad = 'privado' then
    v_confirma := 'declarada';
  else
    v_confirma := 'pendiente';
  end if;

  if p_id is null then
    insert into public.portfolio (
      perfil_id, tipo, empresa_id, nombre, web, industria, ubicacion, estado, ronda, lider,
      anio, rol, descripcion, desafio, solucion, resultados, enlace, visibilidad, confirmacion
    )
    values (
      v_perfil.id, p_tipo, p_empresa, v_nombre, nullif(btrim(p_web), ''), nullif(p_industria, ''),
      nullif(btrim(p_ubicacion), ''), coalesce(nullif(p_estado, ''), 'actual'), nullif(p_ronda, ''), p_lider,
      p_anio, nullif(btrim(p_rol), ''), nullif(btrim(p_descripcion), ''), nullif(btrim(p_desafio), ''),
      nullif(btrim(p_solucion), ''),
      coalesce(array(select btrim(r) from unnest(p_resultados) r where nullif(btrim(r), '') is not null), '{}'),
      nullif(btrim(p_enlace), ''), coalesce(nullif(p_visibilidad, ''), 'publico'), v_confirma
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.portfolio set
    tipo         = p_tipo,
    empresa_id   = p_empresa,
    nombre       = v_nombre,
    web          = nullif(btrim(p_web), ''),
    industria    = nullif(p_industria, ''),
    ubicacion    = nullif(btrim(p_ubicacion), ''),
    estado       = coalesce(nullif(p_estado, ''), 'actual'),
    ronda        = nullif(p_ronda, ''),
    lider        = p_lider,
    anio         = p_anio,
    rol          = nullif(btrim(p_rol), ''),
    descripcion  = nullif(btrim(p_descripcion), ''),
    desafio      = nullif(btrim(p_desafio), ''),
    solucion     = nullif(btrim(p_solucion), ''),
    resultados   = coalesce(array(select btrim(r) from unnest(p_resultados) r where nullif(btrim(r), '') is not null), '{}'),
    enlace       = nullif(btrim(p_enlace), ''),
    visibilidad  = coalesce(nullif(p_visibilidad, ''), 'publico'),
    confirmacion = v_confirma,
    updated_at   = now()
  where id = p_id
  returning id into v_id;
  return v_id;
end;
$$;

create function public.borrar_portfolio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  delete from public.portfolio where id = p_id and perfil_id = v_perfil.id;
end;
$$;

-- Relaciones que nombran a la empresa de la sesión y esperan respuesta.
create function public.relaciones_pendientes()
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

-- Un miembro de la empresa confirma (o no) una relación que la nombra.
create function public.responder_relacion(p_id uuid, p_confirmar boolean)
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

create function public.guardar_servicio(
  p_id          uuid,
  p_nombre      text,
  p_categoria   text,
  p_descripcion text,
  p_modalidad   text,
  p_precio      text
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
    if (select count(*) from public.perfil_servicios where perfil_id = v_perfil.id) >= 12 then
      raise exception 'demasiados servicios' using errcode = '22023';
    end if;
    insert into public.perfil_servicios (perfil_id, nombre, categoria, descripcion, modalidad, precio, orden)
    values (
      v_perfil.id, btrim(p_nombre), nullif(p_categoria, ''), nullif(btrim(p_descripcion), ''),
      nullif(p_modalidad, ''), nullif(btrim(p_precio), ''),
      (select coalesce(max(orden), 0) + 1 from public.perfil_servicios where perfil_id = v_perfil.id)
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.perfil_servicios set
    nombre = btrim(p_nombre), categoria = nullif(p_categoria, ''), descripcion = nullif(btrim(p_descripcion), ''),
    modalidad = nullif(p_modalidad, ''), precio = nullif(btrim(p_precio), ''), updated_at = now()
  where id = p_id and perfil_id = v_perfil.id
  returning id into v_id;
  if v_id is null then
    raise exception 'ese servicio no es tuyo' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create function public.borrar_servicio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  delete from public.perfil_servicios where id = p_id and perfil_id = v_perfil.id;
end;
$$;

create function public.guardar_tesis(p_texto text, p_geografias text[], p_modelos text[], p_busca text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles := public.perfil_de_sesion();
begin
  insert into public.perfil_tesis (perfil_id, texto, geografias, modelos, busca)
  values (
    v_perfil.id, nullif(btrim(p_texto), ''), coalesce(p_geografias, '{}'), coalesce(p_modelos, '{}'),
    nullif(btrim(p_busca), '')
  )
  on conflict (perfil_id) do update set
    texto = excluded.texto, geografias = excluded.geografias, modelos = excluded.modelos,
    busca = excluded.busca, updated_at = now();
end;
$$;

revoke execute on function public.guardar_portfolio(uuid, text, uuid, text, text, text, text, text, text, boolean, integer, text, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.borrar_portfolio(uuid) from public, anon;
revoke execute on function public.relaciones_pendientes() from public, anon;
revoke execute on function public.responder_relacion(uuid, boolean) from public, anon;
revoke execute on function public.guardar_servicio(uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.borrar_servicio(uuid) from public, anon;
revoke execute on function public.guardar_tesis(text, text[], text[], text) from public, anon;
grant execute on function public.guardar_portfolio(uuid, text, uuid, text, text, text, text, text, text, boolean, integer, text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.borrar_portfolio(uuid) to authenticated;
grant execute on function public.relaciones_pendientes() to authenticated;
grant execute on function public.responder_relacion(uuid, boolean) to authenticated;
grant execute on function public.guardar_servicio(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.borrar_servicio(uuid) to authenticated;
grant execute on function public.guardar_tesis(text, text[], text[], text) to authenticated;
