-- Pecera: postulación desde /sumate. El formulario propio ya no pasa por el
-- Google Form: guarda todo menos el video (que todavía no se puede subir
-- desde la app — ver AGENTS/CLAUDE.md, "fuera de alcance"). El equipo la
-- revisa a mano, coordina el video por WhatsApp o email, y recién ahí arma
-- el perfil + pitch de verdad en `perfiles`/`pitches`.
--
-- Mismo patrón que piques: anon nunca toca la tabla directo, solo puede
-- llamar la función security definer de abajo, que valida y limita la
-- frecuencia por dispositivo (uuid al azar en localStorage, sin login).

create table public.postulaciones (
  id          uuid primary key default gen_random_uuid(),
  rol         text not null check (rol in ('emprendedor', 'inversor', 'aliado')),
  tipo        text not null check (tipo in (
                'startup', 'emprendimiento', 'aceleradora', 'incubadora',
                'angel', 'fondo', 'coach'
              )),
  nombre      text not null,
  descripcion text not null,
  whatsapp    text,
  email       text,
  linkedin    text,
  instagram   text,
  web         text,
  estado      text not null default 'pendiente' check (
                estado in ('pendiente', 'contactado', 'publicado', 'descartado')
              ),
  created_at  timestamptz not null default now()
);

create table public.postulaciones_frecuencia (
  dispositivo uuid primary key,
  ventana     timestamptz not null,
  acciones    integer not null
);

alter table public.postulaciones            enable row level security;
alter table public.postulaciones_frecuencia enable row level security;
revoke all on public.postulaciones            from anon, authenticated;
revoke all on public.postulaciones_frecuencia from anon, authenticated;

-- Hasta 5 postulaciones por dispositivo por hora: alcanza para un error de
-- tipeo y un reintento, no para spamear la tabla.
create function public.crear_postulacion(
  p_dispositivo uuid,
  p_rol text,
  p_tipo text,
  p_nombre text,
  p_descripcion text,
  p_whatsapp text default null,
  p_email text default null,
  p_linkedin text default null,
  p_instagram text default null,
  p_web text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acciones integer;
  v_id uuid;
begin
  if p_dispositivo is null then
    raise exception 'postulación inválida' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nombre, ''))) < 2 or length(trim(coalesce(p_descripcion, ''))) < 8 then
    raise exception 'faltan datos' using errcode = '22023';
  end if;

  insert into public.postulaciones_frecuencia as f (dispositivo, ventana, acciones)
  values (p_dispositivo, now(), 1)
  on conflict (dispositivo) do update set
    ventana  = case when f.ventana < now() - interval '1 hour' then now() else f.ventana end,
    acciones = case when f.ventana < now() - interval '1 hour' then 1 else f.acciones + 1 end
  returning acciones into v_acciones;

  if v_acciones > 5 then
    raise exception 'demasiadas postulaciones' using errcode = 'P0001';
  end if;

  insert into public.postulaciones (
    rol, tipo, nombre, descripcion, whatsapp, email, linkedin, instagram, web
  )
  values (
    p_rol, p_tipo, trim(p_nombre), trim(p_descripcion),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_linkedin, '')), ''),
    nullif(trim(coalesce(p_instagram, '')), ''),
    nullif(trim(coalesce(p_web, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.crear_postulacion(
  uuid, text, text, text, text, text, text, text, text, text
) from public;
grant  execute on function public.crear_postulacion(
  uuid, text, text, text, text, text, text, text, text, text
) to anon;
