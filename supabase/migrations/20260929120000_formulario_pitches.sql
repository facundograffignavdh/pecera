-- Pecera: formulario nuevo de pitches (rama v2-cuentas).
-- Base compartida con producción: todo es aditivo (tablas, una columna y funciones
-- nuevas). La ingesta de main no usa nada de esto y sigue andando igual.
--
-- Una respuesta del Form = un pitch, asignado al perfil de una cuenta existente
-- según el email. Los emails quedan solo en tablas privadas: nunca en perfiles ni
-- pitches.

-- 1) Descripción por pitch. El feed la muestra; si falta, usa la del perfil.
alter table public.pitches
  add column descripcion text
  check (descripcion is null or char_length(descripcion) <= 150);

update public.pitches pi
set descripcion = left(pe.descripcion, 150)
from public.perfiles pe
where pe.id = pi.perfil_id
  and pi.descripcion is null;

-- 2) Registro de cada envío del Form. Solo la toca la ingesta (service key).
--    `regla` dice cómo se resolvió la asignación (ver scripts/ingesta/formulario.ts).
create table public.envios (
  origen_id        text primary key,
  email_verificado text not null,
  email_escrito    text not null,
  fecha            timestamptz not null,
  estado           text not null check (estado in ('recibido', 'en_espera', 'ok', 'error', 'rechazado')),
  regla            text,
  perfil_id        uuid references public.perfiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index envios_email_escrito_idx on public.envios (email_escrito);
create index envios_perfil_id_idx on public.envios (perfil_id);

-- 3) Emails verificados bloqueados: sus envíos se rechazan (y se registran).
create table public.emails_bloqueados (
  email      text primary key check (email = lower(btrim(email))),
  motivo     text,
  created_at timestamptz not null default now()
);

-- 4) Equipo que carga pitches a otros: su envío va a la cuenta del email escrito.
create table public.equipo_ingesta (
  email      text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

-- RLS sin políticas: anon y authenticated no leen ni escriben. La service key sí.
alter table public.envios            enable row level security;
alter table public.emails_bloqueados enable row level security;
alter table public.equipo_ingesta    enable row level security;
revoke all on public.envios            from anon, authenticated;
revoke all on public.emails_bloqueados from anon, authenticated;
revoke all on public.equipo_ingesta    from anon, authenticated;

-- 5) Para la ingesta: qué emails son cuentas y cuál es su perfil (si tienen).
--    Solo service_role: expone la relación email ↔ perfil.
create function public.ingesta_cuentas(p_emails text[])
returns table (email text, es_cuenta boolean, perfil_id uuid, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)::text, true, pe.id, pe.slug
  from auth.users u
  left join public.perfiles pe on pe.usuario_id = u.id
  where lower(u.email) = any (select lower(e) from unnest(p_emails) e);
$$;

revoke execute on function public.ingesta_cuentas(text[]) from public, anon, authenticated;
grant execute on function public.ingesta_cuentas(text[]) to service_role;

-- 6) "Mis pitches" en /cuenta: los pitches publicados del perfil propio y los
--    envíos que todavía no se publicaron (por el email escrito o ya asignados a
--    su perfil). Nunca devuelve emails, origen_id ni la regla. Sin rechazados.
create function public.mis_pitches()
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
  select pi.id::text, pi.created_at, 'publicado', pi.poster_url, pi.descripcion
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

revoke execute on function public.mis_pitches() from public, anon;
grant execute on function public.mis_pitches() to authenticated;

-- Bloquear un email (verificado por Google, en minúsculas):
--   insert into public.emails_bloqueados (email, motivo) values ('x@mail.com', '...');
-- Sumar a alguien del equipo:
--   insert into public.equipo_ingesta (email) values ('x@mail.com');
