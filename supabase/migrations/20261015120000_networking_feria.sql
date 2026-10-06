-- Networking de la Feria 21: "Qué buscás y qué ofrecés" con una taxonomía de dos niveles
-- (categoría y opción), detalle libre y "cómo" por lado; un flujo de interés → match para
-- todos los roles (aparte del de cofundador/a) y el consentimiento OPCIONAL para compartir el
-- perfil con la organización del evento (Universidad Siglo 21).
--
-- Va después de 20261014120000_persona_empresa.sql. Aditiva en datos: no se borra ni se
-- renombra nada, no se toca ninguna fila. Dos CHECK se AMPLÍAN (perfiles_busca_valido y
-- perfiles_ofrece_valido: lista nueva + los 10 valores de siempre, tope 6 → 10): todo lo que
-- valía sigue valiendo, así que main sigue andando con esta base. Tablas y funciones nuevas;
-- ninguna existente se redefine (cofundador_intereses y sus funciones quedan igual).
-- Vuelta atrás: supabase/rollback-networking-feria.sql (NO es migración).
--
-- Espejo en la app: NECESIDADES / COMOS en lib/etiquetas.ts. Cambiar uno = migración nueva.

-- ---------------------------------------------------------------------------
-- 1) Busca / ofrece: lista nueva (los 10 valores viejos siguen valiendo) y tope 10
-- ---------------------------------------------------------------------------
-- Valores viejos: inversion y talento quedan como "toda la categoría (en general)"; cofundador,
-- mentoria, clientes, empleo, alianzas, proveedores, networking y prensa son opciones de la
-- taxonomía nueva con el mismo id.
create function public.necesidades_validas()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    -- de siempre (generales)
    'inversion', 'talento',
    -- Capital y financiamiento
    'inversion_angel', 'capital_riesgo', 'fondos_publicos', 'premios', 'credito', 'aceleracion_inversion',
    -- Equipo y talento
    'cofundador', 'desarrollo', 'diseno', 'ventas', 'pasantias', 'freelancers', 'asesores',
    -- Conocimiento y acompañamiento
    'mentoria', 'aceleracion', 'capacitacion', 'legal', 'contable', 'propiedad_intelectual',
    -- Mercado y ventas
    'clientes', 'pilotos', 'distribucion', 'exportacion', 'compras_publicas',
    -- Producto y tecnología
    'mvp', 'prototipado', 'ia', 'hardware_iot', 'datos', 'pruebas_usuarios',
    -- Herramientas y plataformas
    'software', 'creditos_nube', 'no_code', 'ecommerce', 'apis',
    -- Infraestructura y recursos
    'espacio', 'laboratorio', 'equipamiento', 'fabricacion', 'logistica', 'proveedores',
    -- Investigación y alianzas
    'alianzas', 'universidad_empresa', 'investigacion', 'innovacion_abierta',
    -- Difusión y comunidad
    'prensa', 'marketing', 'exponer', 'networking',
    -- Trabajo y oportunidades
    'empleo', 'proyectos_freelance', 'colaboracion'
  ]::text[]
$$;

alter table public.perfiles drop constraint perfiles_busca_valido;
alter table public.perfiles drop constraint perfiles_ofrece_valido;
alter table public.perfiles
  add constraint perfiles_busca_valido check (
    cardinality(busca) <= 10 and busca <@ public.necesidades_validas()
  ),
  add constraint perfiles_ofrece_valido check (
    cardinality(ofrece) <= 10 and ofrece <@ public.necesidades_validas()
  );

-- ---------------------------------------------------------------------------
-- 2) Detalle libre y "cómo", por lado (públicos, como el resto del perfil)
-- ---------------------------------------------------------------------------
alter table public.perfiles
  add column busca_detalle  text[] not null default '{}',
  add column ofrece_detalle text[] not null default '{}',
  add column busca_como     text[] not null default '{}',
  add column ofrece_como    text[] not null default '{}';

-- Cada etiqueta entre 1 y 30 caracteres (sin contar espacios de los bordes).
create function public.etiquetas_cortas_validas(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p) <= 8
    and not exists (select 1 from unnest(p) t where char_length(btrim(t)) not between 1 and 30)
$$;

alter table public.perfiles
  add constraint perfiles_busca_detalle_valido  check (public.etiquetas_cortas_validas(busca_detalle)),
  add constraint perfiles_ofrece_detalle_valido check (public.etiquetas_cortas_validas(ofrece_detalle)),
  add constraint perfiles_busca_como_valido check (
    busca_como <@ array['pago', 'canje', 'sin_costo', 'a_conversar']::text[]
  ),
  add constraint perfiles_ofrece_como_valido check (
    ofrece_como <@ array['pago', 'canje', 'sin_costo', 'a_conversar']::text[]
  );

