-- Vuelta atrás de 20261011120000_super_dataroom.sql. NO es migración: se corre a mano
-- en el SQL editor, en una transacción. La migración no redefine ninguna función
-- existente, así que alcanza con borrar lo nuevo. Se pierden la actividad, los
-- vínculos, las marcas de equipo, los snapshots por hora y los del Demo Day
-- (exportá el CSV antes si hace falta). vistas, contactos y piques no se tocan.
begin;

drop function if exists public.admin_demo_day_snapshots();
drop function if exists public.admin_congelar_demo_day();
drop function if exists public.admin_dataroom(timestamptz, timestamptz, text);
drop function if exists public.admin_vivo();
drop function if exists public.snapshot_metricas_hora();
drop function if exists public.podar_actividad();
drop function if exists public.marcar_equipo(uuid);
drop function if exists public.vincular_dispositivo(uuid);
drop function if exists public.registrar_actividad(text, uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb);
drop function if exists public.metrica_resumen(timestamptz, timestamptz);
drop function if exists public.metrica_actividad(timestamptz, timestamptz);
drop function if exists public.metrica_vistas(timestamptz, timestamptz);
drop function if exists public.metrica_ci(timestamptz, timestamptz);
drop function if exists public.metrica_proyectos();
drop function if exists public.metrica_perfiles_equipo();
drop function if exists public.metrica_dispositivos_equipo();
drop function if exists public.metrica_cuentas_equipo();
drop function if exists public.metrica_inicio();
drop function if exists public.metrica_dia(timestamptz);
drop function if exists public.en_horario_feria(timestamptz);

-- Los triggers caen con sus tablas; las funciones de trigger, después.
drop table if exists public.demo_day_snapshots;
drop table if exists public.metricas_hora;
drop table if exists public.actividad_descartes;
drop table if exists public.actividad;
drop table if exists public.dispositivos_equipo;
drop table if exists public.dispositivo_cuentas;
drop table if exists public.feria_franjas;

drop function if exists public.dispositivo_cuentas_al_borrar();
drop function if exists public.demo_day_inmutable();
drop function if exists public.actividad_inmutable();

-- Lo que usó el limitador compartido con estos tipos.
delete from public.medicion_frecuencia where tipo in ('actividad', 'vincular', 'equipo');

commit;
