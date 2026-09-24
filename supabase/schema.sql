-- Pecera: esquema de datos.
-- Refleja types/pecera.ts. Solo lectura pública; la carga se hace desde el
-- panel de Supabase o con la service role (que se saltea RLS).

create table public.perfiles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  nombre      text not null,
  tipo        text not null check (tipo in (
                'startup', 'emprendimiento', 'aceleradora', 'incubadora',
                'angel', 'fondo', 'coach'
              )),
  rol         text not null check (rol in ('emprendedor', 'inversor', 'aliado')),
  descripcion text not null,
  avatar_url  text,
  whatsapp    text,
  email       text,
  linkedin    text,
  instagram   text,
  web         text,
  publicado   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.pitches (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  video_url  text not null,
  poster_url text,
  orden      integer not null,
  publicado  boolean not null default false,
  created_at timestamptz not null default now()
);

create index pitches_perfil_id_idx on public.pitches (perfil_id);

-- RLS: anon solo lee lo publicado. Sin políticas de escritura.
alter table public.perfiles enable row level security;
alter table public.pitches  enable row level security;

grant select on public.perfiles to anon;
grant select on public.pitches  to anon;

create policy "anon lee perfiles publicados"
  on public.perfiles for select
  to anon
  using (publicado = true);

create policy "anon lee pitches publicados de perfiles publicados"
  on public.pitches for select
  to anon
  using (
    publicado = true
    and exists (
      select 1 from public.perfiles p
      where p.id = pitches.perfil_id
        and p.publicado = true
    )
  );
