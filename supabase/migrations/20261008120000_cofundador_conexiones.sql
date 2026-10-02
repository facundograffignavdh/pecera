-- Cofounder match: del directorio al flujo. Alguien muestra interés (con un mensaje corto), la otra
-- persona acepta o pasa, y si se aceptan hay match: recién ahí el contacto queda destacado.
--
-- ADITIVA: una tabla nueva y funciones nuevas; no toca nada existente. Sin esta migración la página
-- /cofundadores sigue andando como directorio (la app hace caer a lo de siempre con faltaMigracion).
-- Todo por RPC `security definer`: la tabla no se lee ni se escribe directo.
--
-- Reglas (todas acá, no solo en la pantalla):
--  - Para mostrar interés hay que tener tu propio perfil publicado, visible y con «Busco cofundador/a».
--  - Solo a perfiles publicados, visibles y que buscan cofundador/a; nunca a uno mismo.
--  - Un interés por par (de → a). Si ya te dijeron que no, no se vuelve a pedir.
--  - Si la otra persona ya te había mostrado interés, el match es inmediato (los dos quisieron).
--  - Tope de 20 intereses nuevos por día por persona (contra el spam).

create table public.cofundador_intereses (
  de            uuid not null references public.perfiles (id) on delete cascade,
  a             uuid not null references public.perfiles (id) on delete cascade,
  mensaje       text not null default '',
  estado        text not null default 'pendiente',
  created_at    timestamptz not null default now(),
  respondido_at timestamptz,

  primary key (de, a),
  constraint cofundador_intereses_no_a_uno_mismo check (de <> a),
  constraint cofundador_intereses_estado_valido check (estado in ('pendiente', 'aceptado', 'rechazado')),
  constraint cofundador_intereses_mensaje_largo check (char_length(mensaje) <= 280)
);

create index cofundador_intereses_a_idx on public.cofundador_intereses (a, estado);
create index cofundador_intereses_dia_idx on public.cofundador_intereses (de, created_at);

alter table public.cofundador_intereses enable row level security;
revoke all on public.cofundador_intereses from anon, authenticated;
-- Sin políticas: nadie la lee ni la escribe directo; solo las funciones de abajo.

-- Mostrar interés. Devuelve 'pendiente' | 'match' | 'ya_enviado' | 'rechazado'.
create function public.cofundador_interesar(p_a uuid, p_mensaje text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo      public.perfiles;
  v_mensaje text := btrim(coalesce(p_mensaje, ''));
  v_previo  public.cofundador_intereses;
  v_inverso public.cofundador_intereses;
begin
  v_yo := public.perfil_de_sesion();

  if not (v_yo.publicado and not v_yo.oculto and v_yo.busca_cofundador) then
    raise exception 'primero activá «Busco cofundador/a» en tu perfil' using errcode = '22023';
  end if;
  if p_a is null or p_a = v_yo.id then
    raise exception 'cofundador inválido' using errcode = '22023';
  end if;
  if char_length(v_mensaje) > 280 then
    raise exception 'el mensaje es muy largo (máximo 280 caracteres)' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.perfiles p
    where p.id = p_a and p.publicado and not p.oculto and p.busca_cofundador and p.usuario_id is not null
  ) then
    raise exception 'esa persona no está buscando cofundador/a' using errcode = '22023';
  end if;

  select * into v_previo from public.cofundador_intereses where de = v_yo.id and a = p_a;
  if found then
    return case v_previo.estado when 'pendiente' then 'ya_enviado' when 'aceptado' then 'match' else 'rechazado' end;
  end if;

  if (select count(*) from public.cofundador_intereses where de = v_yo.id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'ya mostraste mucho interés hoy: probá mañana' using errcode = '22023';
  end if;

  -- Si la otra persona ya te había elegido, es match de los dos lados.
  select * into v_inverso from public.cofundador_intereses where de = p_a and a = v_yo.id and estado = 'pendiente';
  if found then
    update public.cofundador_intereses set estado = 'aceptado', respondido_at = now() where de = p_a and a = v_yo.id;
    insert into public.cofundador_intereses (de, a, mensaje, estado, respondido_at)
    values (v_yo.id, p_a, v_mensaje, 'aceptado', now());
    return 'match';
  end if;

  insert into public.cofundador_intereses (de, a, mensaje) values (v_yo.id, p_a, v_mensaje);
  return 'pendiente';
end;
$$;

-- Responder a un interés recibido: aceptar (hay match) o pasar. Devuelve el estado final.
create function public.cofundador_responder(p_de uuid, p_aceptar boolean)
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
  update public.cofundador_intereses
    set estado = v_estado, respondido_at = now()
    where de = p_de and a = v_yo.id and estado = 'pendiente';
  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    raise exception 'no hay un interés pendiente de esa persona' using errcode = '22023';
  end if;
  return v_estado;
end;
$$;

-- Retirar un interés propio que todavía no tuvo respuesta.
create function public.cofundador_retirar(p_a uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
begin
  v_yo := public.perfil_de_sesion();
  delete from public.cofundador_intereses where de = v_yo.id and a = p_a and estado = 'pendiente';
end;
$$;

-- Mis conexiones: lo que recibí, lo que envié y los matches. WhatsApp y email solo vienen
-- cuando hay match. (Lo que la otra persona rechazó no se muestra: "pasó" no se notifica.)
create function public.mis_cofundador_conexiones()
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
  from public.cofundador_intereses i
  join public.perfiles p on p.id = case when i.a = v_yo.id then i.de else i.a end
  where (i.de = v_yo.id or i.a = v_yo.id)
    and i.estado in ('pendiente', 'aceptado')
    and p.publicado and not p.oculto
    -- Un match aparece una sola vez: normalmente es una fila (la aceptó quien recibió); si
    -- los dos se eligieron hay dos filas y se muestra la de menor id de origen.
    and (
      i.estado = 'pendiente'
      or not exists (
        select 1 from public.cofundador_intereses r where r.de = i.a and r.a = i.de and r.estado = 'aceptado'
      )
      or i.de < i.a
    )
  order by i.created_at desc;
end;
$$;

revoke execute on function public.cofundador_interesar(uuid, text) from public, anon;
revoke execute on function public.cofundador_responder(uuid, boolean) from public, anon;
revoke execute on function public.cofundador_retirar(uuid) from public, anon;
revoke execute on function public.mis_cofundador_conexiones() from public, anon;
grant execute on function public.cofundador_interesar(uuid, text) to authenticated;
grant execute on function public.cofundador_responder(uuid, boolean) to authenticated;
grant execute on function public.cofundador_retirar(uuid) to authenticated;
grant execute on function public.mis_cofundador_conexiones() to authenticated;
