-- Pecera: el guardián de perfiles trata "" como null y dice qué campo falló.
-- Aditiva: solo reemplaza la función (mismo nombre y firma; el trigger no cambia).
--
-- - Los opcionales vacíos o con solo espacios se guardan como null, aunque la app
--   ya los manda así: defensa por si alguien le pega directo a la API.
-- - Cada validación levanta su propio mensaje ("dato inválido: <campo>") para que
--   /cuenta muestre el error en el campo. Mismo errcode 22023 que antes.

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
  if new.whatsapp is not null and new.whatsapp !~ '^[1-9][0-9]{9}$' then
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

revoke execute on function public.perfiles_guardian() from public, anon, authenticated;
