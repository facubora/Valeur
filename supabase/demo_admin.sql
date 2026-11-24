-- Valeur - le da permiso de admin a la cuenta de prueba del docente (@profe) y
-- deja algo para revisar en el Panel admin: un pedido de verificado y reportes.
-- Correr en: Supabase -> SQL Editor, despues de "demo.py cargar" y "demo.py profe".
-- Se puede correr mas de una vez (no duplica). Solo ASCII, como la 0005.

-- 1. @profe es admin
update public.profiles set is_admin = true where username = 'profe';

-- 2. un pedido de verificado pendiente (de una cuenta de ejemplo)
insert into public.verification_requests (user_id, category, link, reason)
select p.id, 'creador', 'youtube.com/@martucedears',
       U&'Hago videos explicando CEDEARs para gente que reci\00E9n arranca.'
from public.profiles p
where p.username = 'martu_cedears'
  and not p.verified
  and not exists (
    select 1 from public.verification_requests v
    where v.user_id = p.id and v.status = 'pending'
  );

-- 3. una recomendacion reportada por tres personas
insert into public.reports (post_id, reporter_id, reason)
select post.id, who.id, r.reason
from (
  select po.id
  from public.posts po
  join public.profiles a on a.id = po.user_id
  where a.username = 'leo_trader'
  order by po.created_at desc
  limit 1
) post
cross join (values ('sofi_m', 'misleading'), ('juan_cruz', 'spam'), ('ana_inversiones', 'misleading')) as r(username, reason)
join public.profiles who on who.username = r.username
on conflict (post_id, reporter_id) do update set status = 'open';

-- Lo que quedo: tiene que decir admin = true, pedidos 1 (o mas) y reportes 3 (o mas)
select
  (select is_admin from public.profiles where username = 'profe') as admin,
  (select count(*) from public.verification_requests where status = 'pending') as pedidos,
  (select count(*) from public.reports where status = 'open') as reportes;
