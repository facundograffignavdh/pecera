-- Pecera: #feria21 no cuenta para el tope de 150 caracteres de la descripción de un pitch.
-- Va después de 20261019120000_alta_rapida.sql.
--
-- Base compartida con producción: un CHECK se AFLOJA (todo lo que valía sigue valiendo) y una
-- función NUEVA; ninguna se redefine. Así el equipo suma el tag aunque la descripción ya tenga
-- 150, y la dueña puede editarla con el tag puesto. Vuelta atrás:
-- supabase/rollback-feria21-sin-tope.sql (no es migración).
--
-- La regla (espejo en lib/pitch.ts, `largoDescripcionPitch`): se cuenta el texto sin los
-- "#feria21" (ni el espacio de antes). Así nadie usa el tag para escribir más de 150.

do $$
declare
  v_nombre text;
begin
  for v_nombre in
    select conname from pg_constraint
    where conrelid = 'public.pitches'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%descripcion%'
      and pg_get_constraintdef(oid) ilike '%150%'
  loop
    execute format('alter table public.pitches drop constraint %I', v_nombre);
  end loop;
end;
$$;

alter table public.pitches
  add constraint pitches_descripcion_valida check (
    descripcion is null
    or char_length(btrim(regexp_replace(descripcion, '\s*#feria21', '', 'gi'))) <= 150
  );

-- Como admin_pitch_feria, sin el tope: agrega o saca #feria21 de la descripción del pitch (si no
-- tiene propia, parte de la del perfil).
create function public.admin_pitch_feria_libre(p_pitch uuid, p_con boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag   constant text := '(^|[^[:alnum:]_])#feria21($|[^[:alnum:]_])';
  v_texto text;
  v_nuevo text;
begin
  perform public.admin_como_sistema();
  select coalesce(x.descripcion, p.descripcion) into v_texto
  from public.pitches x join public.perfiles p on p.id = x.perfil_id
  where x.id = p_pitch;
  if not found then
    raise exception 'pitch inexistente' using errcode = '22023';
  end if;

  if p_con then
    v_nuevo := case
      when coalesce(v_texto, '') ~* v_tag then v_texto
      else btrim(coalesce(v_texto, '') || ' #feria21')
    end;
    update public.pitches set descripcion = v_nuevo where id = p_pitch;
  else
    -- Dos pasadas: "#feria21 #feria21" comparte el separador.
    v_nuevo := regexp_replace(coalesce(v_texto, ''), v_tag, '\1\2', 'gi');
    v_nuevo := regexp_replace(v_nuevo, v_tag, '\1\2', 'gi');
    v_nuevo := btrim(regexp_replace(v_nuevo, '\s{2,}', ' ', 'g'));
    update public.pitches set descripcion = nullif(v_nuevo, '') where id = p_pitch;
  end if;
end;
$$;

revoke execute on function public.admin_pitch_feria_libre(uuid, boolean) from public, anon;
grant execute on function public.admin_pitch_feria_libre(uuid, boolean) to authenticated;
