begin;
create or replace function app_private.shadow_new_round(p_run uuid) returns void
language plpgsql set search_path='' as $$
declare v_options jsonb;v_target jsonb;v_number integer;
begin
 select jsonb_agg(jsonb_build_object('id',id,'name',name,'path',thumbnail_path)) into v_options
 from (select * from (select distinct on(name) id,name,thumbnail_path from public.collectible_species
 where kind<>'map' and thumbnail_path is not null and thumbnail_path<>'' order by name,id) pool order by random() limit 4) chosen;
 if jsonb_array_length(coalesce(v_options,'[]'::jsonb))<>4 then raise exception 'SHADOW_POOL_UNAVAILABLE'; end if;
 v_target:=v_options->floor(random()*4)::integer;
 select coalesce(max(number),0)+1 into v_number from app_private.shadow_game_rounds where run_id=p_run;
 insert into app_private.shadow_game_rounds(run_id,number,target_id,target_name,image_path,options,deadline)
 values(p_run,v_number,v_target->>'id',v_target->>'name',v_target->>'path',
 (select jsonb_agg(jsonb_build_object('id',o->>'id','name',o->>'name')) from jsonb_array_elements(v_options) o),clock_timestamp()+interval '8 seconds');
end $$;
revoke all on function app_private.shadow_new_round(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
