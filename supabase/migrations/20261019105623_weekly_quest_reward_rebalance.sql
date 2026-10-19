-- Keep claim identities and historical payouts intact; only unclaimed rewards change.
create or replace function app_private.quest_period(p_kind text,p_now timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb;q jsonb;entries jsonb:='[]'::jsonb;fuel integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 p:=app_private.base_quest_period(p_kind,p_now);
 for q in select value from jsonb_array_elements(p->'quests') loop
  fuel:=case when p_kind='daily' and q->>'id' in ('post','depart','care') then 1
   when p_kind='weekly' and q->>'id'='trade' then 3
   when p_kind='weekly' and q->>'id'='gift' then 5 else 0 end;
  entries:=entries||jsonb_build_array(q||jsonb_build_object('reward',case when fuel>0 then 0
   when p_kind='weekly' and (q->>'reward')::integer=50 then 80 else (q->>'reward')::integer end,'rewardFuel',fuel));
 end loop;
 return jsonb_set(p,'{quests}',entries);
end $$;
revoke all on function app_private.quest_period(text,timestamptz) from public,anon,authenticated;
