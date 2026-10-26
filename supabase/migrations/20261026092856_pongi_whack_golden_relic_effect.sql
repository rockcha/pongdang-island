begin;
alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check ((((effect_kind = 'none'::text) AND (effect_value = (0)::numeric)) OR ((effect_kind = ANY (ARRAY['fuel_active_slots'::text, 'bait_active_slots'::text])) AND (((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'personal_bait_hours'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (2)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (4)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (8)::numeric)))) OR ((effect_kind = 'fishing_wait_seconds'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = 0.5)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'trap_seconds_per_bait'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (30)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (90)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (180)::numeric)))) OR ((effect_kind = 'boat_discount_gold'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (50)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (150)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (400)::numeric)))) OR ((effect_kind = 'bait_discount_gold'::text) AND (((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'harbor_duration_percent'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (3)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (6)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (10)::numeric)))) OR ((effect_kind = 'production_auto_claim'::text) AND (rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric))) or (effect_kind='pongi_whack_golden_count' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=10))));
CREATE OR REPLACE FUNCTION app_private.pongi_whack_board()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare board jsonb:='[]'; free integer[]:=array_fill(0,array[12]);
 t integer:=500; slot integer; choices integer[]; kind text; roll double precision; decoy integer;
 golden_due integer[]; golden_count integer:=1; golden integer:=0; deadline integer; n integer:=0;
begin
 select coalesce((select r.effect_value::integer from app_private.player_relic_loadouts l
  join app_private.player_fishing_relics owned on owned.user_id=l.user_id and owned.relic_id=l.relic_id
  join public.fishing_relics r on r.id=l.relic_id
  where l.user_id=(select auth.uid()) and r.enabled and r.effect_kind='pongi_whack_golden_count' and r.effect_value in(2,4,10)),1) into golden_count;
 select array_agg(case when golden_count=1 then 5000+floor(random()*21000)::integer
  else 3000+floor((i-1+random())*24000/golden_count)::integer end order by i)
  into golden_due from generate_series(1,golden_count) i;
 while t<29000 loop
  select array_agg(i) into choices from generate_series(1,12) i where free[i]<=t;
  if cardinality(choices)>0 then
   slot:=choices[1+floor(random()*cardinality(choices))::integer]; roll:=random();
   kind:=case when golden<golden_count and t>=golden_due[golden+1] then 'golden'
    when roll<case when t<10000 then 0.16 when t<20000 then 0.28 else 0.40 end
     then 'decoy' else 'pongi' end;
   if kind='decoy' then
    decoy:=floor(random()*3)::integer;
    kind:=case decoy when 0 then 'impostor' when 1 then 'hay' else 'sandcastle' end;
   end if;
   if kind='golden' then golden:=golden+1;end if;
   deadline:=least(30000,t+case when kind='golden' then 1000 else round(1100-500*least(1,t/30000.0))::integer end);
   board:=board||jsonb_build_array(jsonb_build_object('id',n,'hole',slot-1,'at',t,'until',deadline,'kind',kind));
   free[slot]:=deadline+100;n:=n+1;
  end if;
  t:=t+case when t<10000 then 600 when t<20000 then 420 else 300 end;
 end loop;
 return board;
end $function$;
notify pgrst,'reload schema';
commit;
