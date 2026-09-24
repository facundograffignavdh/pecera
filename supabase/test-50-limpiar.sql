-- Pecera: borra los datos de prueba de supabase/test-50.sql.
-- Solo toca perfiles cuyo slug empieza con "test-"; sus pitches se van por el
-- `on delete cascade`. El seed y los perfiles reales no se tocan.

delete from public.perfiles
where left(slug, 5) = 'test-';
