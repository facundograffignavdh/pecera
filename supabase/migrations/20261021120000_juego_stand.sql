-- Juego del stand de Pecera en la Feria 21 (rama juego-stand). Solo aditiva: dos tablas nuevas y
-- funciones nuevas; no toca nada existente. Después de 20261020120000_feria21_sin_tope.sql.
-- Vuelta atrás: supabase/rollback-juego-stand.sql (NO es migración; con pérdida de los datos del juego).
-- Pruebas sin tocar ninguna base: supabase/pruebas/juego_stand.mjs.
--
-- Cómo se juega (/tarjetas, solo por link o QR; la app no lo enlaza): la persona deja nombre, apellido, teléfono y si quiere una tarjeta NFC
-- personalizada; después tiene 3 intentos para adivinar un número de 3 cifras. Hay N tarjetas en
-- juego (5 por defecto): las primeras N personas que aciertan ganan un código para retirarla.
--
-- El número NUNCA está en el repo (es público) ni llega al navegador: se carga desde /admin → Juego
-- del stand (admin_stand_config) o en el SQL editor. Sin número cargado el juego dice "arranca pronto".
-- Todo pasa por funciones `security definer`: las tablas no se leen ni se escriben directo.

create table public.stand_juego (
  id         boolean primary key default true,
  secreto    smallint,
  premios    smallint not null default 5,
  activo     boolean not null default true,
  updated_at timestamptz not null default now(),

  constraint stand_juego_una_fila check (id),
  constraint stand_juego_secreto_valido check (secreto is null or secreto between 0 and 999),
  constraint stand_juego_premios_validos check (premios between 0 and 100)
);
insert into public.stand_juego (id) values (true);

create table public.stand_jugadores (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  apellido          text not null,
  telefono          text not null,
  quiere_nfc        boolean not null,
  intentos          smallint not null default 0,
  acerto            boolean not null default false,
  gano              boolean not null default false,
  codigo            text,
  entregado_at      timestamptz,
  dispositivo       uuid not null,
  consentimiento_at timestamptz not null,
  created_at        timestamptz not null default now(),

  constraint stand_jugadores_telefono_unico unique (telefono),
  constraint stand_jugadores_codigo_unico unique (codigo),
  constraint stand_jugadores_nombre_valido check (char_length(nombre) between 1 and 60),
  constraint stand_jugadores_apellido_valido check (char_length(apellido) between 1 and 60),
  -- Igual que el WhatsApp del perfil (lib/cuenta.ts WHATSAPP): 10 dígitos argentinos o +E.164.
  constraint stand_jugadores_telefono_valido check (telefono ~ '^([1-9][0-9]{9}|\+[1-9][0-9]{7,14})$'),
  constraint stand_jugadores_intentos_validos check (intentos between 0 and 3),
  constraint stand_jugadores_gano_con_codigo check (gano = (codigo is not null)),
  constraint stand_jugadores_gano_acerto check (not gano or acerto)
);
create index stand_jugadores_created_idx on public.stand_jugadores (created_at desc);

alter table public.stand_juego enable row level security;
alter table public.stand_jugadores enable row level security;
revoke all on public.stand_juego from anon, authenticated;
revoke all on public.stand_jugadores from anon, authenticated;
-- Sin políticas: nadie las lee ni escribe directo; solo las funciones de abajo.

-- "351 123-4567" → "3511234567"; "+54 9 351…" → "+549351…". Lo mismo hace el navegador.
create function public.stand_telefono(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(p, '')) like '+%' then '+' || regexp_replace(p, '[^0-9]', '', 'g')
    else regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g')
  end
$$;

-- Cuántas tarjetas quedan (las ganadas no se devuelven).
create function public.stand_quedan()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, (select j.premios from public.stand_juego j where j.id) - (select count(*)::int from public.stand_jugadores g where g.gano))
$$;

-- Lo que el juego muestra a cualquiera: si está abierto, si ya hay número cargado y cuántas quedan.
-- Nunca el número.
create function public.stand_estado()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'activo', j.activo,
    'listo', j.secreto is not null,
    'premios', j.premios,
    'quedan', public.stand_quedan()
  )
  from public.stand_juego j
  where j.id
$$;

