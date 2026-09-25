-- Pecera: el "Pique" ("me picó"), el like de Pecera.
-- Anónimo: el celular genera un uuid al azar y lo guarda en localStorage. Sin
-- login ni datos personales. anon nunca toca las tablas: da y quita piques con
-- funciones security definer y solo ve conteos agregados.

create table public.piques (
  pitch_id    uuid not null references public.pitches (id) on delete cascade,
  dispositivo uuid not null,
  created_at  timestamptz not null default now(),
  primary key (pitch_id, dispositivo)
);

-- Límite básico de frecuencia: acciones (dar + quitar) por dispositivo en una
-- ventana de un minuto.
create table public.piques_frecuencia (
  dispositivo uuid primary key,
  ventana     timestamptz not null,
  acciones    integer not null
);

-- RLS sin políticas: anon no lee ni escribe. Las funciones de abajo sí.
alter table public.piques            enable row level security;
alter table public.piques_frecuencia enable row level security;
revoke all on public.piques            from anon, authenticated;
revoke all on public.piques_frecuencia from anon, authenticated;

-- Validación y límite, compartidos por dar y quitar. No se expone a anon.
create function public.piques_validar(p_pitch uuid, p_dispositivo uuid)
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
    where pi.id = p_pitch and pi.publicado and pe.publicado
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

-- Da el pique (idempotente) y devuelve el total del pitch.
create function public.dar_pique(p_pitch uuid, p_dispositivo uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.piques_validar(p_pitch, p_dispositivo);
  insert into public.piques (pitch_id, dispositivo)
  values (p_pitch, p_dispositivo)
  on conflict do nothing;
  return (select count(*)::integer from public.piques where pitch_id = p_pitch);
end;
$$;

-- Quita el pique (si no estaba, no pasa nada) y devuelve el total del pitch.
create function public.quitar_pique(p_pitch uuid, p_dispositivo uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.piques_validar(p_pitch, p_dispositivo);
  delete from public.piques
  where pitch_id = p_pitch and dispositivo = p_dispositivo;
  return (select count(*)::integer from public.piques where pitch_id = p_pitch);
end;
$$;

-- Conteos de los pitches publicados con al menos un pique. Lo único que ve anon.
create function public.conteo_piques()
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
  where pi.publicado and pe.publicado
  group by pq.pitch_id;
$$;

-- Postgres da execute a public por defecto: se lo sacamos y abrimos solo lo justo.
revoke execute on function public.piques_validar(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.dar_pique(uuid, uuid)      from public;
revoke execute on function public.quitar_pique(uuid, uuid)   from public;
revoke execute on function public.conteo_piques()            from public;
grant  execute on function public.dar_pique(uuid, uuid)      to anon;
grant  execute on function public.quitar_pique(uuid, uuid)   to anon;
grant  execute on function public.conteo_piques()            to anon;
