-- Vuelta atrás de 20261020120000_feria21_sin_tope.sql. NO es migración: se corre a mano en el
-- SQL editor. Sin pérdida: las descripciones que hoy pasan de 150 por el tag quedan como están
-- (el CHECK de antes vuelve como NOT VALID: no revisa lo existente, sí lo nuevo). Sin la función,
-- la app cae a admin_pitch_feria (con el tope).
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.

begin;

drop function if exists public.admin_pitch_feria_libre(uuid, boolean);
alter table public.pitches drop constraint if exists pitches_descripcion_valida;
alter table public.pitches
  add constraint pitches_descripcion_check check (descripcion is null or char_length(descripcion) <= 150) not valid;

commit;
