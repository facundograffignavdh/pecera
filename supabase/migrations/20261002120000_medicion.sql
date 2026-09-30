-- Pecera: medición de vistas y contactos. ADITIVA: solo tablas y funciones nuevas.
-- Mismo patrón que los piques: el celular se identifica con el uuid anónimo de
-- localStorage, anon nunca toca las tablas (solo funciones security definer) y lo
-- único público son conteos agregados. Los contactos solo los ve el equipo.

-- Una vista = el video se reprodujo al menos 3 segundos. Una por dispositivo y
-- pitch cada 12 horas (lo decide registrar_vista).
create table public.vistas (
  id          bigint generated always as identity primary key,
  pitch_id    uuid not null references public.pitches (id) on delete cascade,
  dispositivo uuid not null,
  created_at  timestamptz not null default now()
);
create index vistas_pitch_dispositivo on public.vistas (pitch_id, dispositivo, created_at desc);

-- Cada toque en un canal de contacto. pitch_id null = desde el perfil; con pitch =
-- desde el pop-up del pique de ese reel.
create table public.contactos (
  id          bigint generated always as identity primary key,
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  pitch_id    uuid references public.pitches (id) on delete set null,
  canal       text not null
    constraint contactos_canal_valido
    check (canal in ('whatsapp', 'email', 'linkedin', 'instagram', 'web')),
  dispositivo uuid not null,
  created_at  timestamptz not null default now()
);
create index contactos_perfil on public.contactos (perfil_id);

-- Límite de frecuencia por dispositivo y tipo, en ventanas de un minuto. Aparte de
-- piques_frecuencia: mirar videos no gasta el cupo de los piques.
create table public.medicion_frecuencia (
  dispositivo uuid not null,
  tipo        text not null,
  ventana     timestamptz not null,
  acciones    integer not null,
  primary key (dispositivo, tipo)
);

-- RLS sin políticas: anon y authenticated no leen ni escriben. Las funciones sí.
alter table public.vistas              enable row level security;
alter table public.contactos           enable row level security;
alter table public.medicion_frecuencia enable row level security;
revoke all on public.vistas              from anon, authenticated;
revoke all on public.contactos           from anon, authenticated;
revoke all on public.medicion_frecuencia from anon, authenticated;

