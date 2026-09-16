-- Valeur — portfolio real: operaciones + activos seguidos
-- Correr en: Supabase → SQL Editor (después de 0001_profiles.sql).
--
-- Las posiciones NO se guardan: se derivan de las operaciones (trades).
-- Así hay historial, costo promedio y ganancia real por activo.

-- ── Operaciones (compra / venta) ─────────────────────────────────────────────
create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  symbol      text not null check (symbol ~ '^[A-Z0-9.=^-]{1,12}$'),
  name        text,                                  -- nombre de la empresa (opcional)
  side        text not null check (side in ('buy', 'sell')),
  qty         numeric(18, 6) not null check (qty > 0),
  price       numeric(18, 4) not null check (price >= 0),
  executed_at date not null default current_date,
  note        text check (char_length(note) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists trades_user_date_idx
  on public.trades (user_id, executed_at desc, created_at desc);

alter table public.trades enable row level security;

drop policy if exists "trades: solo el dueño" on public.trades;
create policy "trades: solo el dueño"
  on public.trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Activos seguidos ─────────────────────────────────────────────────────────
create table if not exists public.watchlist (
  user_id   uuid not null references auth.users (id) on delete cascade,
  symbol    text not null check (symbol ~ '^[A-Z0-9.=^-]{1,12}$'),
  name      text,
  added_at  timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table public.watchlist enable row level security;

drop policy if exists "watchlist: solo el dueño" on public.watchlist;
create policy "watchlist: solo el dueño"
  on public.watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
