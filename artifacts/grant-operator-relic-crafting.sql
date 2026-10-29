-- One explicit test grant, safe to retry. No balance changes.
begin;
do $$
declare u uuid:='e50ad282-fb2a-485c-9124-303d560d05b1';
begin
 if not exists(select 1 from app_private.notice_operators where user_id=u) then raise exception 'OPERATOR_REQUIRED';end if;
 if (select count(*) from public.fishing_relics where enabled)<>26 then raise exception 'RELIC_CATALOG_CHANGED';end if;
 perform 1 from public.player_wallets where user_id=u for update;
 insert into app_private.relic_test_grants(user_id,grant_key) values(u,'operator-crafting-20261029-two-each') on conflict do nothing;
 if not found then return;end if;
 insert into app_private.player_fishing_relics(user_id,relic_id,quantity)
 select u,id,2 from public.fishing_relics where enabled
 on conflict(user_id,relic_id) do update set quantity=app_private.player_fishing_relics.quantity+2;
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id)
 select u,id from public.fishing_relics where enabled on conflict do nothing;
end$$;
commit;
