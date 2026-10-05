-- Solo lectura (SQL editor). Perfiles con cuenta que probablemente se crearon a nombre
-- de un emprendimiento u organización: su "tipo" es de entidad (persona_empresa lo
-- pasa a cada empresa). Sirve para acompañar la conversión guiada de /cuenta
-- ("¿Este perfil es de tu emprendimiento?"); no cambia nada.
--
-- sin_empresa = true y tipo startup/emprendimiento: el caso más probable. Si el
-- perfil ya tiene el nombre de la persona, ella elige "ya es mi nombre" y solo se
-- crea la empresa. No muestra nombres: se revisa cada slug a mano.
select
  p.slug,
  p.tipo,
  p.rol,
  p.publicado and not p.oculto as visible,
  not exists (select 1 from public.empresa_miembros m where m.perfil_id = p.id) as sin_empresa,
  p.created_at::date as creado
from public.perfiles p
where p.usuario_id is not null
  and p.tipo in ('startup', 'emprendimiento', 'aceleradora', 'incubadora', 'fondo', 'empresa', 'institucion')
order by sin_empresa desc, p.created_at;
