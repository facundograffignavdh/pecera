-- Vuelta atrás de 20261019120000_alta_rapida.sql. NO es migración: se corre a mano en el SQL
-- editor.
--
-- CON PÉRDIDA: se van el registro de quién creó cada perfil (perfiles_alta_equipo), los emails
-- de reclamo (perfiles_reclamo) y el registro de acciones del equipo (equipo_acciones). Los
-- perfiles y empresas creados desde el alta QUEDAN: son perfiles comunes sin dueña (se vinculan
-- a mano como antes, ver el final de 20260928120000_cuentas.sql). Lo ya reclamado queda reclamado.
-- Sin estas funciones, /admin/alta y el editor muestran "falta la migración" y /cuenta sigue con
-- el alta de siempre.
--
-- Prueba en seco: cambiar el `commit` del final por `rollback`.

begin;

drop function if exists public.rechazar_reclamo(uuid);
drop function if exists public.reclamar_perfil(uuid, boolean);
drop function if exists public.mi_reclamo_pendiente();
drop function if exists public.email_verificado_sesion();
drop function if exists public.admin_reclamos_revisar();
drop function if exists public.admin_perfiles_v2();
drop function if exists public.admin_vincular_cuenta(uuid, text);
drop function if exists public.admin_email_reclamo(uuid, text);
drop function if exists public.admin_sumar_a_empresa(uuid, uuid, text, text);
drop function if exists public.admin_agregar_empresa(uuid, text, text, text, text);
drop function if exists public.admin_editar_empresa_equipo(uuid, text, text);
drop function if exists public.admin_editar_perfil_cuenta(uuid, text, text);
drop function if exists public.admin_editar_perfil_equipo(uuid, text, text, text, text, boolean, boolean);
drop function if exists public.admin_perfil_detalle(uuid, text);
drop function if exists public.admin_borrar_perfil_equipo(uuid);
drop function if exists public.admin_deshacer_alta(uuid);
drop function if exists public.admin_altas_recientes();
drop function if exists public.admin_empresas_parecidas(text, text);
drop function if exists public.admin_parecidos(text, text);
drop function if exists public.admin_alta_rapida(text, text, text, text, text, uuid, text, text, text, boolean, boolean, text);

drop function if exists public.perfil_equipo_borrar(uuid);
drop function if exists public.vincular_interno(uuid, uuid, boolean);
drop function if exists public.equipo_evento(text);
drop function if exists public.equipo_anotar_feria(uuid, uuid, uuid);
drop function if exists public.equipo_validar_empresa(text, text, text);
drop function if exists public.equipo_crear_empresa(uuid, text, text, text, uuid);
drop function if exists public.equipo_registrar(uuid, text, uuid, uuid, text[]);
drop function if exists public.equipo_validar_email(text);
drop function if exists public.equipo_validar_texto(text, text, integer, integer);
drop function if exists public.slug_libre(text, text);
drop function if exists public.texto_comparable(text);
drop function if exists public.email_canonico(text);

drop table if exists public.equipo_acciones;
drop table if exists public.perfiles_reclamo;
drop table if exists public.perfiles_alta_equipo;

-- Los contadores de frecuencia de estas funciones (por cuenta del equipo o de la persona).
delete from public.medicion_frecuencia
where tipo in ('alta_equipo', 'vincular', 'reclamo', 'reclamo_ver');

commit;
