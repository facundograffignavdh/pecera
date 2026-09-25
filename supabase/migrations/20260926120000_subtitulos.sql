-- Pecera: subtítulos automáticos (Whisper) de los pitches.
-- La ingesta los genera después de publicar (fase 2) y los guarda como datos:
-- [{"desde": 1.24, "hasta": 3.9, "texto": "..."}], en segundos. Se corrigen
-- editando la celda. null = falta transcribir; [] = sin voz, no se muestra nada.

alter table public.pitches add column subtitulos jsonb
  check (subtitulos is null or jsonb_typeof(subtitulos) = 'array');

-- Estado de la transcripción, en la tabla privada: pitches es pública para anon
-- y el error no tiene que verse. Más de 3 intentos fallidos no se reintentan.
alter table public.ingestas
  add column subtitulos_intentos integer not null default 0,
  add column subtitulos_error    text;
