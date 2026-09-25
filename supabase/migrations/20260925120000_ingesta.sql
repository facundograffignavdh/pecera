-- Pecera: ingesta automática desde el Google Form (scripts/ingesta/).
-- `origen_id` es el ID de Drive del video: la huella para no duplicar. Va en
-- pitches y también en perfiles, para que un reintento reuse el perfil que ya
-- creó en vez de sumar uno con slug "-2".
-- video_url, poster_url y avatar_url pasan a guardar la clave del archivo en R2
-- ("<id>.mp4"); las rutas "/videos/..." del seed siguen valiendo tal cual.

alter table public.perfiles add column origen_id text unique;
alter table public.pitches  add column origen_id text unique;

-- Una fila por video del Form. Solo la toca el workflow con la service key.
create table public.ingestas (
  origen_id  text primary key,
  estado     text not null check (estado in ('ok', 'error')),
  error      text,
  intentos   integer not null default 0,
  -- Bytes subidos a R2 por esta fila (video + poster + avatar). Un reintento
  -- sobrescribe las mismas claves, así que se reemplaza, no se suma.
  bytes      bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS sin políticas: anon no lee ni escribe. La service key se la saltea.
alter table public.ingestas enable row level security;
revoke all on public.ingestas from anon, authenticated;
