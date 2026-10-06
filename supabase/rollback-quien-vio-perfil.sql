-- Vuelta atrás de 20261017120000_quien_vio.sql. NO es migración: se corre a mano en el SQL
-- editor, solo si "Quién vio tu perfil" / la pared / el traspaso rompieron algo en producción.
-- Antes de esto, lo más rápido es apagar todo desde /admin (Funciones): no hace falta deploy.
--
-- OJO, con pérdida: se borran todas las visitas registradas (con nombre y contadores), los avisos
-- vistos y el modo privado de cada cuenta, y los interruptores. Exportarlas antes si hace falta.
-- La migración no redefinió ninguna función existente: no hay nada que restaurar.
-- Después, sacar el paso "Podar visitas" de .github/workflows/metricas.yml (si no, falla con 404).
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.

begin;

drop function if exists public.admin_funciones(boolean, boolean, integer, boolean);
drop function if exists public.podar_visitas();
drop function if exists public.acreditar_traspaso(text, boolean, uuid[], uuid[], uuid[]);
drop function if exists public.borrar_mis_visitas_hechas();
drop function if exists public.mis_visitas_hechas();
drop function if exists public.mis_visitas(text, date, integer);
drop function if exists public.mis_visitas_resumen();
drop function if exists public.guardar_aviso_visitas(text, boolean);
drop function if exists public.mi_estado_visitas();
drop function if exists public.quitar_visita_pique(uuid);
drop function if exists public.registrar_visita(text, uuid, uuid);
drop function if exists public.config_funciones();
drop function if exists public.visitas_perfil_visible(uuid);
drop function if exists public.visitas_guardar(uuid, boolean, uuid, text, text);
drop function if exists public.visitas_ajuste_visitante(uuid);
drop function if exists public.visitas_anonimizar(uuid);
drop function if exists public.visitas_limitar(uuid, integer);
drop function if exists public.visitas_hoy();

drop table if exists public.visitas_frecuencia;
drop table if exists public.visitas_anonimas;
drop table if exists public.visitas;
drop table if exists public.visitas_ajustes;
drop table if exists public.funciones_config;

commit;
