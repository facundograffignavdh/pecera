-- Pecera: logo de cada empresa. Corre DESPUÉS de portfolio.
--
-- ADITIVO. Tabla aparte de `empresas` a propósito: las consultas de siempre (feed,
-- perfiles, empresas) no cambian, y si esta migración no corrió la app sigue igual
-- (se ven las iniciales).
--
-- El archivo vive en R2 como `<empresaId>-<hash8>.png|jpg`, igual que la foto del
-- perfil. El logo anterior va a r2_borrar con una hora de gracia (el ISR puede seguir
-- sirviéndolo).

create table public.empresa_logos (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  clave      text not null,
  updated_at timestamptz not null default now(),

  constraint empresa_logos_clave_valida check (clave ~ '^[0-9a-f-]{36}-[0-9a-f]{8}\.(png|jpg)$')
);

alter table public.empresa_logos enable row level security;
revoke all on public.empresa_logos from anon, authenticated;
grant select on public.empresa_logos to anon, authenticated;

create policy "todos leen logos de empresas visibles"
  on public.empresa_logos for select
  to anon, authenticated
  using (public.empresa_visible(empresa_id));
create policy "los miembros leen el logo de su empresa"
  on public.empresa_logos for select
  to authenticated
  using (public.soy_de_empresa(empresa_id));

-- Pone (o saca, con null) el logo de la empresa de la sesión. Cualquier miembro.
create function public.poner_logo_empresa(p_clave text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_de_sesion();
  v_previa  text;
begin
  if p_clave is not null and p_clave not like v_empresa::text || '-%' then
    raise exception 'imagen inválida' using errcode = '22023';
  end if;

  select clave into v_previa from public.empresa_logos where empresa_id = v_empresa;

  if p_clave is null then
    delete from public.empresa_logos where empresa_id = v_empresa;
  else
    insert into public.empresa_logos (empresa_id, clave)
    values (v_empresa, p_clave)
    on conflict (empresa_id) do update set clave = excluded.clave, updated_at = now();
  end if;

  if v_previa is not null and v_previa is distinct from p_clave then
    insert into public.r2_borrar (clave, borrar_despues)
    values (v_previa, now() + interval '1 hour')
    on conflict (clave) do nothing;
  end if;
end;
$$;

revoke execute on function public.poner_logo_empresa(text) from public, anon;
grant execute on function public.poner_logo_empresa(text) to authenticated;
