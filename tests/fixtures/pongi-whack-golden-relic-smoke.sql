begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); item record; board jsonb;
 state jsonb; saved jsonb; op uuid; run_id uuid; hit_log jsonb; i integer; expected integer;
begin
 insert into auth.users(id) values(u),(other_user);
 insert into public.player_profiles(id,nickname) values(u,'황금유물검증'),(other_user,'계정격리검증');
 insert into public.player_wallets(user_id,gold,inventory) values(u,100000,'{}'),(other_user,100000,'{}') on conflict(user_id) do update set gold=100000;
 perform set_config('request.jwt.claim.sub',u::text,true);
 for item in select * from public.fishing_relics where effect_kind='pongi_whack_golden_count' order by effect_value loop
  insert into app_private.player_fishing_relics(user_id,relic_id) values(u,item.id);
  perform public.equip_relic(item.id,gen_random_uuid(),0);
  for i in 1..40 loop
   board:=app_private.pongi_whack_board();
   if (select count(*) from jsonb_array_elements(board) t where t->>'kind'='golden')<>item.effect_value then raise exception 'GOLDEN_COUNT_MISMATCH:%',item.id; end if;
   if exists(select 1 from jsonb_array_elements(board) t where (t->>'until')::integer>30000 or (t->>'hole')::integer not between 0 and 11) then raise exception 'INVALID_BOARD';end if;
  end loop;
  op:=gen_random_uuid(); state:=public.pongi_whack_action('start',op);saved:=state->'run'->'targets';run_id:=(state->'run'->>'id')::uuid;
  perform public.equip_relic(null,gen_random_uuid(),500);
  state:=public.pongi_whack_action('start',op);
  if state->'run'->'targets'<>saved then raise exception 'BOARD_CHANGED_AFTER_UNEQUIP';end if;
  if (select count(*) from jsonb_array_elements(app_private.pongi_whack_board()) t where t->>'kind'='golden')<>1 then raise exception 'UNEQUIP_BONUS_REMAINS';end if;
  update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds' where id=run_id;
  select jsonb_agg(jsonb_build_object('id',(t->>'id')::integer,'ms',(t->>'at')::integer+150) order by (t->>'at')::integer)
   into hit_log from jsonb_array_elements(saved) t where t->>'kind'='golden';
  state:=public.pongi_whack_action('finish',null,run_id,hit_log);
  expected:=item.effect_value::integer*10;
  if (state->'run'->>'score')::integer<>expected or (state->'run'->>'rewardGold')::integer<>expected then raise exception 'RELIC_REWARD_MISMATCH';end if;
  if public.pongi_whack_action('finish',null,run_id,'[]')->>'gold'<>state->>'gold' then raise exception 'DOUBLE_REWARD';end if;
 end loop;
 perform public.equip_relic('golden-parade-crown',gen_random_uuid(),0);
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 if (select count(*) from jsonb_array_elements(app_private.pongi_whack_board()) t where t->>'kind'='golden')<>1 then raise exception 'CROSS_ACCOUNT_RELIC';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 update public.fishing_relics set enabled=false where id='golden-parade-crown';
 if (select count(*) from jsonb_array_elements(app_private.pongi_whack_board()) t where t->>'kind'='golden')<>1 then raise exception 'DISABLED_RELIC_BONUS';end if;
 update public.fishing_relics set enabled=true where id='golden-parade-crown';
 begin
  delete from app_private.player_fishing_relics where user_id=u and relic_id='golden-parade-crown';
  raise exception 'EQUIPPED_OWNERSHIP_NOT_PROTECTED';
 exception when foreign_key_violation then null;
 end;
 perform public.equip_relic(null,gen_random_uuid(),500);
 delete from app_private.player_fishing_relics where user_id=u and relic_id='golden-parade-crown';
 if (select count(*) from jsonb_array_elements(app_private.pongi_whack_board()) t where t->>'kind'='golden')<>1 then raise exception 'UNOWNED_RELIC_BONUS';end if;
end $$;
rollback;
