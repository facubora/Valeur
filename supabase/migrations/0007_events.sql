-- Valeur - avisos de proximos resultados y dividendos.
-- Correr en: Supabase -> SQL Editor (despues de 0006_practice.sql).
-- Escrita solo en ASCII, como las anteriores. Se puede correr mas de una vez.
--
-- El backend (valeur-backend/events.py) avisa el dia antes cuando una empresa
-- que tenes o seguis presenta resultados o corta el dividendo. event_notices
-- guarda que avisos ya salieron para no repetirlos.

-- Las notificaciones suman el tipo 'event'. La restriccion vieja se busca por
-- lo que controla (no por su nombre), asi se reemplaza aunque se llame distinto.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'notifications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%kind%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('alert', 'follow', 'post', 'like', 'verified', 'event'));

create table if not exists public.event_notices (
  user_id    uuid not null references auth.users (id) on delete cascade,
  base       text not null,                       -- la accion de origen (AAPL para AAPL.BA)
  kind       text not null check (kind in ('earnings', 'exdiv')),
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, base, kind, day)
);

-- solo la usa el backend (service role): sin politicas, nadie mas la ve
alter table public.event_notices enable row level security;

-- que la API vea la tabla nueva ya mismo
notify pgrst, 'reload schema';
