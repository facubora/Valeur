-- Valeur — perfiles de usuario sobre Supabase Auth
-- Correr en: Supabase → SQL Editor (o `supabase db push` con la CLI).
--
-- Auth (email + password) la maneja Supabase; acá solo guardamos lo que
-- la app necesita mostrar: el username. Cada perfil se crea solo, por
-- trigger, cuando se registra un usuario (el username viaja en el metadata
-- del signUp).

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
             check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

-- Búsqueda de username sin distinguir mayúsculas (facu = Facu)
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Los perfiles son públicos (solo tienen username): sirve para chequear
-- disponibilidad al registrarse y para la parte social más adelante.
drop policy if exists "profiles: lectura pública" on public.profiles;
create policy "profiles: lectura pública"
  on public.profiles for select
  using (true);

-- Cada usuario edita solo su propio perfil
drop policy if exists "profiles: editar el propio" on public.profiles;
create policy "profiles: editar el propio"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Trigger: crear el perfil al registrarse ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      'user_' || left(replace(new.id::text, '-', ''), 8)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: ¿está libre este username? (usable sin sesión) ───────────────────
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
