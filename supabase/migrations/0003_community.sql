-- Valeur — comunidad: perfiles públicos, seguir/amigos, recomendaciones,
-- verificados, alertas de precio y notificaciones.
-- Correr en: Supabase → SQL Editor (después de 0002_portfolio.sql).
--
-- Reglas de privacidad:
--   · Amigos = se siguen mutuamente.
--   · Portfolio: privado / solo amigos / público. Aun siendo público, nunca se
--     exponen montos: shared_portfolio() devuelve cantidades escaladas (sirven
--     para calcular % de composición y rendimiento, no cuánta plata hay).
--   · Verificado: lo aprueba un admin desde la tabla verification_requests;
--     el usuario no puede autoasignárselo.

-- ── Perfil: datos públicos y preferencias ────────────────────────────────────
alter table public.profiles
  add column if not exists display_name   text check (char_length(display_name) <= 40),
  add column if not exists bio            text check (char_length(bio) <= 160),
  add column if not exists visibility     text not null default 'private'
                                          check (visibility in ('private', 'friends', 'public')),
  add column if not exists interests      text[] not null default '{}',
  add column if not exists verified       boolean not null default false,
  add column if not exists verified_label text;

-- Rol del pedido actual ('authenticated', 'anon' o null desde el SQL Editor)
create or replace function public.request_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
$$;

-- El usuario edita su perfil, pero el verificado solo lo cambia un admin
create or replace function public.protect_profile()
returns trigger
language plpgsql
as $$
begin
  if public.request_role() in ('authenticated', 'anon') then
    new.verified       := old.verified;
    new.verified_label := old.verified_label;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

-- ── Seguir (amigos = seguimiento mutuo) ──────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "follows: lectura" on public.follows;
create policy "follows: lectura"
  on public.follows for select to authenticated
  using (true);

drop policy if exists "follows: seguir" on public.follows;
create policy "follows: seguir"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists "follows: dejar de seguir" on public.follows;
create policy "follows: dejar de seguir"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from follows where follower_id = a and followee_id = b)
     and exists (select 1 from follows where follower_id = b and followee_id = a);
$$;

