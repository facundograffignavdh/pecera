-- Pantalla del stand (/admin/vivo) con los totales de toda la plataforma. Va después de
-- feria21_sin_tope. Aditiva: UNA función nueva, nada se redefine. Sin ella, /admin/vivo
-- muestra "—" en estos números y el ranking sigue igual.
-- Vuelta atrás: drop function public.admin_vivo_stand();
--
-- Todo desde siempre (la plataforma solo funcionó en la Feria 21) y sin tráfico interno:
-- ni dispositivos ni cuentas del equipo, ni perfiles de prueba, del equipo o el oficial.
--   conexiones            CI (metrica_ci): toque en un canal sin otro del par en 24 h
--   proyectos_con_conexion perfiles visibles que recibieron al menos una CI
--   vistas                 vistas de pitches (3 s, metrica_vistas)
--   contactos              toques en canales de contacto, sin deduplicar
--   piques                 piques vigentes
--   personas / empresas    perfiles visibles y empresas visibles (con alguna integrante visible)

create function public.admin_vivo_stand()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := timestamptz '2026-01-01 00:00:00-03';
  v       jsonb;
begin
  perform public.exigir_admin();

  with disp_equipo as (select public.metrica_dispositivos_equipo() as dispositivo),
  perfiles_equipo as (select public.metrica_perfiles_equipo() as id),
  personas as (
    select p.id from public.perfiles p
    where p.publicado and not p.oculto and p.id not in (select id from perfiles_equipo)
  ),
  ci as (select c.destino from public.metrica_ci(v_desde, now()) c)
  select jsonb_build_object(
    'conexiones', (select count(*) from ci)::integer,
    'proyectos_con_conexion',
      (select count(distinct ci.destino) from ci where ci.destino in (select id from personas))::integer,
    'vistas', (select count(*) from public.metrica_vistas(v_desde, now()))::integer,
    'contactos', (
      select count(*) from public.contactos c
      where c.perfil_id not in (select id from perfiles_equipo)
        and c.dispositivo not in (select dispositivo from disp_equipo)
    )::integer,
    'piques', (
      select count(*) from public.piques q
      join public.pitches x on x.id = q.pitch_id
      where x.perfil_id not in (select id from perfiles_equipo)
        and q.dispositivo not in (select dispositivo from disp_equipo)
    )::integer,
    'personas', (select count(*) from personas)::integer,
    'empresas', (
      select count(*) from public.empresas e
      where not e.oculta
        and exists (
          select 1 from public.empresa_miembros m
          where m.empresa_id = e.id and m.perfil_id in (select id from personas)
        )
    )::integer,
    'actualizado', now()
  ) into v;
  return v;
end;
$$;

revoke execute on function public.admin_vivo_stand() from public, anon;
grant execute on function public.admin_vivo_stand() to authenticated;
