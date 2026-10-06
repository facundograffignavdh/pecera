-- Interruptor de emergencia del score crediticio (rama score-crediticio). Solo aditiva: una
-- columna en funciones_config (quien_vio) y dos funciones nuevas. APAGADO por defecto: toda empresa
-- arranca en D "Riesgo alto" y el nombre y los rótulos esperan la revisión legal.
-- No redefine config_funciones ni admin_funciones (arman su JSON con columnas explícitas).
-- Después de 20261017120000_quien_vio.sql. Vuelta atrás: supabase/rollback-score-switch.sql.
-- Pruebas sin tocar ninguna base: supabase/pruebas/score_switch.mjs.

alter table public.funciones_config add column score_activo boolean not null default false;

-- La única lectura (lib/datos.ts scoreActivo). Sin fila, apagado.
create function public.config_score()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.score_activo from public.funciones_config c where c.id), false)
$$;

-- Prender o apagar desde /admin → Funciones.
create function public.admin_score(p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_admin();
  if p_activo is null then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  update public.funciones_config set score_activo = p_activo where id;
end;
$$;

revoke execute on function public.config_score() from public;
grant execute on function public.config_score() to anon, authenticated;
revoke execute on function public.admin_score(boolean) from public, anon;
grant execute on function public.admin_score(boolean) to authenticated;
