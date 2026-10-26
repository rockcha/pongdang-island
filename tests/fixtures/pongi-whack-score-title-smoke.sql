begin;
do $$
declare u uuid; points integer; expected integer; found_count integer; active_id uuid;
begin
 foreach points in array array[49,50,59,60,69,70,100] loop
  u:=gen_random_uuid();
  insert into auth.users(id) values(u);
  insert into public.player_profiles(id,nickname) values(u,'칭호검증'||points);
  perform set_config('request.jwt.claim.sub',u::text,true);
  -- A previously completed real run is eligible on the next title sync.
  insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,targets,finished_at,score,duration_ms)
   values(u,gen_random_uuid(),clock_timestamp()-interval '1 minute','[]',clock_timestamp(),points,30000);
  -- In-progress and abandoned runs must never inflate the best score.
  insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,targets,score,duration_ms)
   values(u,gen_random_uuid(),clock_timestamp(),'[]',999,30000) returning id into active_id;
  insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,targets,score,abandoned_at,duration_ms)
   values(u,gen_random_uuid(),clock_timestamp(),'[]',999,clock_timestamp(),30000);
  perform public.title_state();
  expected:=case when points>=70 then 3 when points>=60 then 2 when points>=50 then 1 else 0 end;
  select count(*) into found_count from public.player_titles where user_id=u and title_id like 'arcade-whack-score-%';
  if found_count<>expected then raise exception 'SCORE_TITLE_BOUNDARY:% expected % got %',points,expected,found_count;end if;
  if (app_private.title_metrics(u)->>'arcade_whack_best')::integer<>points then raise exception 'INCORRECT_BEST_SCORE';end if;
  perform public.title_state();
  if (select count(*) from public.player_titles where user_id=u and title_id like 'arcade-whack-score-%')<>expected then raise exception 'DUPLICATE_TITLE';end if;
  delete from app_private.title_dirty where user_id=u;
  update app_private.pongi_whack_runs set score=70,finished_at=clock_timestamp() where id=active_id;
  if not exists(select 1 from app_private.title_dirty where user_id=u) then raise exception 'TITLE_QUEUE_NOT_UPDATED';end if;
  perform public.title_state();
  if (select count(*) from public.player_titles where user_id=u and title_id like 'arcade-whack-score-%')<>3 then raise exception 'COMPLETION_TITLE_NOT_AWARDED';end if;
 end loop;
end $$;
rollback;
