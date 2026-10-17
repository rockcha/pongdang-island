-- Reviewed catalog diff: change route order only.
begin;
-- Vacate existing unique positions before assigning the new order.
update public.regions set sort_order=sort_order+1000
where id in ('pongdang','coral','bluegrove','mistmoon','starruins','primal','dreamabyss');
update public.regions set sort_order=case id
 when 'pongdang' then 1 when 'coral' then 2 when 'bluegrove' then 3
 when 'mistmoon' then 4 when 'starruins' then 5 when 'primal' then 6 when 'dreamabyss' then 7 end
where id in ('pongdang','coral','bluegrove','mistmoon','starruins','primal','dreamabyss');
commit;