-- Lo que ve la persona de su propio juego (sin el número, claro).
create function public.stand_resumen(p_j public.stand_jugadores)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jugador', p_j.id,
    'nombre', p_j.nombre,
    'intentos_restantes', 3 - p_j.intentos,
    'acerto', p_j.acerto,
    'gano', p_j.gano,
    'codigo', p_j.codigo,
    'quedan', public.stand_quedan()
  )
$$;

-- Anotarse. Un juego por teléfono: si el mismo teléfono vuelve desde el mismo celular, se retoma
-- (los intentos no se reinician); desde otro celular, no (así nadie usa los intentos o el código de otro).
create function public.stand_registrar(
  p_nombre      text,
  p_apellido    text,
  p_telefono    text,
  p_quiere_nfc  boolean,
  p_consiento   boolean,
  p_dispositivo uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_juego    public.stand_juego;
  v_tel      text := public.stand_telefono(p_telefono);
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_apellido text := btrim(coalesce(p_apellido, ''));
  v_j        public.stand_jugadores;
begin
  if p_dispositivo is null then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'stand', 12);

  select * into v_juego from public.stand_juego where id;
  if not v_juego.activo then
    raise exception 'el juego está cerrado' using errcode = '22023';
  end if;
  if v_juego.secreto is null then
    raise exception 'el juego todavía no arrancó' using errcode = '22023';
  end if;

  if char_length(v_nombre) not between 1 and 60 or char_length(v_apellido) not between 1 and 60 then
    raise exception 'nombre o apellido inválido' using errcode = '22023';
  end if;
  if v_tel !~ '^([1-9][0-9]{9}|\+[1-9][0-9]{7,14})$' then
    raise exception 'teléfono inválido' using errcode = '22023';
  end if;
  if p_quiere_nfc is null then
    raise exception 'falta la respuesta de la tarjeta NFC' using errcode = '22023';
  end if;
  if not coalesce(p_consiento, false) then
    raise exception 'falta el consentimiento' using errcode = '22023';
  end if;

  select * into v_j from public.stand_jugadores where telefono = v_tel;
  if found then
    if v_j.dispositivo <> p_dispositivo then
      raise exception 'ese teléfono ya está jugando desde otro celular' using errcode = '22023';
    end if;
    return public.stand_resumen(v_j);
  end if;

  insert into public.stand_jugadores (nombre, apellido, telefono, quiere_nfc, dispositivo, consentimiento_at)
  values (v_nombre, v_apellido, v_tel, p_quiere_nfc, p_dispositivo, now())
  returning * into v_j;
  return public.stand_resumen(v_j);
end;
$$;

