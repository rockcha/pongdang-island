-- Keep existing odds in every other region. Cloud Ferry temporarily rolls epic instead of a missing mythic.
create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text) returns jsonb
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;v_rank integer;v_success integer;v_c integer;v_r integer;v_e integer;v_m integer;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 select case rarity when 'common' then 0 when 'rare' then 1 when 'epic' then 2 else 3 end into v_rank from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0);end if;
 v_success:=10000-b.failure_bp;
 if b.common_bp>0 then
  v_r:=1300+300*v_rank;v_e:=180+80*v_rank;v_m:=20+20*v_rank;
 elsif b.rare_bp>0 then
  v_r:=9870-50*v_rank;v_e:=100+40*v_rank;v_m:=30+10*v_rank;
 elsif b.epic_bp>0 then
  v_r:=0;v_e:=9970-20*v_rank;v_m:=30+20*v_rank;
 else v_r:=0;v_e:=0;v_m:=10000;end if;
 v_m:=floor(v_success::numeric*v_m/10000);v_e:=floor(v_success::numeric*v_e/10000);
 if b.common_bp>0 then v_r:=floor(v_success::numeric*v_r/10000);v_c:=v_success-v_r-v_e-v_m;
 elsif b.rare_bp>0 then v_c:=0;v_r:=v_success-v_e-v_m;
 elsif b.epic_bp>0 then v_c:=0;v_r:=0;v_e:=v_success-v_m;
 else v_c:=0;v_r:=0;v_e:=0;v_m:=v_success;end if;
 if p_region_id in('whitenight','cloudferry') and not exists(
  select 1 from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and s.kind='fish' and s.rarity='mythic'
 ) then v_e:=v_e+v_m;v_m:=0;end if;
 return jsonb_build_object('common_bp',v_c,'rare_bp',v_r,'epic_bp',v_e,'mythic_bp',v_m,'failure_bp',b.failure_bp);
end $$;