-- ---------------------------------------------------------------------------
-- 3) Intereses de networking (aparte de cofundador_intereses, mismo flujo)
-- ---------------------------------------------------------------------------
-- Reglas (todas acá, no solo en la pantalla):
--  - Para mostrar interés hay que tener tu perfil publicado, visible y con algo en busca u ofrece.
--  - Solo a perfiles publicados, visibles, con dueño y con algo en busca u ofrece; nunca a uno mismo.
--  - Un interés por par (de → a). Si ya te dijeron que no, o lo retiraste, no se vuelve a pedir.
--  - Si la otra persona ya te había mostrado interés, el match es inmediato.
--  - Tope PROPIO de 20 intereses nuevos por día (aparte de los 20 de cofundador/a). Retirar no
--    devuelve el cupo.
--  - Al pasar o retirar se vacía el mensaje.
--  - evento_id: en qué evento se hizo (la Feria 21) o null (toda la plataforma). Para medir.
--  - Al borrar la cuenta (borrar_mi_cuenta borra el perfil) se van en cascada, enviados y recibidos.
create table public.networking_intereses (
  de            uuid not null references public.perfiles (id) on delete cascade,
  a             uuid not null references public.perfiles (id) on delete cascade,
  mensaje       text not null default '',
  estado        text not null default 'pendiente',
  evento_id     uuid references public.eventos (id) on delete set null,
  created_at    timestamptz not null default now(),
  respondido_at timestamptz,

  primary key (de, a),
  constraint networking_intereses_no_a_uno_mismo check (de <> a),
  constraint networking_intereses_estado_valido check (estado in ('pendiente', 'aceptado', 'rechazado', 'retirado')),
  constraint networking_intereses_mensaje_largo check (char_length(mensaje) <= 280)
);

create index networking_intereses_a_idx on public.networking_intereses (a, estado);
create index networking_intereses_dia_idx on public.networking_intereses (de, created_at);
create index networking_intereses_evento_idx on public.networking_intereses (evento_id) where evento_id is not null;

alter table public.networking_intereses enable row level security;
revoke all on public.networking_intereses from anon, authenticated;
-- Sin políticas: nadie la lee ni la escribe directo; solo las funciones de abajo.

