-- Pecera: lanzamiento de v2-cuentas. NO es una migración: se corre a mano en el
-- SQL editor el día que la rama se une a main, paso por paso.

-- 1) Revisar los perfiles creados desde /cuenta que todavía no están publicados.
--    Anotá los slugs de las cuentas de prueba para excluirlos en el paso 2.
select slug, nombre, created_at
from public.perfiles
where usuario_id is not null
  and publicado = false
order by created_at;

-- 2) Publicar los perfiles reales creados mientras tanto.
update public.perfiles
set publicado = true
where usuario_id is not null
  and publicado = false
  and slug not like 'test-%'
  and slug not in ('slug-de-prueba-1', 'slug-de-prueba-2');  -- ← completar

-- 3) Desde ahora, los perfiles nuevos se publican solos.
update public.ajustes set autopublicar = true;

-- 4) Envíos del Form nuevo que quedaron en espera: resolverlos con el input
--    `asignar` del workflow ("<origen_id> <slug>") o esperar a que la persona cree
--    su perfil.
select origen_id, regla, fecha
from public.envios
where estado = 'en_espera'
order by fecha;
