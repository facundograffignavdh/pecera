-- Vuelta atrás de 20261014120000_persona_empresa.sql (NO es migración: se corre a mano en
-- el SQL editor). Saca las tres funciones nuevas y el tipo de empresa. No inventa datos:
-- si ya hay perfiles con tipo 'persona' o empresas sin descripción, esos CHECK quedan
-- ampliados (con un aviso) hasta que se corrijan esas filas a mano.

drop function if exists public.crear_empresa_basica(text, text, text, text);
drop function if exists public.editar_empresa_v3_en(uuid, text, text, text, text, text, text, text[], text, text, text);
drop function if exists public.mis_empresas_v2();

alter table public.empresas drop constraint if exists empresas_tipo_valido;
alter table public.empresas drop column if exists tipo;

do $$
begin
  if exists (select 1 from public.empresas where descripcion is null) then
    raise notice 'Hay empresas sin descripción: empresas.descripcion queda opcional.';
  else
    alter table public.empresas drop constraint empresas_descripcion_valida;
    alter table public.empresas
      add constraint empresas_descripcion_valida check (char_length(btrim(descripcion)) between 1 and 280);
    alter table public.empresas alter column descripcion set not null;
  end if;

  if exists (select 1 from public.perfiles where tipo = 'persona') then
    raise notice 'Hay perfiles con tipo persona: perfiles_tipo_check queda ampliado.';
  else
    alter table public.perfiles drop constraint perfiles_tipo_check;
    alter table public.perfiles
      add constraint perfiles_tipo_check check (tipo in (
        'startup', 'emprendimiento', 'aceleradora', 'incubadora', 'angel', 'fondo', 'coach',
        'profesional', 'empresa', 'institucion'
      ));
  end if;
end;
$$;
