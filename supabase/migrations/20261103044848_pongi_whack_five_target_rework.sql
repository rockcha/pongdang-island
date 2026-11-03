-- Only newly started rounds receive this pattern. Existing stored boards,
-- finish validation, rewards and weekly records remain authoritative.
create or replace function app_private.pongi_whack_board()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
 board jsonb := '[]'; free integer[] := array_fill(0,array[12]);
 t integer := 500; slot integer; choices integer[]; choice_index integer;
 kind text; decoy integer; golden_due integer[]; golden_count integer := 1;
 golden integer := 0; deadline integer; n integer := 0; wave_size integer; j integer;
 fake_chance double precision; progress double precision; smooth double precision;
 variation double precision; lifetime_ms integer; sink_ms integer;
begin
 select coalesce((select r.effect_value::integer from app_private.player_relic_loadouts l
  join app_private.player_fishing_relics owned on owned.user_id=l.user_id and owned.relic_id=l.relic_id
  join public.fishing_relics r on r.id=l.relic_id
  where l.user_id=(select auth.uid()) and r.enabled and r.effect_kind='pongi_whack_golden_count' and r.effect_value in(2,4,10)),1) into golden_count;
 select array_agg(4000+floor((i-1+random())*24000/golden_count)::integer order by i)
  into golden_due from generate_series(1,golden_count) i;
 while t<29200 loop
  wave_size := case when t<10000 then 1 else 5 end;
  fake_chance := case when t<10000 then .365 when t<20000 then .515 when t<25000 then .615 else .685 end;
  progress := least(1.0,greatest(0.0,(t-10000)/20000.0));
  smooth := progress*progress*(3-2*progress);
  select array_agg(i order by i) into choices from generate_series(1,12) i where free[i]<=t;
  for j in 1..wave_size loop
   exit when coalesce(cardinality(choices),0)=0;
   choice_index := 1+floor(random()*cardinality(choices))::integer;
   slot := choices[choice_index]; choices := array_remove(choices,slot);
   kind := case when golden<golden_count and t>=golden_due[golden+1] then 'golden'
    when random()<fake_chance then 'decoy' else 'pongi' end;
   if kind='decoy' then
    decoy:=floor(random()*3)::integer;
    kind:=case decoy when 0 then 'impostor' when 1 then 'hay' else 'sandcastle' end;
   end if;
   if kind='golden' then golden:=golden+1;end if;
   variation := random()*2-1;
   lifetime_ms := round((1000-250*smooth+variation*40)::numeric)::integer;
   sink_ms := round((170-90*smooth+variation*8)::numeric)::integer;
   deadline := least(30000,t+case when kind='golden' then 1100 else lifetime_ms end);
   board := board||jsonb_build_array(jsonb_build_object('id',n,'hole',slot-1,'at',t,'until',deadline,'kind',kind,'sinkMs',sink_ms));
   free[slot]:=deadline+100;n:=n+1;
  end loop;
  t:=t+case when t<10000 then 1100 else 700 end;
 end loop;
 return board;
end
$function$;