-- ¿El usuario actual puede ver el portfolio de `target`?
create or replace function public.can_see_portfolio(target uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select target = auth.uid() or exists (
    select 1 from profiles p
    where p.id = target
      and (p.visibility = 'public'
           or (p.visibility = 'friends' and public.is_friend(auth.uid(), target)))
  );
$$;

-- ── Portfolio compartido (sin montos) ────────────────────────────────────────
-- Posiciones abiertas con costo promedio ponderado (misma lógica que la app).
-- `units` = cantidad / Σ costos: conserva las proporciones entre posiciones
-- (para el % de composición) pero no deja reconstruir cuánto invirtió.
create or replace function public.shared_portfolio(target uuid)
returns table (symbol text, name text, units numeric, avg_cost numeric, since date)
language plpgsql
stable
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  t     record;
  st    jsonb := '{}';
  cur   jsonb;
  q     numeric;
  c     numeric;
  scale numeric;
begin
  if not public.can_see_portfolio(target) then
    return;
  end if;

  for t in
    select * from trades where user_id = target order by executed_at, created_at
  loop
    cur := coalesce(st -> t.symbol,
                    jsonb_build_object('qty', 0, 'cost', 0, 'name', t.name, 'since', t.executed_at));
    q := (cur ->> 'qty')::numeric;
    c := (cur ->> 'cost')::numeric;
    if t.side = 'buy' then
      if q <= 1e-9 then
        cur := cur || jsonb_build_object('since', t.executed_at);
      end if;
      q := q + t.qty;
      c := c + t.qty * t.price;
    elsif q > 0 then
      c := c - c * least(1, t.qty / q);
      q := greatest(0, q - t.qty);
    end if;
    cur := cur || jsonb_build_object('qty', q, 'cost', c, 'name', coalesce(cur ->> 'name', t.name));
    st := jsonb_set(st, array[t.symbol], cur);
  end loop;

  select sum((v ->> 'cost')::numeric) into scale
  from jsonb_each(st) as e (k, v)
  where (v ->> 'qty')::numeric > 1e-9;

  if coalesce(scale, 0) <= 0 then
    return;
  end if;

  return query
    select e.k,
           e.v ->> 'name',
           (e.v ->> 'qty')::numeric / scale,
           (e.v ->> 'cost')::numeric / (e.v ->> 'qty')::numeric,
           (e.v ->> 'since')::date
    from jsonb_each(st) as e (k, v)
    where (e.v ->> 'qty')::numeric > 1e-9;
end;
$$;

-- Últimas operaciones, sin cantidades ni precios
create or replace function public.shared_trades(target uuid, lim int default 12)
returns table (symbol text, name text, side text, executed_at date)
language sql
stable
security definer set search_path = public
as $$
  select t.symbol, t.name, t.side, t.executed_at
  from trades t
  where t.user_id = target and public.can_see_portfolio(target)
  order by t.executed_at desc, t.created_at desc
  limit least(lim, 50);
$$;

grant execute on function public.is_friend(uuid, uuid)        to authenticated;
grant execute on function public.can_see_portfolio(uuid)      to authenticated;
grant execute on function public.shared_portfolio(uuid)       to authenticated;
grant execute on function public.shared_trades(uuid, int)     to authenticated;

-- ── Recomendaciones (posts) ──────────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  symbol     text not null check (symbol ~ '^[A-Z0-9.=^-]{1,12}$'),
  stance     text not null check (stance in ('buy', 'hold', 'sell')),
  body       text not null check (char_length(body) between 1 and 500),
  price_at   numeric(18, 4),                        -- precio al publicar (para el seguimiento)
  audience   text not null default 'public' check (audience in ('public', 'friends')),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_symbol_idx  on public.posts (symbol, created_at desc);
create index if not exists posts_user_idx    on public.posts (user_id, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts: lectura" on public.posts;
create policy "posts: lectura"
  on public.posts for select to authenticated
  using (audience = 'public' or user_id = auth.uid() or public.is_friend(auth.uid(), user_id));

drop policy if exists "posts: publicar" on public.posts;
create policy "posts: publicar"
  on public.posts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "posts: borrar las propias" on public.posts;
create policy "posts: borrar las propias"
  on public.posts for delete to authenticated
  using (user_id = auth.uid());

-- "Me sirve"
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "likes: lectura" on public.post_likes;
create policy "likes: lectura"
  on public.post_likes for select to authenticated
  using (true);

drop policy if exists "likes: propios" on public.post_likes;
create policy "likes: propios"
  on public.post_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "likes: sacar los propios" on public.post_likes;
create policy "likes: sacar los propios"
  on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

-- ── Verificación ─────────────────────────────────────────────────────────────
-- El usuario pide; el admin aprueba cambiando `status` a 'approved' (o
-- 'rejected') desde Supabase → Table Editor. El trigger hace el resto.
create table if not exists public.verification_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  category    text not null
              check (category in ('analista', 'asesor', 'broker', 'creador', 'periodista', 'otro')),
  link        text check (char_length(link) <= 200),
  reason      text not null check (char_length(reason) between 10 and 500),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists verification_one_pending_idx
  on public.verification_requests (user_id) where status = 'pending';

alter table public.verification_requests enable row level security;

drop policy if exists "verificación: ver las propias" on public.verification_requests;
create policy "verificación: ver las propias"
  on public.verification_requests for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "verificación: pedir" on public.verification_requests;
create policy "verificación: pedir"
  on public.verification_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- ── Alertas de precio ────────────────────────────────────────────────────────
--   above / below: el precio cruza un valor (se disparan una vez y se apagan)
--   up_pct / down_pct: el día sube/baja más de X% (una vez por día)
create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  symbol       text not null check (symbol ~ '^[A-Z0-9.=^-]{1,12}$'),
  kind         text not null check (kind in ('above', 'below', 'up_pct', 'down_pct')),
  value        numeric(18, 4) not null check (value > 0),
  active       boolean not null default true,
  triggered_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists alerts_user_idx on public.alerts (user_id, created_at desc);

alter table public.alerts enable row level security;

drop policy if exists "alerts: solo el dueño" on public.alerts;
create policy "alerts: solo el dueño"
  on public.alerts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Notificaciones ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('alert', 'follow', 'post', 'like', 'verified')),
  title      text not null check (char_length(title) <= 140),
  body       text check (char_length(body) <= 280),
  symbol     text,
  actor_id   uuid references public.profiles (id) on delete cascade,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifs: ver las propias" on public.notifications;
create policy "notifs: ver las propias"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifs: marcar leídas" on public.notifications;
create policy "notifs: marcar leídas"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifs: borrar las propias" on public.notifications;
create policy "notifs: borrar las propias"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Las alertas se evalúan en la app: el usuario solo puede crearse avisos de alerta
drop policy if exists "notifs: alertas propias" on public.notifications;
create policy "notifs: alertas propias"
  on public.notifications for insert to authenticated
  with check (user_id = auth.uid() and kind = 'alert');

-- Tiempo real: la campanita se actualiza sola
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- ── Triggers que generan notificaciones ──────────────────────────────────────
create or replace function public.uname(uid uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select username from profiles where id = uid;
$$;

-- Alguien te sigue
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (user_id, kind, title, actor_id, link)
  values (
    new.followee_id,
    'follow',
    case when public.is_friend(new.follower_id, new.followee_id)
      then '@' || public.uname(new.follower_id) || ' te siguió también: ahora son amigos'
      else '@' || public.uname(new.follower_id) || ' empezó a seguirte'
    end,
    new.follower_id,
    '/u/' || public.uname(new.follower_id)
  );
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_follow();

-- Alguien que seguís publica una recomendación
create or replace function public.notify_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  verb text := case new.stance when 'buy' then 'comprar' when 'sell' then 'vender' else 'mantener' end;
begin
  insert into notifications (user_id, kind, title, body, symbol, actor_id, link)
  select f.follower_id,
         'post',
         '@' || public.uname(new.user_id) || ' recomienda ' || verb || ' ' || new.symbol,
         left(new.body, 140),
         new.symbol,
         new.user_id,
         '/comunidad?post=' || new.id
  from follows f
  where f.followee_id = new.user_id
    and (new.audience = 'public' or public.is_friend(f.follower_id, new.user_id));
  return new;
end;
$$;

drop trigger if exists posts_notify on public.posts;
create trigger posts_notify
  after insert on public.posts
  for each row execute function public.notify_post();

-- A alguien le sirvió tu recomendación
create or replace function public.notify_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  p record;
begin
  select user_id, symbol into p from posts where id = new.post_id;
  if p.user_id is null or p.user_id = new.user_id then
    return new;
  end if;
  insert into notifications (user_id, kind, title, symbol, actor_id, link)
  values (
    p.user_id,
    'like',
    'A @' || public.uname(new.user_id) || ' le sirvió tu recomendación de ' || p.symbol,
    p.symbol,
    new.user_id,
    '/comunidad?post=' || new.post_id
  );
  return new;
end;
$$;

drop trigger if exists likes_notify on public.post_likes;
create trigger likes_notify
  after insert on public.post_likes
  for each row execute function public.notify_like();

-- El admin aprueba o rechaza una verificación
create or replace function public.review_verification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  label text := case new.category
    when 'analista'   then 'Analista'
    when 'asesor'     then 'Asesor financiero'
    when 'broker'     then 'Broker / ALyC'
    when 'creador'    then 'Creador de contenido'
    when 'periodista' then 'Periodista'
    else 'Cuenta verificada'
  end;
begin
  if new.status = old.status or old.status <> 'pending' then
    return new;
  end if;
  new.reviewed_at := now();
  if new.status = 'approved' then
    update profiles set verified = true, verified_label = label where id = new.user_id;
    insert into notifications (user_id, kind, title, body, link)
    values (new.user_id, 'verified', 'Tu cuenta está verificada', label, '/u/' || public.uname(new.user_id));
  else
    insert into notifications (user_id, kind, title, body)
    values (new.user_id, 'verified', 'No pudimos verificar tu cuenta por ahora',
            'Podés volver a pedirlo con más información.');
  end if;
  return new;
end;
$$;

drop trigger if exists verification_review on public.verification_requests;
create trigger verification_review
  before update on public.verification_requests
  for each row execute function public.review_verification();