-- Retomar el juego al volver a la página (el navegador guarda el id del jugador).
create function public.stand_mi_juego(p_jugador uuid, p_dispositivo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.stand_resumen(j) from public.stand_jugadores j where j.id = p_jugador and j.dispositivo = p_dispositivo
$$;

-- Un intento. Devuelve resultado: 'gano' | 'agotado' (acertó pero ya no quedan tarjetas) | 'fallo' |
-- 'sin_intentos' | 'ya_gano'. La fila del juego se bloquea mientras tanto: nunca hay más ganadores que
-- tarjetas aunque dos personas acierten a la vez.
create function public.stand_adivinar(p_jugador uuid, p_dispositivo uuid, p_numero integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_juego  public.stand_juego;
  v_j      public.stand_jugadores;
  v_codigo text;
  v_res    text;
begin
  if p_dispositivo is null or p_jugador is null then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  perform public.medicion_limitar(p_dispositivo, 'stand_adivinar', 20);
  if p_numero is null or p_numero not between 0 and 999 then
    raise exception 'tiene que ser un número de 3 cifras' using errcode = '22023';
  end if;

  select * into v_juego from public.stand_juego where id for update;
  if not v_juego.activo then
    raise exception 'el juego está cerrado' using errcode = '22023';
  end if;
  if v_juego.secreto is null then
    raise exception 'el juego todavía no arrancó' using errcode = '22023';
  end if;

  select * into v_j from public.stand_jugadores where id = p_jugador and dispositivo = p_dispositivo for update;
  if not found then
    raise exception 'no encontramos tu juego' using errcode = '22023';
  end if;
  if v_j.gano then
    return public.stand_resumen(v_j) || jsonb_build_object('resultado', 'ya_gano');
  end if;
  if v_j.intentos >= 3 or v_j.acerto then
    return public.stand_resumen(v_j) || jsonb_build_object('resultado', 'sin_intentos');
  end if;

  if p_numero = v_juego.secreto then
    if public.stand_quedan() > 0 then
      loop
        v_codigo := upper(substr(md5(gen_random_uuid()::text), 1, 6));
        exit when not exists (select 1 from public.stand_jugadores where codigo = v_codigo);
      end loop;
      update public.stand_jugadores set intentos = intentos + 1, acerto = true, gano = true, codigo = v_codigo
      where id = v_j.id returning * into v_j;
      v_res := 'gano';
    else
      update public.stand_jugadores set intentos = intentos + 1, acerto = true where id = v_j.id returning * into v_j;
      v_res := 'agotado';
    end if;
  else
    update public.stand_jugadores set intentos = intentos + 1 where id = v_j.id returning * into v_j;
    v_res := 'fallo';
  end if;
  return public.stand_resumen(v_j) || jsonb_build_object('resultado', v_res);
end;
$$;

-- /admin → Juego del stand: estado y lista (lo más nuevo primero). El número no se devuelve: solo si
-- está cargado.
create function public.admin_stand()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  return jsonb_build_object(
    'activo', (select j.activo from public.stand_juego j where j.id),
    'listo', (select j.secreto is not null from public.stand_juego j where j.id),
    'premios', (select j.premios from public.stand_juego j where j.id),
    'quedan', public.stand_quedan(),
    'jugadores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'nombre', g.nombre, 'apellido', g.apellido, 'telefono', g.telefono,
        'quiere_nfc', g.quiere_nfc, 'intentos', g.intentos, 'acerto', g.acerto, 'gano', g.gano,
        'codigo', g.codigo, 'entregado_at', g.entregado_at, 'created_at', g.created_at
      ) order by g.created_at desc)
      from public.stand_jugadores g
    ), '[]'::jsonb)
  );
end;
$$;

-- Abrir/cerrar, cuántas tarjetas y el número (null = no tocarlo).
create function public.admin_stand_config(p_activo boolean, p_premios integer, p_secreto integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  if p_activo is null or p_premios is null or p_premios not between 0 and 100
     or (p_secreto is not null and p_secreto not between 0 and 999) then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  update public.stand_juego
  set activo = p_activo, premios = p_premios, secreto = coalesce(p_secreto, secreto), updated_at = now()
  where id;
end;
$$;

-- Marcar (o desmarcar) que la tarjeta ya se entregó en el stand.
create function public.admin_stand_entregar(p_jugador uuid, p_entregado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  update public.stand_jugadores
  set entregado_at = case when coalesce(p_entregado, false) then now() else null end
  where id = p_jugador and gano;
  if not found then
    raise exception 'ese jugador no ganó una tarjeta' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.stand_telefono(text) from public;
revoke execute on function public.stand_quedan() from public, anon, authenticated;
revoke execute on function public.stand_resumen(public.stand_jugadores) from public, anon, authenticated;
revoke execute on function public.stand_estado() from public;
revoke execute on function public.stand_registrar(text, text, text, boolean, boolean, uuid) from public;
revoke execute on function public.stand_mi_juego(uuid, uuid) from public;
revoke execute on function public.stand_adivinar(uuid, uuid, integer) from public;
revoke execute on function public.admin_stand() from public, anon;
revoke execute on function public.admin_stand_config(boolean, integer, integer) from public, anon;
revoke execute on function public.admin_stand_entregar(uuid, boolean) from public, anon;

grant execute on function public.stand_estado() to anon, authenticated;
grant execute on function public.stand_registrar(text, text, text, boolean, boolean, uuid) to anon, authenticated;
grant execute on function public.stand_mi_juego(uuid, uuid) to anon, authenticated;
grant execute on function public.stand_adivinar(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.admin_stand() to authenticated;
grant execute on function public.admin_stand_config(boolean, integer, integer) to authenticated;
grant execute on function public.admin_stand_entregar(uuid, boolean) to authenticated;
