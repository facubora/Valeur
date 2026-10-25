-- Valeur - modo practica: cartera con plata de mentira (US$ 10.000) y ranking.
-- Correr en: Supabase -> SQL Editor (despues de 0005_admin.sql).
-- Escrita solo en ASCII, como la 0004 y la 0005.
--
-- Las compras y ventas las hace el backend (valeur-backend/practice.py) con
-- el precio real del momento: practice_execute() solo la puede llamar la
-- service role key, asi nadie se inventa un precio desde el navegador.

-- -- Cuentas -----------------------------------------------------------------
create table if not exists public.practice_accounts (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  cash       numeric(18, 4) not null default 10000 check (cash >= 0),
  started_at timestamptz not null default now(),
  resets     int not null default 0
);

alter table public.practice_accounts enable row level security;

drop policy if exists "practica: ver la propia" on public.practice_accounts;
create policy "practica: ver la propia"
  on public.practice_accounts for select to authenticated
  using (user_id = auth.uid());

-- -- Operaciones ---------------------------------------------------------------
-- price: en la moneda del activo; price_usd: lo que se desconto/acredito por
-- unidad (al MEP del momento si el activo cotiza en pesos)
create table if not exists public.practice_trades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  symbol     text not null check (symbol ~ '^[A-Z0-9.=^-]{1,15}$'),
  name       text,
  side       text not null check (side in ('buy', 'sell')),
  qty        numeric(24, 8) not null check (qty > 0),
  price      numeric(18, 6) not null check (price > 0),
  price_usd  numeric(18, 6) not null check (price_usd > 0),
  created_at timestamptz not null default now()
);

create index if not exists practice_trades_user_idx on public.practice_trades (user_id, created_at desc);

alter table public.practice_trades enable row level security;

drop policy if exists "practica: ver las propias" on public.practice_trades;
create policy "practica: ver las propias"
  on public.practice_trades for select to authenticated
  using (user_id = auth.uid());

-- -- Empezar y empezar de nuevo (los hace el usuario) ---------------------------
create or replace function public.practice_start()
returns void
language sql
security definer set search_path = public
as $$
  insert into practice_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
$$;

create or replace function public.practice_reset()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from practice_trades where user_id = auth.uid();
  update practice_accounts
     set cash = 10000, started_at = now(), resets = resets + 1
   where user_id = auth.uid();
end;
$$;

revoke all on function public.practice_start() from public, anon;
revoke all on function public.practice_reset() from public, anon;
grant execute on function public.practice_start() to authenticated;
grant execute on function public.practice_reset() to authenticated;

-- -- Operar (solo el backend) ------------------------------------------------
-- Bloquea la cuenta mientras opera: dos compras a la vez no gastan dos veces
-- la misma plata. Devuelve la operacion y el efectivo que queda.
create or replace function public.practice_execute(
  p_user uuid, p_symbol text, p_name text, p_side text, p_qty numeric, p_price numeric, p_price_usd numeric
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  acc   practice_accounts;
  held  numeric;
  total numeric := round(p_qty * p_price_usd, 4);
  t     practice_trades;
begin
  select * into acc from practice_accounts where user_id = p_user for update;
  if not found then
    raise exception 'sin cuenta de practica' using errcode = 'P0002';
  end if;
  if p_side = 'buy' then
    if total > acc.cash + 0.005 then
      raise exception 'no alcanza el efectivo' using errcode = 'P0001';
    end if;
    update practice_accounts set cash = greatest(cash - total, 0) where user_id = p_user returning * into acc;
  else
    select coalesce(sum(case when side = 'buy' then qty else -qty end), 0) into held
      from practice_trades where user_id = p_user and symbol = p_symbol;
    if p_qty > held + 0.00000001 then
      raise exception 'no tenes tantas' using errcode = 'P0001';
    end if;
    update practice_accounts set cash = cash + total where user_id = p_user returning * into acc;
  end if;
  insert into practice_trades (user_id, symbol, name, side, qty, price, price_usd)
  values (p_user, p_symbol, p_name, p_side, p_qty, p_price, p_price_usd)
  returning * into t;
  return jsonb_build_object('trade', to_jsonb(t), 'cash', acc.cash);
end;
$$;

revoke all on function public.practice_execute(uuid, text, text, text, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.practice_execute(uuid, text, text, text, numeric, numeric, numeric) to service_role;

-- -- Para el ranking (solo el backend, que les pone precio) ---------------------
-- Una fila por jugador y activo que todavia tiene (o una sola sin activo si
-- esta todo en efectivo)
create or replace function public.practice_board()
returns table (
  user_id uuid, username text, display_name text, verified boolean, verified_label text,
  cash numeric, started_at timestamptz, trades bigint, symbol text, qty numeric
)
language sql
stable
security definer set search_path = public
as $$
  with pos as (
    select t.user_id, t.symbol, sum(case when t.side = 'buy' then t.qty else -t.qty end) as qty
    from practice_trades t
    group by t.user_id, t.symbol
    having sum(case when t.side = 'buy' then t.qty else -t.qty end) > 0.00000001
  ),
  n as (select user_id, count(*) as trades from practice_trades group by user_id)
  select a.user_id, p.username, p.display_name, p.verified, p.verified_label,
         a.cash, a.started_at, coalesce(n.trades, 0), pos.symbol, pos.qty
  from practice_accounts a
  join profiles p on p.id = a.user_id
  left join pos on pos.user_id = a.user_id
  left join n on n.user_id = a.user_id;
$$;

revoke all on function public.practice_board() from public, anon, authenticated;
grant execute on function public.practice_board() to service_role;
