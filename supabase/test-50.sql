-- Pecera: datos de prueba para probar el feed con 50 reels.
-- Crea 50 perfiles publicados con slug "test-01" … "test-50", cada uno con un
-- pitch que reusa los videos de public/. Uno de cada diez va sin poster para
-- probar el fondo Tinta. Los `orden` van de 101 a 150, después del seed.
-- Se puede correr más de una vez sin duplicar nada.
-- Para borrarlos: supabase/test-50-limpiar.sql

insert into public.perfiles
  (slug, nombre, tipo, rol, descripcion, email, publicado)
select
  'test-' || lpad(n::text, 2, '0'),
  'Prueba ' || lpad(n::text, 2, '0'),
  (array['startup', 'emprendimiento', 'aceleradora', 'incubadora',
         'angel', 'fondo', 'coach'])[1 + (n - 1) % 7],
  case (n - 1) % 7
    when 4 then 'inversor'
    when 5 then 'inversor'
    when 2 then 'aliado'
    when 3 then 'aliado'
    when 6 then 'aliado'
    else 'emprendedor'
  end,
  'Perfil de prueba número ' || n || ' para ver cómo anda el feed con muchos reels.',
  'test-' || lpad(n::text, 2, '0') || '@example.com',
  true
from generate_series(1, 50) as n
on conflict (slug) do nothing;

insert into public.pitches
  (perfil_id, video_url, poster_url, orden, publicado)
select
  p.id,
  '/videos/pitch_' || (1 + (n - 1) % 3) || '.mp4',
  case when n % 10 = 0 then null
       else '/posters/pitch_' || (1 + (n - 1) % 3) || '.jpg' end,
  100 + n,
  true
from generate_series(1, 50) as n
join public.perfiles p on p.slug = 'test-' || lpad(n::text, 2, '0')
where not exists (
  select 1 from public.pitches x where x.perfil_id = p.id
);
