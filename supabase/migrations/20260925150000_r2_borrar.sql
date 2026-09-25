-- Pecera: claves de R2 que quedaron viejas al reprocesar un video.
-- Cada versión se sube con clave nueva (<id>-<hash8>.mp4). La anterior no se
-- borra enseguida porque el ISR puede seguir sirviendo la página vieja un rato:
-- se anota acá y la ingesta la borra cuando vence `borrar_despues`.

create table public.r2_borrar (
  clave          text primary key,
  -- Sigue ocupando R2 hasta que se borre: cuenta para el tope de 8 GB.
  bytes          bigint not null default 0,
  borrar_despues timestamptz not null,
  created_at     timestamptz not null default now()
);

-- RLS sin políticas: anon no lee ni escribe. La service key se la saltea.
alter table public.r2_borrar enable row level security;
revoke all on public.r2_borrar from anon, authenticated;