-- Cuenta una acción y corta si el dispositivo pasó el tope del minuto. Uso interno.
create function public.medicion_limitar(p_dispositivo uuid, p_tipo text, p_max integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acciones integer;
begin
  insert into public.medicion_frecuencia as f (dispositivo, tipo, ventana, acciones)
  values (p_dispositivo, p_tipo, now(), 1)
  on conflict (dispositivo, tipo) do update set
    ventana  = case when f.ventana < now() - interval '1 minute' then now() else f.ventana end,
    acciones = case when f.ventana < now() - interval '1 minute' then 1 else f.acciones + 1 end
  returning acciones into v_acciones;

  if v_acciones > p_max then
    raise exception 'demasiadas acciones' using errcode = 'P0001';
  end if;
end;
$$;

-- Registra una vista si el pitch es visible y no hubo otra del mismo dispositivo
-- en las últimas 12 horas. Devuelve true si la contó.
create function public.registrar_vista(p_pitch uuid, p_dispositivo uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pitch is null or p_dispositivo is null then
    raise exception 'vista inválida' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.pitches pi
    join public.perfiles pe on pe.id = pi.perfil_id
    where pi.id = p_pitch and pi.publicado and pe.publicado and not pe.oculto
  ) then
    raise exception 'pitch inexistente' using errcode = '22023';
  end if;

  perform public.medicion_limitar(p_dispositivo, 'vista', 30);

  -- Dos pedidos simultáneos del mismo par no cuentan dos vistas.
  perform pg_advisory_xact_lock(hashtextextended(p_pitch::text || p_dispositivo::text, 0));

  if exists (
    select 1 from public.vistas
    where pitch_id = p_pitch
      and dispositivo = p_dispositivo
      and created_at > now() - interval '12 hours'
  ) then
    return false;
  end if;

  insert into public.vistas (pitch_id, dispositivo) values (p_pitch, p_dispositivo);
  return true;
end;
$$;

-- Registra un toque en un canal de contacto de un perfil visible. Si viene el
-- pitch (pop-up del pique), tiene que ser de ese perfil y estar publicado.
create function public.registrar_contacto(
  p_perfil uuid,
  p_pitch uuid,
  p_canal text,
  p_dispositivo uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_perfil is null or p_dispositivo is null
     or p_canal is null or p_canal not in ('whatsapp', 'email', 'linkedin', 'instagram', 'web') then
    raise exception 'contacto inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.perfiles
    where id = p_perfil and publicado and not oculto
  ) then
    raise exception 'perfil inexistente' using errcode = '22023';
  end if;

  if p_pitch is not null and not exists (
    select 1 from public.pitches
    where id = p_pitch and perfil_id = p_perfil and publicado
  ) then
    raise exception 'pitch inexistente' using errcode = '22023';
  end if;

  perform public.medicion_limitar(p_dispositivo, 'contacto', 20);

  insert into public.contactos (perfil_id, pitch_id, canal, dispositivo)
  values (p_perfil, p_pitch, p_canal, p_dispositivo);
end;
$$;

-- Vistas y piques de los pitches publicados de un perfil visible. Solo agregados.
create function public.metricas_perfil(p_slug text)
returns table (pitch_id uuid, vistas integer, piques integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pi.id,
    (select count(*)::integer from public.vistas v where v.pitch_id = pi.id),
    (select count(*)::integer from public.piques q where q.pitch_id = pi.id)
  from public.pitches pi
  join public.perfiles pe on pe.id = pi.perfil_id
  where pe.slug = p_slug and pe.publicado and not pe.oculto and pi.publicado;
$$;

-- Para el Resumen de /admin: vistas y contactos por perfil (con el detalle por
-- canal). Solo perfiles con alguna vista o algún contacto; sin los test-*.
create function public.admin_metricas()
returns table (
  perfil_id uuid,
  slug      text,
  nombre    text,
  vistas    integer,
  contactos integer,
  por_canal jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return query
  select m.id, m.slug, m.nombre, m.vistas, m.contactos, m.por_canal
  from (
    select
      p.id, p.slug, p.nombre,
      (select count(*)::integer
         from public.vistas v join public.pitches x on x.id = v.pitch_id
        where x.perfil_id = p.id) as vistas,
      (select count(*)::integer from public.contactos c where c.perfil_id = p.id) as contactos,
      (select coalesce(jsonb_object_agg(canal, n), '{}'::jsonb)
         from (select c.canal, count(*) n from public.contactos c
                where c.perfil_id = p.id group by c.canal) k) as por_canal
    from public.perfiles p
    where p.slug not like 'test-%'
  ) m
  where m.vistas > 0 or m.contactos > 0
  order by m.vistas desc, m.contactos desc, m.nombre;
end;
$$;

-- Postgres da execute a public por defecto: se lo sacamos y abrimos solo lo justo.
revoke execute on function public.medicion_limitar(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.registrar_vista(uuid, uuid)                from public;
revoke execute on function public.registrar_contacto(uuid, uuid, text, uuid) from public;
revoke execute on function public.metricas_perfil(text)                     from public;
revoke execute on function public.admin_metricas()                          from public, anon;
grant  execute on function public.registrar_vista(uuid, uuid)                to anon, authenticated;
grant  execute on function public.registrar_contacto(uuid, uuid, text, uuid) to anon, authenticated;
grant  execute on function public.metricas_perfil(text)                     to anon, authenticated;
grant  execute on function public.admin_metricas()                          to authenticated;
