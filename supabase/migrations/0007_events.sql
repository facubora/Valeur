-- Valeur - avisos de proximos resultados y dividendos.
-- Correr en: Supabase -> SQL Editor (despues de 0006_practice.sql).
-- Escrita solo en ASCII, como las anteriores.
--
-- El backend (valeur-backend/events.py) avisa el dia antes cuando una empresa
-- que tenes o seguis presenta resultados o corta el dividendo. event_notices
-- guarda que avisos ya salieron para no repetirlos.

-- Las notificaciones suman el tipo 'event'
alter table public.notifications drop constraint if exists notifications_kind_check;
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
