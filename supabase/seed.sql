-- Pecera: datos de prueba, los mismos de lib/mock-data.ts.
-- UUIDs fijos para que los pitches apunten a su perfil y el seed se pueda
-- correr más de una vez sin duplicar.

insert into public.perfiles
  (id, slug, nombre, tipo, rol, descripcion, avatar_url,
   whatsapp, email, linkedin, instagram, web, publicado)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'raiz-verde', 'Raíz Verde', 'startup', 'emprendedor',
    'Convertimos la borra de café de bares porteños en sustrato para huertas urbanas. Ocho locales en Chacarita ya nos separan los residuos.',
    null,
    '1144445555', 'hola@raizverde.com.ar',
    'https://www.linkedin.com/company/raiz-verde',
    'https://instagram.com/raizverde.ar',
    'https://raizverde.com.ar',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'delta-capital', 'Delta Capital', 'fondo', 'inversor',
    'Fondo semilla enfocado en agtech y logística del Litoral. Tickets de USD 25k a 150k y acompañamiento operativo, no solo plata.',
    null,
    null, 'deal@deltacapital.ar',
    'https://www.linkedin.com/company/delta-capital-ar',
    null,
    'https://deltacapital.ar',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'nodo-litoral', 'Nodo Litoral', 'incubadora', 'aliado',
    'Incubadora de Paraná. Damos espacio, mentoría legal y contable durante seis meses a proyectos de la región que recién arrancan.',
    null,
    '3434567890', 'contacto@nodolitoral.org',
    null,
    '@nodolitoral',
    'nodolitoral.org',
    true
  )
on conflict (id) do nothing;

insert into public.pitches
  (id, perfil_id, video_url, poster_url, orden, publicado)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '/videos/pitch_1.mp4', '/posters/pitch_1.jpg', 1, true),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002',
   '/videos/pitch_2.mp4', '/posters/pitch_2.jpg', 2, true),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003',
   '/videos/pitch_3.mp4', '/posters/pitch_3.jpg', 3, true)
on conflict (id) do nothing;
