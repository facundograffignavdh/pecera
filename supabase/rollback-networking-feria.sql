-- Vuelta atrás de 20261015120000_networking_feria.sql (NO es migración: se corre a mano en el
-- SQL editor, en una transacción).
--
-- OJO, con pérdida:
--  - Las opciones nuevas de busca/ofrece pasan a la opción vieja de su categoría (tabla de
--    abajo), sin repetidos y recortadas a 6, para que vuelvan a entrar en la regla de siempre.
--  - Se borran el detalle libre y el "cómo" (busca_detalle, ofrece_detalle, busca_como,
--    ofrece_como).
--  - Se borran los intereses de networking y las constancias de consentimiento para la
--    organización del evento (evento_consentimientos). Si hace falta conservarlas, exportarlas
--    antes.

begin;

-- 1) Opciones nuevas → la vieja de su categoría.
create temporary table necesidad_vieja (nueva text primary key, vieja text not null) on commit drop;
insert into necesidad_vieja (nueva, vieja) values
  -- Capital y financiamiento → inversion
  ('inversion_angel', 'inversion'), ('capital_riesgo', 'inversion'), ('fondos_publicos', 'inversion'),
  ('premios', 'inversion'), ('credito', 'inversion'), ('aceleracion_inversion', 'inversion'),
  -- Equipo y talento → talento
  ('desarrollo', 'talento'), ('diseno', 'talento'), ('ventas', 'talento'), ('pasantias', 'talento'),
  ('freelancers', 'talento'), ('asesores', 'talento'),
  -- Conocimiento y acompañamiento → mentoria
  ('aceleracion', 'mentoria'), ('capacitacion', 'mentoria'), ('legal', 'mentoria'), ('contable', 'mentoria'),
  ('propiedad_intelectual', 'mentoria'),
  -- Mercado y ventas → clientes
  ('pilotos', 'clientes'), ('distribucion', 'clientes'), ('exportacion', 'clientes'), ('compras_publicas', 'clientes'),
  -- Producto y tecnología → talento
  ('mvp', 'talento'), ('prototipado', 'talento'), ('ia', 'talento'), ('hardware_iot', 'talento'),
  ('datos', 'talento'), ('pruebas_usuarios', 'talento'),
  -- Herramientas y plataformas / Infraestructura y recursos → proveedores
  ('software', 'proveedores'), ('creditos_nube', 'proveedores'), ('no_code', 'proveedores'),
  ('ecommerce', 'proveedores'), ('apis', 'proveedores'),
  ('espacio', 'proveedores'), ('laboratorio', 'proveedores'), ('equipamiento', 'proveedores'),
  ('fabricacion', 'proveedores'), ('logistica', 'proveedores'),
  -- Investigación y alianzas → alianzas
  ('universidad_empresa', 'alianzas'), ('investigacion', 'alianzas'), ('innovacion_abierta', 'alianzas'),
  -- Difusión y comunidad
  ('marketing', 'prensa'), ('exponer', 'networking'),
  -- Trabajo y oportunidades → empleo
  ('proyectos_freelance', 'empleo'), ('colaboracion', 'empleo');

create function pg_temp.a_viejas(p text[])
returns text[]
language sql
as $$
  select coalesce((
    select array_agg(v order by primera)
    from (
      select v, min(ord) as primera
      from (
        select coalesce(nv.vieja, x.v) as v, x.ord
        from unnest(p) with ordinality as x(v, ord)
        left join necesidad_vieja nv on nv.nueva = x.v
      ) m
      group by v
      order by min(ord)
      limit 6
    ) d
  ), '{}')
$$;

alter table public.perfiles drop constraint perfiles_busca_valido;
alter table public.perfiles drop constraint perfiles_ofrece_valido;

update public.perfiles
  set busca = pg_temp.a_viejas(busca), ofrece = pg_temp.a_viejas(ofrece)
  where busca && (select array_agg(nueva) from necesidad_vieja)
     or ofrece && (select array_agg(nueva) from necesidad_vieja)
     or cardinality(busca) > 6
     or cardinality(ofrece) > 6;

alter table public.perfiles
  add constraint perfiles_busca_valido check (
    cardinality(busca) <= 6 and busca <@ array[
      'inversion', 'cofundador', 'mentoria', 'clientes', 'talento', 'alianzas',
      'proveedores', 'networking', 'prensa', 'empleo'
    ]::text[]
  ),
  add constraint perfiles_ofrece_valido check (
    cardinality(ofrece) <= 6 and ofrece <@ array[
      'inversion', 'cofundador', 'mentoria', 'clientes', 'talento', 'alianzas',
      'proveedores', 'networking', 'prensa', 'empleo'
    ]::text[]
  );

drop function if exists public.necesidades_validas();

-- 2) Detalle libre y "cómo".
alter table public.perfiles
  drop constraint if exists perfiles_busca_detalle_valido,
  drop constraint if exists perfiles_ofrece_detalle_valido,
  drop constraint if exists perfiles_busca_como_valido,
  drop constraint if exists perfiles_ofrece_como_valido;
alter table public.perfiles
  drop column if exists busca_detalle,
  drop column if exists ofrece_detalle,
  drop column if exists busca_como,
  drop column if exists ofrece_como;
drop function if exists public.etiquetas_cortas_validas(text[]);

-- 3) Networking.
drop function if exists public.networking_interesar(uuid, text, text);
drop function if exists public.networking_responder(uuid, boolean);
drop function if exists public.networking_retirar(uuid);
drop function if exists public.mis_networking_conexiones();
drop table if exists public.networking_intereses;

-- 4) Consentimiento para la organización.
drop function if exists public.mi_consentimiento_evento(text);
drop function if exists public.guardar_consentimiento_evento(text, boolean, text);
drop table if exists public.evento_consentimientos;

commit;
