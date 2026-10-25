begin;
create function app_private.relic_title_metrics(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $function$
 select jsonb_build_object('relic_discoveries',count(*),'relic_mythic_discoveries',count(*) filter(where r.rarity='mythic'))
 from app_private.player_fishing_relic_discoveries d join public.fishing_relics r on r.id=d.relic_id
 where d.user_id=p_user
$function$;
revoke all on function app_private.relic_title_metrics(uuid) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION app_private.sync_player_titles(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user)||app_private.rare_title_metrics(p_user)||app_private.challenge_title_metrics(p_user)||app_private.everyday_title_metrics(p_user)||app_private.relic_title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $function$;
create trigger relic_titles_dirty after insert on app_private.player_fishing_relic_discoveries
for each row execute function app_private.title_activity_event();
-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('relic-fifteen','바다 유산의 계승자',4,'collection','서로 다른 유물 15종 발견','relic_discoveries',15,null,null,4605),
('relic-first','바다가 건넨 유산',1,'collection','서로 다른 유물 1종 발견','relic_discoveries',1,null,null,4601),
('relic-five','잠든 보물의 수집가',2,'collection','서로 다른 유물 5종 발견','relic_discoveries',5,null,null,4602),
('relic-mythic','신화를 건져 올린 자',3,'collection','신화 등급 유물 1종 발견','relic_mythic_discoveries',1,null,null,4604),
('relic-ten','잊힌 시대의 탐구자',3,'collection','서로 다른 유물 10종 발견','relic_discoveries',10,null,null,4603)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
