-- Apply after 60. Repeatable; preserves past attempts and operation ID replays.
-- The client only calls cast_fishing after completing the tension minigame.
begin;
-- Regional odds use failure_bp for the success budget and the first nonzero
-- tier for the bait minimum. Keep that minimum and the 10,000bp table check.
update public.fishing_baits set
 common_bp=common_bp+case when common_bp>0 then failure_bp else 0 end,
 rare_bp=rare_bp+case when common_bp=0 and rare_bp>0 then failure_bp else 0 end,
 epic_bp=epic_bp+case when common_bp=0 and rare_bp=0 and epic_bp>0 then failure_bp else 0 end,
 mythic_bp=mythic_bp+case when common_bp=0 and rare_bp=0 and epic_bp=0 then failure_bp else 0 end,
 failure_bp=0,
 effect_description=case
 when effect_kind='decoration' then '미니게임에 성공하면 현재 해역의 장식물을 획득해요. 지도는 나오지 않아요.'
 when common_bp>0 then '미니게임에 성공하면 반드시 획득해요. 상위 해역에서는 희귀·특급·신화 확률이 조금 높아져요.'
 when rare_bp>0 then '미니게임에 성공하면 최소 희귀를 획득해요. 등급 확률은 해역에 따라 달라져요.'
 when epic_bp>0 then '미니게임에 성공하면 최소 특급을 획득해요. 등급 확률은 해역에 따라 달라져요.'
 else '미니게임에 성공하면 신화 등급을 획득해요.' end;
-- Verify the actual regional odds/resolver before committing. No bait is spent.
do $$
declare b record;r record;o jsonb;
begin
 for b in select id from public.fishing_baits where effect_kind<>'decoration' loop
  for r in select id from public.regions loop
   o:=app_private.regional_bait_odds(b.id,r.id);
   if (o->>'failure_bp')::integer<>0 or
    (o->>'common_bp')::integer+(o->>'rare_bp')::integer+(o->>'epic_bp')::integer+(o->>'mythic_bp')::integer<>10000 or
    app_private.resolve_regional_fishing(b.id,r.id,0) is null or
    app_private.resolve_regional_fishing(b.id,r.id,9999) is null then
    raise exception 'CATCH_GUARANTEE_CHECK_FAILED: %, %',b.id,r.id;
   end if;
  end loop;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
select b.id,b.name,r.name as region,app_private.regional_bait_odds(b.id,r.id) as odds
from public.fishing_baits b cross join public.regions r order by b.sort_order,r.sort_order;
