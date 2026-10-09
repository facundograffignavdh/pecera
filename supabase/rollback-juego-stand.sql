-- Vuelta atrás de 20261021120000_juego_stand.sql. NO es migración: se corre a mano en el SQL
-- editor. CON PÉRDIDA: borra los jugadores, los ganadores y el número. Si solo hace falta frenar el
-- juego, cerrarlo desde /admin → Juego del stand.
-- Sin estas funciones, /tarjetas muestra "El juego arranca pronto".
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.

begin;

drop function if exists public.admin_stand_entregar(uuid, boolean);
drop function if exists public.admin_stand_config(boolean, integer, integer);
drop function if exists public.admin_stand();
drop function if exists public.stand_adivinar(uuid, uuid, integer);
drop function if exists public.stand_mi_juego(uuid, uuid);
drop function if exists public.stand_registrar(text, text, text, boolean, boolean, uuid);
drop function if exists public.stand_estado();
drop function if exists public.stand_resumen(public.stand_jugadores);
drop function if exists public.stand_quedan();
drop function if exists public.stand_telefono(text);
drop table if exists public.stand_jugadores;
drop table if exists public.stand_juego;
-- Los contadores de medicion_limitar con tipo 'stand' / 'stand_adivinar' se vencen solos (1 minuto).

commit;
