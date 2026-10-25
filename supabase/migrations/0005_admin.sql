-- Valeur - panel admin: quien es admin, reportes de recomendaciones y numeros.
-- Correr en: Supabase -> SQL Editor (despues de 0004_fix_accents.sql).
-- Escrita solo en ASCII (los acentos van como U&'\00F3') para que no se
-- rompa al pegarla, como la 0004.
--
-- Para hacerte admin, al final (una sola vez, con tu usuario):
--   update public.profiles set is_admin = true where username = 'TU_USUARIO';

-- -- Admin --------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- El usuario edita su perfil, pero el verificado lo cambia solo un admin y
-- quien es admin se cambia solo desde el SQL Editor
create or replace function public.protect_profile()
returns trigger
language plpgsql
as $$
begin
  if public.request_role() in ('authenticated', 'anon') then
    new.is_admin := old.is_admin;
    if not public.is_admin() then
      new.verified       := old.verified;
      new.verified_label := old.verified_label;
    end if;
  end if;
  return new;
end;
$$;

-- -- Verificaciones: el admin ve todos los pedidos y los aprueba o rechaza ---
-- (el trigger review_verification de la 0003/0004 hace el resto)
drop policy if exists "verificacion: el admin ve todas" on public.verification_requests;
create policy "verificacion: el admin ve todas"
  on public.verification_requests for select to authenticated
  using (public.is_admin());

drop policy if exists "verificacion: el admin revisa" on public.verification_requests;
create policy "verificacion: el admin revisa"
  on public.verification_requests for update to authenticated
  using (public.is_admin() and status = 'pending')
  with check (public.is_admin());

-- -- Recomendaciones: el admin ve y borra cualquiera -------------------------
drop policy if exists "posts: el admin ve todas" on public.posts;
create policy "posts: el admin ve todas"
  on public.posts for select to authenticated
  using (public.is_admin());

drop policy if exists "posts: el admin borra" on public.posts;
create policy "posts: el admin borra"
  on public.posts for delete to authenticated
  using (public.is_admin());

-- -- Reportes -----------------------------------------------------------------
-- Cualquiera reporta una recomendacion ajena (una vez); el admin la borra o
-- descarta el reporte. Si la recomendacion se borra, sus reportes tambien.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text not null check (reason in ('spam', 'misleading', 'offensive', 'other')),
  note        text check (char_length(note) <= 280),
  status      text not null default 'open' check (status in ('open', 'dismissed')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (post_id, reporter_id)
);

create index if not exists reports_open_idx on public.reports (created_at desc) where status = 'open';

alter table public.reports enable row level security;

drop policy if exists "reportes: reportar" on public.reports;
create policy "reportes: reportar"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and exists (select 1 from posts p where p.id = post_id and p.user_id <> auth.uid())
  );

drop policy if exists "reportes: ver los propios" on public.reports;
create policy "reportes: ver los propios"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reportes: el admin revisa" on public.reports;
create policy "reportes: el admin revisa"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.stamp_report_review()
returns trigger
language plpgsql
as $$
begin
  if new.status <> old.status then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reports_review on public.reports;
create trigger reports_review
  before update on public.reports
  for each row execute function public.stamp_report_review();

-- -- Numeros ------------------------------------------------------------------
-- Todo en una llamada y solo para admins. Cuenta, no muestra datos de nadie.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  out jsonb;
begin
  if not public.is_admin() then
    raise exception 'solo admins' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'users',          (select count(*) from profiles),
    'users_week',     (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_week',    (select count(distinct user_id) from (
                         select user_id from trades where created_at > now() - interval '7 days'
                         union all select user_id from posts where created_at > now() - interval '7 days'
                         union all select user_id from alerts where created_at > now() - interval '7 days'
                         union all select user_id from watchlist where added_at > now() - interval '7 days'
                       ) a),
    'with_trades',    (select count(distinct user_id) from trades),
    'posts',          (select count(*) from posts),
    'posts_week',     (select count(*) from posts where created_at > now() - interval '7 days'),
    'likes',          (select count(*) from post_likes),
    'follows',        (select count(*) from follows),
    'alerts_active',  (select count(*) from alerts where active),
    'alerts_fired',   (select count(*) from alerts where triggered_at > now() - interval '7 days'),
    'verified',       (select count(*) from profiles where verified),
    'pending_verifications', (select count(*) from verification_requests where status = 'pending'),
    'open_reports',   (select count(distinct post_id) from reports where status = 'open'),
    'signups', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'n', w.n) order by w.week), '[]')
      from (
        select to_char(g.week, 'YYYY-MM-DD') as week,
               (select count(*) from profiles p
                 where p.created_at >= g.week and p.created_at < g.week + interval '7 days') as n
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as g(week)
      ) w
    ),
    'top_watched', (
      select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'n', n) order by n desc, symbol), '[]')
      from (select symbol, count(*) as n from watchlist group by symbol order by n desc, symbol limit 8) t
    ),
    'top_recommended', (
      select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'n', n) order by n desc, symbol), '[]')
      from (select symbol, count(*) as n from posts group by symbol order by n desc, symbol limit 8) t
    )
  ) into out;
  return out;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
