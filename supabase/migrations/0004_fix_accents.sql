-- ============================================================================
-- 0004 - Arregla los acentos de las notificaciones
--
-- Al pegar la 0003 en Supabase, los textos con acento de los triggers quedaron
-- mal guardados: cada letra con acento se leyo como dos caracteres de Mac
-- (la o con tilde de "sirvio" quedo como raiz + mayor-igual). Esta migracion
-- vuelve a crear esas funciones y corrige las notificaciones que ya salieron.
--
-- Este archivo esta escrito SOLO con caracteres ASCII (los acentos van como
-- U&'\00F3'), asi que no se puede romper al copiarlo y pegarlo. Se puede
-- correr mas de una vez.
-- ============================================================================

-- Las funciones, con los textos bien -----------------------------------------
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
      then '@' || public.uname(new.follower_id) || U&' te sigui\00F3 tambi\00E9n: ahora son amigos'
      else '@' || public.uname(new.follower_id) || U&' empez\00F3 a seguirte'
    end,
    new.follower_id,
    '/u/' || public.uname(new.follower_id)
  );
  return new;
end;
$$;

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
    'A @' || public.uname(new.user_id) || U&' le sirvi\00F3 tu recomendaci\00F3n de ' || p.symbol,
    p.symbol,
    new.user_id,
    '/comunidad?post=' || new.post_id
  );
  return new;
end;
$$;

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
    values (new.user_id, 'verified', U&'Tu cuenta est\00E1 verificada', label, '/u/' || public.uname(new.user_id));
  else
    insert into notifications (user_id, kind, title, body)
    values (new.user_id, 'verified', 'No pudimos verificar tu cuenta por ahora',
            U&'Pod\00E9s volver a pedirlo con m\00E1s informaci\00F3n.');
  end if;
  return new;
end;
$$;

-- Las notificaciones que ya salieron mal ---------------------------------------
-- cada par de caracteres de Mac vuelve a ser la letra con acento que era
create or replace function pg_temp.fix_accents(t text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(t,
    U&'\221A\00B0', U&'\00E1'),  -- a
    U&'\221A\00A9', U&'\00E9'),  -- e
    U&'\221A\2260', U&'\00ED'),  -- i
    U&'\221A\2265', U&'\00F3'),  -- o
    U&'\221A\222B', U&'\00FA'),  -- u
    U&'\221A\00B1', U&'\00F1'),  -- enie
    U&'\221A\00C5', U&'\00C1'),  -- A
    U&'\221A\00E2', U&'\00C9'),  -- E
    U&'\221A\00E7', U&'\00CD'),  -- I
    U&'\221A\00EC', U&'\00D3'),  -- O
    U&'\221A\00F6', U&'\00DA'),  -- U
    U&'\221A\00EB', U&'\00D1'),  -- ENIE
    U&'\221A\00BA', U&'\00FC'),  -- u con dieresis
    U&'\00AC\00F8', U&'\00BF'),  -- abre pregunta
    U&'\00AC\00B0', U&'\00A1');  -- abre exclamacion
$$;

update public.notifications
set title = pg_temp.fix_accents(title),
    body  = pg_temp.fix_accents(body)
where title like U&'%\221A%' or title like U&'%\00AC%'
   or body  like U&'%\221A%' or body  like U&'%\00AC%';
