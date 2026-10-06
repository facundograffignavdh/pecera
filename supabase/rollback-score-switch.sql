-- Vuelta atrás de 20261018120000_score_switch.sql. NO es migración: se corre a mano en el SQL
-- editor. Antes de esto, lo más rápido es apagar el score desde /admin (Funciones).
-- Sin pérdida de datos: solo se va el interruptor. Sin config_score la app cae a APAGADO
-- (scoreActivo en lib/datos.ts): no se muestra nada del score.
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.

begin;

drop function if exists public.admin_score(boolean);
drop function if exists public.config_score();
alter table public.funciones_config drop column if exists score_activo;

commit;
