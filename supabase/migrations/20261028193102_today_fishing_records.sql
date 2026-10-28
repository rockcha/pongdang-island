begin;

-- Bait is consumed on preparation. Keep the start-day cohort even if a cast finishes after midnight.
create index prepared_fishing_daily on app_private.prepared_fishing_casts(user_id,created_at);

create function app_private.today_fishing_records()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();v_now timestamptz:=statement_timestamp();v_day date;v_start timestamptz;v_end timestamptz;result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 v_day:=(v_now at time zone 'Asia/Seoul')::date;
 v_start:=v_day::timestamp at time zone 'Asia/Seoul';
 v_end:=(v_day+1)::timestamp at time zone 'Asia/Seoul';
 with records as materialized (
  select p.bait_id,a.rarity,a.operation_id is not null completed
  from app_private.prepared_fishing_casts p
  left join public.fishing_attempts a on a.user_id=p.user_id and a.operation_id=p.operation_id
  where p.user_id=u and p.created_at>=v_start and p.created_at<v_end and p.created_at<=v_now
  union all
  select a.bait_id,a.rarity,true
  from public.fishing_attempts a
  where a.user_id=u and a.created_at>=v_start and a.created_at<v_end and a.created_at<=v_now
   and not exists(select 1 from app_private.prepared_fishing_casts p where p.user_id=u and p.operation_id=a.operation_id)
 ), bait_counts as (
  select bait_id,count(*) used from records group by bait_id
 )
 select jsonb_build_object(
  'serverNow',v_now,'day',v_day,'nextResetAt',v_end,
  'totalCasts',count(*),'caughtCount',count(*) filter(where rarity is not null),
  'failedCount',count(*) filter(where completed and rarity is null),'unfinishedCount',count(*) filter(where not completed),
  'rarities',jsonb_build_object('mythic',count(*) filter(where rarity='mythic'),'epic',count(*) filter(where rarity='epic'),'rare',count(*) filter(where rarity='rare'),'common',count(*) filter(where rarity='common')),
  'baits',(select coalesce(jsonb_agg(jsonb_build_object('id',bc.bait_id,'name',coalesce(b.name,bc.bait_id),'imagePath',b.image_path,'used',bc.used) order by bc.used desc,bc.bait_id),'[]'::jsonb)
   from bait_counts bc left join public.fishing_baits b on b.id=bc.bait_id)
 ) into result from records;
 return result;
end $$;

create function public.today_fishing_records()
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.today_fishing_records()
$$;
revoke all on function public.today_fishing_records(),app_private.today_fishing_records() from public,anon;
grant execute on function public.today_fishing_records(),app_private.today_fishing_records() to authenticated;

commit;
