-- Valeur - reglas de las operaciones del lado del servidor
-- Correr en: Supabase -> SQL Editor (despues de 0002_portfolio.sql).
-- Se puede correr mas de una vez.
--
-- La app ya controla esto en el formulario, pero el front se puede saltear
-- (cualquiera con la anon key y su sesion puede escribir directo en la API).
-- Con esto la base rechaza:
--   - operaciones con fecha futura o anterior a 1990
--   - precio cero
--   - vender mas de lo que se tenia ese dia, o borrar/cambiar una compra
--     de la que despues salio una venta
-- Solo ASCII a proposito (ver 0004).

-- Fecha y precio: restricciones simples sobre la fila
alter table public.trades drop constraint if exists trades_price_positive;
alter table public.trades add constraint trades_price_positive check (price > 0) not valid;

alter table public.trades drop constraint if exists trades_date_range;
alter table public.trades add constraint trades_date_range check (executed_at >= date '1990-01-01') not valid;

-- La fecha futura depende del dia de hoy (en Argentina): va en un trigger,
-- porque un check no puede usar current_date.
create or replace function public.trades_check_row()
returns trigger
language plpgsql
as $$
begin
  if new.executed_at > (now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception 'La fecha no puede ser futura' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trades_check_row on public.trades;
create trigger trades_check_row
  before insert or update on public.trades
  for each row execute function public.trades_check_row();

-- Sin ventas de mas: despues de cada cambio se recorre la historia de ese
-- activo de ese usuario en orden y la cantidad nunca puede quedar negativa.
create or replace function public.trades_check_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  bad record;
begin
  for r in
    select distinct user_id, symbol from (
      select new.user_id, new.symbol where tg_op <> 'DELETE'
      union all
      select old.user_id, old.symbol where tg_op <> 'INSERT'
    ) t
  loop
    select executed_at, held into bad
    from (
      select executed_at,
             sum(case when side = 'buy' then qty else -qty end)
               over (order by executed_at, created_at, id) as held
      from public.trades
      where user_id = r.user_id and symbol = r.symbol
    ) s
    where held < -0.000001
    order by executed_at
    limit 1;
    if found then
      raise exception 'Al % no alcanza la cantidad de % para esa venta', bad.executed_at, r.symbol
        using errcode = 'check_violation';
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists trades_check_balance on public.trades;
create trigger trades_check_balance
  after insert or update or delete on public.trades
  for each row execute function public.trades_check_balance();

-- que la API vuelva a leer el esquema
notify pgrst, 'reload schema';