-- Mostrar interés. Devuelve 'pendiente' | 'match' | 'ya_enviado' | 'rechazado' | 'retirado'.
create function public.networking_interesar(p_a uuid, p_mensaje text default '', p_evento text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo      public.perfiles;
  v_mensaje text := btrim(coalesce(p_mensaje, ''));
  v_evento  uuid;
  v_previo  public.networking_intereses;
  v_inverso public.networking_intereses;
begin
  v_yo := public.perfil_de_sesion();

  if not (v_yo.publicado and not v_yo.oculto and (cardinality(v_yo.busca) > 0 or cardinality(v_yo.ofrece) > 0)) then
    raise exception 'primero contá qué buscás y qué ofrecés en tu perfil' using errcode = '22023';
  end if;
  if p_a is null or p_a = v_yo.id then
    raise exception 'perfil inválido' using errcode = '22023';
  end if;
  if char_length(v_mensaje) > 280 then
    raise exception 'el mensaje es muy largo (máximo 280 caracteres)' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.perfiles p
    where p.id = p_a and p.publicado and not p.oculto and p.usuario_id is not null
      and (cardinality(p.busca) > 0 or cardinality(p.ofrece) > 0)
  ) then
    raise exception 'esa persona no está haciendo networking' using errcode = '22023';
  end if;
  if p_evento is not null then
    select id into v_evento from public.eventos where slug = p_evento and activo;
  end if;

  select * into v_previo from public.networking_intereses where de = v_yo.id and a = p_a;
  if found then
    return case v_previo.estado
      when 'pendiente' then 'ya_enviado'
      when 'aceptado' then 'match'
      when 'retirado' then 'retirado'
      else 'rechazado'
    end;
  end if;

  if (select count(*) from public.networking_intereses where de = v_yo.id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'ya mostraste mucho interés hoy: probá mañana' using errcode = '22023';
  end if;

  -- Si la otra persona ya te había elegido, es match de los dos lados.
  select * into v_inverso from public.networking_intereses where de = p_a and a = v_yo.id and estado = 'pendiente';
  if found then
    update public.networking_intereses set estado = 'aceptado', respondido_at = now() where de = p_a and a = v_yo.id;
    insert into public.networking_intereses (de, a, mensaje, estado, evento_id, respondido_at)
    values (v_yo.id, p_a, v_mensaje, 'aceptado', v_evento, now());
    return 'match';
  end if;

  insert into public.networking_intereses (de, a, mensaje, evento_id) values (v_yo.id, p_a, v_mensaje, v_evento);
  return 'pendiente';
end;
$$;

-- Responder a un interés recibido: aceptar (hay match) o pasar. Devuelve el estado final.
create function public.networking_responder(p_de uuid, p_aceptar boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
  v_estado text := case when p_aceptar then 'aceptado' else 'rechazado' end;
  v_filas integer;
begin
  v_yo := public.perfil_de_sesion();
  update public.networking_intereses
    set estado = v_estado,
        respondido_at = now(),
        mensaje = case when p_aceptar then mensaje else '' end
    where de = p_de and a = v_yo.id and estado = 'pendiente';
  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    raise exception 'no hay un interés pendiente de esa persona' using errcode = '22023';
  end if;
  return v_estado;
end;
$$;

-- Retirar un interés propio sin respuesta: queda 'retirado' (sin mensaje) y sigue contando.
create function public.networking_retirar(p_a uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
begin
  v_yo := public.perfil_de_sesion();
  update public.networking_intereses
    set estado = 'retirado', mensaje = '', respondido_at = now()
    where de = v_yo.id and a = p_a and estado = 'pendiente';
end;
$$;

-- Mis conexiones de networking: misma forma que mis_cofundador_conexiones. WhatsApp y email
-- solo con match; lo rechazado y lo retirado no se muestran.
create function public.mis_networking_conexiones()
returns table (
  tipo        text,
  perfil_id   uuid,
  slug        text,
  nombre      text,
  rol         text,
  avatar_url  text,
  descripcion text,
  mensaje     text,
  creado      timestamptz,
  whatsapp    text,
  email       text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
begin
  v_yo := public.perfil_de_sesion();
  return query
  select
    case
      when i.estado = 'aceptado' then 'match'
      when i.a = v_yo.id then 'recibido'
      else 'enviado'
    end,
    p.id, p.slug, p.nombre, p.rol, p.avatar_url, p.descripcion, i.mensaje, i.created_at,
    case when i.estado = 'aceptado' then p.whatsapp end,
    case when i.estado = 'aceptado' then p.email end
  from public.networking_intereses i
  join public.perfiles p on p.id = case when i.a = v_yo.id then i.de else i.a end
  where (i.de = v_yo.id or i.a = v_yo.id)
    and i.estado in ('pendiente', 'aceptado')
    and p.publicado and not p.oculto
    and (
      i.estado = 'pendiente'
      or not exists (
        select 1 from public.networking_intereses r where r.de = i.a and r.a = i.de and r.estado = 'aceptado'
      )
      or i.de < i.a
    )
  order by i.created_at desc;
end;
$$;

revoke execute on function public.networking_interesar(uuid, text, text) from public, anon;
revoke execute on function public.networking_responder(uuid, boolean) from public, anon;
revoke execute on function public.networking_retirar(uuid) from public, anon;
revoke execute on function public.mis_networking_conexiones() from public, anon;
grant execute on function public.networking_interesar(uuid, text, text) to authenticated;
grant execute on function public.networking_responder(uuid, boolean) to authenticated;
grant execute on function public.networking_retirar(uuid) to authenticated;
grant execute on function public.mis_networking_conexiones() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Consentimiento OPCIONAL para la organización del evento (Ley 25.326)
-- ---------------------------------------------------------------------------
-- Nunca es condición para usar Pecera ni el networking. Se guarda la última elección, su fecha y
-- la versión del texto aceptado; retirarlo deja acepta = false con la fecha nueva. Por ahora
-- nadie más lo lee (el panel de la organización va en otra fase, con el convenio firmado). Va en
-- una tabla aparte porque anon lee perfiles entera.
create table public.evento_consentimientos (
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  acepta      boolean not null,
  version     text not null,
  decidido_at timestamptz not null default now(),

  primary key (evento_id, perfil_id),
  constraint evento_consentimientos_version_valida check (version ~ '^[a-z0-9-]{1,20}$')
);

create index evento_consentimientos_perfil_idx on public.evento_consentimientos (perfil_id);

alter table public.evento_consentimientos enable row level security;
revoke all on public.evento_consentimientos from anon, authenticated;
-- Sin políticas: solo por las funciones de abajo.

create function public.mi_consentimiento_evento(p_evento text)
returns table (acepta boolean, version text, decidido_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
begin
  v_yo := public.perfil_de_sesion();
  return query
  select c.acepta, c.version, c.decidido_at
  from public.evento_consentimientos c
  join public.eventos ev on ev.id = c.evento_id
  where ev.slug = p_evento and c.perfil_id = v_yo.id;
end;
$$;

create function public.guardar_consentimiento_evento(p_evento text, p_acepta boolean, p_version text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo     public.perfiles;
  v_evento uuid;
  v_fecha  timestamptz := now();
begin
  v_yo := public.perfil_de_sesion();
  if p_acepta is null then
    raise exception 'elección inválida' using errcode = '22023';
  end if;
  select id into v_evento from public.eventos where slug = p_evento and activo;
  if v_evento is null then
    raise exception 'evento inválido' using errcode = '22023';
  end if;
  insert into public.evento_consentimientos (evento_id, perfil_id, acepta, version, decidido_at)
  values (v_evento, v_yo.id, p_acepta, p_version, v_fecha)
  on conflict (evento_id, perfil_id) do update
    set acepta = excluded.acepta, version = excluded.version, decidido_at = excluded.decidido_at;
  return v_fecha;
end;
$$;

revoke execute on function public.mi_consentimiento_evento(text) from public, anon;
revoke execute on function public.guardar_consentimiento_evento(text, boolean, text) from public, anon;
grant execute on function public.mi_consentimiento_evento(text) to authenticated;
grant execute on function public.guardar_consentimiento_evento(text, boolean, text) to authenticated;
