-- Execute inside a transaction and roll back; uses only temporary test players.
do $fixture$
declare u uuid:=gen_random_uuid();r record;t record;n integer:=0;s jsonb;m jsonb;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'유물칭호검증'||left(u::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 for r in select id from public.fishing_relics order by (rarity='mythic'),id limit 15 loop
  n:=n+1;
  insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,r.id);
  if not exists(select 1 from app_private.title_dirty where user_id=u) then raise exception 'RELIC_TITLE_NOT_QUEUED';end if;
  s:=public.title_state();
  for t in select id,target from public.title_catalog where id in ('relic-first','relic-five','relic-ten','relic-fifteen') loop
   if exists(select 1 from public.player_titles where user_id=u and title_id=t.id) is distinct from (n>=t.target) then
    raise exception 'RELIC_TITLE_BOUNDARY_FAILED: % at %',t.id,n;
   end if;
  end loop;
 end loop;
 if n<>15 then raise exception 'INSUFFICIENT_RELIC_FIXTURE';end if;
 if not exists(select 1 from public.player_titles where user_id=u and title_id='relic-mythic') then raise exception 'MYTHIC_TITLE_NOT_AWARDED';end if;
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,r.id) on conflict do nothing;
 m:=app_private.relic_title_metrics(u);
 if (m->>'relic_discoveries')::int<>15 then raise exception 'DUPLICATE_RELIC_COUNTED';end if;
 perform public.equip_title('relic-fifteen');
 s:=public.title_state();
 if s->>'equipped'<>'relic-fifteen' then raise exception 'RELIC_TITLE_EQUIP_FAILED';end if;
end $fixture$;
