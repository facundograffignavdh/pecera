-- Pecera: cuentas con Google y "Mi perfil" (/cuenta).
-- Base compartida con producción: todo es aditivo. Lo único que se modifica (sin
-- borrar ni renombrar) son las dos políticas públicas y las dos funciones de piques
-- que filtran por perfil visible, para que también respeten `oculto`.
--
-- Visible al público = publicado (lo controla el equipo) y no oculto (lo controla
-- la persona). El email de la cuenta nunca se copia a perfiles: queda en auth.users.

alter table public.perfiles
  add column usuario_id        uuid references auth.users (id) on delete set null,
  add column oculto            boolean not null default false,
  add column consentimiento_at timestamptz;

-- Un perfil por cuenta. Los perfiles existentes no tienen dueño (null).
create unique index perfiles_usuario_id_key
  on public.perfiles (usuario_id)
  where usuario_id is not null;

-- Ajustes del equipo: una sola fila. Nadie más que el trigger la lee.
create table public.ajustes (
  id           boolean primary key default true check (id),
  -- Si está en true, los perfiles creados desde /cuenta nacen publicados.
  autopublicar boolean not null default false
);
insert into public.ajustes default values;

alter table public.ajustes enable row level security;
revoke all on public.ajustes from anon, authenticated;

-- Lo público también respeta `oculto`.
alter policy "anon lee perfiles publicados"
  on public.perfiles
  using (publicado = true and oculto = false);

alter policy "anon lee pitches publicados de perfiles publicados"
  on public.pitches
  using (
    publicado = true
    and exists (
      select 1 from public.perfiles p
      where p.id = pitches.perfil_id
        and p.publicado = true
        and p.oculto = false
    )
  );

-- Cada usuario ve, crea y edita solo su perfil. Sin borrar.
grant select, insert, update on public.perfiles to authenticated;
revoke delete, truncate on public.perfiles from authenticated;

create policy "usuario lee su perfil"
  on public.perfiles for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "usuario crea su perfil"
  on public.perfiles for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "usuario edita su perfil"
  on public.perfiles for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- Guardián de lo que escribe un usuario. Solo actúa con sesión de usuario: la
-- ingesta (service key) y el SQL editor no tienen auth.uid() y pasan derecho.
-- Repite las validaciones del formulario para que pegarle directo a la API con el
-- JWT no las saltee. No son `check` de la tabla para no trabar a la ingesta.
create function public.perfiles_guardian()
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

  -- Validaciones del formulario.
  if char_length(btrim(new.nombre)) not between 1 and 80
     or char_length(btrim(new.descripcion)) not between 1 and 150
     or (new.whatsapp is not null and new.whatsapp !~ '^[1-9][0-9]{9}$')
     or (new.email is not null and (char_length(new.email) > 200
         or new.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'))
     or (new.linkedin is not null and (char_length(new.linkedin) > 200
         or new.linkedin !~* 'linkedin\.com'))
     or (new.instagram is not null and char_length(new.instagram) > 100)
     or (new.web is not null and (char_length(new.web) > 200
         or regexp_replace(new.web, '^https?://', '', 'i') !~ '^[\w-]+(\.[\w-]+)+(/\S*)?$')) then
    raise exception 'datos inválidos' using errcode = '22023';
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

revoke execute on function public.perfiles_guardian() from public, anon, authenticated;

create trigger perfiles_guardian
  before insert or update on public.perfiles
  for each row execute function public.perfiles_guardian();

-- Piques: mismas funciones, ahora también con `not pe.oculto`.
create or replace function public.piques_validar(p_pitch uuid, p_dispositivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acciones integer;
begin
  if p_pitch is null or p_dispositivo is null then
    raise exception 'pique inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.pitches pi
    join public.perfiles pe on pe.id = pi.perfil_id
    where pi.id = p_pitch and pi.publicado and pe.publicado and not pe.oculto
  ) then
    raise exception 'pitch inexistente' using errcode = '22023';
  end if;

  insert into public.piques_frecuencia as f (dispositivo, ventana, acciones)
  values (p_dispositivo, now(), 1)
  on conflict (dispositivo) do update set
    ventana  = case when f.ventana < now() - interval '1 minute' then now() else f.ventana end,
    acciones = case when f.ventana < now() - interval '1 minute' then 1 else f.acciones + 1 end
  returning acciones into v_acciones;

  if v_acciones > 30 then
    raise exception 'demasiados piques' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.conteo_piques()
returns table (pitch_id uuid, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pq.pitch_id, count(*)::integer
  from public.piques pq
  join public.pitches pi on pi.id = pq.pitch_id
  join public.perfiles pe on pe.id = pi.perfil_id
  where pi.publicado and pe.publicado and not pe.oculto
  group by pq.pitch_id;
$$;

-- Vincular a mano un perfil existente con su cuenta (correr en el SQL editor
-- después de que la persona haya entrado una vez con Google):
--
-- update public.perfiles p
-- set usuario_id = u.id
-- from auth.users u
-- where lower(u.email) = lower('persona@mail.com')
--   and p.slug = 'su-slug'
--   and p.usuario_id is null;
