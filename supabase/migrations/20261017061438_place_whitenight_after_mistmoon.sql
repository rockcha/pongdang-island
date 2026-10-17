-- Reviewed catalog diff: route order only; retain all prices and ownership.
begin;
update public.regions set sort_order=sort_order+1000 where id in ('pongdang','coral','bluegrove','mistmoon','whitenight','starruins','primal','dreamabyss');
update public.regions set sort_order=case id
 when 'pongdang' then 1
 when 'coral' then 2
 when 'bluegrove' then 3
 when 'mistmoon' then 4
 when 'whitenight' then 5
 when 'starruins' then 6
 when 'primal' then 7
 when 'dreamabyss' then 8 end where id in ('pongdang','coral','bluegrove','mistmoon','whitenight','starruins','primal','dreamabyss');
commit;
